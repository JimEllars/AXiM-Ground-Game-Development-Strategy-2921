import { renderHook, act } from '@testing-library/react';
import { useAsyncApi } from '../useApi';
import { vi } from 'vitest';

describe('useAsyncApi', () => {
  it('should initialize with loading false and error null', () => {
    const { result } = renderHook(() => useAsyncApi());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.execute).toBe('function');
  });

  it('should handle successful api calls', async () => {
    const { result } = renderHook(() => useAsyncApi<string>());
    const mockData = 'Success Data';
    const mockApiCall = vi.fn().mockResolvedValue(mockData);

    let apiResult;
    await act(async () => {
      apiResult = await result.current.execute(mockApiCall);
    });

    expect(mockApiCall).toHaveBeenCalledTimes(1);
    expect(apiResult).toBe(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should update loading state during execution', async () => {
    const { result } = renderHook(() => useAsyncApi<string>());

    let resolveApi: (value: string) => void;
    const mockApiCall = vi.fn().mockImplementation(() => {
      return new Promise<string>((resolve) => {
        resolveApi = resolve;
      });
    });

    // Start execution
    let executePromise: Promise<string | null>;
    act(() => {
      executePromise = result.current.execute(mockApiCall);
    });

    // loading should be true while executing
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    // Resolve the api call
    await act(async () => {
      resolveApi!('Success Data');
      await executePromise;
    });

    // loading should be false again
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle failed api calls and set error state', async () => {
    const { result } = renderHook(() => useAsyncApi<string>());
    const mockError = new Error('API Error');
    const mockApiCall = vi.fn().mockRejectedValue(mockError);

    let apiResult;
    await act(async () => {
      apiResult = await result.current.execute(mockApiCall);
    });

    expect(mockApiCall).toHaveBeenCalledTimes(1);
    expect(apiResult).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(mockError);
  });

  it('should reset error state before a new api call', async () => {
    const { result } = renderHook(() => useAsyncApi<string>());

    // First call fails
    const mockError = new Error('API Error');
    const mockFailingCall = vi.fn().mockRejectedValue(mockError);

    await act(async () => {
      await result.current.execute(mockFailingCall);
    });
    expect(result.current.error).toBe(mockError);

    // Second call is pending
    let resolveApi: (value: string) => void;
    const mockPendingCall = vi.fn().mockImplementation(() => {
      return new Promise<string>((resolve) => {
        resolveApi = resolve;
      });
    });

    let executePromise: Promise<string | null>;
    act(() => {
      executePromise = result.current.execute(mockPendingCall);
    });

    // Error should be null while loading
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    // Resolve second call
    await act(async () => {
      resolveApi!('Success Data');
      await executePromise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
