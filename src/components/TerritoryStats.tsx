import React from 'react';
    import { Box, Typography, Card, CardContent, Grid, Chip } from '@mui/material';
    import { FiMapPin, FiUsers, FiCheckCircle, FiActivity } from 'react-icons/fi';
    import SafeIcon from '@/common/SafeIcon';

    interface TerritoryStatsProps {
      territory: any;
    }

    const TerritoryStats: React.FC<TerritoryStatsProps> = ({ territory }) => {
      const totalLeads = territory.leads?.length || 0;
      const completedLeads = territory.leads?.filter((l: any) => l.lastInteraction).length || 0;
      const completionRate = totalLeads > 0 ? Math.round((completedLeads / totalLeads) * 100) : 0;

      const stats = [
        { label: 'Total Leads', value: totalLeads, icon: FiUsers, color: '#1976d2' },
        { label: 'Completed', value: completedLeads, icon: FiCheckCircle, color: '#388e3c' },
        { label: 'Pending', value: totalLeads - completedLeads, icon: FiActivity, color: '#f57c00' },
        { label: 'Completion Rate', value: `${completionRate}%`, icon: FiMapPin, color: '#7b1fa2' },
      ];

      return (
        <Card elevation={2} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {territory.name}
            </Typography>
            {territory.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {territory.description}
              </Typography>
            )}
            <Grid container spacing={2}>
              {stats.map((stat, index) => (
                <Grid item xs={6} sm={3} key={index}>
                  <Box sx={{ textAlign: 'center' }}>
                    <SafeIcon icon={stat.icon} style={{ fontSize: 24, color: stat.color, marginBottom: 4 }} />
                    <Typography variant="h6" color={stat.color}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Chip
                label={`${completionRate}% Complete`}
                color={completionRate > 75 ? 'success' : completionRate > 50 ? 'warning' : 'error'}
                size="small"
              />
              <Typography variant="caption" color="text.secondary">
                Created: {new Date(territory.createdAt).toLocaleDateString()}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      );
    };

    export default TerritoryStats;