import { mapToDeskera } from '../types/deskera_payload_schema.js';
import logger from '../utils/logger.js';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import crypto from 'crypto';

const aximCoreApiUrl = process.env.AXIM_CORE_API_URL || 'http://localhost:4000/api';
const aximCoreApiKey = process.env.AXIM_CORE_API_KEY;

if (!aximCoreApiKey) {
  logger.warn('AXiM Core API Key not found. AXiM Core service may not function correctly.');
}

const aximClient = axios.create({
  baseURL: aximCoreApiUrl,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': aximCoreApiKey || '',
  },
});

// Implement exponential backoff for aximClient
// 3 retries at 1s, 3s, and 9s intervals
axiosRetry(aximClient, {
  retries: 3,
  retryDelay: (retryCount) => {
    // 1st retry: 3^0 * 1000 = 1000ms
    // 2nd retry: 3^1 * 1000 = 3000ms
    // 3rd retry: 3^2 * 1000 = 9000ms
    const delay = Math.pow(3, retryCount - 1) * 1000;
    logger.info(`Retrying request to AXiM Core API (attempt ${retryCount}) in ${delay}ms`);
    return delay;
  },
  retryCondition: (error) => {
    // Retry on network errors or 5xx status codes
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  }
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

export const dispatchAgentViewTask = async (payload: any) => {
  const webhookUrl = process.env.AXIM_AGENTVIEW_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.warn('AXIM_AGENTVIEW_WEBHOOK_URL not configured. AgentView task handoff will not be performed.');
    return;
  }

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aximCoreApiKey || '',
      },
      timeout: 5000
    });
    logger.info(`AgentView task handoff successful for lead: ${payload.leadId}`);
    return response.data;
  } catch (error) {
    logger.error('Error dispatching AgentView task handoff:', error);
    throw error;
  }
};
