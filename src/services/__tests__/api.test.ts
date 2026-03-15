import axios from 'axios';
import api, {
  authAPI,
  territoriesAPI,
  leadsAPI,
  repsAPI,
  interactionsAPI,
  analyticsAPI,
  usersAPI,
  teamsAPI
} from '../api';

jest.mock('../../config', () => ({
  config: {
    apiBaseUrl: '/api',
  },
}));

jest.mock('axios', () => {
  const mAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mAxiosInstance),
    },
  };
});

describe('API Services', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authAPI', () => {
    it('login', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: {} });
      await authAPI.login('test@test.com', 'password');
      expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'test@test.com', password: 'password' });
    });

    it('register', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: {} });
      const data = { email: 't', password: 'p', firstName: 'f', lastName: 'l', organizationId: '1' };
      await authAPI.register(data);
      expect(api.post).toHaveBeenCalledWith('/auth/register', data);
    });

    it('getProfile', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: {} });
      await authAPI.getProfile();
      expect(api.get).toHaveBeenCalledWith('/auth/profile');
    });
  });

  describe('territoriesAPI', () => {
    it('create', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: {} });
      const data = { name: 'Territory', geoJson: {} };
      await territoriesAPI.create(data);
      expect(api.post).toHaveBeenCalledWith('/territories', data);
    });

    it('getAll', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: {} });
      await territoriesAPI.getAll();
      expect(api.get).toHaveBeenCalledWith('/territories');
    });

    it('delete', async () => {
      (api.delete as jest.Mock).mockResolvedValue({ data: {} });
      await territoriesAPI.delete('1');
      expect(api.delete).toHaveBeenCalledWith('/territories/1');
    });

    it('assign', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: {} });
      await territoriesAPI.assign('1', '2');
      expect(api.post).toHaveBeenCalledWith('/territories/1/assign', { userId: '2' });
    });

    it('getAvailableReps', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: {} });
      await territoriesAPI.getAvailableReps();
      expect(api.get).toHaveBeenCalledWith('/territories/available-reps');
    });

    it('getMyTerritories', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: {} });
      await territoriesAPI.getMyTerritories();
      expect(api.get).toHaveBeenCalledWith('/territories/my-territories');
    });

    it('getUserTerritories', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: {} });
      await territoriesAPI.getUserTerritories('1');
      expect(api.get).toHaveBeenCalledWith('/territories/user/1');
    });
  });

  describe('leadsAPI', () => {
    it('upload', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: {} });
      const file = new File(['content'], 'test.csv', { type: 'text/csv' });
      await leadsAPI.upload(file);
      expect(api.post).toHaveBeenCalledWith('/leads/upload', expect.any(FormData), expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' }
      }));
    });

    it('getAll', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: {} });
      await leadsAPI.getAll({ page: 1 });
      expect(api.get).toHaveBeenCalledWith('/leads', { params: { page: 1 } });
    });

    it('update', async () => {
      (api.put as jest.Mock).mockResolvedValue({ data: {} });
      await leadsAPI.update('123', { status: 'new' });
      expect(api.put).toHaveBeenCalledWith('/leads/123', { status: 'new' });
    });

    it('deleteMany', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: {} });
      await leadsAPI.deleteMany(['1', '2']);
      expect(api.post).toHaveBeenCalledWith('/leads/delete-many', { ids: ['1', '2'] });
    });
  });

  describe('repsAPI', () => {
    it('getMyTurf', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: {} });
      await repsAPI.getMyTurf();
      expect(api.get).toHaveBeenCalledWith('/reps/me/turf');
    });

    it('getStats', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: {} });
      await repsAPI.getStats({ startDate: '2023-01-01' });
      expect(api.get).toHaveBeenCalledWith('/reps/me/stats', { params: { startDate: '2023-01-01' } });
    });
  });

  describe('interactionsAPI', () => {
    it('create', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: {} });
      const data = [{ leadId: '1', outcome: 'success' }];
      await interactionsAPI.create(data);
      expect(api.post).toHaveBeenCalledWith('/interactions', data);
    });

    it('getAll', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: {} });
      await interactionsAPI.getAll({ leadId: '1' });
      expect(api.get).toHaveBeenCalledWith('/interactions', { params: { leadId: '1' } });
    });
  });

  describe('analyticsAPI', () => {
    it('getAnalytics', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: {} });
      await analyticsAPI.getAnalytics({ startDate: '2023-01-01' });
      expect(api.get).toHaveBeenCalledWith('/analytics', { params: { startDate: '2023-01-01' } });
    });

    it('getPerformance', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: {} });
      await analyticsAPI.getPerformance({ startDate: '2023-01-01' });
      expect(api.get).toHaveBeenCalledWith('/analytics/performance', { params: { startDate: '2023-01-01' } });
    });
  });

  describe('usersAPI', () => {
    it('getUsers', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: {} });
      await usersAPI.getUsers({ role: 'admin' });
      expect(api.get).toHaveBeenCalledWith('/users', { params: { role: 'admin' } });
    });

    it('createUser', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: {} });
      const data = { email: 't', password: 'p', firstName: 'f', lastName: 'l' };
      await usersAPI.createUser(data);
      expect(api.post).toHaveBeenCalledWith('/users', data);
    });

    it('updateUser', async () => {
      (api.put as jest.Mock).mockResolvedValue({ data: {} });
      await usersAPI.updateUser('1', { firstName: 'new' });
      expect(api.put).toHaveBeenCalledWith('/users/1', { firstName: 'new' });
    });

    it('deleteUser', async () => {
      (api.delete as jest.Mock).mockResolvedValue({ data: {} });
      await usersAPI.deleteUser('1');
      expect(api.delete).toHaveBeenCalledWith('/users/1');
    });

    it('getUserStats', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: {} });
      await usersAPI.getUserStats();
      expect(api.get).toHaveBeenCalledWith('/users/stats');
    });
  });

  describe('teamsAPI', () => {
    it('getTeams', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: {} });
      await teamsAPI.getTeams();
      expect(api.get).toHaveBeenCalledWith('/teams');
    });

    it('createTeam', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: {} });
      await teamsAPI.createTeam({ name: 'team' });
      expect(api.post).toHaveBeenCalledWith('/teams', { name: 'team' });
    });

    it('updateTeam', async () => {
      (api.put as jest.Mock).mockResolvedValue({ data: {} });
      await teamsAPI.updateTeam('1', { name: 'new name' });
      expect(api.put).toHaveBeenCalledWith('/teams/1', { name: 'new name' });
    });

    it('deleteTeam', async () => {
      (api.delete as jest.Mock).mockResolvedValue({ data: {} });
      await teamsAPI.deleteTeam('1');
      expect(api.delete).toHaveBeenCalledWith('/teams/1');
    });

    it('assignUser', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: {} });
      await teamsAPI.assignUser('1', '2');
      expect(api.post).toHaveBeenCalledWith('/teams/1/assign', { userId: '2' });
    });
  });
});
