import { useState, useEffect, useCallback } from 'react';

    interface UseApiOptions<T> {
      immediate?: boolean;
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
    }

    export function useApi<T>(apiCall: () => Promise<T>, options: UseApiOptions<T> = {}) {
      const [data, setData] = useState<T | null>(null);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState<Error | null>(null);

      const execute = useCallback(async () => {
        try {
          setLoading(true);
          setError(null);
          const result = await apiCall();
          setData(result);
          options.onSuccess?.(result);
        } catch (err) {
          const error = err as Error;
          setError(error);
          options.onError?.(error);
        } finally {
          setLoading(false);
        }
      }, [apiCall, options]);

      useEffect(() => {
        if (options.immediate !== false) {
          execute();
        }
      }, [execute, options.immediate]);

      const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
      }, []);

      return { data, loading, error, execute, reset };
    }

    export function useAsyncApi<T>() {
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState<Error | null>(null);

      const execute = useCallback(async (apiCall: () => Promise<T>): Promise<T | null> => {
        try {
          setLoading(true);
          setError(null);
          const result = await apiCall();
          return result;
        } catch (err) {
          const error = err as Error;
          setError(error);
          return null;
        } finally {
          setLoading(false);
        }
      }, []);

      return { loading, error, execute };
    }