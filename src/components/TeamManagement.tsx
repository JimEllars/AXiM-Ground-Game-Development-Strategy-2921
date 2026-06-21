import React from 'react';
import { useState } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import { FiUsers, FiUserPlus, FiEdit2, FiTrash2, FiMapPin, FiBriefcase } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';
import { usersAPI, teamsAPI } from '@/services/api';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Team, User } from '@/types';
import { TabPanel } from './TabPanel';

const TeamManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  // User Dialog State
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'REP' as 'ADMIN' | 'MANAGER' | 'REP',
    password: '',
  });

  // Team Dialog State
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamFormData, setTeamFormData] = useState({
    name: '',
    description: '',
  });

  // Assign Team Dialog State
  const [assignTeamDialogOpen, setAssignTeamDialogOpen] = useState(false);
  const [selectedUserForTeam, setSelectedUserForTeam] = useState<User | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  const { data: users = [], isLoading: isLoadingUsers } = useQuery('users', () => usersAPI.getUsers().then(res => res.data));
  const { data: teams = [], isLoading: isLoadingTeams } = useQuery('teams', () => teamsAPI.getTeams().then(res => res.data));
  const loading = isLoadingUsers || isLoadingTeams;

  type SortableUserKey = 'lastName' | 'createdAt';
  const [sortConfig, setSortConfig] = useState<{ key: SortableUserKey; direction: 'asc' | 'desc' } | null>(null);

  const sortedUsers = React.useMemo(() => {
    let sortableUsers = [...users];
    if (sortConfig !== null) {
      sortableUsers.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableUsers;
  }, [users, sortConfig]);

  const requestSort = (key: SortableUserKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };



  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // --- USER MANAGEMENT ---

  const createUserMutation = useMutation((data: typeof userFormData) => usersAPI.createUser({
    email: data.email,
    password: data.password,
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role,
  }), {
    onSuccess: () => {
      queryClient.invalidateQueries('users');
      setSuccess('User created successfully');
      setUserDialogOpen(false);
      resetUserForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  });

  const handleCreateUser = () => {
    setError('');
    if (!userFormData.email || !userFormData.firstName || !userFormData.lastName || !userFormData.password) {
      setError('All fields are required');
      return;
    }
    createUserMutation.mutate(userFormData);
  };

  const updateUserMutation = useMutation((data: { id: string; user: any }) => usersAPI.updateUser(data.id, {
    firstName: data.user.firstName,
    lastName: data.user.lastName,
    role: data.user.role,
    password: data.user.password || undefined,
  }), {
    onSuccess: () => {
      queryClient.invalidateQueries('users');
      setSuccess('User updated successfully');
      setUserDialogOpen(false);
      resetUserForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  });

  const handleUpdateUser = () => {
    if (!editingUser) return;
    setError('');
    updateUserMutation.mutate({ id: editingUser.id, user: userFormData });
  };

  const deleteUserMutation = useMutation((id: string) => usersAPI.deleteUser(id), {
    onSuccess: () => {
      queryClient.invalidateQueries('users');
      setSuccess('User deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  });

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      password: '',
    });
    setUserDialogOpen(true);
  };

  const resetUserForm = () => {
    setUserFormData({ email: '', firstName: '', lastName: '', role: 'REP', password: '' });
    setEditingUser(null);
  };

  // --- TEAM MANAGEMENT ---

  const createTeamMutation = useMutation((data: typeof teamFormData) => teamsAPI.createTeam(data), {
    onSuccess: () => {
      queryClient.invalidateQueries('teams');
      setSuccess('Team created successfully');
      setTeamDialogOpen(false);
      resetTeamForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create team');
    }
  });

  const handleCreateTeam = () => {
    setError('');
    if (!teamFormData.name) {
      setError('Team name is required');
      return;
    }
    createTeamMutation.mutate(teamFormData);
  };

  const updateTeamMutation = useMutation((data: { id: string; team: typeof teamFormData }) => teamsAPI.updateTeam(data.id, data.team), {
    onSuccess: () => {
      queryClient.invalidateQueries('teams');
      setSuccess('Team updated successfully');
      setTeamDialogOpen(false);
      resetTeamForm();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to update team');
    }
  });

  const handleUpdateTeam = () => {
    if (!editingTeam) return;
    setError('');
    updateTeamMutation.mutate({ id: editingTeam.id, team: teamFormData });
  };

  const deleteTeamMutation = useMutation((id: string) => teamsAPI.deleteTeam(id), {
    onSuccess: () => {
      queryClient.invalidateQueries('teams');
      setSuccess('Team deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to delete team');
    }
  });

  const handleDeleteTeam = (teamId: string) => {
    if (window.confirm('Are you sure you want to delete this team? Users will be unassigned.')) {
      deleteTeamMutation.mutate(teamId);
    }
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamFormData({
      name: team.name,
      description: team.description || '',
    });
    setTeamDialogOpen(true);
  };

  const resetTeamForm = () => {
    setTeamFormData({ name: '', description: '' });
    setEditingTeam(null);
  };

  const handleAssignTeamClick = (user: User) => {
    setSelectedUserForTeam(user);
    setSelectedTeamId(user.teamId || '');
    setAssignTeamDialogOpen(true);
  };

  const handleAssignTeamSubmit = async () => {
    if (!selectedUserForTeam || !selectedTeamId) return;
    try {

      await teamsAPI.assignUser(selectedTeamId, selectedUserForTeam.id);
      setSuccess('User assigned to team successfully');
      setAssignTeamDialogOpen(false);

      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to assign user to team');
    } finally {

    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'MANAGER': return 'warning';
      case 'REP': return 'primary';
      default: return 'default';
    }
  };

  const getRoleStats = () => {
    const stats = users.reduce((acc: any, user: any) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return [
      { role: 'Admin', count: stats.ADMIN || 0, color: '#EF4444' },
      { role: 'Manager', count: stats.MANAGER || 0, color: '#F59E0B' },
      { role: 'Rep', count: stats.REP || 0, color: '#1E3A8A' },
    ];
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Organization Management</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="organization tabs">
          <Tab label="Users" />
          <Tab label="Teams" />
        </Tabs>
      </Box>

      {/* USERS TAB */}
      <TabPanel value={activeTab} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<SafeIcon icon={FiUserPlus} />}
            onClick={() => { resetUserForm(); setUserDialogOpen(true); }}
            data-testid="add-user-btn"
          >
            Add Member
          </Button>
        </Box>

        {/* Role Statistics */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
            {getRoleStats().map((stat) => (
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

        <TableContainer component={Paper}>
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
                <TableCell>Team</TableCell>
                <TableCell>Territories</TableCell>
                <TableCell>Status</TableCell>
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
              {loading && users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
              sortedUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: getRoleColor(user.role) as any }}>
                        {user.firstName[0]}{user.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {user.firstName} {user.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={user.role} size="small" color={getRoleColor(user.role) as any} />
                  </TableCell>
                  <TableCell>
                    {user.teamId ? (
                        <Chip
                          label={teams.find((t: any) => t.id === user.teamId)?.name || 'Unknown Team'}
                          size="small"
                          icon={<SafeIcon icon={FiBriefcase} />}
                          onClick={() => handleAssignTeamClick(user)}
                        />
                    ) : (
                        <Button size="small" onClick={() => handleAssignTeamClick(user)}>Assign Team</Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SafeIcon icon={FiMapPin} style={{ fontSize: 14 }} />
                      <Typography variant="body2">{user.assignedTerritories || 0}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={user.isActive ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEditUser(user)}>
                      <SafeIcon icon={FiEdit2} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteUser(user.id)} disabled={user.role === 'ADMIN'}>
                      <SafeIcon icon={FiTrash2} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* TEAMS TAB */}
      <TabPanel value={activeTab} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<SafeIcon icon={FiUsers} />}
            onClick={() => { resetTeamForm(); setTeamDialogOpen(true); }}
          >
            Create Team
          </Button>
        </Box>

        <Grid container spacing={3}>
            {teams.map((team: any) => (
                <Grid item xs={12} md={6} lg={4} key={team.id}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Typography variant="h6">{team.name}</Typography>
                                <Box>
                                    <IconButton size="small" onClick={() => handleEditTeam(team)}>
                                        <SafeIcon icon={FiEdit2} />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleDeleteTeam(team.id)}>
                                        <SafeIcon icon={FiTrash2} />
                                    </IconButton>
                                </Box>
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {team.description || 'No description'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SafeIcon icon={FiUsers} />
                                <Typography variant="body2">
                                    {team.memberCount || 0} Members
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
            {teams.length === 0 && (
                <Grid item xs={12}>
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="text.secondary">No teams found. Create one to get started.</Typography>
                    </Paper>
                </Grid>
            )}
        </Grid>
      </TabPanel>

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Add Team Member'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={userFormData.email}
            onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
            sx={{ mb: 2 }}
            disabled={!!editingUser}
          />
          <TextField
            margin="dense"
            label="First Name"
            fullWidth
            variant="outlined"
            value={userFormData.firstName}
            onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Last Name"
            fullWidth
            variant="outlined"
            value={userFormData.lastName}
            onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={userFormData.role}
              onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
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
            value={userFormData.password}
            onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
            helperText={editingUser ? 'Leave blank to keep current password' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={editingUser ? handleUpdateUser : handleCreateUser} variant="contained">
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={teamDialogOpen} onClose={() => setTeamDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTeam ? 'Edit Team' : 'Create Team'}</DialogTitle>
        <DialogContent>
            <TextField
                autoFocus
                margin="dense"
                label="Team Name"
                fullWidth
                variant="outlined"
                value={teamFormData.name}
                onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                sx={{ mb: 2 }}
                inputProps={{ "aria-label": "Team Name" }} // Add accessibility label for tests
            />
            <TextField
                margin="dense"
                label="Description"
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={teamFormData.description}
                onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                inputProps={{ "aria-label": "Description" }}
            />
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setTeamDialogOpen(false)}>Cancel</Button>
            <Button onClick={editingTeam ? handleUpdateTeam : handleCreateTeam} variant="contained">
                {editingTeam ? 'Update' : 'Create'}
            </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Team Dialog */}
      <Dialog open={assignTeamDialogOpen} onClose={() => setAssignTeamDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Assign to Team</DialogTitle>
          <DialogContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                  Assigning <strong>{selectedUserForTeam?.firstName} {selectedUserForTeam?.lastName}</strong>
              </Typography>
              <FormControl fullWidth>
                  <InputLabel>Select Team</InputLabel>
                  <Select
                    value={selectedTeamId}
                    label="Select Team"
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                  >
                      {teams.map((team: any) => (
                          <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
                      ))}
                  </Select>
              </FormControl>
          </DialogContent>
          <DialogActions>
              <Button onClick={() => setAssignTeamDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAssignTeamSubmit} variant="contained">Save</Button>
          </DialogActions>
      </Dialog>

    </Box>
  );
};

export default TeamManagement;
