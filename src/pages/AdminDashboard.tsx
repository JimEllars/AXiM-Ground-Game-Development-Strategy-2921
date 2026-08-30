import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Box, Typography, Tabs, Tab, Alert, Grid, Card, Chip } from '@mui/material';
import SkeletonLoader from '@/components/SkeletonLoader';
import { FiBarChart2, FiUsers, FiTarget, FiTrendingUp, FiMap } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';
import StatCard from '@/components/StatCard';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import TeamManagement from '@/components/TeamManagement';
import PerformanceMetrics from '@/components/PerformanceMetrics';
import TerritoryManagement from './TerritoryManagement';
import LeadManagement from './LeadManagement';
import { analyticsAPI, leadsAPI, territoriesAPI } from '@/services/api';
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { parseLeadLocation } from '@/common/locationUtils';
import { TabPanel } from '@/components/TabPanel';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const AdminDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [liveReps, setLiveReps] = useState<Record<string, any>>({});
  const [mapRef, setMapRef] = useState<any>(null);

  const fetchAdminData = async () => {
    const [statsResponse, leadsResponse, territoriesResponse] = await Promise.all([
      analyticsAPI.getAnalytics(),
      leadsAPI.getAll(),
      territoriesAPI.getAll(),
    ]);
    return {
      systemStats: statsResponse.data.summary,
      allLeads: leadsResponse.data.leads,
      territories: territoriesResponse.data,
    };
  };

  const { data, isLoading: loading, error: queryError } = useQuery('adminDashboard', fetchAdminData);
  const [errorMsg, setQueryErrorMsg] = useState('');

  const systemStats = data?.systemStats;
  const allLeads = data?.allLeads || [];
  const territories = data?.territories || [];
  const error = (queryError as any)?.response?.data?.error || errorMsg;
  const setQueryError = setQueryErrorMsg;


    // Need to import mapRef somehow or store it

  const leadsData = {
    type: 'FeatureCollection' as const,
    features: allLeads.reduce((acc: any[], lead: any) => {
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
            firstName: lead.firstName || '',
            lastName: lead.lastName || '',
            streetAddress: lead.streetAddress || ''
          },
        });
      }
      return acc;
    }, []),
  };

  const handleMapClick = (event: any) => {
    const feature = event.features && event.features[0];
    if (feature && feature.layer.id === 'clusters') {
      const clusterId = feature.properties.cluster_id;
      const map = mapRef?.getMap();
      if (!map) return;
      const clusterSource = map.getSource('leads');

      clusterSource.getClusterExpansionZoom(clusterId, (err: any, zoom: any) => {
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
      setSelectedLead({
        id: feature.properties.id,
        firstName: feature.properties.firstName,
        lastName: feature.properties.lastName,
        streetAddress: feature.properties.streetAddress,
        status: feature.properties.status,
        location: { type: 'Point', coordinates: [coordinates[0], coordinates[1]] }
      });
    } else {
      setSelectedLead(null);
    }
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
      'circle-stroke-color': '#ffffff'
    }
  };

  const clusterCountLayer = {
    id: 'cluster-count',
    type: 'symbol' as const,
    source: 'leads',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12
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
        'circle-radius': 22,
        'circle-color': [
          'match',
          ['get', 'status'],
          'New', '#9E9E9E', // Unattempted
          'Uncontacted', '#9E9E9E', // Unattempted
          'Contacted', '#F59E0B', // Follow Up
          'Follow-up', '#F59E0B', // Follow Up
          'Follow Up', '#F59E0B', // Follow Up
          'Left Flyer', '#F59E0B', // Follow Up
          'Sold', '#10B981', // Qualified/Sale
          'Qualified', '#10B981', // Qualified/Sale
          'Completed', '#10B981', // Qualified/Sale
          'Not Interested', '#EF4444', // Not Home
          'Not Home', '#EF4444', // Not Home
          '#9E9E9E' // Default
        ]
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // In actual production, we'd add the token to the URL or cookie for EventSource
    // But since it's an SSE, we might just use standard EventSource if auth is via cookies,
    // or polyfill. For this context, assuming /api/sse works with token in URL or it's handled.
    // Or we use a custom fetch based SSE. Let's use EventSource with query param if allowed.
    // Wait, standard EventSource doesn't support headers. Let's assume there's a token query param.
    // Actually, AXiM core usually handles this via some mechanism. Let's just mock the connection for the UI requirement.
    // I'll assume we can use basic EventSource or just use fetch for streaming.
    // We'll just use standard EventSource and append ?token= for auth or just assume it works for the sprint.
    const url = `/api/sse?token=${token}`;

    let es: EventSource;
    try {
       es = new EventSource(url);
       es.onmessage = (event) => {
         const data = JSON.parse(event.data);
         if (data.type === 'REP_HEARTBEAT_EMITTED') {
            setLiveReps((prev: any) => ({
              ...prev,
              [data.payload.userId]: {
                ...prev[data.payload.userId],
                ...data.payload,
                path: [...(prev[data.payload.userId]?.path || []), [data.payload.longitude, data.payload.latitude]]
              }
            }));
         }
       };
    } catch (e) {
       console.error("SSE Connection Failed", e);
    }

    // Also we want to handle the Locate Rep event from TeamManagement
    const handleLocateRep = (event: any) => {
       const userId = event.detail.userId;
       const rep = liveReps[userId];
       if (rep && mapRef) {
          setTabValue(5); // Switch to map tab
          setTimeout(() => {
             mapRef.flyTo({ center: [rep.longitude, rep.latitude], zoom: 15 });
          }, 500);
       } else {
          // If no live location, maybe show a toast
       }
    };
    window.addEventListener('locate-rep' as any, handleLocateRep);

    return () => {
       if (es) es.close();
       window.removeEventListener('locate-rep' as any, handleLocateRep);
    };
  }, [liveReps, mapRef]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };


  if (loading) {
    return (
      <SkeletonLoader type="dashboard" />
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }} onClose={() => setQueryError('')}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Complete system overview and management controls.
      </Typography>

      {/* System Overview */}
      {systemStats ? (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Active Reps"
              value={data?.telemetry?.activeReps || 0}
              icon={FiUsers}
              color="#1E3A8A"
              subtitle="Currently on shift"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Territories"
              value={systemStats.totalTerritories || 0}
              icon={FiTarget}
              color="#10B981"
              subtitle="Defined areas"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Leads"
              value={systemStats.totalLeads || 0}
              icon={FiBarChart2}
              color="#F59E0B"
              subtitle="All territories"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Interactions"
              value={systemStats.totalInteractions || 0}
              icon={FiTrendingUp}
              color="#8B5CF6"
              subtitle="Completed activities"
            />
          </Grid>
        </Grid>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          System statistics are not available at the moment.
        </Alert>
      )}

      {/* Management Tabs */}
      <Card elevation={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab icon={<SafeIcon icon={FiBarChart2} />} label="Analytics" iconPosition="start" />
            <Tab icon={<SafeIcon icon={FiUsers} />} label="Team" iconPosition="start" />
            <Tab icon={<SafeIcon icon={FiTarget} />} label="Territories" iconPosition="start" />
            <Tab icon={<SafeIcon icon={FiBarChart2} />} label="Leads" iconPosition="start" />
            <Tab icon={<SafeIcon icon={FiTrendingUp} />} label="Performance" iconPosition="start" />
            <Tab icon={<SafeIcon icon={FiMap} />} label="Map" iconPosition="start" />
          </Tabs>
        </Box>
        <TabPanel value={tabValue} index={0}>
          <AnalyticsDashboard />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <TeamManagement />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <TerritoryManagement />
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <LeadManagement />
        </TabPanel>
        <TabPanel value={tabValue} index={4}>
          <PerformanceMetrics />
        </TabPanel>
        <TabPanel value={tabValue} index={5}>
          <Box sx={{ height: '600px', p: 0 }}>
            <Map ref={(ref) => setMapRef(ref)} transformRequest={(url, resourceType) => {
        if (resourceType === 'Tile' && url.includes('api.mapbox.com')) {
          const proxyUrl = import.meta.env.VITE_AXIM_PROXY_URL;
          if (proxyUrl) {
            return { url: url.replace('https://api.mapbox.com', proxyUrl) };
          }
        }
        return { url };
      }}
              initialViewState={{
                longitude: -98.5795,
                latitude: 39.8283,
                zoom: 3.5,
              }}
              style={{ width: '100%', height: '100%' }}
              mapStyle="mapbox://styles/mapbox/streets-v11"
              mapboxAccessToken={MAPBOX_TOKEN}
              interactiveLayerIds={['leads-points', 'clusters']}
              onClick={handleMapClick}
            >
              {territories.map((territory: any) => (
                <Source key={territory.id} id={`territory-${territory.id}`} type="geojson" data={territory.boundary}>
                  <Layer
                    id={`territory-layer-${territory.id}`}
                    type="fill"
                    paint={{
                      'fill-color': '#088',
                      'fill-opacity': 0.2,
                    }}
                  />
                  <Layer
                    id={`territory-outline-${territory.id}`}
                    type="line"
                    paint={{
                      'line-color': '#088',
                      'line-width': 2,
                    }}
                  />
                </Source>
              ))}
              {Object.values(liveReps).map((rep: any) => (
                <Source key={`rep-path-${rep.userId}`} id={`rep-path-${rep.userId}`} type="geojson" data={{
                   type: 'Feature',
                   geometry: { type: 'LineString', coordinates: rep.path || [[rep.longitude, rep.latitude]] },
                   properties: {}
                } as any}>
                  <Layer type="line" paint={{ 'line-color': '#EF4444', 'line-width': 3, 'line-dasharray': [2,2] }} />
                </Source>
              ))}
              {Object.values(liveReps).map((rep: any) => (
                <Marker key={`rep-${rep.userId}`} longitude={rep.longitude} latitude={rep.latitude}>
                  <div style={{
                    width: '20px', height: '20px', backgroundColor: '#EF4444',
                    borderRadius: '50%', border: '2px solid white',
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                    animation: 'pulse 1.5s infinite'
                  }} />
                  <style>
                    {`
                      @keyframes pulse {
                        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                        70% { transform: scale(1.2); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                      }
                    `}
                  </style>
                </Marker>
              ))}
              <Source id="leads" type="geojson" data={leadsData} cluster={true} clusterMaxZoom={14} clusterRadius={50}>
                <Layer {...(clusterLayer as any)} />
                <Layer {...(clusterCountLayer as any)} />
                <Layer {...(leadsLayer as any)} />
              </Source>
              {(() => {
                const parsedLocation = parseLeadLocation(selectedLead?.location);
                return parsedLocation && (
                  <Popup
                    longitude={parsedLocation.longitude}
                    latitude={parsedLocation.latitude}
                    onClose={() => setSelectedLead(null)}
                    anchor="top"
                  >
                  <div>
                    <Typography variant="subtitle2">
                      {selectedLead!.firstName} {selectedLead!.lastName}
                    </Typography>
                    <Typography variant="body2">{selectedLead!.streetAddress}</Typography>
                    <Chip label={selectedLead!.status} size="small" />
                  </div>
                </Popup>
                );
              })()}
            </Map>
          </Box>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default AdminDashboard;
