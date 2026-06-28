import React from 'react';
import { Box, Skeleton, Grid } from '@mui/material';

interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'detail' | 'dashboard';
  count?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type = 'card', count = 1 }) => {
  const renderItem = (index: number) => {
    switch (type) {
      case 'card':
        return (
          <Box key={index} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1, mb: 2 }}>
            <Skeleton variant="text" width="60%" height={30} />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
          </Box>
        );
      case 'list':
        return (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="60%" />
            </Box>
          </Box>
        );
      case 'detail':
        return (
          <Box key={index} sx={{ p: 2 }}>
            <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 1 }} />
            <Skeleton variant="text" width="80%" height={40} />
            <Skeleton variant="text" width="60%" />
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={6}>
                <Skeleton variant="rectangular" height={60} />
              </Grid>
              <Grid item xs={6}>
                <Skeleton variant="rectangular" height={60} />
              </Grid>
            </Grid>
          </Box>
        );
      case 'dashboard':
        return (
          <Box key={index} sx={{ width: '100%' }}>
            <Grid container spacing={2}>
              {[1, 2, 3, 4].map(i => (
                 <Grid item xs={12} sm={6} md={3} key={`dash-stat-${i}`}>
                   <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
                 </Grid>
              ))}
            </Grid>
            <Box sx={{ mt: 3 }}>
               <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
            </Box>
          </Box>
        );
      default:
        return <Skeleton key={index} />;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => renderItem(i))}
    </>
  );
};

export default SkeletonLoader;
