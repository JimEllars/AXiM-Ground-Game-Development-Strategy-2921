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
    } else if (typeof loc?.x === 'number' && typeof loc?.y === 'number') {
      longitude = Number(loc.x);
      latitude = Number(loc.y);
    } else if (Array.isArray(loc?.coordinates) && loc.coordinates.length >= 2) {
      longitude = Number(loc.coordinates[0]);
      latitude = Number(loc.coordinates[1]);
    } else if (typeof loc?.longitude === 'number' && typeof loc?.latitude === 'number') {
      longitude = loc.longitude;
      latitude = loc.latitude;
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
