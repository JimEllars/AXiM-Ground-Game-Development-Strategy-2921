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

// Mock other dependencies if necessary
jest.unstable_mockModule('../../services/geocoding.js', () => ({
  geocodeAddress: jest.fn(),
  batchGeocode: jest.fn(),
}));

jest.unstable_mockModule('../../services/aximService.js', () => ({
  syncLeadToCore: jest.fn(),
}));

const { getLeads } = await import('../leadsController.js');

const mockReq = (query = {}) => ({
  user: { organization_id: 'org-123' },
  query
});

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('getLeads', () => {
  let res: any;

  beforeEach(() => {
    res = mockRes();
    jest.clearAllMocks();
  });

  it('should construct the query correctly with default parameters', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // leads query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // count query

    const req = mockReq();
    await getLeads(req as any, res);

    expect(mockQuery).toHaveBeenCalledTimes(2);

    // Check main query
    const mainQuery = mockQuery.mock.calls[0][0] as string;
    expect(mainQuery).toContain('WHERE l.organization_id = $1');
    expect(mainQuery).toContain('ORDER BY l.created_at DESC');
    expect(mainQuery).toContain('LIMIT $2 OFFSET $3');

    // Check parameters
    const mainParams = mockQuery.mock.calls[0][1] as any[];
    expect(mainParams).toEqual(['org-123', 100, 0]);

    // Check count query
    const countQuery = mockQuery.mock.calls[1][0] as string;
    expect(countQuery).toContain('SELECT COUNT(*)');
    expect(countQuery).toContain('WHERE l.organization_id = $1');
    expect(mockQuery.mock.calls[1][1]).toEqual(['org-123']);
  });

  it('should include status filter in the query', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const req = mockReq({ status: 'New' });
    await getLeads(req as any, res);

    const mainQuery = mockQuery.mock.calls[0][0] as string;
    expect(mainQuery).toContain('AND l.status = $2');

    const mainParams = mockQuery.mock.calls[0][1] as any[];
    expect(mainParams).toContain('New');
  });

  it('should include search filter in the query', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const req = mockReq({ search: 'John' });
    await getLeads(req as any, res);

    const mainQuery = mockQuery.mock.calls[0][0] as string;
    expect(mainQuery).toContain('pii.first_name ILIKE $2');
    expect(mainQuery).toContain('pii.last_name ILIKE $2');
    expect(mainQuery).toContain('pii.street_address ILIKE $2');

    const mainParams = mockQuery.mock.calls[0][1] as any[];
    expect(mainParams).toContain('%John%');
  });

  it('should handle sorting by last_name correctly', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const req = mockReq({ sort: 'last_name', order: 'asc' });
    await getLeads(req as any, res);

    const mainQuery = mockQuery.mock.calls[0][0] as string;
    expect(mainQuery).toContain('ORDER BY pii.last_name ASC');
  });

  it('should handle sorting by status correctly', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const req = mockReq({ sort: 'status' });
    await getLeads(req as any, res);

    const mainQuery = mockQuery.mock.calls[0][0] as string;
    expect(mainQuery).toContain('ORDER BY l.status DESC');
  });

  it('should return 400 for invalid sort column', async () => {
    const req = mockReq({ sort: 'invalid_column' });
    await getLeads(req as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid sort column' });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should handle pagination correctly', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '250' }] });

    const req = mockReq({ page: '3', limit: '50' });
    await getLeads(req as any, res);

    const mainParams = mockQuery.mock.calls[0][1] as any[];
    // page 3, limit 50 -> offset (3-1)*50 = 100
    expect(mainParams).toEqual(['org-123', 50, 100]);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      pagination: {
        page: 3,
        limit: 50,
        total: 250,
        pages: 5
      }
    }));
  });
});
