import React, { useState, useEffect } from 'react';
    import {
      Box,
      Card,
      CardContent,
      Typography,
      Button,
      Table,
      TableBody,
      TableCell,
      TableContainer,
      TableHead,
      TableRow,
      Chip,
      Dialog,
      DialogTitle,
      DialogContent,
      DialogActions,
      TextField,
      Select,
      MenuItem,
      FormControl,
      InputLabel,
      Alert,
      IconButton,
      Avatar,
      Grid,
      Paper,
      TableSortLabel,
    } from '@mui/material';
    import { FiUsers, FiUserPlus, FiEdit2, FiTrash2, FiMail, FiMapPin } from 'react-icons/fi';
    import SafeIcon from '@/common/SafeIcon';
    import { authAPI } from '@/services/api';

    interface User {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: 'ADMIN' | 'MANAGER' | 'REP';
      isActive: boolean;
      createdAt: string;
      assignedTerritories?: number;
    }

    const TeamManagement: React.FC = () => {
      const [users, setUsers] = useState<User[]>([]);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      const [success, setSuccess] = useState('');
      const [dialogOpen, setDialogOpen] = useState(false);
      const [editingUser, setEditingUser] = useState<User | null>(null);
      const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
      const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        role: 'REP' as 'ADMIN' | 'MANAGER' | 'REP',
        password: '',
      });

      const sortedUsers = React.useMemo(() => {
        let sortableUsers = [...users];
        if (sortConfig !== null) {
          sortableUsers.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
              return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
              return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
          });
        }
        return sortableUsers;
      }, [users, sortConfig]);

      const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
          direction = 'descending';
        }
        setSortConfig({ key, direction });
      };

      useEffect(() => {
        loadUsers();
      }, []);

      const loadUsers = async () => {
        try {
          setLoading(true);
          // Mock data for now - in real implementation, this would call an API
          const mockUsers: User[] = [
            {
              id: '1',
              email: 'admin@axim.com',
              firstName: 'Admin',
              lastName: 'User',
              role: 'ADMIN',
              isActive: true,
              createdAt: '2024-01-01',
              assignedTerritories: 0,
            },
            {
              id: '2',
              email: 'manager@axim.com',
              firstName: 'Manager',
              lastName: 'User',
              role: 'MANAGER',
              isActive: true,
              createdAt: '2024-01-02',
              assignedTerritories: 0,
            },
            {
              id: '3',
              email: 'rep@axim.com',
              firstName: 'Rep',
              lastName: 'User',
              role: 'REP',
              isActive: true,
              createdAt: '2024-01-03',
              assignedTerritories: 2,
            },
          ];
          setUsers(mockUsers);
        } catch (error: any) {
          setError(error.response?.data?.error || 'Failed to load users');
        } finally {
          setLoading(false);
        }
      };

      const handleCreateUser = async () => {
        try {
          setLoading(true);
          setError('');
          if (!formData.email || !formData.firstName || !formData.lastName || !formData.password) {
            setError('All fields are required');
            return;
          }
          // Mock organization ID - in real implementation, this would come from current user
          const organizationId = '550e8400-e29b-41d4-a716-446655440000';
          await authAPI.register({
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            organizationId,
            role: formData.role,
          });
          setSuccess('User created successfully');
          setDialogOpen(false);
          resetForm();
          loadUsers();
          setTimeout(() => setSuccess(''), 3000);
        } catch (error: any) {
          setError(error.response?.data?.error || 'Failed to create user');
        } finally {
          setLoading(false);
        }
      };

      const handleEditUser = (user: User) => {
        setEditingUser(user);
        setFormData({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          password: '',
        });
        setDialogOpen(true);
      };

      const handleUpdateUser = async () => {
        try {
          setLoading(true);
          setError('');
          // Mock update - in real implementation, this would call an API
          setSuccess('User updated successfully');
          setDialogOpen(false);
          resetForm();
          loadUsers();
          setTimeout(() => setSuccess(''), 3000);
        } catch (error: any) {
          setError(error.response?.data?.error || 'Failed to update user');
        } finally {
          setLoading(false);
        }
      };

      const handleDeleteUser = async (userId: string) => {
        if (!window.confirm('Are you sure you want to delete this user?')) {
          return;
        }
        try {
          setLoading(true);
          setError('');
          // Mock delete - in real implementation, this would call an API
          setUsers(users.filter((u) => u.id !== userId));
          setSuccess('User deleted successfully');
          setTimeout(() => setSuccess(''), 3000);
        } catch (error: any) {
          setError(error.response?.data?.error || 'Failed to delete user');
        } finally {
          setLoading(false);
        }
      };

      const resetForm = () => {
        setFormData({ email: '', firstName: '', lastName: '', role: 'REP', password: '' });
        setEditingUser(null);
      };

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

      const getRoleStats = () => {
        const stats = users.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        return [
          { role: 'Admin', count: stats.ADMIN || 0, color: '#d32f2f' },
          { role: 'Manager', count: stats.MANAGER || 0, color: '#f57c00' },
          { role: 'Rep', count: stats.REP || 0, color: '#1976d2' },
        ];
      };

      return (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4">Team Management</Typography>
            <Button
              variant="contained"
              startIcon={<SafeIcon icon={FiUserPlus} />}
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
            >
              Add Team Member
            </Button>
          </Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {/* Role Statistics */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {users.length > 0 &&
              getRoleStats().map((stat) => (
                <Grid item xs={12} sm={4} key={stat.role}>
                  <Card elevation={2}>
                    <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: stat.color }}>
                        <SafeIcon icon={FiUsers} />
                      </Avatar>
                      <Box>
                        <Typography variant="h4" color={stat.color}>
                          {stat.count}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stat.role}s
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Users Table */}
          <Paper sx={{ width: '100%' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sortDirection={sortConfig?.key === 'lastName' ? sortConfig.direction : false}>
                      <TableSortLabel
                        active={sortConfig?.key === 'lastName'}
                        direction={sortConfig?.direction}
                        onClick={() => requestSort('lastName')}
                      >
                        User
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Territories</TableCell>
                    <TableCell sortDirection={sortConfig?.key === 'createdAt' ? sortConfig.direction : false}>
                      <TableSortLabel
                        active={sortConfig?.key === 'createdAt'}
                        direction={sortConfig?.direction}
                        onClick={() => requestSort('createdAt')}
                      >
                        Created
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : sortedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedUsers.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: getRoleColor(user.role) as any }}>
                              {user.firstName[0]}
                              {user.lastName[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {user.firstName} {user.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                <SafeIcon icon={FiMail} style={{ fontSize: 12, marginRight: 4 }} />
                                {user.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={user.role} size="small" color={getRoleColor(user.role) as any} />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.isActive ? 'Active' : 'Inactive'}
                            size="small"
                            color={user.isActive ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SafeIcon icon={FiMapPin} style={{ fontSize: 14 }} />
                            <Typography variant="body2">{user.assignedTerritories || 0}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton size="small" onClick={() => handleEditUser(user)}>
                              <SafeIcon icon={FiEdit2} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={user.role === 'ADMIN'}
                            >
                              <SafeIcon icon={FiTrash2} />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Create/Edit User Dialog */}
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add Team Member'}</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Email Address"
                type="email"
                fullWidth
                variant="outlined"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="First Name"
                fullWidth
                variant="outlined"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Last Name"
                fullWidth
                variant="outlined"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  label="Role"
                >
                  <MenuItem value="REP">Field Representative</MenuItem>
                  <MenuItem value="MANAGER">Manager</MenuItem>
                  <MenuItem value="ADMIN">Administrator</MenuItem>
                </Select>
              </FormControl>
              <TextField
                margin="dense"
                label="Password"
                type="password"
                fullWidth
                variant="outlined"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                helperText={editingUser ? 'Leave blank to keep current password' : ''}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={editingUser ? handleUpdateUser : handleCreateUser}
                variant="contained"
                disabled={loading}
              >
                {loading ? 'Saving...' : editingUser ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      );
    };

    export default TeamManagement;