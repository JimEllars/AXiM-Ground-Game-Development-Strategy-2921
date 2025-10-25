import React, { useState, useEffect } from 'react';
    import { Box, Typography, Tabs, Tab, Alert, Grid, Card, CardContent, Button, CircularProgress } from '@mui/material';
    import { FiBarChart2, FiUsers, FiTarget, FiTrendingUp, FiSettings } from 'react-icons/fi';
    import SafeIcon from '@/common/SafeIcon';
    import AnalyticsDashboard from '@/components/AnalyticsDashboard';
    import TeamManagement from '@/components/TeamManagement';
    import PerformanceMetrics from '@/components/PerformanceMetrics';
    import TerritoryManagement from './TerritoryManagement';
    import LeadManagement from './LeadManagement';
    import { analyticsAPI } from '@/services/api';

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

      useEffect(() => {
        loadSystemStats();
      }, []);

      const loadSystemStats = async () => {
        try {
          const response = await analyticsAPI.getAnalytics();
          setSystemStats(response.data.summary);
        } catch (error: any) {
          setError(error.response?.data?.error || 'Failed to load system stats');
        } finally {
          setLoading(false);
        }
      };

      const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
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
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Users"
                value={systemStats?.totalUsers || 0}
                icon={FiUsers}
                color="#1976d2"
                subtitle="Active accounts"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Territories"
                value={systemStats?.totalTerritories || 0}
                icon={FiTarget}
                color="#388e3c"
                subtitle="Defined areas"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Leads"
                value={systemStats?.totalLeads || 0}
                icon={FiBarChart2}
                color="#f57c00"
                subtitle="In database"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Interactions"
                value={systemStats?.totalInteractions || 0}
                icon={FiTrendingUp}
                color="#7b1fa2"
                subtitle="Completed activities"
              />
            </Grid>
          </Grid>

          {/* Management Tabs */}
          <Card elevation={2}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab icon={<SafeIcon icon={FiBarChart2} />} label="Analytics" iconPosition="start" />
                <Tab icon={<SafeIcon icon={FiUsers} />} label="Team" iconPosition="start" />
                <Tab icon={<SafeIcon icon={FiTarget} />} label="Territories" iconPosition="start" />
                <Tab icon={<SafeIcon icon={FiBarChart2} />} label="Leads" iconPosition="start" />
                <Tab icon={<SafeIcon icon={FiTrendingUp} />} label="Performance" iconPosition="start" />
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
          </Card>
        </Box>
      );
    };

    export default AdminDashboard;