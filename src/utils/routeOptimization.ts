import { Lead } from '../types';

// Simple haversine distance based nearest neighbor approximation
export const optimizeRoute = (leads: Lead[], startLocation: { latitude: number, longitude: number } | null = null): Lead[] => {
  const validLeads = leads.filter(l => l.location && l.location.coordinates);
  const invalidLeads = leads.filter(l => !l.location || !l.location.coordinates);

  if (validLeads.length <= 1) return leads;

  const unrouted = [...validLeads];
  const routed: Lead[] = [];

  let current: any;
  if (startLocation) {
     current = { location: { coordinates: [startLocation.longitude, startLocation.latitude] } };
  } else {
     current = unrouted.shift()!;
     routed.push(current);
  }

  while (unrouted.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unrouted.length; i++) {
      const candidate = unrouted[i];
      const dist = getDistance(
        current.location!.coordinates[1], current.location!.coordinates[0],
        candidate.location!.coordinates[1], candidate.location!.coordinates[0]
      );

      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    current = unrouted.splice(nearestIdx, 1)[0];
    routed.push(current as Lead);
  }

  return [...routed, ...invalidLeads];
};

// Haversine formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}
