import { jest } from '@jest/globals';

const mockQuery = jest.fn();
(mockQuery as any).mockResolvedValue({ rows: [{ id: 'mock_id', interaction_date: new Date() }] });

jest.unstable_mockModule('../../config/database.js', () => ({
  pool: {
    query: mockQuery
  }
}));

const { createInteractions } = await import('../interactionsController.js');
const { pool } = await import('../../config/database.js');

describe('Interactions Controller - Performance Baseline', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create 100 valid interactions
    const interactions = Array.from({ length: 100 }, (_, i) => ({
      leadId: `lead-id-${i}`,
      outcome: i % 2 === 0 ? 'interested' : 'not home',
      notes: `Note ${i}`
    }));

    req = {
      user: { id: 'user-id-1' },
      body: interactions
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  it('measures pool.query call count for 100 interactions', async () => {
    const startTime = performance.now();
    await createInteractions(req, res);
    const endTime = performance.now();

    const queryCount = (pool.query as any).mock.calls.length;
    // console.log(`\n--- BASELINE METRICS ---`);
    // console.log(`Execution Time: ${(endTime - startTime).toFixed(2)}ms`);
    // console.log(`Total queries executed: ${queryCount}`);
    // console.log(`Expected for 100 interactions (before opt): 100 INSERTS + 100 UPDATES = 200 queries`);

    // Verify it responds successfully
    expect(res.json).toHaveBeenCalled();
  });
});
