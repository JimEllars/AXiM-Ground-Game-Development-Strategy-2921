import { jest } from '@jest/globals';

const mockQuery = jest.fn();

const mockPool = {
  query: mockQuery,
  on: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
};

jest.unstable_mockModule('../../config/database.js', () => ({
  pool: mockPool,
  default: mockPool,
}));

describe('usersController', () => {
  let req: any;
  let res: any;
  let getUsers: any;
  let createUser: any;
  let updateUser: any;

  beforeAll(async () => {
    const controller = await import('../usersController.js');
    getUsers = controller.getUsers;
    createUser = controller.createUser;
    updateUser = controller.updateUser;
  });

  beforeEach(() => {
    req = {
      user: { organization_id: 'org1' },
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return all users for the organization', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'ADMIN',
          is_active: true,
          created_at: new Date('2023-01-01T00:00:00Z'),
          assigned_territories: '2',
          team_id: 'team1'
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockUsers } as any);

      await getUsers(req, res);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE organization_id = $1');
      expect(queryCall[1]).toEqual(['org1']);

      expect(res.json).toHaveBeenCalledWith([{
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
        createdAt: mockUsers[0].created_at,
        assignedTerritories: 2,
        teamId: 'team1'
      }]);
    });

    it('should filter users by role', async () => {
      req.query = { role: 'REP' };
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await getUsers(req, res);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE organization_id = $1 AND role = $2');
      expect(queryCall[1]).toEqual(['org1', 'REP']);
    });

    it('should filter users by isActive', async () => {
      req.query = { isActive: 'true' };
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await getUsers(req, res);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE organization_id = $1 AND is_active = $2');
      expect(queryCall[1]).toEqual(['org1', true]);
    });

    it('should filter users by both role and isActive', async () => {
      req.query = { role: 'ADMIN', isActive: 'false' };
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await getUsers(req, res);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE organization_id = $1 AND role = $2 AND is_active = $3');
      expect(queryCall[1]).toEqual(['org1', 'ADMIN', false]);
    });

    it('should pass error to next on database error', async () => {
      const error = new Error('Database error');
      mockQuery.mockRejectedValueOnce(error);
      const next = jest.fn();

      await getUsers(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('should return 400 if role is invalid', async () => {
      req.body = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: 'INVALID_ROLE'
      };

      await createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid role' });
    });

    it('should return 400 if role is empty string', async () => {
      req.body = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: ''
      };

      await createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid role' });
    });

    it('should return 400 if role is null', async () => {
      req.body = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: null
      };

      await createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid role' });
    });
  });

  describe('updateUser', () => {
    it('should return 400 if role is invalid', async () => {
      req.params = { userId: 'user1' };
      req.body = { role: 'INVALID_ROLE' };

      // Mock user belongs to organization check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'user1', organization_id: 'org1', role: 'REP' }]
      } as any);

      await updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid role' });
    });
  });
});