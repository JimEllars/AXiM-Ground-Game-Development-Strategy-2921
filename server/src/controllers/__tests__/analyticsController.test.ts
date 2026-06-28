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

const { getAnalytics, getPerformanceMetrics } = await import('../analyticsController.js');

const mockReq = (query = {}) => ({
  user: { organization_id: 'org1' },
  query
});

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Analytics Controller', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockRes();
  });

  describe('getAnalytics', () => {
    it('should calculate completion rate properly and handle top performers', async () => {
      req = mockReq();

      mockQuery
        .mockResolvedValueOnce({ rows: [{ total_territories: '10', territories_assigned: '5' }] } as any) // territories
        .mockResolvedValueOnce({ rows: [{ total_leads: '100', completed_leads: '25', geocoded_leads: '50' }] } as any) // leads
        .mockResolvedValueOnce({ rows: [
          { id: 1, outcome: 'Completed', lead_id: 'l1', interaction_date: new Date() },
          { id: 2, outcome: 'Completed', lead_id: 'l2', interaction_date: new Date() },
          { id: 3, outcome: 'Not Home', lead_id: 'l3', interaction_date: new Date() },
          { id: 4, outcome: 'Not Interested', lead_id: 'l4', interaction_date: new Date() },
        ] } as any) // interactions - 2/4 completed = 50%
        .mockResolvedValueOnce({ // userStats
          rows: [
            { id: 'u1', first_name: 'Alice', last_name: 'A', role: 'REP', total_interactions: '50', unique_leads: '40', active_days: '10' },
            { id: 'u2', first_name: 'Bob', last_name: 'B', role: 'REP', total_interactions: '0', unique_leads: '0', active_days: '0' },
            { id: 'u3', first_name: 'Charlie', last_name: 'C', role: 'REP', total_interactions: '30', unique_leads: '25', active_days: '8' }
          ]
        } as any);

      await getAnalytics(req, res, mockNext);

      const json = res.json.mock.calls[0][0];

      expect(json.summary.completionRate).toBe(50);
      expect(json.topPerformers).toHaveLength(2); // Bob should be filtered out
      expect(json.topPerformers[0].name).toBe('Alice A'); // Ordered by total interactions
      expect(json.topPerformers[1].name).toBe('Charlie C');
    });

    it('should aggregate interactions correctly by date', async () => {
      req = mockReq();
      const date1 = new Date('2023-01-01T12:00:00Z');
      const date2 = new Date('2023-01-01T14:00:00Z'); // Same date
      const date3 = new Date('2023-01-02T10:00:00Z');

      mockQuery
        .mockResolvedValueOnce({ rows: [{ total_territories: 0, territories_assigned: 0 }] } as any) // territories
        .mockResolvedValueOnce({ rows: [{ total_leads: 0, completed_leads: 0, geocoded_leads: 0 }] } as any) // leads
        .mockResolvedValueOnce({ // interactions
          rows: [
            { interaction_date: date1, outcome: 'Sold', outcome_count: '1', lead_id: 'l1' },
            { interaction_date: date2, outcome: 'Sold', outcome_count: '1', lead_id: 'l2' },
            { interaction_date: date3, outcome: 'Refused', outcome_count: '1', lead_id: 'l3' },
            { interaction_date: date3, outcome: null, outcome_count: '1', lead_id: 'l4' } // edge case: no outcome but has date
          ]
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // userStats

      await getAnalytics(req, res, mockNext);

      const json = res.json.mock.calls[0][0];
      const trends = json.trends;

      expect(trends).toHaveLength(2);

      const entry1 = trends.find((t: any) => t.date === date1.toISOString().split('T')[0]);
      expect(entry1).toBeDefined();
      expect(entry1.interactions).toBe(2);

      const entry2 = trends.find((t: any) => t.date === date3.toISOString().split('T')[0]);
      expect(entry2).toBeDefined();
      expect(entry2.interactions).toBe(2);

      expect(json.summary.activeDays).toBe(2);
    });

    it('should add date filter conditions when startDate and endDate are provided', async () => {
        req = mockReq({ startDate: '2023-01-01', endDate: '2023-01-31' });

        mockQuery
          .mockResolvedValueOnce({ rows: [{ total_territories: 0, territories_assigned: 0 }] } as any) // territories
          .mockResolvedValueOnce({ rows: [{ total_leads: 0, completed_leads: 0, geocoded_leads: 0 }] } as any) // leads
          .mockResolvedValueOnce({ rows: [] } as any) // interactions
          .mockResolvedValueOnce({ rows: [] } as any); // userStats

        await getAnalytics(req, res, mockNext);

        expect(mockQuery).toHaveBeenCalledTimes(4);

        // interactions query should have the date filter
        expect(mockQuery.mock.calls[2][0]).toContain('BETWEEN $2 AND $3');
        expect(mockQuery.mock.calls[2][1]).toEqual(['org1', '2023-01-01', '2023-01-31']);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics aggregated by day', async () => {
      req = mockReq();

      const mockResult = {
        rows: [
          {
            date: new Date('2023-01-01T00:00:00Z'),
            interactions: '10',
            lead_id: 'l1',
            user_id: 'u1',
            first_name: 'Alice',
            last_name: 'A',
            completed_interactions: '5'
          },
          {
             date: new Date('2023-01-01T00:00:00Z'),
             interactions: '5',
             lead_id: 'l2',
             user_id: 'u2',
             first_name: 'Bob',
             last_name: 'B',
             completed_interactions: '2'
          },
          {
            date: new Date('2023-01-02T00:00:00Z'),
            interactions: '8',
            lead_id: 'l1',
            user_id: 'u1',
            first_name: 'Alice',
            last_name: 'A',
            completed_interactions: '4'
          }
        ]
      };

      // Ensure mock queries are resolved as a single array as per Promise.all
      mockQuery.mockResolvedValueOnce({ rows: mockResult.rows } as any); // performanceResult

      await getPerformanceMetrics(req, res, mockNext);

      const json = res.json.mock.calls[0][0];

      expect(json.dailyPerformance).toHaveLength(2);

      const day1 = json.dailyPerformance.find((d: any) => d.date === '2023-01-01');
      expect(day1.totalInteractions).toBe(15);
      expect(day1.uniqueLeads).toBe(2);
      expect(day1.activeUsers).toBe(2);
      expect(day1.completedInteractions).toBe(7);
      expect(day1.completionRate).toBe(Math.round((7 / 15) * 100));

      const day2 = json.dailyPerformance.find((d: any) => d.date === '2023-01-02');
      expect(day2.totalInteractions).toBe(8);
      expect(day2.completedInteractions).toBe(4);
      expect(day2.completionRate).toBe(50);

      expect(json.summary.totalDays).toBe(2);
      expect(json.summary.totalInteractions).toBe(23);
      expect(json.summary.averagePerDay).toBe(12); // Math.round(23/2)
    });

    it('should add date filter conditions when startDate and endDate are provided', async () => {
        req = mockReq({ startDate: '2023-01-01', endDate: '2023-01-31' });

        mockQuery.mockResolvedValueOnce({ rows: [] } as any);

        await getPerformanceMetrics(req, res, mockNext);

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery.mock.calls[0][0]).toContain('BETWEEN $2 AND $3');
        expect(mockQuery.mock.calls[0][1]).toEqual(['org1', '2023-01-01', '2023-01-31']);
    });
  });
});
