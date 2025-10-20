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
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { FiMap, FiUsers, FiTarget, FiTrendingUp, FiMapPin, FiPlay, FiCheck } from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { repsAPI, interactionsAPI } from '../services/api';

const RepDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({});
  const [territories, setTerritories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeInteraction, setActiveInteraction] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [turfResponse, statsResponse] = await Promise.all([
        repsAPI.getMyTurf(),
        repsAPI.getStats()
      ]);
      setTerritories(turfResponse.data.territories);
      setStats(statsResponse.data);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartInteraction = async (leadId: string, outcome: string) => {
    try {
      setActiveInteraction(true);
      await interactionsAPI.create([{
        leadId,
        outcome,
        notes: '',
        interactionDate: new Date()
      }]);
      // Refresh data
      loadDashboardData();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to record interaction');
    } finally {
      setActiveInteraction(false);
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

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

        {/* Territories and Leads */}
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

        {/* Recent Leads for Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            {territories.length > 0 && territories[0].leads.length > 0 ? (
              <List dense>
                {territories[0].leads.slice(0, 5).map((lead: any) => (
                  <ListItem key={lead.id}>
                    <ListItemText
                      primary={`${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unnamed Lead'}
                      secondary={lead.streetAddress}
                    />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={() => handleStartInteraction(lead.id, 'Contacted')}
                        disabled={activeInteraction || lead.lastInteraction}
                        startIcon={<SafeIcon icon={FiCheck} />}
                      >
                        {lead.lastInteraction ? 'Done' : 'Contact'}
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">
                No leads available for interaction
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RepDashboard;