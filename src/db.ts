import Dexie, { Table } from 'dexie';
import { Lead } from './types';

export interface OfflineInteraction {
  id?: number;
  leadId: string;
  outcome: string;
  notes: string;
  interactionDate: string;
  synced: boolean;
  surveyData?: any;
}

export interface OfflineTerritory {
  id: string;
  name: string;
  boundary: any;
  leads: Lead[];
}

export interface OfflineSetting {
  id: string; // e.g. "surveys" or "dispositions"
  data: any;
}

export class AppDB extends Dexie {
  interactions!: Table<OfflineInteraction, number>;
  territories!: Table<OfflineTerritory, string>;
  settings!: Table<OfflineSetting, string>;

  constructor() {
    super('AximGroundGameDB');
    this.version(2).stores({
      interactions: '++id, leadId, synced',
      territories: 'id, name',
      settings: 'id'
    });
  }
}

export const db = new AppDB();
