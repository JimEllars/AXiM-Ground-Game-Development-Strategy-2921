import { AsyncLocalStorage } from 'async_hooks';

export const loggerStorage = new AsyncLocalStorage<string>();

function getCallerContext() {
  const err = new Error();
  const stack = err.stack?.split('\n') || [];
  if (stack.length > 3) {
    const callerLine = stack[3];
    const match = callerLine.match(/\/([^\/]+)\.[a-z]+:/i);
    if (match && match[1]) {
      return match[1];
    }
  }
  return 'Unknown';
}

function formatLog(level: string, message: any, args: any[]) {
  const timestamp = new Date().toISOString();
  const context = getCallerContext();
  const traceId = loggerStorage.getStore() || 'N/A';

  if (process.env.NODE_ENV === 'production') {
    const logObj = {
      timestamp,
      level,
      context,
      traceId,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      args: args.length > 0 ? args : undefined,
    };
    return JSON.stringify(logObj);
  } else {
    const prefix = `[${timestamp}] [${level}] [${context}] [Trace: ${traceId}]`;
    return [prefix, message, ...args];
  }
}

const logger = {
  info: (message: any, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      if (process.env.NODE_ENV === 'production') {
        console.log(formatLog('INFO', message, args));
      } else {
        const formatted = formatLog('INFO', message, args) as any[];
        console.log(formatted[0], formatted[1], ...formatted.slice(2));
      }
    }
  },
  warn: (message: any, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      if (process.env.NODE_ENV === 'production') {
        console.warn(formatLog('WARN', message, args));
      } else {
        const formatted = formatLog('WARN', message, args) as any[];
        console.warn(formatted[0], formatted[1], ...formatted.slice(2));
      }
    }
  },
  error: (message: any, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      if (process.env.NODE_ENV === 'production') {
        console.error(formatLog('ERROR', message, args));
      } else {
        const formatted = formatLog('ERROR', message, args) as any[];
        console.error(formatted[0], formatted[1], ...formatted.slice(2));
      }
    }
  },
  debug: (message: any, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      const formatted = formatLog('DEBUG', message, args) as any[];
      console.debug(formatted[0], formatted[1], ...formatted.slice(2));
    }
  }
};

export default logger;
