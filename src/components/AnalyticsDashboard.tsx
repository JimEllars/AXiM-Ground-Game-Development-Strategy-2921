import React, { useState, useEffect } from 'react';
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
      CircularProgress,
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
    import { FiTrendingUp, FiUsers, FiTarget, FiActivity, FiDownload } from 'react-icons/fi';
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
    import { territoriesAPI, leadsAPI, interactionsAPI } from '@/services/api';

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

    const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2'];

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
    };

    const AnalyticsDashboard: React.FC = () => {
      const [tabValue, setTabValue] = useState(0);
      const [dateRange, setDateRange] = useState('7days');
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      const [analytics, setAnalytics] = useState<any>(initialAnalyticsState);

      useEffect(() => {
        loadAnalytics();
      }, [dateRange, tabValue]);

      const loadAnalytics = async () => {
        try {
          setLoading(true);
          setError('');

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

          const [territoriesData, leadsData, interactionsData] = await Promise.all([
            territoriesAPI.getAll(),
            leadsAPI.getAll({ limit: 1000 }),
            interactionsAPI.getAll({ startDate: startDate.toISOString(), endDate: endDate.toISOString() }),
          ]);

          // Process analytics data
          const processedData = {
            territories: territoriesData.data || [],
            leads: leadsData.data?.leads || [],
            interactions: interactionsData.data?.interactions || [],
            summary: {
              totalTerritories: territoriesData.data?.length || 0,
              totalLeads: leadsData.data?.pagination?.total || 0,
              totalInteractions: interactionsData.data?.pagination?.total || 0,
              completionRate: calculateCompletionRate(leadsData.data?.leads),
            },
            trends: processTrendsData(interactionsData.data?.interactions),
            outcomes: processOutcomesData(interactionsData.data?.interactions),
            topPerformers: processTopPerformers(interactionsData.data?.interactions),
          };

          setAnalytics(processedData);
        } catch (error: any) {
          setError(error.response?.data?.error || 'Failed to load analytics');
        } finally {
          setLoading(false);
        }
      };

      const calculateCompletionRate = (leads: any[] = []) => {
        if (!leads || leads.length === 0) return 0;
        const completedLeads = leads.reduce(
          (count: number, lead: any) => count + (lead && (lead.status === 'Completed' || lead.status === 'Sold') ? 1 : 0),
          0
        );
        return Math.round((completedLeads / leads.length) * 100);
      };

      const processTrendsData = (interactions: any[] = []) => {
        if (!interactions) return [];
        const dailyData = interactions.reduce((acc: any, interaction) => {
          if (!interaction || !interaction.interactionDate || !interaction.lead) return acc;
          const date = new Date(interaction.interactionDate).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = { date, interactions: 0, uniqueLeads: new Set() };
          }
          acc[date].interactions++;
          acc[date].uniqueLeads.add(interaction.lead.id);
          return acc;
        }, {});
        return Object.values(dailyData).map((item: any) => ({ ...item, uniqueLeads: item.uniqueLeads.size }));
      };

      const processOutcomesData = (interactions: any[] = []) => {
        if (!interactions) return [];
        const outcomes = interactions.reduce((acc: any, interaction) => {
          if (!interaction || !interaction.outcome) return acc;
          const outcome = interaction.outcome;
          acc[outcome] = (acc[outcome] || 0) + 1;
          return acc;
        }, {});
        return Object.entries(outcomes).map(([name, value]) => ({ name, value }));
      };

      const processTopPerformers = (interactions: any[] = []) => {
        if (!interactions) return [];
        const performers = interactions.reduce((acc: any, interaction) => {
          if (!interaction || !interaction.user || !interaction.lead) return acc;
          const userId = interaction.user.id;
          if (!userId) return acc;

          if (!acc[userId]) {
            acc[userId] = {
              id: userId,
              name: `${interaction.user.firstName || 'Unknown'} ${interaction.user.lastName || 'User'}`,
              interactions: 0,
              uniqueLeads: new Set(),
            };
          }
          acc[userId].interactions++;
          acc[userId].uniqueLeads.add(interaction.lead.id);
          return acc;
        }, {});
        return Object.values(performers)
          .map((performer: any) => ({ ...performer, uniqueLeads: performer.uniqueLeads.size }))
          .sort((a: any, b: any) => b.interactions - a.interactions)
          .slice(0, 10);
      };

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
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <CircularProgress />
          </Box>
        );
      }

      return (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4">Analytics Dashboard</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Date Range</InputLabel>
                <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)} label="Date Range">
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
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Territories"
                value={analytics.summary.totalTerritories}
                icon={FiTarget}
                color="#1976d2"
                subtitle="Active"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Total Leads" value={analytics.summary.totalLeads} icon={FiUsers} color="#388e3c" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Interactions"
                value={analytics.summary.totalInteractions}
                icon={FiActivity}
                color="#f57c00"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Completion Rate"
                value={`${analytics.summary.completionRate}%`}
                icon={FiTrendingUp}
                color="#7b1fa2"
              />
            </Grid>
          </Grid>

          {/* Analytics Tabs */}
          <Paper sx={{ width: '100%' }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="Trends" />
              <Tab label="Outcomes" />
              <Tab label="Top Performers" />
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
                    <Line type="monotone" dataKey="interactions" stroke="#1976d2" strokeWidth={2} />
                    <Line type="monotone" dataKey="uniqueLeads" stroke="#388e3c" strokeWidth={2} />
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
          </Paper>
        </Box>
      );
    };

    export default AnalyticsDashboard;