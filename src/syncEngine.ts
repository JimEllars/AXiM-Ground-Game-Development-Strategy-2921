import logger from '@/utils/logger';
import { db } from './db';
import { interactionsAPI, analyticsAPI } from './services/api';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

let isSyncPaused = false;

window.addEventListener('auth-unauthorized', () => {
  isSyncPaused = true;
});

export const getPendingSyncCount = async (): Promise<number> => {
  try {
    const offlineInteractions = await db.interactions
      .filter(item => item.synced === 0 || item.synced === 'retrying')
      .count();
    return offlineInteractions;
  } catch (error) {
    return 0;
  }
};

export const syncOfflineData = async () => {
  const token = localStorage.getItem('token');
  if (!navigator.onLine || isSyncPaused || !token) return;

  try {
    // Exclude permanently failed or duplicate
    const offlineInteractions = await db.interactions
      .filter(item => item.synced === 0 || item.synced === 'retrying')
      .toArray();

    if (offlineInteractions.length === 0) return;

    const batchSize = 20;

    for (let i = 0; i < offlineInteractions.length; i += batchSize) {
      if (isSyncPaused) {
        logger.warn('Sync paused due to unauthorized status.');
        break;
      }

      const batch = offlineInteractions.slice(i, i + batchSize);
      const reconciledBatch = [];
      const poisonIds = [];

      for (const item of batch) {
        try {
          // Delta Map Check (Simulated for Interactions/Leads)
          const localUpdatedAt = new Date(item.interactionDate).getTime();
          const remoteUpdatedAt = localUpdatedAt; // Placeholder

          if (remoteUpdatedAt > localUpdatedAt) {
            logger.info(`Delta conflict detected for lead ${item.leadId}. Prioritizing field rep local inputs.`);

            try {
               await analyticsAPI.reportClientError({
                 error: 'Sync conflict detected',
                 stack: `Conflict for lead ${item.leadId}`,
                 componentStack: 'syncEngine'
               });
            } catch (e) {
               logger.error('Failed to report sync telemetry notice');
            }

            // DO NOT DELETE - We just log. It'll get retried or overridden based on backend
          }

          if (!item.leadId || !item.outcome) {
            throw new Error('Missing required fields');
          }
          if (isNaN(new Date(item.interactionDate).getTime())) {
            throw new Error('Invalid interactionDate');
          }

          reconciledBatch.push({
            idempotencyKey: item.idempotencyKey,
            id: item.id,
            leadId: item.leadId,
            outcome: item.outcome,
            notes: item.notes,
            interactionDate: new Date(item.interactionDate),
            surveyData: item.surveyData
          });
        } catch (itemErr) {
          logger.error(`Validation error parsing interaction payload for ID ${item.id}`, itemErr);
          if (item.id !== undefined) {
             poisonIds.push(item.id);
             // Dispatch poison-pill entry
             await db.telemetryQueue.add({
               payload: {
                 error: 'Poison Record Payload',
                 stack: String(itemErr),
                 componentStack: 'syncEngine.itemValidation',
                 message: `Record ${item.id} corrupted`
               }
             });
          }
        }
      }

      if (reconciledBatch.length > 0) {
        const payload = reconciledBatch.map(item => ({
          idempotencyKey: item.idempotencyKey,
          leadId: item.leadId,
          outcome: item.outcome,
          notes: item.notes,
          interactionDate: item.interactionDate,
          surveyData: item.surveyData
        }));

        logger.info(`Syncing interactions batch ${Math.floor(i / batchSize) + 1} payload: ${JSON.stringify(payload)}`);
        try {
          await interactionsAPI.create(payload, { headers: { 'X-Idempotency-Key': crypto.randomUUID() } });
          const idsToUpdate = reconciledBatch.map(item => item.id!);
          await db.interactions.bulkUpdate(idsToUpdate.map(id => ({ key: id, changes: { synced: 1 as any } })));
        } catch (apiErr: any) {
           logger.error('API batch sync failure', apiErr);

           if (apiErr.response && apiErr.response.status === 409) {
             // Idempotency conflict - treat as duplicate / already success
             const idsToUpdate = reconciledBatch.map(item => item.id!);
             await db.interactions.bulkUpdate(idsToUpdate.map(id => ({ key: id, changes: { synced: 'duplicate' as any } })));
             continue;
           }

           for (const item of reconciledBatch) {
              const currentItem = await db.interactions.get(item.id!);
              if (currentItem) {
                const failCount = (currentItem as any).failCount || 0;
                if (failCount >= 2) {
                   try {
                     fetch('/api/v1/field-fault', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({
                          type: 'sync_queue_stagnation',
                          leadId: item.leadId,
                          error: String(apiErr)
                       })
                     }).catch(() => {});
                     await db.interactions.update(item.id!, { synced: 'failed' as any, supportReported: true });
                   } catch(e) {}
                } else {
                   await db.interactions.update(item.id!, { synced: 'retrying' as any, failCount: failCount + 1 });
                }
              }
           }
        }
      }

      if (poisonIds.length > 0) {
         // Mark poison pills as permanently failed
         await db.interactions.bulkUpdate(poisonIds.map(id => ({ key: id, changes: { synced: 'failed' as any } })));
      }

      if (i + batchSize < offlineInteractions.length) {
        await delay(200);
      }
    }

    if (!isSyncPaused) {
      logger.info(`Successfully processed interactions batch.`);
      await pruneSyncedData();

      window.dispatchEvent(new CustomEvent('offline-sync-complete', {
        detail: { count: offlineInteractions.length }
      }));
    }
  } catch (error) {
    logger.error('Failed to sync offline interactions:', error);
  }
};


