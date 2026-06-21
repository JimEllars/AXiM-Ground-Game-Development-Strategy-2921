import { useState } from 'react';
import { useQuery } from 'react-query';
    import {
      Box,
      Card,
      CardContent,
      Typography,
      Grid,
      LinearProgress,
      Table,
      TableBody,
      TableCell,
      TableContainer,
      TableHead,
      TableRow,
      Chip,
      Alert,
      } from '@mui/material';
import SkeletonLoader from '@/components/SkeletonLoader';
    import { FiTrendingUp,  FiTarget, FiClock, FiActivity, FiAward } from 'react-icons/fi';
    import {


      XAxis,
      YAxis,
      CartesianGrid,
      Tooltip,
      ResponsiveContainer,
      BarChart,
      Bar,
    } from 'recharts';
    import SafeIcon from '@/common/SafeIcon';

    interface PerformanceData {
      totalInteractions: number;
      averagePerDay: number;
      completionRate: number;
      activeDays: number;
      topPerformers: Array<{
        name: string;
        interactions: number;
        efficiency: number;
      }>;
      dailyProgress: Array<{
        date: string;
        interactions: number;
        goal: number;
      }>;
    }

    const PerformanceMetrics: React.FC = () => {
      const fetchPerformanceData = async (): Promise<PerformanceData> => {
        // Mock performance data - in real implementation, this would come from API
        return {
          totalInteractions: 1247,
          averagePerDay: 45,
          completionRate: 78,
          activeDays: 28,
          topPerformers: [
            { name: 'John Smith', interactions: 234, efficiency: 92 },
            { name: 'Sarah Johnson', interactions: 198, efficiency: 88 },
            { name: 'Mike Davis', interactions: 187, efficiency: 85 },
            { name: 'Emily Wilson', interactions: 176, efficiency: 90 },
            { name: 'Chris Brown', interactions: 165, efficiency: 82 },
          ],
          dailyProgress: [
            { date: 'Mon', interactions: 42, goal: 50 },
            { date: 'Tue', interactions: 58, goal: 50 },
            { date: 'Wed', interactions: 45, goal: 50 },
            { date: 'Thu', interactions: 62, goal: 50 },
            { date: 'Fri', interactions: 38, goal: 50 },
            { date: 'Sat', interactions: 28, goal: 40 },
            { date: 'Sun', interactions: 15, goal: 30 },
          ],
        };
      };

      const { data: performance = null, isLoading: loading, error: queryError } = useQuery('performanceMetrics', fetchPerformanceData);
      const [errorMsg, setErrorMsg] = useState('');
      const error = (queryError as any)?.response?.data?.error || errorMsg;
      const setError = setErrorMsg;


      const MetricCard: React.FC<{
        title: string;
        value: string | number;
        icon: any;
        color: string;
        subtitle?: string;
        progress?: number;
      }> = ({ title, value, icon, color, subtitle, progress }) => (
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SafeIcon icon={icon} style={{ fontSize: 24, color: color, marginRight: 12 }} />
              <Typography variant="h6" color="text.secondary">
                {title}
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight="bold" color={color}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {subtitle}
              </Typography>
            )}
            {progress !== undefined && (
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'grey.200',
                    '& .MuiLinearProgress-bar': { backgroundColor: color },
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  {progress}% of target
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      );

      if (loading) {
        return (
          <SkeletonLoader type="dashboard" />
        );
      }

      if (!performance) {
        return (
          <Alert severity="info">No performance data available yet. Start canvassing to see metrics.</Alert>
        );
      }

      return (
        <Box>
          <Typography variant="h4" gutterBottom>
            Performance Metrics
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Track team performance and identify areas for improvement.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Key Metrics */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Total Interactions"
                value={performance.totalInteractions}
                icon={FiActivity}
                color="#1E3A8A"
                subtitle="This month"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Daily Average"
                value={performance.averagePerDay}
                icon={FiTrendingUp}
                color="#10B981"
                subtitle="Per rep"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Completion Rate"
                value={`${performance.completionRate}%`}
                icon={FiTarget}
                color="#F59E0B"
                subtitle="Leads completed"
                progress={performance.completionRate}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Active Days"
                value={performance.activeDays}
                icon={FiClock}
                color="#8B5CF6"
                subtitle="Days worked this month"
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* Daily Progress Chart */}
            <Grid item xs={12} md={8}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Daily Progress vs Goals
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performance.dailyProgress}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="interactions" fill="#1E3A8A" />
                      <Bar dataKey="goal" fill="#e0e0e0" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Top Performers */}
            <Grid item xs={12} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SafeIcon icon={FiAward} /> Top Performers
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell align="right">Interactions</TableCell>
                          <TableCell align="right">Efficiency</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {performance.topPerformers.map((performer, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {index + 1}. {performer.name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">{performer.interactions}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={`${performer.efficiency}%`}
                                size="small"
                                color={
                                  performer.efficiency >= 90
                                    ? 'success'
                                    : performer.efficiency >= 80
                                    ? 'warning'
                                    : 'default'
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      );
    };

    export default PerformanceMetrics;