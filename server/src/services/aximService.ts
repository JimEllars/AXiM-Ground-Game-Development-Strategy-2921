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
