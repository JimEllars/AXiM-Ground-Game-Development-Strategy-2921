import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import api, { authAPI } from '@/services/api';
import { db } from '@/db';

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

  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [offlinePin, setOfflinePin] = useState('');
  const [cachedUser, setCachedUser] = useState<User | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);

    const handleOfflineAuth = async () => {
      try {
        const authRecords = await db.auth.toArray();
        if (authRecords.length > 0) {
          setCachedUser(authRecords[0].user);
          setShowPinPrompt(true);
          setLoading(false);
          return true;
        }
      } catch (e) {
        console.error("Failed to load cached offline session", e);
      }
      return false;
    };

    const getUser = async () => {
      if (!navigator.onLine) {
        const handled = await handleOfflineAuth();
        if (handled) return;
      }
      const token = localStorage.getItem('token');
      if (token) {
        try {
          setLoading(true);
          const response = await authAPI.getProfile();
          setUser(response.data);
          await db.auth.put({ id: 'current', user: response.data });
        } catch (err: any) {
          if (err.response && [502, 503, 504].includes(err.response.status)) {
            const handled = await handleOfflineAuth();
            if (handled) return;

            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              const decodedUser = {
                id: payload.id || payload.sub,
                email: payload.email || '',
                firstName: payload.firstName || '',
                lastName: payload.lastName || '',
                role: payload.role || '',
                organizationId: payload.organizationId || ''
              };
              setUser(decodedUser);
              await db.auth.put({ id: 'current', user: decodedUser });
              setError(null);
            } catch (e) {
              setError('Failed to load user profile (offline decode failed)');
              localStorage.removeItem('token');
            }
          } else {
            setError(err.response?.data?.error || 'Failed to load user profile');
            localStorage.removeItem('token');
          }
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
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
              const res = await (authAPI as any).refreshToken();
              if (res.data && res.data.token) {
                localStorage.setItem('token', res.data.token);
              }
            }
          } catch (err) {
            console.error('Failed to refresh token in background', err);
          }
        }
      }, 10 * 60 * 1000);
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

  const handlePinSubmit = () => {
    if (offlinePin.length === 4) {
      setUser(cachedUser);
      setShowPinPrompt(false);

      const verifyWhenOnline = async () => {
        if (navigator.onLine) {
          try {
            const response = await authAPI.getProfile();
            setUser(response.data);
            await db.auth.put({ id: 'current', user: response.data });
          } catch(err) {
             console.error("Re-verification failed", err);
          }
          window.removeEventListener('online', verifyWhenOnline);
        }
      };
      window.addEventListener('online', verifyWhenOnline);
    }
  };

  if (showPinPrompt) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Offline Mode Locked</h2>
        <p>Please enter your 4-digit offline PIN to access cached territories.</p>
        <input
          type="password"
          maxLength={4}
          value={offlinePin}
          onChange={(e) => setOfflinePin(e.target.value)}
          style={{ padding: '10px', fontSize: '1.2rem', width: '80px', textAlign: 'center' }}
        />
        <br/><br/>
        <button onClick={handlePinSubmit} style={{ padding: '10px 20px', fontSize: '1rem', cursor: 'pointer' }}>
          Unlock Session
        </button>
      </div>
    );
  }

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
