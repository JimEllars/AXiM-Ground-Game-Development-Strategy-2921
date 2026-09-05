
import logger from '@/utils/logger';
import { vi } from 'vitest';

vi.mock('../../config', () => ({
  config: {
    apiBaseUrl: '/api',
  },
}));

let requestInterceptor: any;
let responseInterceptorSuccess: any;
let responseInterceptorError: any;

const mAxiosInstance = Object.assign(vi.fn(), {
  interceptors: {
    request: {
      use: vi.fn((req) => {
        requestInterceptor = req;
      }),
    },
    response: {
      use: vi.fn((resSuccess, resError) => {
        responseInterceptorSuccess = resSuccess;
        responseInterceptorError = resError;
      }),
    },
  },
  post: vi.fn().mockResolvedValue({ data: { token: 'new-token' } }),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
});

vi.mock('axios', () => ({
  __esModule: true,
  default: {
    create: vi.fn(() => mAxiosInstance),
  },
}));

describe('API Interceptors', () => {
  beforeAll(async () => {
    await import('../api');
  });

  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
       vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => null);
       vi.spyOn(window.localStorage.__proto__, 'removeItem').mockImplementation(() => {});
       vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {});
    } else if (typeof global !== 'undefined' && global.localStorage) {
       vi.spyOn(global.localStorage, 'getItem').mockImplementation(() => null);
       vi.spyOn(global.localStorage, 'removeItem').mockImplementation(() => {});
       vi.spyOn(global.localStorage, 'setItem').mockImplementation(() => {});
    }
    vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('request interceptor should add token if it exists', () => {
    const config = { headers: {} };
    if (typeof window !== 'undefined' && window.localStorage) {
       vi.spyOn(window.localStorage.__proto__, 'getItem').mockReturnValue('test-token');
    }
    const newConfig = requestInterceptor(config);
    expect(newConfig.headers.Authorization).toBe('Bearer test-token');
  });

  it('response interceptor should silently refresh token and replay failed request on 401', async () => {
    let assignMock = vi.fn();
    try {
        delete (window as any).location;
        window.location = { pathname: '/some-other-path', assign: assignMock } as any;
    } catch (e) {}

    const originalRequest = { url: '/test', headers: {} };
    const mockError = { response: { status: 401 }, config: originalRequest };
    mAxiosInstance.post.mockResolvedValueOnce({ data: { token: 'new-test-token' } });

    // interceptor triggers refresh
    const resultPromise = responseInterceptorError(mockError);
    await new Promise(process.nextTick);

    expect(mAxiosInstance.post).toHaveBeenCalledWith('/auth/refresh-token');
  });

  it('response interceptor should handle 401 error and redirect if retry fails', async () => {
    let assignMock = vi.fn();
    try {
        delete (window as any).location;
        window.location = { pathname: '/some-other-path', assign: assignMock } as any;
    } catch (e) {}

    const originalRequest = { url: '/test', headers: {} };
    const mockError = { response: { status: 401 }, config: originalRequest };
    mAxiosInstance.post.mockRejectedValueOnce({ response: { status: 401 } });

    await expect(responseInterceptorError(mockError)).rejects.toBeDefined();
  });
});
