
import React from 'react';
import Map, { Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Territory, Lead } from '@/types';

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
        'circle-color': '#B42222'
    }
  };

  const leadsData = {
    type: 'FeatureCollection' as const,
    features: leads.reduce((acc: any[], lead) => {
      // Ensure lead.location is valid and has coordinates
      if (lead.location) {
        let lon: number | null = null;
        let lat: number | null = null;
        let geometry: any = null;

        if (lead.location.type === 'Point' && Array.isArray(lead.location.coordinates)) {
          lon = lead.location.coordinates[0];
          lat = lead.location.coordinates[1];
          geometry = lead.location;
        } else if (typeof (lead.location as any).x === 'number' && typeof (lead.location as any).y === 'number') {
          lon = (lead.location as any).x;
          lat = (lead.location as any).y;
          geometry = { type: 'Point', coordinates: [lon, lat] };
        }

        if (lon !== null && lat !== null && !isNaN(lon) && !isNaN(lat)) {
          acc.push({
            type: 'Feature' as const,
            geometry: geometry,
            properties: {
                id: lead.id,
                status: lead.status,
            }
          });
        }
      }
      return acc;
    }, [])
  };

  return (
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
        <Layer {...leadsLayer} />
      </Source>
    </Map>
  );
};

export default RepTerritoryMap;
