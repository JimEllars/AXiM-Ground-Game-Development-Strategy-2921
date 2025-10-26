import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Avatar, Menu, MenuItem, Chip } from '@mui/material';
import {
  FiMap,
  FiUsers,
  FiDatabase,
  FiLogOut,
  FiUser,
  FiHome,
  FiBarChart2,
  FiSettings,
} from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import SafeIcon from '@/common/SafeIcon';
import { useAuth } from '@/contexts/AuthContext';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigationItems = [
    { path: '/', label: 'Dashboard', icon: FiHome },
    { path: '/territories', label: 'Territories', icon: FiMap, roles: ['ADMIN', 'MANAGER'] },
    { path: '/leads', label: 'Leads', icon: FiDatabase, roles: ['ADMIN', 'MANAGER'] },
    { path: '/turf', label: 'My Turf', icon: FiUsers, roles: ['REP'] },
    { path: '/analytics', label: 'Analytics', icon: FiBarChart2, roles: ['ADMIN', 'MANAGER'] },
    { path: '/team', label: 'Team', icon: FiUsers, roles: ['ADMIN'] },
    { path: '/settings', label: 'Settings', icon: FiSettings, roles: ['ADMIN', 'MANAGER'] },
  ];

  const filteredNavItems = navigationItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'error';
      case 'MANAGER':
        return 'warning';
      case 'REP':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        {/* Logo/Brand */}
        <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
          AXiM Ground Game
        </Typography>

        {/* Navigation Links */}
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          {filteredNavItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={<SafeIcon icon={item.icon} />}
              onClick={() => navigate(item.path)}
              sx={{
                backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* User Profile */}
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={user.role}
              size="small"
              color={getRoleColor(user.role) as any}
              variant="outlined"
              sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
            />
            <Button
              color="inherit"
              onClick={handleProfileClick}
              startIcon={
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255, 255, 255, 0.1)' }}>
                  <SafeIcon icon={FiUser} style={{ fontSize: 16 }} />
                </Avatar>
              }
            >
              {user.firstName} {user.lastName}
            </Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleProfileClose}>
              <MenuItem
                onClick={() => {
                  navigate('/profile');
                  handleProfileClose();
                }}
              >
                <SafeIcon icon={FiUser} style={{ marginRight: 8 }} /> Profile
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <SafeIcon icon={FiLogOut} style={{ marginRight: 8 }} /> Logout
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Button color="inherit" onClick={() => navigate('/login')}>
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
