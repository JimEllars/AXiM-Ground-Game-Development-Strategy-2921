
import React from 'react';
import Map, { Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Territory } from '@/types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// TODO: Improve the Territory type to be more specific than 'any' for boundary.
interface RepTerritoryMapProps {
  boundary: Territory['boundary'];
  leads: any[]; // TODO: Define a Lead type
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
    features: leads.map(lead => ({
        type: 'Feature' as const,
        geometry: lead.location,
        properties: {
            id: lead.id,
            status: lead.status,
        }
    }))
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
