import axios from 'axios';
import logger, { clientExceptionStream } from '../utils/logger.js';

const NEXUS_CRM_ENDPOINT = process.env.NEXUS_CRM_ENDPOINT || 'https://api.nexus-crm.mock/v1';
const NEXUS_CRM_API_KEY = process.env.NEXUS_CRM_API_KEY || 'mock-key';

const nexusClient = axios.create({
  baseURL: NEXUS_CRM_ENDPOINT,
  headers: {
    'Authorization': `Bearer ${NEXUS_CRM_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

export interface NexusContactPayload {
  first_name: string | null;
  last_name: string | null;
  street_address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  disposition: string;
  organization_id: string;
}

export const syncToNexusCRM = (payload: NexusContactPayload) => {
  // Fire-and-forget: do not await this in the main request flow
  nexusClient.post('/contacts', payload)
    .then(() => {
      logger.info(`Successfully synced contact to Nexus CRM for org ${payload.organization_id}`);
    })
    .catch((error) => {
      logger.error('Failed to sync to Nexus CRM:', error.message);
      const logEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'nexus_sync_error',
        payload,
        error: error.message,
      });
      clientExceptionStream.write(logEntry + '\n');
    });
};
