import MapErrorBoundary from '@/components/MapErrorBoundary';

import React, { useState } from 'react';
import Map, { Source, Layer, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Territory, Lead } from '@/types';
import { parseLeadLocation } from '@/common/locationUtils';
import { Box, Typography, Button, TextField, Chip, Stack, Fab } from '@mui/material';
import { FiMapPin } from 'react-icons/fi';
import { repsAPI } from '@/services/api';


import { useDebounce } from '@/hooks/useDebounce';
import { db } from '@/db';
import { calculateLeadPriorityScore, getPriorityBadgeProps } from '@/utils/leadScoring';
import { useLiveQuery } from 'dexie-react-hooks';
import { syncOfflineData } from '@/syncEngine';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface RepTerritoryMapProps {
  boundary: Territory['boundary'];
  leads: Lead[];
  optimizedRoute?: (Lead & { sequenceNumber: number })[];
}

const RepTerritoryMap: React.FC<RepTerritoryMapProps> = ({ boundary, leads, optimizedRoute }) => {
  const [popupInfo, setPopupInfo] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<number[][]>([]);
  const [lastTrackedPos, setLastTrackedPos] = useState<{lat: number, lon: number, time: number} | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

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
          'New', '#64748b', // Uncontacted
          'Uncontacted', '#64748b', // Uncontacted
          'Contacted', '#10b981', // High Propensity Lead / Green
          'High Propensity Lead', '#10b981', // High Propensity Lead / Green
          'Completed', '#10b981', // Green
          'Callback', '#f59e0b', // Callback / Orange
          'Callback Scheduled', '#f59e0b', // Callback / Orange
          'Follow-up', '#f59e0b',
          'Follow Up', '#f59e0b',
          'Left Flyer', '#64748b', // Gray
          'Do Not Knock', '#ef4444', // Red
          'Not Interested', '#64748b', // Gray
          'Not Home', '#64748b', // Gray
          '#64748b' // Default
        ]
    }
  };


  const recentInteractions = useLiveQuery(() => db.interactions.toArray(), []);

  // Merge interactions into leads to dynamically update status
  const mergedLeads = React.useMemo(() => {
    if (!recentInteractions) return leads;

    // Map of leadId -> latest outcome
    const latestOutcomes = new Map();
    recentInteractions.forEach(i => {
       const existing = latestOutcomes.get(i.leadId);
       if (!existing || new Date(i.interactionDate) > new Date(existing.interactionDate)) {
           latestOutcomes.set(i.leadId, i);
       }
    });

    return leads.map(lead => {
       const interaction = latestOutcomes.get(lead.id);
       if (interaction) {
           return { ...lead, status: interaction.outcome };
       }
       return lead;
    });
  }, [leads, recentInteractions]);

  const statuses = ['All', 'Unattempted', 'Not Home', 'Follow Up', 'Qualified'];

  const filteredLeads = mergedLeads.filter(lead => {
    if (statusFilter !== 'All') {
       const mappedStatus = lead.status === 'New' || lead.status === 'Uncontacted' ? 'Unattempted'
                           : lead.status === 'Contacted' || lead.status === 'Follow-up' || lead.status === 'Follow Up' || lead.status === 'Left Flyer' ? 'Follow Up'
                           : lead.status === 'Sold' || lead.status === 'Qualified' || lead.status === 'Completed' ? 'Qualified'
                           : lead.status === 'Not Interested' || lead.status === 'Not Home' ? 'Not Home'
                           : lead.status;
       if (mappedStatus !== statusFilter) return false;
    }
    if (!debouncedSearchTerm) return true;
    const term = debouncedSearchTerm.toLowerCase();
    const name = `${lead.firstName || ''} ${lead.lastName || ''}`.toLowerCase();
    const address = `${lead.streetAddress || ''} ${lead.city || ''}`.toLowerCase();
    return name.includes(term) || address.includes(term);
  });


  const routeLineData = React.useMemo(() => {
    if (!optimizedRoute || optimizedRoute.length < 2) return null;
    const coordinates = optimizedRoute
      .filter(l => l.location && l.location.coordinates)
      .map(l => [l.location!.coordinates[0], l.location!.coordinates[1]]);

    if (coordinates.length < 2) return null;

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      },
      properties: {}
    };
  }, [optimizedRoute]);

  const leadsData = {
    type: 'FeatureCollection' as const,
    features: filteredLeads.reduce((acc: any[], lead) => {
      const parsedLocation = parseLeadLocation(lead.location);
      if (parsedLocation) {
        // Find if this lead is in the optimized route to attach sequence number
        const seqNum = optimizedRoute?.find(r => r.id === lead.id)?.sequenceNumber;

        acc.push({
          type: 'Feature' as const,
          geometry: {
            type: 'Point',
            coordinates: [parsedLocation.longitude, parsedLocation.latitude],
          },
          properties: {
            id: lead.id,
            status: lead.status,
            credit_tier: lead.credit_tier,
            property_value_est: lead.property_value_est,
            commercial_uniform_fit: lead.commercial_uniform_fit,
            name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unnamed Lead',
            priorityScore: calculateLeadPriorityScore(lead),
            sequenceNumber: seqNum
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


  const handleQuickDrop = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await api.post('/leads/quick-drop', {
             latitude: pos.coords.latitude,
             longitude: pos.coords.longitude,
             status: 'NOT_HOME'
          });
          console.log("Quick drop success", res.data);
        } catch (e) {
          console.error("Quick drop failed", e);
        }
      });
    }
  };

  return (

    <MapErrorBoundary fallbackLeads={leads}>
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="Map Quick Search"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search leads by name or address..."
          sx={{ mb: 1 }}
        />
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
          {statuses.map(status => (
            <Chip
              key={status}
              label={status}
              onClick={() => setStatusFilter(status)}
              color={statusFilter === status ? 'primary' : 'default'}
              variant={statusFilter === status ? 'filled' : 'outlined'}
              clickable
            />
          ))}
        </Stack>
      </Box>


    <Map transformRequest={(url, resourceType) => {

        if (resourceType === 'Tile' && url.includes('api.mapbox.com')) {
          const proxyUrl = import.meta.env.VITE_AXIM_PROXY_URL;
          if (proxyUrl) {
            return { url: url.replace('https://api.mapbox.com', proxyUrl) };
          }
        }
        return { url };
      }}
      initialViewState={initialViewState}
      style={{ width: '100%', height: 400 }}
      mapStyle="mapbox://styles/mapbox/streets-v9"
      mapboxAccessToken={MAPBOX_TOKEN}
      interactiveLayerIds={['leads-points', 'clusters']}
      onClick={handleMapClick}
    >


      {routeLineData && (
        <Source id="optimized-route" type="geojson" data={routeLineData as any}>
          <Layer
            id="optimized-route-line"
            type="line"
            beforeId="leads-points"
            paint={{
              'line-color': '#2563EB',
              'line-width': 3,
              'line-dasharray': [2, 2],
              'line-opacity': 0.75
            }}
            layout={{
              'line-join': 'round',
              'line-cap': 'round'
            }}
          />
        </Source>
      )}

      <Source id="breadcrumbs" type="geojson" data={{

        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: breadcrumbs
        },
        properties: {}
      } as any}>
        <Layer
          id="breadcrumbs-line"
          type="line"
          paint={{
            'line-color': 'rgba(59, 130, 246, 0.6)', // translucent blue
            'line-width': 4,
            'line-dasharray': [2, 2]
          }}
          layout={{
            'line-join': 'round',
            'line-cap': 'round'
          }}
        />
      </Source>

      <Source id="territory" type="geojson" data={boundary}>
        <Layer {...territoryLayer} />
      </Source>

      <Source id="leads" type="geojson" data={leadsData} cluster={true} clusterMaxZoom={14} clusterRadius={50}>
        <Layer {...(clusterLayer as any)} />
        <Layer {...(clusterCountLayer as any)} />
        <Layer {...(leadsLayer as any)} />
        <Layer
          id="leads-sequence-badges"
          type="symbol"
          source="leads"
          filter={['has', 'sequenceNumber']}
          layout={{
            'text-field': ['get', 'sequenceNumber'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 14,
            'text-offset': [0, -1.5],
            'text-anchor': 'top',
          }}
          paint={{
            'text-color': '#FFFFFF',
            'text-halo-color': '#000000',
            'text-halo-width': 2,
          }}
        />
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
            {(() => {
              const score = popupInfo.feature.properties.priorityScore;
              if (score !== undefined) {
                 const badge = getPriorityBadgeProps(score);
                 return <Chip label={badge.label} color={badge.color as any} size="small" sx={{ mb: 1 }} />;
              }
              return null;
            })()}
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              <strong>Status:</strong> {popupInfo.feature.properties.status}
            </Typography>
            {popupInfo.feature.properties.credit_tier && (
              <Typography variant="body2">
                <strong>Credit:</strong> {popupInfo.feature.properties.credit_tier}
              </Typography>
            )}
            {popupInfo.feature.properties.property_value_est && (
              <Typography variant="body2">
                <strong>Value:</strong> {popupInfo.feature.properties.property_value_est}
              </Typography>
            )}
            {popupInfo.feature.properties.commercial_uniform_fit && (
              <Typography variant="body2">
                <strong>Commercial Fit:</strong> {popupInfo.feature.properties.commercial_uniform_fit}
              </Typography>
            )}

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
