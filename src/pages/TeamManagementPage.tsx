import React from 'react';
    import { Box, Typography, Paper } from '@mui/material';
    import TeamManagement from '@/components/TeamManagement';

    const TeamManagementPage: React.FC = () => {
      return (
        <Box>
          <Typography variant="h4" gutterBottom>
            Team Management
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Manage team members, roles, and permissions.
          </Typography>
          <Paper elevation={2}>
            <TeamManagement />
          </Paper>
        </Box>
      );
    };

    export default TeamManagementPage;