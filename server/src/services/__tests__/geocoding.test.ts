import { jest } from '@jest/globals';

const mockGet = jest.fn();

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
    // Set API key to test the actual API call path
    process.env = {
      ...originalEnv,
      GEOCODING_API_KEY: 'test-api-key',
    };

    // Use dynamic import after mock is setup
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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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
      });

      const result = await geocodeAddress('San Francisco, CA');

      expect(result).toEqual({
        longitude: -122.4194,
        latitude: 37.7749,
        formatted_address: 'San Francisco, California, United States'
      });
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith(
        'https://api.mapbox.com/geocoding/v5/mapbox.places/San%20Francisco%2C%20CA.json?access_token=test-api-key&limit=1'
      );
    });

    it('should return null when no features are found', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          features: []
        }
      });

      const result = await geocodeAddress('Unknown Place');

      expect(result).toBeNull();
    });

    it('should return null when an error occurs', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      const result = await geocodeAddress('Some Place');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

  });

  describe('batchGeocode', () => {
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
      });

      const addresses = ['Address 1', 'Address 2', 'Address 3'];

      // Execute the promise but don't await it yet so we can advance timers if needed
      // Actually, since it's a single batch, it shouldn't have a timeout
      const resultPromise = batchGeocode(addresses);

      // Just in case, try to advance timers (though it shouldn't be waiting)
      jest.runAllTimers();

      const result = await resultPromise;

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        { longitude: 10, latitude: 20, formatted_address: 'Test Place' },
        { longitude: 10, latitude: 20, formatted_address: 'Test Place' },
        { longitude: 10, latitude: 20, formatted_address: 'Test Place' }
      ]);
      expect(mockGet).toHaveBeenCalledTimes(3);
    });

    it('should chunk larger arrays and apply staggered delays between batches', async () => {
      mockGet.mockResolvedValue({
        data: {
          features: [
            {
              center: [10, 20],
              place_name: 'Test Place'
            }
          ]
        }
      });

      // 12 addresses -> 3 batches (5, 5, 2)
      const addresses = Array.from({ length: 12 }, (_, i) => `Address ${i + 1}`);

      const resultPromise = batchGeocode(addresses);

      // Batch 0 starts immediately, batch 1 waits 100ms, batch 2 waits 200ms
      // Wait for promises in the first batch to be created/resolved
      await Promise.resolve();

      // Advance by 100ms for batch 1
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // Advance by 100ms for batch 2 (total 200ms)
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      const result = await resultPromise;

      expect(result).toHaveLength(12);
      expect(mockGet).toHaveBeenCalledTimes(12);
    });

    it('should handle failures in some addresses gracefully', async () => {
      // Mock get to fail on the second call
      mockGet
        .mockResolvedValueOnce({
          data: { features: [{ center: [1, 1], place_name: 'Place 1' }] }
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { features: [{ center: [3, 3], place_name: 'Place 3' }] }
        });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const addresses = ['Address 1', 'Address 2', 'Address 3'];
      const result = await batchGeocode(addresses);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ longitude: 1, latitude: 1, formatted_address: 'Place 1' });
      expect(result[1]).toBeNull();
      expect(result[2]).toEqual({ longitude: 3, latitude: 3, formatted_address: 'Place 3' });

      expect(mockGet).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
