import { useState, useEffect } from 'react';
    import { authAPI } from '@/services/api';

    interface User {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      organizationId: string;
    }

    export const useAuth = () => {
      const [user, setUser] = useState<User | null>(null);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);

      useEffect(() => {
        const getUser = async () => {
          try {
            setLoading(true);
            const response = await authAPI.getProfile();
            setUser(response.data);
          } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load user profile');
          } finally {
            setLoading(false);
          }
        };
        getUser();
      }, []);

      const login = async (email: string, password: string) => {
        try {
          setLoading(true);
          setError(null);
          const response = await authAPI.login(email, password);
          const { token, user } = response.data;
          localStorage.setItem('token', token);
          setUser(user);
          return response.data;
        } catch (err: any) {
          const errorMessage = err.response?.data?.error || 'Login failed';
          setError(errorMessage);
          throw new Error(errorMessage);
        } finally {
          setLoading(false);
        }
      };

      const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
      };

      return { user, loading, error, login, logout };
    };