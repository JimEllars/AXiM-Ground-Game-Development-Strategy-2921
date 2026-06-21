import MapErrorBoundary from '@/components/MapErrorBoundary';

import React from 'react';
import Map, { Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Territory, Lead } from '@/types';
import { parseLeadLocation } from '@/common/locationUtils';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface RepTerritoryMapProps {
  boundary: Territory['boundary'];
  leads: Lead[];
}

const RepTerritoryMap: React.FC<RepTerritoryMapProps> = ({ boundary, leads }) => {
  if (!boundary) {
    return <div>No boundary data available.</div>;
  }

  const initialViewState = {
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 3.5,
  };

  const territoryLayer = {
    id: 'territory-boundary',
    type: 'fill' as const,
    source: 'territory',
    layout: {},
    paint: {
      'fill-color': '#088',
      'fill-opacity': 0.2,
    },
  };

  const leadsLayer = {
    id: 'leads-points',
    type: 'circle' as const,
    source: 'leads',
    paint: {
        'circle-radius': 6,
        'circle-color': [
          'match',
          ['get', 'status'],
          'New', '#1E3A8A', // AXiM Primary
          'Uncontacted', '#1E3A8A', // AXiM Primary
          'Contacted', '#F59E0B', // Accent Warning
          'Follow-up', '#F59E0B', // Accent Warning
          'Sold', '#10B981', // Accent Success
          'Completed', '#10B981', // Accent Success
          'Not Interested', '#EF4444', // Accent Danger
          'Not Home', '#EF4444', // Accent Danger
          '#1E3A8A' // Default
        ]
    }
  };

  const leadsData = {
    type: 'FeatureCollection' as const,
    features: leads.reduce((acc: any[], lead) => {
      const parsedLocation = parseLeadLocation(lead.location);
      if (parsedLocation) {
        acc.push({
          type: 'Feature' as const,
          geometry: {
            type: 'Point',
            coordinates: [parsedLocation.longitude, parsedLocation.latitude],
          },
          properties: {
            id: lead.id,
            status: lead.status,
          },
        });
      }
      return acc;
    }, []),
  };

  return (
    <MapErrorBoundary fallbackLeads={leads}>
    <Map
      initialViewState={initialViewState}
      style={{ width: '100%', height: 400 }}
      mapStyle="mapbox://styles/mapbox/streets-v9"
      mapboxAccessToken={MAPBOX_TOKEN}
    >
      <Source id="territory" type="geojson" data={boundary}>
        <Layer {...territoryLayer} />
      </Source>
      <Source id="leads" type="geojson" data={leadsData}>
        <Layer {...(leadsLayer as any)} />
      </Source>
    </Map>
  </MapErrorBoundary>
  );
};

export default RepTerritoryMap;
