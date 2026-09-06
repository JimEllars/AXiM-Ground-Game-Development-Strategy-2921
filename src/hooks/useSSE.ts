import { useEffect, useState, useRef } from 'react';
import { interactionsAPI } from '@/services/api'; // Or standard fetch

export function useSSE(url: string) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<Event | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Assuming backend handles auth via cookie or we just use EventSource
    // If JWT is in header, we might need a fetch-based approach or polyfill.
    // For this app, let's assume EventSource works or we append a token to URL
    const token = localStorage.getItem('token');
    const sourceUrl = token ? `${url}?token=${token}` : url;

    const eventSource = new EventSource(sourceUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
      } catch (err) {
        setData(event.data);
      }
    };

    eventSource.onerror = (err) => {
      setError(err);
      eventSource.close();
      // Simple reconnect logic if needed could go here
    };

    eventSourceRef.current = eventSource;

    return () => {
      eventSource.close();
    };
  }, [url]);

  return { data, error };
}
