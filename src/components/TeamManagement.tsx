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
  Tabs,
  Tab,
} from '@mui/material';
import { FiUsers, FiUserPlus, FiEdit2, FiTrash2, FiMapPin, FiBriefcase } from 'react-icons/fi';
import SafeIcon from '@/common/SafeIcon';
import { usersAPI, teamsAPI } from '@/services/api';
import { Team } from '@/types';

// Use a local interface that matches what the API returns (Uppercase roles)
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'REP';
  isActive: boolean;
  createdAt: string;
  assignedTerritories?: number;
  teamId?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TeamManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, teamsRes] = await Promise.all([
        usersAPI.getUsers(),
        teamsAPI.getTeams()
      ]);
      setUsers(usersRes.data);
      setTeams(teamsRes.data);
    } catch (error: any) {
      console.error('Failed to load data', error);
      setError(error.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // --- USER MANAGEMENT ---

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      setError('');
      if (!userFormData.email || !userFormData.firstName || !userFormData.lastName || !userFormData.password) {
        setError('All fields are required');
        return;
      }

      await usersAPI.createUser({
        email: userFormData.email,
        password: userFormData.password,
        firstName: userFormData.firstName,
        lastName: userFormData.lastName,
        role: userFormData.role,
      });

      setSuccess('User created successfully');
      setUserDialogOpen(false);
      resetUserForm();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      setLoading(true);
      setError('');

      await usersAPI.updateUser(editingUser.id, {
        firstName: userFormData.firstName,
        lastName: userFormData.lastName,
        role: userFormData.role,
        password: userFormData.password || undefined,
      });

      setSuccess('User updated successfully');
      setUserDialogOpen(false);
      resetUserForm();
      loadData();
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
      await usersAPI.deleteUser(userId);
      setSuccess('User deleted successfully');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete user');
    } finally {
      setLoading(false);
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

  const handleCreateTeam = async () => {
    try {
      setLoading(true);
      setError('');
      if (!teamFormData.name) {
        setError('Team name is required');
        return;
      }

      await teamsAPI.createTeam(teamFormData);
      setSuccess('Team created successfully');
      setTeamDialogOpen(false);
      resetTeamForm();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam) return;
    try {
      setLoading(true);
      setError('');

      await teamsAPI.updateTeam(editingTeam.id, teamFormData);
      setSuccess('Team updated successfully');
      setTeamDialogOpen(false);
      resetTeamForm();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update team');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Are you sure you want to delete this team? Users will be unassigned.')) {
      return;
    }
    try {
      setLoading(true);
      await teamsAPI.deleteTeam(teamId);
      setSuccess('Team deleted successfully');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete team');
    } finally {
      setLoading(false);
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
      setLoading(true);
      await teamsAPI.assignUser(selectedTeamId, selectedUserForTeam.id);
      setSuccess('User assigned to team successfully');
      setAssignTeamDialogOpen(false);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to assign user to team');
    } finally {
      setLoading(false);
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
                          label={teams.find(t => t.id === user.teamId)?.name || 'Unknown Team'}
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
            {teams.map(team => (
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
                      {teams.map(team => (
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
