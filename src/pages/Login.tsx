import React, { useState } from 'react';
    import { Box, Paper, TextField, Button, Typography, Alert, Container, Avatar } from '@mui/material';
    import { FiUser, FiLock, FiLogIn } from 'react-icons/fi';
    import { useNavigate } from 'react-router-dom';
    import SafeIcon from '@/common/SafeIcon';
    import { useAuth } from '@/contexts/AuthContext';

    const Login: React.FC = () => {
      const navigate = useNavigate();
      const { login, loading, error } = useAuth();
      const [formData, setFormData] = useState({ email: '', password: '' });

      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Clear error when user starts typing
        if (error) {
          // Error will be cleared by useAuth hook on next login attempt
        }
      };

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
          await login(formData.email, formData.password);
          navigate('/dashboard');
        } catch (err) {
          // Error is handled by useAuth hook
        }
      };

      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <Container maxWidth="sm">
            <Paper elevation={10} sx={{ p: 4, borderRadius: 2 }}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: 'primary.main', width: 64, height: 64 }}>
                  <SafeIcon icon={FiUser} style={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h4" gutterBottom>
                  AXiM Ground Game
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Next-Generation Canvassing Platform
                </Typography>
              </Box>
              <Box component="form" onSubmit={handleSubmit}>
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
                    startAdornment: <SafeIcon icon={FiUser} style={{ marginRight: 8, color: '#666' }} />,
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
                  startIcon={<SafeIcon icon={FiLogIn} />}
                  sx={{ mt: 3, mb: 2 }}
                  data-testid="login-button"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </Box>
            </Paper>
          </Container>
        </Box>
      );
    };

    export default Login;