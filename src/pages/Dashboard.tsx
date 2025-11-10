import React, { useState, useEffect } from 'react';
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
    import {
      Grid,
      Paper,
      Typography,
      Box,
      Card,
      CardContent,
      Chip,
      List,
      ListItem,
      ListItemText,
      ListItemIcon,
      Alert,
      CircularProgress,
    } from '@mui/material';
import { FiMap, FiUsers, FiMapPin } from 'react-icons/fi';
    import SafeIcon from '@/common/SafeIcon';
    import RepDashboard from './RepDashboard';
    import AdminDashboard from './AdminDashboard';
import { authAPI, territoriesAPI, leadsAPI } from '@/services/api';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

    const Dashboard: React.FC = () => {
      const [user, setUser] = useState<any>(null);
      const [territories, setTerritories] = useState<any[]>([]);
      const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [allLeads, setAllLeads] = useState<any[]>([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState('');
      const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

      useEffect(() => {
        loadDashboardData();
      }, []);

      const loadDashboardData = async () => {
        setLoading(true);
        try {
      const userResponse = await authAPI.getProfile();
          const userData = userResponse.data;
          setUser(userData);

      if (userData.role === 'MANAGER' || userData.role === 'ADMIN') {
            const [territoriesResponse, leadsResponse] = await Promise.all([
              territoriesAPI.getAll(),
          leadsAPI.getAll(),
            ]);
            setTerritories(territoriesResponse.data);
        setAllLeads(leadsResponse.data.leads);
        setRecentActivity(leadsResponse.data.leads.slice(0, 5));
          }
          setLastUpdated(new Date());
        } catch (error: any) {
          setError(error.response?.data?.error || 'Failed to load dashboard data');
        } finally {
          setLoading(false);
        }
      };

      const StatCard: React.FC<{
        title: string;
        value: string | number;
        icon: any;
        color: string;
        subtitle?: string;
      }> = ({ title, value, icon, color, subtitle }) => (
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SafeIcon icon={icon} style={{ fontSize: 24, color: color, marginRight: 12 }} />
              <Typography variant="h6" color="text.secondary">
                {title}
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight="bold" color={color}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </CardContent>
        </Card>
      );

      const renderManagerDashboard = () => (
        <Grid container spacing={3}>
      {/* Map */}
      <Grid item xs={12}>
        <Paper sx={{ height: '500px', p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Live Operations Map
          </Typography>
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
            {allLeads.map((lead) => (
              lead.location && (
                <Marker
                  key={lead.id}
                  longitude={lead.location.coordinates[0]}
                  latitude={lead.location.coordinates[1]}
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedLead(lead);
                  }}
                />
              )
            ))}
            {selectedLead && (
              <Popup
                longitude={selectedLead.location.coordinates[0]}
                latitude={selectedLead.location.coordinates[1]}
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
            )}
          </Map>
        </Paper>
      </Grid>

          {/* Stats Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Territories" value={territories.length} icon={FiMap} color="#1976d2" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
          title="Total Leads"
          value={allLeads.length}
              icon={FiUsers}
              color="#388e3c"
            />
          </Grid>

          {/* Territories List */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Territories Overview
              </Typography>
              {territories.length > 0 ? (
                <List>
                  {territories.map((territory) => (
                    <ListItem key={territory.id} divider>
                      <ListItemIcon>
                        <SafeIcon icon={FiMapPin} />
                      </ListItemIcon>
                      <ListItemText
                        primary={territory.name}
                        secondary={`Created by ${territory.createdBy} • ${new Date(
                          territory.createdAt
                        ).toLocaleDateString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">No territories created yet</Typography>
              )}
            </Paper>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Leads
              </Typography>
              {recentActivity.length > 0 ? (
                <List dense>
                  {recentActivity.map((lead) => (
                    <ListItem key={lead.id}>
                      <ListItemText
                        primary={`${lead.firstName} ${lead.lastName}`.trim() || 'Unnamed Lead'}
                        secondary={lead.streetAddress}
                      />
                      <Chip label={lead.status} size="small" color="default" />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">No recent leads</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      );

      if (loading) {
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <CircularProgress />
          </Box>
        );
      }

      if (!user) {
        return <Typography>Loading...</Typography>;
      }

      // Admin gets the full admin dashboard
      if (user.role === 'ADMIN') {
        return <AdminDashboard />;
      }

      return (
        <Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <Typography variant="h4" gutterBottom>
            Welcome back, {user.firstName}!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Here's your {user.role.toLowerCase()} dashboard overview
          </Typography>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          {user.role === 'REP' ? <RepDashboard /> : renderManagerDashboard()}
        </Box>
      );
    };

    export default Dashboard;