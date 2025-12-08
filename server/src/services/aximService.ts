import axios from 'axios';

const aximCoreApiUrl = process.env.AXIM_CORE_API_URL || 'http://localhost:4000/api';
const aximCoreApiKey = process.env.AXIM_CORE_API_KEY;

if (!aximCoreApiKey) {
  console.warn('AXiM Core API Key not found. AXiM Core service may not function correctly.');
}

const aximClient = axios.create({
  baseURL: aximCoreApiUrl,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': aximCoreApiKey,
  },
});

export const syncLeadToCore = async (leadData: any) => {
  try {
    const response = await aximClient.post('/leads/sync', leadData);
    return response.data;
  } catch (error) {
    console.error('Error syncing lead to AXiM Core:', error);
    throw error;
  }
};

export const getOrganizationFromCore = async (orgId: string) => {
  try {
    const response = await aximClient.get(`/organizations/${orgId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching organization from AXiM Core:', error);
    throw error;
  }
};

export default aximClient;
