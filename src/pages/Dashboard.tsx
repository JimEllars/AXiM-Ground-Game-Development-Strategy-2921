import React, { useState, useEffect } from 'react';
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
    import { FiMap, FiUsers, FiTarget, FiTrendingUp, FiMapPin, FiBarChart2 } from 'react-icons/fi';
    import SafeIcon from '@/common/SafeIcon';
    import RepDashboard from './RepDashboard';
    import AdminDashboard from './AdminDashboard';
    import { authAPI, repsAPI, territoriesAPI, leadsAPI } from '@/services/api';

    const Dashboard: React.FC = () => {
      const [user, setUser] = useState<any>(null);
      const [stats, setStats] = useState<any>({});
      const [territories, setTerritories] = useState<any[]>([]);
      const [recentActivity, setRecentActivity] = useState<any[]>([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState('');

      useEffect(() => {
        loadDashboardData();
      }, []);

      const loadDashboardData = async () => {
        try {
          const [userResponse] = await Promise.all([authAPI.getProfile()]);
          const userData = userResponse.data;
          setUser(userData);

          // Load role-specific data
          if (userData.role === 'REP') {
            // Rep dashboard is handled by RepDashboard component
          } else if (userData.role === 'ADMIN') {
            // Admin will use AdminDashboard component
          } else {
            // Manager data
            const [territoriesResponse, leadsResponse] = await Promise.all([
              territoriesAPI.getAll(),
              leadsAPI.getAll({ limit: 5 }),
            ]);
            setTerritories(territoriesResponse.data);
            setRecentActivity(leadsResponse.data.leads);
          }
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
          {/* Stats Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Territories" value={territories.length} icon={FiMap} color="#1976d2" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Recent Leads"
              value={recentActivity.length}
              icon={FiUsers}
              color="#388e3c"
              subtitle="Last 5 uploaded"
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
          {user.role === 'REP' ? <RepDashboard /> : renderManagerDashboard()}
        </Box>
      );
    };

    export default Dashboard;