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
      interactionDate: new Date(i.interactionDate)
    }));

    await interactionsAPI.create(payload);

    const idsToUpdate = offlineInteractions.map(i => i.id!);
    await db.interactions.bulkUpdate(idsToUpdate.map(id => ({ key: id, changes: { synced: true } })));

    console.log(`Successfully synced ${offlineInteractions.length} interactions.`);
  } catch (error) {
    console.error('Failed to sync offline interactions:', error);
  }
};

window.addEventListener('online', syncOfflineData);
