import { jest } from '@jest/globals';

// Define mocks first
const mockPost = jest.fn();
const mockGet = jest.fn();
const mockCreate = jest.fn(() => ({
  post: mockPost,
  get: mockGet,
  defaults: { headers: { common: {} } },
  interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
}));

// Mock axios module
jest.unstable_mockModule('axios', () => ({
  default: {
    create: mockCreate,
  },
}));

describe('aximService', () => {
  let syncLeadToCore: any;
  let getOrganizationFromCore: any;

  const originalEnv = process.env;

  beforeAll(async () => {
    process.env = {
      ...originalEnv,
      AXIM_CORE_API_URL: 'http://test-api.axim.com',
      AXIM_CORE_API_KEY: 'test-api-key',
    };

    // Dynamic import to use the mock
    const module = await import('../aximService.js');
    syncLeadToCore = module.syncLeadToCore;
    getOrganizationFromCore = module.getOrganizationFromCore;
  });

  afterAll(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    mockPost.mockClear();
    mockGet.mockClear();
    // Do not clear mockCreate as it is called only once during module load
  });

  describe('syncLeadToCore', () => {
    const mockLeadData = {
      id: 'lead-123',
      firstName: 'John',
      lastName: 'Doe',
      streetAddress: '123 Main St',
      city: 'Test City',
      state: 'TS',
      zip: '12345',
      phone: '555-1234',
      email: 'john@example.com',
      status: 'New',
      notes: 'Test notes',
      location: {
        type: 'Point',
        coordinates: [-123.45, 45.67],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully sync a lead to AXiM Core', async () => {
      const mockResponse = { data: { success: true, id: 'core-lead-123' } };
      mockPost.mockResolvedValue(mockResponse);

      const result = await syncLeadToCore(mockLeadData);

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        baseURL: 'http://test-api.axim.com',
        headers: expect.objectContaining({
          'x-api-key': 'test-api-key',
        }),
      }));

      expect(mockPost).toHaveBeenCalledWith('/leads/sync', mockLeadData);
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw an error when sync fails', async () => {
      const mockError = new Error('Network Error');
      mockPost.mockRejectedValue(mockError);

      await expect(syncLeadToCore(mockLeadData)).rejects.toThrow('Network Error');
      expect(mockPost).toHaveBeenCalledWith('/leads/sync', mockLeadData);
    });
  });

  describe('dispatchLeadConversion', () => {
    let dispatchLeadConversion;
    beforeAll(async () => {
      const module = await import('../aximService.js');
      dispatchLeadConversion = module.dispatchLeadConversion;
    });

    it('should map to Deskera schema and dispatch encrypted webhook', async () => {
      const mockLead = {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        streetAddress: '123 Main St',
        location: { type: 'Point', coordinates: [-111.891, 40.760] }
      };

      const mockInteraction = {
        outcome: 'Interested',
        notes: 'Needs follow up'
      };

      const mockResponse = { data: { success: true } };
      mockPost.mockResolvedValue(mockResponse);

      await dispatchLeadConversion(mockLead, mockInteraction);

      expect(mockPost).toHaveBeenCalledWith('/webhook/universal-dispatcher', expect.any(Object));
      const callArg = mockPost.mock.calls[0][1];
      expect(callArg.encryptedData).toBeDefined();
      expect(callArg.iv).toBeDefined();
      expect(callArg.authTag).toBeDefined();
    });
  });

  describe('getOrganizationFromCore', () => {
    const mockOrgId = 'org-123';

    it('should successfully fetch an organization from AXiM Core', async () => {
      const mockResponse = { data: { id: 'org-123', name: 'Test Org' } };
      mockGet.mockResolvedValue(mockResponse);

      const result = await getOrganizationFromCore(mockOrgId);

      expect(mockGet).toHaveBeenCalledWith(`/organizations/${mockOrgId}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw an error when fetch fails', async () => {
      const mockError = new Error('Not Found');
      mockGet.mockRejectedValue(mockError);

      await expect(getOrganizationFromCore(mockOrgId)).rejects.toThrow('Not Found');
      expect(mockGet).toHaveBeenCalledWith(`/organizations/${mockOrgId}`);
    });
  });
});
