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
  ListItemIcon
} from '@mui/material';
import { FiMap, FiUsers, FiTarget, FiTrendingUp, FiMapPin } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { authAPI, repsAPI, territoriesAPI, leadsAPI } from '../services/api';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [territories, setTerritories] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [userResponse] = await Promise.all([
        authAPI.getProfile()
      ]);

      const userData = userResponse.data;
      setUser(userData);

      // Load role-specific data
      if (userData.role === 'REP') {
        const [turfResponse, statsResponse] = await Promise.all([
          repsAPI.getMyTurf(),
          repsAPI.getStats()
        ]);
        setTerritories(turfResponse.data.territories);
        setStats(statsResponse.data);
      } else {
        // Admin/Manager data
        const [territoriesResponse, leadsResponse] = await Promise.all([
          territoriesAPI.getAll(),
          leadsAPI.getAll({ limit: 5 })
        ]);
        setTerritories(territoriesResponse.data);
        setRecentActivity(leadsResponse.data.leads);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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
          <SafeIcon 
            icon={icon} 
            style={{ 
              fontSize: 24, 
              color: color,
              marginRight: 12 
            }} 
          />
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

  const renderRepDashboard = () => (
    <Grid container spacing={3}>
      {/* Stats Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Total Interactions"
          value={stats.totalInteractions || 0}
          icon={FiTarget}
          color="#1976d2"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Unique Contacts"
          value={stats.uniqueLeadsContacted || 0}
          icon={FiUsers}
          color="#388e3c"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Active Days"
          value={stats.activeDays || 0}
          icon={FiTrendingUp}
          color="#f57c00"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Territories"
          value={territories.length}
          icon={FiMap}
          color="#7b1fa2"
        />
      </Grid>

      {/* Territories */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            My Territories
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
                    secondary={`${territory.leads.length} leads • ${territory.leads.filter((l: any) => l.lastInteraction).length} completed`}
                  />
                  <Chip
                    label={`${Math.round((territory.leads.filter((l: any) => l.lastInteraction).length / territory.leads.length) * 100) || 0}%`}
                    color="primary"
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">
              No territories assigned yet
            </Typography>
          )}
        </Paper>
      </Grid>

      {/* Outcome Breakdown */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Outcome Breakdown
          </Typography>
          {stats.outcomeBreakdown?.length > 0 ? (
            <List dense>
              {stats.outcomeBreakdown.map((outcome: any) => (
                <ListItem key={outcome.outcome}>
                  <ListItemText
                    primary={outcome.outcome}
                    secondary={`${outcome.count} interactions`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">
              No interactions recorded yet
            </Typography>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  const renderManagerDashboard = () => (
    <Grid container spacing={3}>
      {/* Stats Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Territories"
          value={territories.length}
          icon={FiMap}
          color="#1976d2"
        />
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
                    secondary={`Created by ${territory.createdBy} • ${new Date(territory.createdAt).toLocaleDateString()}`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">
              No territories created yet
            </Typography>
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
                  <Chip
                    label={lead.status}
                    size="small"
                    color="default"
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">
              No recent leads
            </Typography>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  if (!user) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user.firstName}!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Here's your {user.role.toLowerCase()} dashboard overview
      </Typography>

      {user.role === 'REP' ? renderRepDashboard() : renderManagerDashboard()}
    </Box>
  );
};

export default Dashboard;