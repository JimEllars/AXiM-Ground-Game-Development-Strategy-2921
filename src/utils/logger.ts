const sanitizeArgs = (args: any[]) => {
  const cache = new Set();
  const stringified = JSON.stringify(args, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);
    }
    return value;
  });
  return stringified.length > 50000 ? stringified.substring(0, 50000) + '...[TRUNCATED]' : stringified;
};

const logWithFormat = (level: string, message: string, ...args: any[]) => {
  const logObject = { level, message, args: sanitizeArgs(args), timestamp: new Date().toISOString() };
  let logString = JSON.stringify(logObject);

  if (logString.length > 100000) {
    logString = JSON.stringify({ level, message: 'Payload exceeded 100kb limit', args: '[TRUNCATED]', timestamp: logObject.timestamp });
  }

  if (level === 'info') console.info(logString);
  else if (level === 'warn') console.warn(logString);
  else if (level === 'error') console.error(logString);
  else if (level === 'debug') console.debug(logString);
};


class TelemetryBuffer {
  private buffer: any[] = [];
  private flushInterval: any;

  constructor() {
    this.startInterval();
  }

  private startInterval() {
    if (typeof window !== 'undefined') {
      this.flushInterval = setInterval(() => this.flush(), 15000);
    }
  }

  public push(event: any) {
    this.buffer.push(event);
    if (this.buffer.length >= 10) {
      this.flush();
    }
  }

  public flush() {
    if (this.buffer.length === 0) return;

    const eventsToFlush = [...this.buffer];
    this.buffer = [];

    if (typeof navigator !== 'undefined' && typeof window !== 'undefined') {
      const url = `${(window as any).config?.apiBaseUrl || '/api'}/analytics/telemetry`;
      const payload = JSON.stringify({ events: eventsToFlush });

      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, payload);
        } else {
          fetch(url, {
            method: 'POST',
            body: payload,
            keepalive: true,
            headers: { 'Content-Type': 'application/json' }
          }).catch(() => {});
        }
      } catch(e) {}
    }
  }
}

export const telemetryBuffer = new TelemetryBuffer();

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') logWithFormat('info', message, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      logWithFormat('warn', message, ...args);
      telemetryBuffer.push({ level: 'warn', message, args: sanitizeArgs(args), timestamp: new Date().toISOString() });
    }
  },
  error: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      logWithFormat('error', message, ...args);
      telemetryBuffer.push({ level: 'error', message, args: sanitizeArgs(args), timestamp: new Date().toISOString() });
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (import.meta.env?.DEV && process.env.NODE_ENV !== 'test') logWithFormat('debug', message, ...args);
  }
};
export default logger;
