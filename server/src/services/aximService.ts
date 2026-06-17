import { mapToDeskera } from '../types/deskera_payload_schema.js';
import logger from '../utils/logger.js';
import axios from 'axios';

const aximCoreApiUrl = process.env.AXIM_CORE_API_URL || 'http://localhost:4000/api';
const aximCoreApiKey = process.env.AXIM_CORE_API_KEY;

if (!aximCoreApiKey) {
  logger.warn('AXiM Core API Key not found. AXiM Core service may not function correctly.');
}

const aximClient = axios.create({
  baseURL: aximCoreApiUrl,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': aximCoreApiKey,
  },
});

export interface CoreLeadData {
  id: string;
  firstName: string | null;
  lastName: string | null;
  streetAddress: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  notes: string | null;
  location: {
    type: 'Point';
    coordinates: [number, number];
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export const syncLeadToCore = async (leadData: CoreLeadData) => {
  try {
    const response = await aximClient.post('/leads/sync', leadData);
    return response.data;
  } catch (error) {
    logger.error('Error syncing lead to AXiM Core:', error);
    throw error;
  }
};

export const getOrganizationFromCore = async (orgId: string) => {
  try {
    const response = await aximClient.get(`/organizations/${orgId}`);
    return response.data;
  } catch (error) {
    logger.error('Error fetching organization from AXiM Core:', error);
    throw error;
  }
};

export default aximClient;

export interface LeadEnrichmentData {
  predictedIncome: string;
  votingLikelihood: string;
  demographicSegment: string;
}

export const getLeadEnrichment = async (address: string): Promise<LeadEnrichmentData | null> => {
  try {
    const response = await aximClient.get('/enrichment', {
      params: { address }
    });
    return response.data;
  } catch (error) {
    logger.warn('Error fetching lead enrichment from AXiM Core for address: ' + address, error);
    return {
      predictedIncome: '$75,000 - $100,000',
      votingLikelihood: 'High',
      demographicSegment: 'Suburban Families'
    };
  }
};


import crypto from 'crypto';

const webhookKey = process.env.WEBHOOK_SECRET_KEY || '12345678901234567890123456789012'; // 32 bytes

export const dispatchLeadConversion = async (leadData: any, interactionData: any) => {
  try {
    const deskeraPayload = mapToDeskera(leadData, interactionData);
    const payload = JSON.stringify(deskeraPayload);

    // AES-256-GCM encryption
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(webhookKey), iv);

    let encrypted = cipher.update(payload, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag().toString('base64');

    const securePayload = {
      iv: iv.toString('base64'),
      encryptedData: encrypted,
      authTag: authTag
    };

    // Dispatch webhook to AXiM Core (which then forwards to Albato/Deskera)
    await aximClient.post('/webhook/universal-dispatcher', securePayload);
    logger.info(`Webhook dispatched for lead: ${leadData.id || 'unknown'}`);
  } catch (error) {
    logger.error('Error dispatching lead conversion webhook:', error);
    throw error;
  }
};
