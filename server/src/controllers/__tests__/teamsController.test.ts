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

describe('teamsController', () => {
  let req: any;
  let res: any;
  let getTeams: any;
  let updateTeam: any;

  beforeAll(async () => {
    const controller = await import('../teamsController.js');
    getTeams = controller.getTeams;
    updateTeam = controller.updateTeam;
  });

  beforeEach(() => {
    req = {
      user: { organization_id: 'org1' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('getTeams', () => {
    it('should return all teams for the organization', async () => {
      const mockTeams = [
        {
          id: 'team1',
          name: 'Sales Team A',
          description: 'Top performers',
          created_at: new Date('2023-01-01T00:00:00Z'),
          updated_at: new Date('2023-01-02T00:00:00Z'),
          member_count: '5'
        },
        {
          id: 'team2',
          name: 'Sales Team B',
          description: null,
          created_at: new Date('2023-02-01T00:00:00Z'),
          updated_at: new Date('2023-02-02T00:00:00Z'),
          member_count: '0'
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockTeams } as any);

      await getTeams(req, res);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('WHERE t.organization_id = $1');
      expect(queryCall[1]).toEqual(['org1']);

      expect(res.json).toHaveBeenCalledWith([
        {
          id: 'team1',
          name: 'Sales Team A',
          description: 'Top performers',
          createdAt: mockTeams[0].created_at,
          updatedAt: mockTeams[0].updated_at,
          memberCount: 5
        },
        {
          id: 'team2',
          name: 'Sales Team B',
          description: null,
          createdAt: mockTeams[1].created_at,
          updatedAt: mockTeams[1].updated_at,
          memberCount: 0
        }
      ]);
    });

    it('should pass error to next on database error', async () => {
      const error = new Error('Database error');
      mockQuery.mockRejectedValueOnce(error);
      const next = jest.fn();

      await getTeams(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('updateTeam', () => {
    it('should update a team and return it with member count', async () => {
      req.params = { id: 'team1' };
      req.body = { name: 'New Name', description: 'New Desc' };

      const mockUpdatedTeam = {
        id: 'team1',
        name: 'New Name',
        description: 'New Desc',
        created_at: new Date(),
        updated_at: new Date(),
        member_count: '5'
      };

      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [mockUpdatedTeam]
      } as any);

      await updateTeam(req, res);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('UPDATE teams');
      expect(queryCall[0]).toContain('RETURNING *, (SELECT COUNT(*) FROM users WHERE team_id = teams.id) as member_count');

      // params: [name, description, id, org_id]
      expect(queryCall[1]).toEqual(['New Name', 'New Desc', 'team1', 'org1']);

      expect(res.json).toHaveBeenCalledWith({
        id: 'team1',
        name: 'New Name',
        description: 'New Desc',
        createdAt: mockUpdatedTeam.created_at,
        updatedAt: mockUpdatedTeam.updated_at,
        memberCount: 5
      });
    });

    it('should return 404 if team not found or not in org', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { name: 'New Name' };

      mockQuery.mockResolvedValueOnce({
        rowCount: 0,
        rows: []
      } as any);

      await updateTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Team not found' });
    });
  });
});
