import { jest } from '@jest/globals';

// We need to mock the pool before importing the controller
const mockQuery = jest.fn();

// Create a mock pool object
const mockPool = {
  query: mockQuery,
  on: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
};

// Mock the database module
jest.unstable_mockModule('../../config/database.js', () => ({
  pool: mockPool,
  default: mockPool, // Handle default export too just in case
}));

// Now import the controller
const { getAnalytics } = await import('../analyticsController.js');

// Mock request/response objects
const mockReq = () => ({
  user: { organization_id: 'org1' },
  query: {}
});

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('getAnalytics', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = mockReq();
    res = mockRes();
    jest.clearAllMocks();
  });

  it('should aggregate interactions correctly by date', async () => {
    const date1 = new Date('2023-01-01T12:00:00Z');
    const date2 = new Date('2023-01-01T14:00:00Z'); // Same date
    const date3 = new Date('2023-01-02T10:00:00Z');

    // Return values for each call
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total_territories: 0, territories_assigned: 0 }] } as any) // territories
      .mockResolvedValueOnce({ rows: [{ total_leads: 0, completed_leads: 0, geocoded_leads: 0 }] } as any) // leads
      .mockResolvedValueOnce({ // interactions
        rows: [
          { interaction_date: date1, outcome: 'Sold', outcome_count: '2', lead_id: 'l1' },
          { interaction_date: date2, outcome: 'Sold', outcome_count: '3', lead_id: 'l2' }, // Same date as date1
          { interaction_date: date3, outcome: 'Refused', outcome_count: '1', lead_id: 'l3' }
        ]
      } as any)
      .mockResolvedValueOnce({ rows: [] } as any); // userStats

    await getAnalytics(req, res, mockNext);

    const json = res.json.mock.calls[0][0];
    const trends = json.trends;

    // Check if aggregated
    // Current buggy implementation: 3 items (because date1 object != date string)
    // Fixed implementation: 2 items (2023-01-01 with sum 5, 2023-01-02 with sum 1)

    // We expect this to FAIL with current implementation
    expect(trends).toHaveLength(2);

    // Find the aggregated entry for Jan 1st
    const entry1 = trends.find((t: any) => t.date === date1.toISOString().split('T')[0]);
    expect(entry1).toBeDefined();
    // 2 + 3 = 5
    expect(entry1.interactions).toBe(5);

    // Find the aggregated entry for Jan 2nd
    const entry2 = trends.find((t: any) => t.date === date3.toISOString().split('T')[0]);
    expect(entry2).toBeDefined();
    expect(entry2.interactions).toBe(1);
  });
});
