import { jest } from '@jest/globals';

const mockCreateClient = jest.fn();

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

describe('supabaseService client initialization', () => {
  const originalEnv = process.env;
  let originalConsoleWarn: any;

  beforeAll(() => {
    originalConsoleWarn = console.warn;
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.warn = originalConsoleWarn;
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.resetModules();
    mockCreateClient.mockClear();
    (console.warn as jest.Mock).mockClear();
    process.env = { ...originalEnv };
  });

  it('should initialize supabase client when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided', async () => {
    process.env.SUPABASE_URL = 'http://test-supabase-url.com';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    delete process.env.SUPABASE_ANON_KEY;

    mockCreateClient.mockReturnValueOnce({ mockClient: 'service_role' });

    const module = await import('../supabaseService.js');

    expect(mockCreateClient).toHaveBeenCalledWith(
      'http://test-supabase-url.com',
      'test-service-role-key'
    );
    expect(module.supabase).toEqual({ mockClient: 'service_role' });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should initialize supabase client when SUPABASE_URL and SUPABASE_ANON_KEY are provided', async () => {
    process.env.SUPABASE_URL = 'http://test-supabase-url.com';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';

    mockCreateClient.mockReturnValueOnce({ mockClient: 'anon' });

    const module = await import('../supabaseService.js');

    expect(mockCreateClient).toHaveBeenCalledWith(
      'http://test-supabase-url.com',
      'test-anon-key'
    );
    expect(module.supabase).toEqual({ mockClient: 'anon' });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should warn and export null when SUPABASE_URL is missing', async () => {
    delete process.env.SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    const module = await import('../supabaseService.js');

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(module.supabase).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      'Supabase credentials not found. Supabase service will not be initialized.'
    );
  });

  it('should warn and export null when both SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY are missing', async () => {
    process.env.SUPABASE_URL = 'http://test-supabase-url.com';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;

    const module = await import('../supabaseService.js');

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(module.supabase).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      'Supabase credentials not found. Supabase service will not be initialized.'
    );
  });

  it('should warn and export null when SUPABASE_URL and both keys are missing', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;

    const module = await import('../supabaseService.js');

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(module.supabase).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      'Supabase credentials not found. Supabase service will not be initialized.'
    );
  });

  it('should fallback to SUPABASE_ANON_KEY if SUPABASE_SERVICE_ROLE_KEY is not provided', async () => {
    process.env.SUPABASE_URL = 'http://test-supabase-url.com';
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';

    mockCreateClient.mockReturnValueOnce({ mockClient: 'anon' });

    const module = await import('../supabaseService.js');

    expect(mockCreateClient).toHaveBeenCalledWith(
      'http://test-supabase-url.com',
      'test-anon-key'
    );
    expect(module.supabase).toEqual({ mockClient: 'anon' });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should prefer SUPABASE_SERVICE_ROLE_KEY over SUPABASE_ANON_KEY when both are provided', async () => {
    process.env.SUPABASE_URL = 'http://test-supabase-url.com';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';

    mockCreateClient.mockReturnValueOnce({ mockClient: 'service_role' });

    const module = await import('../supabaseService.js');

    expect(mockCreateClient).toHaveBeenCalledWith(
      'http://test-supabase-url.com',
      'test-service-role-key'
    );
    expect(module.supabase).toEqual({ mockClient: 'service_role' });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should warn and export null when SUPABASE_URL is an empty string', async () => {
    process.env.SUPABASE_URL = '';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    const module = await import('../supabaseService.js');

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(module.supabase).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      'Supabase credentials not found. Supabase service will not be initialized.'
    );
  });

  it('should warn and export null when both keys are empty strings', async () => {
    process.env.SUPABASE_URL = 'http://test-supabase-url.com';
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    process.env.SUPABASE_ANON_KEY = '';

    const module = await import('../supabaseService.js');

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(module.supabase).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(
      'Supabase credentials not found. Supabase service will not be initialized.'
    );
  });
});
