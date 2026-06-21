import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Avatar, Menu, MenuItem, Chip, IconButton, useMediaQuery, useTheme, Tooltip } from '@mui/material';
import {
  FiMap,
  FiUsers,
  FiDatabase,
  FiLogOut,
  FiUser,
  FiHome,
  FiBarChart2,
  FiSettings,
  FiMenu,
  FiRefreshCw
} from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import SafeIcon from '@/common/SafeIcon';
import { useAuth } from '@/contexts/AuthContext';
import { syncOfflineData } from '@/syncEngine';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleMobileMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };
  const handleMobileMenuClose = () => {
    setMobileMenuAnchorEl(null);
  };

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
        {isMobile ? (
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <IconButton color="inherit" onClick={handleMobileMenuClick} edge="start" sx={{ mr: 2, minWidth: 44, minHeight: 44 }}>
              <SafeIcon icon={FiMenu} />
            </IconButton>
            <Menu
              anchorEl={mobileMenuAnchorEl}
              open={Boolean(mobileMenuAnchorEl)}
              onClose={handleMobileMenuClose}
            >
              {filteredNavItems.map((item) => (
                <MenuItem
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    handleMobileMenuClose();
                  }}
                  selected={location.pathname === item.path}
                >
                  <SafeIcon icon={item.icon} style={{ marginRight: 8 }} />
                  {item.label}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        ) : (
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
        )}

        {/* User Profile */}
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isMobile ? (
              <Tooltip title="Force Sync">
                <span>
                  <IconButton
                    color="inherit"
                    onClick={async () => {
                      setIsSyncing(true);
                      try {
                        await syncOfflineData();
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsSyncing(false);
                      }
                    }}
                    disabled={isSyncing}
                    sx={{ border: '1px solid rgba(255, 255, 255, 0.5)', minWidth: 44, minHeight: 44 }}
                  >
                    <SafeIcon icon={FiRefreshCw} />
                  </IconButton>
                </span>
              </Tooltip>
            ) : (
              <Button
                color="inherit"
                variant="outlined"
                size="small"
                onClick={async () => {
                  setIsSyncing(true);
                  try {
                    await syncOfflineData();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                disabled={isSyncing}
                startIcon={<SafeIcon icon={FiRefreshCw} />}
                sx={{ borderColor: 'rgba(255, 255, 255, 0.5)' }}
              >
                Force Sync
              </Button>
            )}
            {!isMobile && (
              <Chip
                label={user.role}
                size="small"
                color={getRoleColor(user.role) as any}
                variant="outlined"
                sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
              />
            )}
            <Button
              color="inherit"
              onClick={handleProfileClick}
              sx={{ minWidth: isMobile ? 44 : undefined, minHeight: isMobile ? 44 : undefined, px: isMobile ? 1 : 2 }}
              startIcon={
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255, 255, 255, 0.1)' }}>
                  <SafeIcon icon={FiUser} style={{ fontSize: 16 }} />
                </Avatar>
              }
            >
              {!isMobile && `${user.firstName} ${user.lastName}`}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
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
