import Dexie, { Table } from 'dexie';
import { Lead } from './types';

export interface OfflineInteraction {
  id?: number;
  leadId: string;
  outcome: string;
  notes: string;
  interactionDate: string;
  synced: boolean;
}

export interface OfflineTerritory {
  id: string;
  name: string;
  boundary: any;
  leads: Lead[];
}

export class AppDB extends Dexie {
  interactions!: Table<OfflineInteraction, number>;
  territories!: Table<OfflineTerritory, string>;

  constructor() {
    super('AximGroundGameDB');
    this.version(1).stores({
      interactions: '++id, leadId, synced',
      territories: 'id, name'
    });
  }
}

export const db = new AppDB();
