import axios from 'axios';

// Using a generic geocoding service - can be easily swapped
const GEOCODING_API_KEY = process.env.GEOCODING_API_KEY || '';
const GEOCODING_BASE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

export interface GeocodeResult {
  longitude: number;
  latitude: number;
  formatted_address: string;
}

export const geocodeAddress = async (address: string): Promise<GeocodeResult | null> => {
  try {
    if (!GEOCODING_API_KEY) {
      console.warn('No geocoding API key provided, using mock coordinates');
      // Return mock coordinates for development
      return {
        longitude: -122.4194 + (Math.random() - 0.5) * 0.1,
        latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
        formatted_address: address
      };
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `${GEOCODING_BASE_URL}/${encodedAddress}.json?access_token=${GEOCODING_API_KEY}&limit=1`;

    const response = await axios.get(url);
    
    if (response.data.features && response.data.features.length > 0) {
      const feature = response.data.features[0];
      const [longitude, latitude] = feature.center;
      
      return {
        longitude,
        latitude,
        formatted_address: feature.place_name
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

export const batchGeocode = async (addresses: string[]): Promise<(GeocodeResult | null)[]> => {
  const results: (GeocodeResult | null)[] = [];
  
  // Process in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    const batchPromises = batch.map(address => geocodeAddress(address));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + batchSize < addresses.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
};