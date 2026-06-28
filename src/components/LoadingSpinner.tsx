import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import SkeletonLoader from './SkeletonLoader';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message, size = 40, fullScreen = false }) => {
  if (fullScreen) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress size={size} />
        {message && <Typography sx={{ mt: 2 }} color="text.secondary">{message}</Typography>}
      </Box>
    );
  }
  return <SkeletonLoader type="list" count={3} />;
};

export default LoadingSpinner;
