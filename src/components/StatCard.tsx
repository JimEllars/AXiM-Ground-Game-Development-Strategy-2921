import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';
import SafeIcon from '@/common/SafeIcon';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => (
  <Card elevation={2}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <SafeIcon icon={icon} style={{ fontSize: 24, color: color, marginRight: 12 }} />
        <Typography variant="h6" color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h3" fontWeight="bold" color={color}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export default StatCard;
