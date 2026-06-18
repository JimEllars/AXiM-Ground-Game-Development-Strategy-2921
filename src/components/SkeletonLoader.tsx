import React from 'react';
import { Box, Skeleton, Stack, useMediaQuery, useTheme } from '@mui/material';

interface SkeletonLoaderProps {
  type?: 'dashboard' | 'list' | 'card' | 'form';
  count?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type = 'list', count = 3 }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (type === 'dashboard') {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={3}>
          <Skeleton variant="text" width="40%" height={40} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={120} />
            ))}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
            <Skeleton variant="rounded" height={300} />
            <Skeleton variant="rounded" height={300} />
          </Box>
        </Stack>
      </Box>
    );
  }

  if (type === 'card') {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {[...Array(count)].map((_, i) => (
          <Skeleton key={i} variant="rounded" height={150} />
        ))}
      </Box>
    );
  }

  if (type === 'form') {
    return (
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 500, mx: 'auto', mt: 2 }}>
        <Skeleton variant="text" width="30%" height={32} />
        <Skeleton variant="rounded" height={56} />
        <Skeleton variant="rounded" height={56} />
        <Skeleton variant="rounded" height={100} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Skeleton variant="rounded" width={100} height={40} />
          <Skeleton variant="rounded" width={100} height={40} />
        </Box>
      </Stack>
    );
  }

  // Default 'list' type
  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      {[...Array(count)].map((_, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Box>
          <Skeleton variant="rounded" width={80} height={32} />
        </Box>
      ))}
    </Stack>
  );
};

export default SkeletonLoader;
