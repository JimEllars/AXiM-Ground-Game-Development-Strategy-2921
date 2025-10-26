import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

const UserProfile: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6">Name: {user?.firstName} {user?.lastName}</Typography>
        <Typography variant="body1">Email: {user?.email}</Typography>
        <Typography variant="body1">Role: {user?.role}</Typography>
        <Button variant="contained" onClick={logout} sx={{ mt: 2 }}>
          Logout
        </Button>
      </Paper>
    </Box>
  );
};

export default UserProfile;