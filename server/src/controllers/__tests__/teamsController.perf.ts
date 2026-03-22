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

describe('Teams Controller - Performance Verification', () => {
  let req: any;
  let res: any;
  let updateTeam: any;

  beforeAll(async () => {
    const controller = await import('../teamsController.js');
    updateTeam = controller.updateTeam;
  });

  beforeEach(() => {
    req = {
      user: { organization_id: 'org1' },
      params: { id: 'team1' },
      body: { name: 'Updated Team' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  it('measures pool.query call count for updateTeam (Optimized)', async () => {
    // Single query for everything
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'team1',
        name: 'Updated Team',
        description: 'Desc',
        created_at: new Date(),
        updated_at: new Date(),
        member_count: '5'
      }]
    } as any);

    await updateTeam(req, res);

    const queryCount = mockQuery.mock.calls.length;
    console.log(`\n--- OPTIMIZED METRICS ---`);
    console.log(`Total queries executed: ${queryCount}`);

    expect(queryCount).toBe(1);
    expect(res.json).toHaveBeenCalled();
  });
});
