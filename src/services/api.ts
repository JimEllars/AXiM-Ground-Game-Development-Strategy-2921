import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Pass through successful responses
    return response;
  },
  (error) => {
    // Check if it's a genuine 401 error
    if (error.response && error.response.status === 401) {
      console.error('Authentication Error: Redirecting to login.');
      localStorage.removeItem('token');
      // Use location.assign for a cleaner redirect
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    // For all other errors, just reject the promise
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    role?: string;
  }) => 
    api.post('/auth/register', data),
  getProfile: () => 
    api.get('/auth/profile'),
};

// Territories API
export const territoriesAPI = {
  create: (data: { name: string; description?: string; geoJson: any }) => 
    api.post('/territories', data),
  getAll: () => 
    api.get('/territories'),
  delete: (id: string) => 
    api.delete(`/territories/${id}`),
  assign: (territoryId: string, userId: string) => 
    api.post(`/territories/${territoryId}/assign`, { userId }),
  getAvailableReps: () => 
    api.get('/territories/available-reps'),
  getMyTerritories: () => 
    api.get('/territories/my-territories'),
};

// Leads API
export const leadsAPI = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/leads/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getAll: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }) => 
    api.get('/leads', { params }),
  update: (id: string, data: Partial<{
    status: string;
    notes: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    streetAddress: string;
    city: string;
    state: string;
    zip: string;
  }>) =>
    api.put(`/leads/${id}`, data),
  deleteMany: (ids: string[]) =>
    api.post('/leads/delete-many', { ids }),
};

// Reps API
export const repsAPI = {
  getMyTurf: () => 
    api.get('/reps/me/turf'),
  getStats: (params?: { startDate?: string; endDate?: string }) => 
    api.get('/reps/me/stats', { params }),
};

// Interactions API
export const interactionsAPI = {
  create: (interactions: Array<{
    leadId: string;
    outcome: string;
    notes?: string;
    interactionDate?: Date;
    location?: { longitude: number; latitude: number };
  }>) => 
    api.post('/interactions', interactions),
  getAll: (params?: {
    leadId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => 
    api.get('/interactions', { params }),
};

// Analytics API
export const analyticsAPI = {
  getAnalytics: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/analytics', { params }),
  getPerformance: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/analytics/performance', { params }),
};

// Users API
export const usersAPI = {
  getUsers: (params?: { role?: string; isActive?: boolean }) =>
    api.get('/users', { params }),
  createUser: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }) =>
    api.post('/users', data),
  updateUser: (userId: string, data: {
    firstName?: string;
    lastName?: string;
    role?: string;
    password?: string;
    isActive?: boolean;
  }) =>
    api.put(`/users/${userId}`, data),
  deleteUser: (userId: string) =>
    api.delete(`/users/${userId}`),
  getUserStats: () =>
    api.get('/users/stats'),
};

export default api;