export const pruneSyncedData = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const staleRecords = await db.interactions
      .filter((interaction) => {
        // Only prune successfully synced or duplicate items
        if (interaction.synced !== 1 && interaction.synced !== 'duplicate') return false;
        const interactionDate = new Date(interaction.interactionDate);
        return interactionDate < sevenDaysAgo;
      })
      .toArray();

    const idsToDelete = staleRecords.map(record => record.id!).filter(id => id !== undefined);

    if (idsToDelete.length > 0) {
      await db.interactions.bulkDelete(idsToDelete);
      logger.info(`Successfully pruned ${idsToDelete.length} stale interactions.`);
    }
  } catch (error) {
    logger.error('Failed to prune synced data:', error);
  }
};


export const syncTelemetryQueue = async () => {
  const token = localStorage.getItem('token');
  if (!navigator.onLine || isSyncPaused || !token) return;

  try {
    const queuedLogs = await db.telemetryQueue.toArray();
    if (queuedLogs.length === 0) return;

    logger.info(`Syncing ${queuedLogs.length} queued telemetry logs.`);

    for (const log of queuedLogs) {
      if (isSyncPaused) break;

      try {
        await analyticsAPI.reportClientError(log.payload);
        if (log.id !== undefined) {
           await db.telemetryQueue.delete(log.id);
        }
      } catch (err) {
        logger.error('Failed to sync specific telemetry log:', err);
      }
    }
  } catch (error) {
    logger.error('Failed to sync telemetry queue:', error);
  }
};


export const syncOfflinePhotos = async () => {
  const token = localStorage.getItem('token');
  if (!navigator.onLine || isSyncPaused || !token) return;

  try {
    const offlinePhotos = await db.photos.where('synced').equals(0 as any).toArray();
    if (offlinePhotos.length === 0) return;

    logger.info(`Syncing ${offlinePhotos.length} offline photos.`);

    for (const photo of offlinePhotos) {
      if (isSyncPaused) break;
      try {
        const formData = new FormData();
        formData.append('photo', photo.blob, `offline-photo-${photo.interaction_id}.jpg`);

        const res = await interactionsAPI.uploadPhoto(formData);

        if (photo.id !== undefined) {
           await db.photos.update(photo.id, { synced: 1 as any });
        }
      } catch (err) {
        logger.error('Failed to sync offline photo:', err);
      }
    }
  } catch (error) {
    logger.error('Failed to sync offline photos:', error);
  }
};

window.addEventListener('online', () => {
  syncOfflineData();
  syncTelemetryQueue();
  syncOfflinePhotos();
});

const deduplicateOfflinePins = async (interaction: any) => {};
