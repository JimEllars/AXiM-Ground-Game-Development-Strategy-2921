import logger from '@/utils/logger';
import { db } from './db';
import { interactionsAPI } from './services/api';

export const syncOfflineData = async () => {
  if (!navigator.onLine) return;

  try {
    const offlineInteractions = await db.interactions.where('synced').equals(false).toArray();

    if (offlineInteractions.length === 0) return;

    const payload = offlineInteractions.map(i => ({
      leadId: i.leadId,
      outcome: i.outcome,
      notes: i.notes,
      interactionDate: new Date(i.interactionDate),
      surveyData: i.surveyData
    }));

    await interactionsAPI.create(payload);

    const idsToUpdate = offlineInteractions.map(i => i.id!);
    await db.interactions.bulkUpdate(idsToUpdate.map(id => ({ key: id, changes: { synced: true } })));

    logger.info(`Successfully synced ${offlineInteractions.length} interactions.`);
  } catch (error) {
    logger.error('Failed to sync offline interactions:', error);
  }
};

window.addEventListener('online', syncOfflineData);
