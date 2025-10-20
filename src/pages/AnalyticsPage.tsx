import React from 'react';
    import { Box, Typography, Paper } from '@mui/material';
    import AnalyticsDashboard from '@/components/AnalyticsDashboard';

    const AnalyticsPage: React.FC = () => {
      return (
        <Box>
          <Typography variant="h4" gutterBottom>
            Analytics & Insights
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Comprehensive analytics to track performance and identify trends.
          </Typography>
          <Paper elevation={2}>
            <AnalyticsDashboard />
          </Paper>
        </Box>
      );
    };

    export default AnalyticsPage;