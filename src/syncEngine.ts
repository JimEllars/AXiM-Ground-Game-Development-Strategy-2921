import logger from '@/utils/logger';
import { db } from './db';
import { interactionsAPI, analyticsAPI } from './services/api';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

let isSyncPaused = false;

window.addEventListener('auth-unauthorized', () => {
  isSyncPaused = true;
});

export const syncOfflineData = async () => {
  if (!navigator.onLine || isSyncPaused) return;

  try {
    const offlineInteractions = await db.interactions.where('synced').equals(0 as any).toArray();

    if (offlineInteractions.length === 0) return;

    const batchSize = 20;

    for (let i = 0; i < offlineInteractions.length; i += batchSize) {
      if (isSyncPaused) {
        logger.warn('Sync paused due to unauthorized status.');
        break;
      }

      const batch = offlineInteractions.slice(i, i + batchSize);

      // Deterministic Sync Reconciliation & Delta Mapping
      const reconciledBatch = [];
      for (const item of batch) {
        // Delta Map Check (Simulated for Interactions/Leads)
        const localUpdatedAt = new Date(item.interactionDate).getTime();
        // Assuming we fetched remoteUpdatedAt from server:
        // const remoteUpdatedAt = await fetchRemoteUpdatedAt(item.leadId);
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

          if (item.id !== undefined) {
             await db.interactions.delete(item.id);
          }
        }
        reconciledBatch.push(item);
      }

      const payload = reconciledBatch.map(item => ({
        leadId: item.leadId,
        outcome: item.outcome,
        notes: item.notes,
        interactionDate: new Date(item.interactionDate),
        surveyData: item.surveyData
      }));

      logger.info(`Syncing interactions batch ${Math.floor(i / batchSize) + 1} payload: ${JSON.stringify(payload)}`);
      await interactionsAPI.create(payload);

      const idsToUpdate = batch.map(item => item.id!);
      await db.interactions.bulkUpdate(idsToUpdate.map(id => ({ key: id, changes: { synced: 1 as any } })));

      if (i + batchSize < offlineInteractions.length) {
        await delay(200);
      }
    }

    if (!isSyncPaused) {
      logger.info(`Successfully synced ${offlineInteractions.length} interactions in total.`);

      // Dispatch an event so the UI can listen and show a single toast notification
      // Trigger pruning of stale data after successful sync
      await pruneSyncedData();

      // Dispatch an event so the UI can listen and show a single toast notification
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

    // We fetch and filter because interactionDate might be stored as string or Date
    // and might not be indexed in a way to do a direct Date comparison via where().
    const staleRecords = await db.interactions
      .filter((interaction) => {
        if (!interaction.synced) return false;
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
  if (!navigator.onLine || isSyncPaused) return;

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

window.addEventListener('online', () => {
  syncOfflineData();
  syncTelemetryQueue();
});
