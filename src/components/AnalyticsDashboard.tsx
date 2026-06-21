import { useState } from 'react';
import { useQuery } from 'react-query';
    import {
      Box,
      Typography,
      Grid,
      Select,
      MenuItem,
      FormControl,
      InputLabel,
      Button,
      Alert,
      Tabs,
      Tab,
      Table,
      TableBody,
      TableCell,
      TableContainer,
      TableHead,
      TableRow,
      Paper,
    } from '@mui/material';
import SkeletonLoader from '@/components/SkeletonLoader';
    import { FiTrendingUp, FiUsers, FiTarget, FiActivity, FiDownload, FiWifi, FiServer } from 'react-icons/fi';
    import {
      LineChart,
      Line,
      XAxis,
      YAxis,
      CartesianGrid,
      Tooltip,
      ResponsiveContainer,
      PieChart,
      Pie,
      Cell,
    } from 'recharts';
    import SafeIcon from '@/common/SafeIcon';
    import StatCard from '@/components/StatCard';
    import { analyticsAPI } from '@/services/api';
    import { TabPanel } from './TabPanel';

    const COLORS = ['#1E3A8A', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    const initialAnalyticsState = {
      territories: [],
      leads: [],
      interactions: [],
      summary: {
        totalTerritories: 0,
        totalLeads: 0,
        totalInteractions: 0,
        completionRate: 0,
      },
      trends: [],
      outcomes: [],
      topPerformers: [],
      telemetry: {
        apiLatency: 0,
        offlineSyncHealth: 0,
      }
    };

    const AnalyticsDashboard: React.FC = () => {
      const [tabValue, setTabValue] = useState(0);
      const [dateRange, setDateRange] = useState('7days');
  const [healthData, setHealthData] = useState<any>(null);

      const fetchAnalytics = async () => {
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        switch (dateRange) {
          case '7days':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case '30days':
            startDate.setDate(startDate.getDate() - 30);
            break;
          case '90days':
            startDate.setDate(startDate.getDate() - 90);
            break;
          default:
            startDate.setDate(startDate.getDate() - 7);
        }

        const { data } = await analyticsAPI.getAnalytics({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
        return data;
      };

      const fetchHealth = async () => {
    const { data } = await analyticsAPI.getHealthMetrics();
    return data;
  };
  const { data: healthMetrics } = useQuery('healthMetrics', fetchHealth, { refetchInterval: 30000 });
  const { data: analytics = initialAnalyticsState, isLoading: loading, error: queryErrorState } = useQuery(['analytics', dateRange], fetchAnalytics, {
          keepPreviousData: true
      });
      const errorMsg = '';
      const error = (queryErrorState as any)?.response?.data?.error || errorMsg;



      const handleExportData = () => {
        const dataStr = JSON.stringify(analytics, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `analytics-${new Date().toISOString().split('T')[0]}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      };


      if (loading) {
        return (
          <SkeletonLoader type="dashboard" />
        );
      }

      return (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4">Analytics Dashboard</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Date Range</InputLabel>
                <Select value={dateRange} onChange={(e: any) => setDateRange(e.target.value)} label="Date Range">
                  <MenuItem value="7days">Last 7 Days</MenuItem>
                  <MenuItem value="30days">Last 30 Days</MenuItem>
                  <MenuItem value="90days">Last 90 Days</MenuItem>
                </Select>
              </FormControl>
              <Button variant="outlined" startIcon={<SafeIcon icon={FiDownload} />} onClick={handleExportData}>
                Export Data
              </Button>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} >
              {error}
            </Alert>
          )}

          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="API Latency"
                value={`${analytics.telemetry?.apiLatency || 0} ms`}
                icon={FiServer}
                color="#0288d1"
                subtitle="Avg Response Time"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Offline Sync Health"
                value={`${analytics.telemetry?.offlineSyncHealth || 0}%`}
                icon={FiWifi}
                color="#2e7d32"
                subtitle="Successful Syncs"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Territories"
                value={analytics.summary.totalTerritories}
                icon={FiTarget}
                color="#1E3A8A"
                subtitle="Active"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Total Leads" value={analytics.summary.totalLeads} icon={FiUsers} color="#10B981" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Interactions"
                value={analytics.summary.totalInteractions}
                icon={FiActivity}
                color="#F59E0B"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Completion Rate"
                value={`${analytics.summary.completionRate}%`}
                icon={FiTrendingUp}
                color="#8B5CF6"
              />
            </Grid>
          </Grid>

          {/* Analytics Tabs */}
          <Paper sx={{ width: '100%' }}>
            <Tabs value={tabValue} onChange={(_e, newValue) => setTabValue(newValue)}>
              <Tab label="Trends" />
              <Tab label="Outcomes" />
              <Tab label="Top Performers" />
              <Tab label="System Health" />
            </Tabs>
            <TabPanel value={tabValue} index={0}>
              <Typography variant="h6" gutterBottom>
                Interaction Trends
              </Typography>
              {analytics.trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="interactions" stroke="#1E3A8A" strokeWidth={2} />
                    <Line type="monotone" dataKey="uniqueLeads" stroke="#10B981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Typography sx={{ textAlign: 'center', py: 4 }}>No trend data available for this period.</Typography>
              )}
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" gutterBottom>
                Interaction Outcomes
              </Typography>
              {analytics.outcomes.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.outcomes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.outcomes.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography sx={{ textAlign: 'center', py: 4 }}>No outcome data available for this period.</Typography>
              )}
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>
                Top Performers
              </Typography>
              {analytics.topPerformers.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell align="right">Total Interactions</TableCell>
                        <TableCell align="right">Unique Leads</TableCell>
                        <TableCell align="right">Efficiency</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.topPerformers.map((performer: any, index: number) => (
                        <TableRow key={performer.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {index + 1}. {performer.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{performer.interactions}</TableCell>
                          <TableCell align="right">{performer.uniqueLeads}</TableCell>
                          <TableCell align="right">
                            {performer.interactions > 0
                              ? Math.round((performer.uniqueLeads / performer.interactions) * 100)
                              : 0}
                            %
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography sx={{ textAlign: 'center', py: 4 }}>No performer data available for this period.</Typography>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Typography variant="h6" gutterBottom>
                System Health & Telemetry
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">Average API Latency</Typography>
                    <Typography variant="h4" color="primary">{healthMetrics?.apiLatencyMs || 0} ms</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">Successful Egress Webhooks</Typography>
                    <Typography variant="h4" color="success.main">{healthMetrics?.successfulWebhooks || 0}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

          </Paper>
        </Box>
      );
    };

    export default AnalyticsDashboard;