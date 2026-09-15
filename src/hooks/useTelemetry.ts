import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsAPI } from '@/services/api';
import { db } from '@/db';
import logger from '@/utils/logger';

export interface TelemetryEvent {
  type: string;
  name?: string;
  value?: any;
  message?: string;
  timestamp: string;
  url?: string;
  cfRay?: string;
}

export const useTelemetry = () => {
  const location = useLocation();
  const eventBuffer = useRef<TelemetryEvent[]>([]);
  const flushTimeout = useRef<NodeJS.Timeout | null>(null);

  const flush = useCallback(async () => {
    if (eventBuffer.current.length === 0) return;

    const events = [...eventBuffer.current];
    eventBuffer.current = []; // Clear buffer immediately

    if (navigator.onLine) {
      try {
        await analyticsAPI.reportTelemetryEvent({
          events
        });
      } catch (error) {
        logger.error('Failed to flush telemetry batch online, queuing to indexedDB', error);
        // Queue to db if failed
        for (const event of events) {
          await db.telemetryQueue.add({
            payload: event,
            timestamp: Date.now()
          });
        }
      }
    } else {
      // Queue offline
      for (const event of events) {
        await db.telemetryQueue.add({
          payload: event,
          timestamp: Date.now()
        });
      }
    }
  }, []);

  const trackEvent = useCallback((event: Omit<TelemetryEvent, 'timestamp' | 'url'>) => {
    eventBuffer.current.push({
      ...event,
      timestamp: new Date().toISOString(),
      url: window.location.pathname
    });

    if (!flushTimeout.current) {
      flushTimeout.current = setTimeout(() => {
        flush();
        flushTimeout.current = null;
      }, 5000); // Batch every 5 seconds
    }
  }, [flush]);

  useEffect(() => {
    trackEvent({ type: 'navigation', name: 'page_view' });
  }, [location.pathname, trackEvent]);

  // Flush on unmount or visibility hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      if (flushTimeout.current) {
        clearTimeout(flushTimeout.current);
      }
      flush();
    };
  }, [flush]);

  return { trackEvent, flush };
};
