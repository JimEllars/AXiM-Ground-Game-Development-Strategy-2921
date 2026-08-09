const fs = require('fs');
let geoPath = 'server/src/services/__tests__/geocoding.test.ts';
let geo = fs.readFileSync(geoPath, 'utf8');

// I will overwrite it with a fresh correctly typed mock because it seems it was corrupted during some find-replace.
const content = `import logger from '../../utils/logger.js';
import { jest } from '@jest/globals';

const mockGet = jest.fn<any>();

jest.unstable_mockModule('axios', () => ({
  default: {
    get: mockGet,
  },
}));

describe('geocoding service', () => {
  let geocodeAddress: any;
  let batchGeocode: any;

  const originalEnv = process.env;

  beforeAll(async () => {
    process.env = {
      ...originalEnv,
      GEOCODING_API_KEY: 'test-api-key',
    };
    const module = await import('../geocoding.js');
    geocodeAddress = module.geocodeAddress;
    batchGeocode = module.batchGeocode;
  });

  afterAll(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    mockGet.mockClear();
  });

  describe('geocodeAddress', () => {
    it('should return coordinates for a valid address', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          features: [
            {
              center: [-122.4194, 37.7749],
              place_name: 'San Francisco, California, United States'
            }
          ]
        }
      } as any);

      const result = await geocodeAddress('San Francisco, CA');

      expect(result).toEqual({
        longitude: -122.4194,
        latitude: 37.7749,
        formatted_address: 'San Francisco, California, United States'
      });
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should return null when no features are found', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          features: []
        }
      } as any);

      const result = await geocodeAddress('Unknown Place');

      expect(result).toBeNull();
    });

    it('should return null when an error occurs', async () => {
      const consoleErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
      mockGet.mockRejectedValueOnce(new Error('Network error') as any);

      const result = await geocodeAddress('Some Place');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('batchGeocode', () => {
    beforeEach(() => {
        mockGet.mockReset();
    });

    it('should return an empty array when given an empty array', async () => {
      const result = await batchGeocode([]);
      expect(result).toEqual([]);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should process a small array in a single batch without delay', async () => {
      mockGet.mockResolvedValue({
        data: {
          features: [
            {
              center: [10, 20],
              place_name: 'Test Place'
            }
          ]
        }
      } as any);

      const addresses = ['Address 1', 'Address 2', 'Address 3'];
      const result = await batchGeocode(addresses);
      expect(result).toHaveLength(3);
    });

    it('should handle failures in some addresses gracefully', async () => {
      mockGet.mockImplementation(async (url: string) => {
          if (url.includes('Address%201')) return { data: { features: [{ center: [1, 1], place_name: 'Place 1' }] } };
          if (url.includes('Address%202')) throw new Error("Network error");
          if (url.includes('Address%203')) return { data: { features: [{ center: [3, 3], place_name: 'Place 3' }] } };
          return { data: { features: [] } };
      });
      const consoleErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

      const addresses = ['Address 1', 'Address 2', 'Address 3'];
      const result = await batchGeocode(addresses);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ longitude: 1, latitude: 1, formatted_address: 'Place 1' });
      expect(result[1]).toBeNull();
      expect(result[2]).toEqual({ longitude: 3, latitude: 3, formatted_address: 'Place 3' });

      consoleErrorSpy.mockRestore();
    });
  });
});
`;

fs.writeFileSync(geoPath, content);
