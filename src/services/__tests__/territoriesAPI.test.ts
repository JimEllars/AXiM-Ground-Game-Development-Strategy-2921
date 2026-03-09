// We need to mock import.meta.env for jest since we are requiring the api module which uses it.
// We can do this by mocking the module and returning a mocked axios instance.
// But another way is to just mock `axios` directly since `api.ts` creates an instance of it.
import axios from 'axios';
import api, { territoriesAPI } from '../api';

jest.mock('../../config', () => ({
  config: {
    apiBaseUrl: '/api',
  },
}));

jest.mock('axios', () => {
  const mAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mAxiosInstance),
    },
  };
});

describe('territoriesAPI', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call api.post with the correct endpoint and data', async () => {
      const mockData = { name: 'Test Territory', description: 'Desc', geoJson: {} };
      const mockResponse = { data: { id: '1', ...mockData } };
      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const response = await territoriesAPI.create(mockData);

      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith('/territories', mockData);
      expect(response).toEqual(mockResponse);
    });
  });

  describe('getAll', () => {
    it('should call api.get with the correct endpoint', async () => {
      const mockResponse = { data: [{ id: '1', name: 'Test Territory' }] };
      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const response = await territoriesAPI.getAll();

      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith('/territories');
      expect(response).toEqual(mockResponse);
    });
  });

  describe('delete', () => {
    it('should call api.delete with the correct endpoint', async () => {
      const territoryId = '123';
      const mockResponse = { data: { success: true } };
      (api.delete as jest.Mock).mockResolvedValue(mockResponse);

      const response = await territoriesAPI.delete(territoryId);

      expect(api.delete).toHaveBeenCalledTimes(1);
      expect(api.delete).toHaveBeenCalledWith(`/territories/${territoryId}`);
      expect(response).toEqual(mockResponse);
    });
  });

  describe('assign', () => {
    it('should call api.post with the correct endpoint and data', async () => {
      const territoryId = '123';
      const userId = '456';
      const mockResponse = { data: { success: true } };
      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const response = await territoriesAPI.assign(territoryId, userId);

      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith(`/territories/${territoryId}/assign`, { userId });
      expect(response).toEqual(mockResponse);
    });
  });

  describe('getAvailableReps', () => {
    it('should call api.get with the correct endpoint', async () => {
      const mockResponse = { data: [{ id: '456', name: 'Rep 1' }] };
      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const response = await territoriesAPI.getAvailableReps();

      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith('/territories/available-reps');
      expect(response).toEqual(mockResponse);
    });
  });

  describe('getMyTerritories', () => {
    it('should call api.get with the correct endpoint', async () => {
      const mockResponse = { data: [{ id: '1', name: 'My Territory' }] };
      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const response = await territoriesAPI.getMyTerritories();

      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith('/territories/my-territories');
      expect(response).toEqual(mockResponse);
    });
  });

  describe('getUserTerritories', () => {
    it('should call api.get with the correct endpoint', async () => {
      const userId = 'user-123';
      const mockResponse = { data: [{ id: '1', name: 'User Territory' }] };
      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const response = await territoriesAPI.getUserTerritories(userId);

      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith(`/territories/user/${userId}`);
      expect(response).toEqual(mockResponse);
    });
  });
});
