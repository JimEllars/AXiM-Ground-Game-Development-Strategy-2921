import { useState } from 'react';
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
              title="Total Users"
              value={systemStats.totalUsers || 0}
              icon={FiUsers}
              color="#1E3A8A"
              subtitle="Active accounts"
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
            <Map
              initialViewState={{
                longitude: -98.5795,
                latitude: 39.8283,
                zoom: 3.5,
              }}
              style={{ width: '100%', height: '100%' }}
              mapStyle="mapbox://styles/mapbox/streets-v11"
              mapboxAccessToken={MAPBOX_TOKEN}
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
              {allLeads.map((lead: any) => {
                const parsedLocation = parseLeadLocation(lead.location);
                return parsedLocation && (
                  <Marker
                    key={lead.id}
                    longitude={parsedLocation.longitude}
                    latitude={parsedLocation.latitude}
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      setSelectedLead(lead);
                    }}
                  />
                );
              })}
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
