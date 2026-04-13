import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock ../config before importing api.ts
vi.mock('../config', () => ({
  config: {
    apiBaseUrl: '/api',
  },
}));

// Mock axios.create
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

describe('API Services', () => {
  let authAPI: any;
  let territoriesAPI: any;
  let leadsAPI: any;
  let repsAPI: any;
  let interactionsAPI: any;
  let analyticsAPI: any;
  let usersAPI: any;
  let teamsAPI: any;
  let appointmentsAPI: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    localStorage.clear();

    // Stub location and assign
    vi.stubGlobal('location', {
      pathname: '/',
      assign: vi.fn(),
    });

    const module = await import('../api');
    authAPI = module.authAPI;
    territoriesAPI = module.territoriesAPI;
    leadsAPI = module.leadsAPI;
    repsAPI = module.repsAPI;
    interactionsAPI = module.interactionsAPI;
    analyticsAPI = module.analyticsAPI;
    usersAPI = module.usersAPI;
    teamsAPI = module.teamsAPI;
    appointmentsAPI = module.appointmentsAPI;
  });

  describe('Interceptors', () => {
    it('request interceptor adds Authorization header if token exists', async () => {
      const token = 'test-token';
      localStorage.setItem('token', token);

      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config = { headers: {} } as any;
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBe(`Bearer ${token}`);
    });

    it('response interceptor handles 401 errors', async () => {
      localStorage.setItem('token', 'old-token');
      const responseInterceptorError = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];

      const error = {
        response: { status: 401 }
      };

      await expect(responseInterceptorError(error)).rejects.toEqual(error);
      expect(localStorage.getItem('token')).toBeNull();
      expect(window.location.assign).toHaveBeenCalledWith('/login');
    });

    it('response interceptor does not redirect if already on /login', async () => {
      vi.stubGlobal('location', {
        pathname: '/login',
        assign: vi.fn(),
      });

      const responseInterceptorError = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      const error = {
        response: { status: 401 }
      };

      await expect(responseInterceptorError(error)).rejects.toEqual(error);
      expect(window.location.assign).not.toHaveBeenCalled();
    });
  });

  describe('authAPI', () => {
    it('login success', async () => {
      const mockResponse = { data: { token: 'tok' } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      const result = await authAPI.login('test@test.com', 'password');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login', { email: 'test@test.com', password: 'password' });
      expect(result).toEqual(mockResponse);
    });

    it('login error', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Invalid credentials'));
      await expect(authAPI.login('test@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });

    it('register success', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      const data = { email: 't', password: 'p', firstName: 'f', lastName: 'l', organizationId: 'o1' };
      const result = await authAPI.register(data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/register', data);
      expect(result).toEqual(mockResponse);
    });

    it('getProfile success', async () => {
      const mockResponse = { data: { id: 'u1' } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const result = await authAPI.getProfile();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/profile');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('territoriesAPI', () => {
    it('create success', async () => {
      const mockResponse = { data: { id: 't1' } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      const data = { name: 'Territory', geoJson: {} };
      const result = await territoriesAPI.create(data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/territories', data);
      expect(result).toEqual(mockResponse);
    });

    it('getAll success', async () => {
      const mockResponse = { data: [{ id: 't1' }] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const result = await territoriesAPI.getAll();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/territories');
      expect(result).toEqual(mockResponse);
    });

    it('delete success', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: { success: true } });
      await territoriesAPI.delete('1');
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/territories/1');
    });

    it('assign success', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });
      await territoriesAPI.assign('1', '2');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/territories/1/assign', { userId: '2' });
    });

    it('getAvailableReps success', async () => {
      const mockResponse = { data: [] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const result = await territoriesAPI.getAvailableReps();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/territories/available-reps');
      expect(result).toEqual(mockResponse);
    });

    it('getMyTerritories success', async () => {
      const mockResponse = { data: [] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const result = await territoriesAPI.getMyTerritories();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/territories/my-territories');
      expect(result).toEqual(mockResponse);
    });

    it('getUserTerritories success', async () => {
      const mockResponse = { data: [] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const result = await territoriesAPI.getUserTerritories('u1');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/territories/user/u1');
      expect(result).toEqual(mockResponse);
    });

    it('handles errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network Error'));
      await expect(territoriesAPI.getAll()).rejects.toThrow('Network Error');
    });
  });

  describe('leadsAPI', () => {
    it('upload success', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      const file = new File([''], 'test.csv');
      const result = await leadsAPI.upload(file);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/leads/bulk-import', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const formDataArg = mockAxiosInstance.post.mock.calls[0][1] as FormData;
      expect(formDataArg.get('file')).toEqual(file);
      expect(result).toEqual(mockResponse);
    });

    it('getAll success', async () => {
      const mockResponse = { data: [] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const params = { page: 1, limit: 10 };
      const result = await leadsAPI.getAll(params);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/leads', { params });
      expect(result).toEqual(mockResponse);
    });

    it('update success', async () => {
      const mockResponse = { data: { id: '1' } };
      mockAxiosInstance.put.mockResolvedValue(mockResponse);
      const result = await leadsAPI.update('1', { status: 'contacted' });
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/leads/1', { status: 'contacted' });
      expect(result).toEqual(mockResponse);
    });

    it('deleteMany success', async () => {
      const mockResponse = { data: { count: 2 } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      const result = await leadsAPI.deleteMany(['1', '2']);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/leads/delete-many', { ids: ['1', '2'] });
      expect(result).toEqual(mockResponse);
    });

    it('handles errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Operation failed'));
      await expect(leadsAPI.deleteMany(['1'])).rejects.toThrow('Operation failed');
    });

    it('upload handles errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Upload failed'));
      const file = new File([''], 'test.csv');
      await expect(leadsAPI.upload(file)).rejects.toThrow('Upload failed');
    });

    it('getAll handles errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Failed to fetch leads'));
      await expect(leadsAPI.getAll()).rejects.toThrow('Failed to fetch leads');
    });

    it('update handles errors', async () => {
      mockAxiosInstance.put.mockRejectedValue(new Error('Update failed'));
      await expect(leadsAPI.update('1', { status: 'contacted' })).rejects.toThrow('Update failed');
    });
  });

  describe('repsAPI', () => {
    it('getMyTurf success', async () => {
      const mockResponse = { data: {} };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const result = await repsAPI.getMyTurf();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/reps/me/turf');
      expect(result).toEqual(mockResponse);
    });

    it('getStats success', async () => {
      const mockResponse = { data: {} };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const params = { startDate: '2023-01-01' };
      const result = await repsAPI.getStats(params);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/reps/me/stats', { params });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('interactionsAPI', () => {
    it('create success', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      const data = [{ leadId: '1', outcome: 'contacted' }];
      const result = await interactionsAPI.create(data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/interactions', data);
      expect(result).toEqual(mockResponse);
    });

    it('getAll success', async () => {
      const mockResponse = { data: [] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const params = { leadId: '1' };
      const result = await interactionsAPI.getAll(params);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/interactions', { params });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('analyticsAPI', () => {
    it('getAnalytics success', async () => {
      const mockResponse = { data: {} };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const params = { startDate: '2023-01-01' };
      const result = await analyticsAPI.getAnalytics(params);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/analytics', { params });
      expect(result).toEqual(mockResponse);
    });

    it('getAnalytics handles errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Failed to fetch analytics'));
      await expect(analyticsAPI.getAnalytics()).rejects.toThrow('Failed to fetch analytics');
    });

    it('getPerformance success', async () => {
      const mockResponse = { data: {} };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const params = { startDate: '2023-01-01' };
      const result = await analyticsAPI.getPerformance(params);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/analytics/performance', { params });
      expect(result).toEqual(mockResponse);
    });

    it('getPerformance handles errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Failed to fetch performance data'));
      await expect(analyticsAPI.getPerformance()).rejects.toThrow('Failed to fetch performance data');
    });
  });

  describe('usersAPI', () => {
    it('getUsers success', async () => {
      const mockResponse = { data: [] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const params = { role: 'rep' };
      const result = await usersAPI.getUsers(params);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users', { params });
      expect(result).toEqual(mockResponse);
    });

    it('createUser success', async () => {
      const mockResponse = { data: { id: 'u1' } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      const data = { email: 'e', password: 'p', firstName: 'f', lastName: 'l' };
      const result = await usersAPI.createUser(data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/users', data);
      expect(result).toEqual(mockResponse);
    });

    it('updateUser success', async () => {
      const mockResponse = { data: { id: 'u1' } };
      mockAxiosInstance.put.mockResolvedValue(mockResponse);
      const data = { firstName: 'new' };
      const result = await usersAPI.updateUser('u1', data);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/users/u1', data);
      expect(result).toEqual(mockResponse);
    });

    it('deleteUser success', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: { success: true } });
      await usersAPI.deleteUser('u1');
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/users/u1');
    });

    it('getUserStats success', async () => {
      const mockResponse = { data: {} };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const result = await usersAPI.getUserStats();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users/stats');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('appointmentsAPI', () => {
    it('getAll calls GET /appointments', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { appointments: [] } });
      await appointmentsAPI.getAll({ status: 'Scheduled' });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/appointments', { params: { status: 'Scheduled' } });
    });

    it('create calls POST /appointments', async () => {
      const data = { leadId: '1', userId: '2', scheduledAt: '2023-01-01T10:00:00Z', notes: 'test' };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: { id: '1' } });
      await appointmentsAPI.create(data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/appointments', data);
    });

    it('update calls PUT /appointments/:id', async () => {
      mockAxiosInstance.put.mockResolvedValueOnce({ data: { id: '1' } });
      await appointmentsAPI.update('1', { status: 'Completed' });
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/appointments/1', { status: 'Completed' });
    });

    it('delete calls DELETE /appointments/:id', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: { success: true } });
      await appointmentsAPI.delete('1');
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/appointments/1');
    });
  });

  describe('teamsAPI', () => {
    it('getTeams success', async () => {
      const mockResponse = { data: [] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const result = await teamsAPI.getTeams();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/teams');
      expect(result).toEqual(mockResponse);
    });

    it('createTeam success', async () => {
      const mockResponse = { data: { id: 't1' } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      const data = { name: 'team' };
      const result = await teamsAPI.createTeam(data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/teams', data);
      expect(result).toEqual(mockResponse);
    });

    it('updateTeam success', async () => {
      const mockResponse = { data: { id: 't1' } };
      mockAxiosInstance.put.mockResolvedValue(mockResponse);
      const data = { name: 'new' };
      const result = await teamsAPI.updateTeam('t1', data);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/teams/t1', data);
      expect(result).toEqual(mockResponse);
    });

    it('deleteTeam success', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: { success: true } });
      await teamsAPI.deleteTeam('t1');
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/teams/t1');
    });

    it('assignUser success', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });
      await teamsAPI.assignUser('t1', 'u1');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/teams/t1/assign', { userId: 'u1' });
    });
  });
});
