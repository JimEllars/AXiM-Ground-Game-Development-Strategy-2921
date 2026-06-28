import Dexie, { Table } from 'dexie';
import { Lead } from './types';
import { encryptString, decryptString } from './utils/crypto';

export interface OfflineInteraction {
  id?: number;
  leadId: string;
  outcome: string;
  notes: string;
  interactionDate: string;
  synced: boolean | number;
  surveyData?: any;
}

export interface OfflineTerritory {
  id: string;
  name: string;
  boundary: any;
  leads: Lead[];
}

export interface OfflineTelemetry {
  id?: number;
  payload: any;
  timestamp: number;
}

export interface OfflineSetting {
  id: string; // e.g. "surveys" or "dispositions"
  data: any;
}

export class AppDB extends Dexie {
  interactions!: Table<OfflineInteraction, number>;
  territories!: Table<OfflineTerritory, string>;
  settings!: Table<OfflineSetting, string>;
  telemetryQueue!: Table<OfflineTelemetry, number>;

  constructor() {
    super('AximGroundGameDB');
    this.version(3).stores({
      telemetryQueue: '++id',
      interactions: '++id, leadId, synced',
      territories: 'id, name',
      settings: 'id'
    });

    // Add middleware for encryption/decryption
    this.use({
      stack: 'dbcore',
      name: 'encryptionMiddleware',
      create: (core) => {
        return {
          ...core,
          table: (tableName) => {
            const table = core.table(tableName);
            return {
              ...table,
              mutate: async (req) => {
                const newReq = { ...req };
                if (tableName === 'interactions' && (req.type === 'add' || req.type === 'put')) {
                  newReq.values = req.values.map(val => ({
                    ...val,
                    notes: val.notes ? encryptString(val.notes as string) as string : val.notes
                  }));
                } else if (tableName === 'territories' && (req.type === 'add' || req.type === 'put')) {
                  newReq.values = req.values.map(val => ({
                    ...val,
                    leads: val.leads?.map(lead => ({
                      ...lead,
                      phone: lead.phone ? encryptString(lead.phone) as string : lead.phone,
                      email: lead.email ? encryptString(lead.email) as string : lead.email,
                      streetAddress: lead.streetAddress ? encryptString(lead.streetAddress) as string : lead.streetAddress,
                      notes: lead.notes ? encryptString(lead.notes) as string : lead.notes,
                    }))
                  }));
                }
                return table.mutate(newReq);
              },
              query: async (req) => {
                const result = await table.query(req);
                return {
                  ...result,
                  result: result.result.map((item: any) => {
                    if (tableName === 'interactions') {
                      return {
                        ...item,
                        notes: item.notes ? decryptString(item.notes) : item.notes
                      };
                    } else if (tableName === 'territories') {
                      return {
                        ...item,
                        leads: item.leads?.map((lead: any) => ({
                          ...lead,
                          phone: lead.phone ? decryptString(lead.phone) : lead.phone,
                          email: lead.email ? decryptString(lead.email) : lead.email,
                          streetAddress: lead.streetAddress ? decryptString(lead.streetAddress) : lead.streetAddress,
                          notes: lead.notes ? decryptString(lead.notes) : lead.notes,
                        }))
                      };
                    }
                    return item;
                  })
                };
              }
            };
          }
        };
      }
    });
  }
}

export const db = new AppDB();
