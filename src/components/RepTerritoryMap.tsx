import MapErrorBoundary from '@/components/MapErrorBoundary';

import React, { useState } from 'react';
import Map, { Source, Layer, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Territory, Lead } from '@/types';
import { parseLeadLocation } from '@/common/locationUtils';
import { Box, Typography, Button } from '@mui/material';
import { db } from '@/db';
import { syncOfflineData } from '@/syncEngine';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface RepTerritoryMapProps {
  boundary: Territory['boundary'];
  leads: Lead[];
}

const RepTerritoryMap: React.FC<RepTerritoryMapProps> = ({ boundary, leads }) => {
  const [popupInfo, setPopupInfo] = useState<any>(null);

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

  const clusterLayer = {
    id: 'clusters',
    type: 'circle' as const,
    source: 'leads',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        '#1976d2', // MUI Primary Main
        50,
        '#9c27b0', // MUI Secondary Main
        200,
        '#d32f2f'  // MUI Error Main
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        20,
        50,
        30,
        200,
        40
      ],
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff' // explicit counter rings
    }
  };

  const clusterCountLayer = {
    id: 'cluster-count',
    type: 'symbol' as const,
    source: 'leads',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['Roboto Regular', 'Arial Unicode MS Bold'], // Standard MUI typography font
      'text-size': 14,
    },
    paint: {
      'text-color': '#ffffff'
    }
  };

  const leadsLayer = {
    id: 'leads-points',
    type: 'circle' as const,
    source: 'leads',
    filter: ['!', ['has', 'point_count']],
    paint: {
        'circle-radius': 22, // 44x44 pixels touch target => radius 22
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
            name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unnamed Lead',
          },
        });
      }
      return acc;
    }, []),
  };

  const handleMapClick = (event: any) => {
    const feature = event.features && event.features[0];
    if (feature && feature.layer.id === 'clusters') {
      const map = event.target;
      const clusterId = feature.properties.cluster_id;
      const clusterSource = map.getSource('leads');

      clusterSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        map.easeTo({
          center: feature.geometry.coordinates,
          zoom: zoom,
          duration: 500
        });
      });
      return;
    }

    if (feature && feature.layer.id === 'leads-points') {
      const coordinates = feature.geometry.coordinates.slice();
      setPopupInfo({
        lngLat: [coordinates[0], coordinates[1]],
        feature: feature.properties
      });
    } else {
      setPopupInfo(null);
    }
  };

  const handleQuickDisposition = async (outcome: string) => {
    if (!popupInfo) return;

    const interactionData = {
      leadId: popupInfo.feature.id,
      outcome: outcome,
      notes: 'Quick Disposition',
      interactionDate: new Date(),
      synced: 0 as any, // 0 for false
    };

    try {
      await db.interactions.add(interactionData);
      setPopupInfo(null);

      // Trigger sync
      if (navigator.onLine) {
        syncOfflineData();
      }
    } catch (err) {
      console.error('Error saving quick disposition', err);
    }
  };

  return (
    <MapErrorBoundary fallbackLeads={leads}>
    <Map
      initialViewState={initialViewState}
      style={{ width: '100%', height: 400 }}
      mapStyle="mapbox://styles/mapbox/streets-v9"
      mapboxAccessToken={MAPBOX_TOKEN}
      interactiveLayerIds={['leads-points', 'clusters']}
      onClick={handleMapClick}
    >
      <Source id="territory" type="geojson" data={boundary}>
        <Layer {...territoryLayer} />
      </Source>
      <Source id="leads" type="geojson" data={leadsData} cluster={true} clusterMaxZoom={14} clusterRadius={50}>
        <Layer {...(clusterLayer as any)} />
        <Layer {...(clusterCountLayer as any)} />
        <Layer {...(leadsLayer as any)} />
      </Source>

      {popupInfo && (
        <Popup
          longitude={popupInfo.lngLat[0]}
          latitude={popupInfo.lngLat[1]}
          anchor="bottom"
          onClose={() => setPopupInfo(null)}
          closeOnClick={false}
        >
          <Box sx={{ p: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              {popupInfo.feature.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={() => handleQuickDisposition('Not Home')}
                sx={{ minWidth: '44px', minHeight: '44px' }}
              >
                Not Home
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="primary"
                onClick={() => handleQuickDisposition('Left Flyer')}
                sx={{ minWidth: '44px', minHeight: '44px' }}
              >
                Left Flyer
              </Button>
            </Box>
          </Box>
        </Popup>
      )}
    </Map>
  </MapErrorBoundary>
  );
};

export default RepTerritoryMap;
