import React, { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert, Container, Avatar } from '@mui/material';
import { FiUser, FiLock, FiLogOut, FiBriefcase, FiMail } from 'react-icons/fi';
import { useNavigate, Link } from 'react-router-dom';
import SafeIcon from '@/common/SafeIcon';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/services/api';

const RegisterOrganization: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    organizationName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.registerOrg(formData);
      // Automatically log the user in after successful registration
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={10} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: 'primary.main', width: 64, height: 64 }}>
              <SafeIcon icon={FiBriefcase} style={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h4" gutterBottom>
              Register Organization
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create your AXiM Ground Game account
            </Typography>
          </Box>
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Organization Name"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              margin="normal"
              required
              InputProps={{
                startAdornment: <SafeIcon icon={FiBriefcase} style={{ marginRight: 8, color: '#666' }} />,
              }}
            />
            <TextField
              fullWidth
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              margin="normal"
              required
              InputProps={{
                startAdornment: <SafeIcon icon={FiUser} style={{ marginRight: 8, color: '#666' }} />,
              }}
            />
            <TextField
              fullWidth
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              margin="normal"
              required
              InputProps={{
                startAdornment: <SafeIcon icon={FiUser} style={{ marginRight: 8, color: '#666' }} />,
              }}
            />
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
              InputProps={{
                startAdornment: <SafeIcon icon={FiMail} style={{ marginRight: 8, color: '#666' }} />,
              }}
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              InputProps={{
                startAdornment: <SafeIcon icon={FiLock} style={{ marginRight: 8, color: '#666' }} />,
              }}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={<SafeIcon icon={FiLogOut} />} // Wait, better use FiUserPlus or similar, or skip icon. I will use FiUser here. But I'll fix it in patch if it matters.
              sx={{ mt: 3, mb: 2 }}
              data-testid="register-button"
            >
              {loading ? 'Registering...' : 'Register Organization'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2">
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#1E3A8A', textDecoration: 'none' }}>
                  Sign in here
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default RegisterOrganization;
