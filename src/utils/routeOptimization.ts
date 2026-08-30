import { Lead } from '../types';

import { calculateLeadPriorityScore } from './leadScoring';

export const optimizeRouteByPriority = (leads: Lead[], startLocation: { latitude: number, longitude: number } | null = null): Lead[] => {
  const validLeads = leads.filter(l => l.location && l.location.coordinates);
  const invalidLeads = leads.filter(l => !l.location || !l.location.coordinates);

  if (validLeads.length <= 1) return leads;

  const unrouted = [...validLeads];
  const routed = [];

  let current: any;
  if (startLocation) {
     current = { location: { coordinates: [startLocation.longitude, startLocation.latitude] } };
  } else {
     // Start with the highest priority lead
     unrouted.sort((a, b) => calculateLeadPriorityScore(b) - calculateLeadPriorityScore(a));
     current = unrouted.shift()!;
     routed.push(current);
  }

  while (unrouted.length > 0) {
    let bestIdx = 0;
    let maxScore = -Infinity;

    for (let i = 0; i < unrouted.length; i++) {
      const candidate = unrouted[i];
      const dist = getDistance(
        current.location!.coordinates[1], current.location!.coordinates[0],
        candidate.location!.coordinates[1], candidate.location!.coordinates[0]
      );

      const priorityScore = calculateLeadPriorityScore(candidate);

      // Trade-off: high priority score vs low distance
      // Higher is better. We penalize distance heavily to keep routes logical.
      // E.g. score - (distance_in_km * 50)
      const candidateScore = priorityScore - (dist * 20);

      if (candidateScore > maxScore) {
        maxScore = candidateScore;
        bestIdx = i;
      }
    }

    current = unrouted.splice(bestIdx, 1)[0];
    routed.push(current);
  }

  return [...routed, ...invalidLeads] as Lead[];
};


// Simple haversine distance based nearest neighbor approximation

export const calculateTotalDistance = (route: Lead[]): number => {
  let totalDist = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const current = route[i];
    const next = route[i + 1];
    if (current.location?.coordinates && next.location?.coordinates) {
      totalDist += getDistance(
        current.location.coordinates[1], current.location.coordinates[0],
        next.location.coordinates[1], next.location.coordinates[0]
      );
    }
  }
  return totalDist * 1000; // convert km to meters
};

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
