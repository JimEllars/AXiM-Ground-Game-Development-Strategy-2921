/**
 * Utility to parse lead location from various formats (GeoJSON, legacy {x, y}, or stringified JSON).
 * Returns an object with longitude and latitude, or null if parsing fails.
 */
export const parseLeadLocation = (location: any): { longitude: number; latitude: number } | null => {
  if (!location) return null;

  try {
    const loc = typeof location === 'string' ? JSON.parse(location) : location;

    let longitude: number | null = null;
    let latitude: number | null = null;

    if (loc?.type === 'Point' && Array.isArray(loc?.coordinates)) {
      longitude = Number(loc.coordinates[0]);
      latitude = Number(loc.coordinates[1]);
    } else if (loc?.x !== undefined && loc?.x !== null && loc?.y !== undefined && loc?.y !== null) {
      longitude = Number(loc.x);
      latitude = Number(loc.y);
    } else if (Array.isArray(loc?.coordinates) && loc.coordinates.length >= 2) {
      longitude = Number(loc.coordinates[0]);
      latitude = Number(loc.coordinates[1]);
    } else if (loc?.longitude !== undefined && loc?.longitude !== null && loc?.latitude !== undefined && loc?.latitude !== null) {
      longitude = Number(loc.longitude);
      latitude = Number(loc.latitude);
    }

    if (
      longitude !== null &&
      latitude !== null &&
      !isNaN(longitude) &&
      !isNaN(latitude)
    ) {
      return { longitude, latitude };
    }
  } catch (err) {
    // ignore parsing errors
  }

  return null;
};

// Haversine formula to calculate distance between two coordinates in meters
export const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};
