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

  beforeAll(async () => {
    const controller = await import('../teamsController.js');
    getTeams = controller.getTeams;
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

    it('should return 500 on database error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await getTeams(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });

      consoleErrorSpy.mockRestore();
    });
  });
});
