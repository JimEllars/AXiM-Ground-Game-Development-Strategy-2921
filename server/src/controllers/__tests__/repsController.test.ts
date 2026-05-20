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

const { getMyTurf, getRepStats } = await import('../repsController.js');

const mockReq = (query = {}) => ({
  user: { id: 'user1', organization_id: 'org1' },
  query
});

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Reps Controller', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockRes();
  });

  describe('getMyTurf', () => {
    it('should return territories and leads assigned to the user', async () => {
      req = mockReq();
      const mockResult = {
        rows: [
          {
            territory_id: 't1',
            territory_name: 'Territory 1',
            territory_description: 'Test territory 1',
            territory_created_at: '2023-01-01',
            territory_boundary: '{"type":"Polygon","coordinates":[[[-122,37],[-122,38],[-121,38],[-121,37],[-122,37]]]}',
            lead_id: 'l1',
            first_name: 'John',
            last_name: 'Doe',
            street_address: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zip: '12345',
            phone: '555-1234',
            email: 'john@example.com',
            status: 'New',
            notes: 'Test lead',
            longitude: -121.5,
            latitude: 37.5,
            lead_created_at: '2023-01-02',
            last_outcome: 'Not Home',
            last_notes: 'Will try again',
            last_interaction_date: '2023-01-03',
          },
          {
            territory_id: 't1',
            territory_name: 'Territory 1',
            territory_boundary: '{"type":"Polygon","coordinates":[[[-122,37],[-122,38],[-121,38],[-121,37],[-122,37]]]}',
            lead_id: 'l2',
            first_name: 'Jane',
            last_name: 'Smith',
            status: 'New',
            longitude: -121.6,
            latitude: 37.6,
            last_outcome: null,
          },
          {
            territory_id: 't2',
            territory_name: 'Territory 2',
            territory_boundary: '{"type":"Polygon","coordinates":[[[-120,35],[-120,36],[-119,36],[-119,35],[-120,35]]]}',
            lead_id: null,
          }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockResult as any);

      await getMyTurf(req, res, mockNext);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('FROM territories t');
      expect(mockQuery.mock.calls[0][1]).toEqual(['user1', 'org1']);

      const responseData = res.json.mock.calls[0][0];

      expect(responseData.territories).toHaveLength(2);

      const t1 = responseData.territories.find((t: any) => t.id === 't1');
      expect(t1.name).toBe('Territory 1');
      expect(t1.boundary.type).toBe('Polygon');
      expect(t1.leads).toHaveLength(2);

      const l1 = t1.leads.find((l: any) => l.id === 'l1');
      expect(l1.firstName).toBe('John');
      expect(l1.location.type).toBe('Point');
      expect(l1.location.coordinates).toEqual([-121.5, 37.5]);
      expect(l1.lastInteraction.outcome).toBe('Not Home');

      const t2 = responseData.territories.find((t: any) => t.id === 't2');
      expect(t2.name).toBe('Territory 2');
      expect(t2.leads).toHaveLength(0);

      expect(responseData.summary).toEqual({
        totalTerritories: 2,
        totalLeads: 2,
        completedLeads: 1,
        completionRate: 50,
      });
    });

    it('should handle user with no assigned territories', async () => {
      req = mockReq();
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await getMyTurf(req, res, mockNext);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.territories).toHaveLength(0);
      expect(responseData.summary).toEqual({
        totalTerritories: 0,
        totalLeads: 0,
        completedLeads: 0,
        completionRate: 0,
      });
    });
  });

  describe('getRepStats', () => {
    it('should return rep stats without date filter', async () => {
      req = mockReq();
      const mockResult = {
        rows: [
          {
            total_interactions: '10',
            unique_leads_contacted: '8',
            active_days: '4',
            outcome: null,
            outcome_count: '10'
          },
          {
            outcome: 'Sold',
            outcome_count: '2'
          },
          {
            outcome: 'Not Home',
            outcome_count: '5'
          },
          {
            outcome: 'Refused',
            outcome_count: '3'
          }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockResult as any);

      await getRepStats(req, res, mockNext);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('WHERE i.user_id = $1');
      expect(mockQuery.mock.calls[0][1]).toEqual(['user1']);

      const responseData = res.json.mock.calls[0][0];

      expect(responseData.totalInteractions).toBe(10);
      expect(responseData.uniqueLeadsContacted).toBe(8);
      expect(responseData.activeDays).toBe(4);
      expect(responseData.outcomeBreakdown).toHaveLength(3);
      expect(responseData.outcomeBreakdown).toContainEqual({ outcome: 'Sold', count: 2 });
    });

    it('should return rep stats with date filter', async () => {
      req = mockReq({ startDate: '2023-01-01', endDate: '2023-01-31' });
      const mockResult = {
        rows: [
          {
            total_interactions: '5',
            unique_leads_contacted: '4',
            active_days: '2',
            outcome: null,
            outcome_count: '5'
          },
          {
            outcome: 'Sold',
            outcome_count: '5'
          }
        ]
      };

      mockQuery.mockResolvedValueOnce(mockResult as any);

      await getRepStats(req, res, mockNext);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('i.interaction_date BETWEEN $2 AND $3');
      expect(mockQuery.mock.calls[0][1]).toEqual(['user1', '2023-01-01', '2023-01-31']);

      const responseData = res.json.mock.calls[0][0];

      expect(responseData.totalInteractions).toBe(5);
      expect(responseData.outcomeBreakdown).toHaveLength(1);
    });

    it('should handle user with no interactions', async () => {
      req = mockReq();
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await getRepStats(req, res, mockNext);

      const responseData = res.json.mock.calls[0][0];

      expect(responseData.totalInteractions).toBe(0);
      expect(responseData.uniqueLeadsContacted).toBe(0);
      expect(responseData.activeDays).toBe(0);
      expect(responseData.outcomeBreakdown).toHaveLength(0);
    });
  });
});
