import logger from '@/utils/logger';
import { db } from './db';
import { interactionsAPI } from './services/api';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const syncOfflineData = async () => {
  if (!navigator.onLine) return;

  try {
    const offlineInteractions = await db.interactions.where('synced').equals(0 as any).toArray();

    if (offlineInteractions.length === 0) return;

    const batchSize = 20;

    for (let i = 0; i < offlineInteractions.length; i += batchSize) {
      const batch = offlineInteractions.slice(i, i + batchSize);

      const payload = batch.map(item => ({
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

    logger.info(`Successfully synced ${offlineInteractions.length} interactions in total.`);

    // Dispatch an event so the UI can listen and show a single toast notification
    window.dispatchEvent(new CustomEvent('offline-sync-complete', {
      detail: { count: offlineInteractions.length }
    }));
  } catch (error) {
    logger.error('Failed to sync offline interactions:', error);
  }
};

window.addEventListener('online', syncOfflineData);
