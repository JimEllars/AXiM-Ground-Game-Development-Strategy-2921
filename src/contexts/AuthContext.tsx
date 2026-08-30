import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { authAPI } from '@/services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);

    const getUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          setLoading(true);
          const response = await authAPI.getProfile();
          setUser(response.data);
        } catch (err: any) {
          // Graceful degradation: If offline, decode token to maintain session
          if (err.response && [502, 503, 504].includes(err.response.status)) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              setUser({
                id: payload.id || payload.sub,
                email: payload.email || '',
                firstName: payload.firstName || '',
                lastName: payload.lastName || '',
                role: payload.role || '',
                organizationId: payload.organizationId || ''
              });
              setError(null);
            } catch (e) {
              setError('Failed to load user profile (offline decode failed)');
              localStorage.removeItem('token');
            }
          } else {
            setError(err.response?.data?.error || 'Failed to load user profile');
            localStorage.removeItem('token'); // Clear invalid token
          }
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false); // Not logged in
      }
    };
    getUser();
    return () => {
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    let intervalId: any;
    if (user) {
      intervalId = setInterval(async () => {
        if (navigator.onLine) {
          try {
            const token = localStorage.getItem('token');
            if (token) {
              const res = await authAPI.refreshToken();
              if (res.data && res.data.token) {
                localStorage.setItem('token', res.data.token);
              }
            }
          } catch (err) {
            console.error('Failed to refresh token in background', err);
          }
        }
      }, 10 * 60 * 1000); // 10 minutes
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);



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


  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
