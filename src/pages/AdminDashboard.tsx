import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Alert, Grid, Card, CircularProgress, Chip } from '@mui/material';
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

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [territories, setTerritories] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [statsResponse, leadsResponse, territoriesResponse] = await Promise.all([
        analyticsAPI.getAnalytics(),
        leadsAPI.getAll(),
        territoriesAPI.getAll(),
      ]);
      setSystemStats(statsResponse.data.summary);
      setAllLeads(leadsResponse.data.leads);
      setTerritories(territoriesResponse.data);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load system stats');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
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
              color="#1976d2"
              subtitle="Active accounts"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Territories"
              value={systemStats.totalTerritories || 0}
              icon={FiTarget}
              color="#388e3c"
              subtitle="Defined areas"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Leads"
              value={systemStats.totalLeads || 0}
              icon={FiBarChart2}
              color="#f57c00"
              subtitle="All territories"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Interactions"
              value={systemStats.totalInteractions || 0}
              icon={FiTrendingUp}
              color="#7b1fa2"
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
              {territories.map((territory) => (
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
              {allLeads.map((lead) => {
                let lon = null;
                let lat = null;
                if (lead.location) {
                  if (lead.location.type === 'Point' && Array.isArray(lead.location.coordinates)) {
                    lon = lead.location.coordinates[0];
                    lat = lead.location.coordinates[1];
                  } else if (typeof (lead.location as any).x === 'number' && typeof (lead.location as any).y === 'number') {
                    lon = (lead.location as any).x;
                    lat = (lead.location as any).y;
                  }
                }
                const hasLocation = lon !== null && lat !== null && !isNaN(lon) && !isNaN(lat);

                return hasLocation && (
                  <Marker
                    key={lead.id}
                    longitude={lon as number}
                    latitude={lat as number}
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      setSelectedLead(lead);
                    }}
                  />
                );
              })}
              {(() => {
                let slon = null;
                let slat = null;
                if (selectedLead && selectedLead.location) {
                  if (selectedLead.location.type === 'Point' && Array.isArray(selectedLead.location.coordinates)) {
                    slon = selectedLead.location.coordinates[0];
                    slat = selectedLead.location.coordinates[1];
                  } else if (typeof (selectedLead.location as any).x === 'number' && typeof (selectedLead.location as any).y === 'number') {
                    slon = (selectedLead.location as any).x;
                    slat = (selectedLead.location as any).y;
                  }
                }
                const hasSLocation = slon !== null && slat !== null && !isNaN(slon) && !isNaN(slat);

                return hasSLocation && (
                  <Popup
                    longitude={slon as number}
                    latitude={slat as number}
                    onClose={() => setSelectedLead(null)}
                    anchor="top"
                  >
                  <div>
                    <Typography variant="subtitle2">
                      {selectedLead.firstName} {selectedLead.lastName}
                    </Typography>
                    <Typography variant="body2">{selectedLead.streetAddress}</Typography>
                    <Chip label={selectedLead.status} size="small" />
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
