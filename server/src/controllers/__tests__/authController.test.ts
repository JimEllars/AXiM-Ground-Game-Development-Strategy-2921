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

describe('authController', () => {
  let req: any;
  let res: any;
  let next: any;
  let getProfile: any;
  let registerOrganization: any;

  beforeAll(async () => {
    const controller = await import('../authController.js');
    getProfile = controller.getProfile;
    registerOrganization = controller.registerOrganization;
  });

  beforeEach(() => {
    req = {
      user: { id: 'user123' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });


    describe('registerOrganization', () => {
        it('should require organizationName, email, password, firstName, lastName', async () => {
            req.body = {};
            await registerOrganization(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
            expect(next.mock.calls[0][0].message).toContain('required');
        });

        it('should successfully create organization and admin user', async () => {
            req.body = {
              organizationName: 'Test Org',
              email: 'admin@test.com',
              password: 'password123',
              firstName: 'Test',
              lastName: 'Admin'
            };

            const mockClient = {
              query: jest.fn(),
              release: jest.fn()
            };

            mockPool.connect.mockResolvedValueOnce(mockClient);
            mockClient.query.mockImplementation((query) => {
  if (query.includes("SELECT id FROM users")) return Promise.resolve({ rows: [] });
  if (query.includes("INSERT INTO organizations")) return Promise.resolve({ rows: [{ id: "org123" }] });
  if (query.includes("INSERT INTO users")) return Promise.resolve({ rows: [{ id: "user123", email: "admin@test.com", role: "ADMIN", organization_id: "org123" }] });
  return Promise.resolve();
});



            await registerOrganization(req, res, next);

            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
              token: expect.any(String),
              user: expect.objectContaining({
                email: 'admin@test.com',
                role: 'ADMIN',
                organizationId: 'org123'
              })
            }));
        });

    });


    describe('getProfile', () => {
    it('should return user profile when authenticated and user exists', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'REP',
        organization_id: 'org123',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUser] } as any);

      await getProfile(req, res, next);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email, first_name, last_name, role, organization_id FROM users'),
        ['user123']
      );
      expect(res.json).toHaveBeenCalledWith({
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'REP',
        organizationId: 'org123',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when req.user is missing', async () => {
      req.user = undefined;

      await getProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication error',
          statusCode: 401,
        })
      );
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should return 404 when user is not found in database', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as never);

      await getProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not found or is inactive',
          statusCode: 404,
        })
      );
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should pass database errors to next', async () => {
      const dbError = new Error('DB Connection Failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await getProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
