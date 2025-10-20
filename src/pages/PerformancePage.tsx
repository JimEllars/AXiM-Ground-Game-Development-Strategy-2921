import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import PerformanceMetrics from '../components/PerformanceMetrics';

const PerformancePage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Performance Metrics
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Track team performance and identify areas for improvement.
      </Typography>
      
      <Paper elevation={2}>
        <PerformanceMetrics />
      </Paper>
    </Box>
  );
};

export default PerformancePage;