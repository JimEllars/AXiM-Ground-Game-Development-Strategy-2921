const logger = {
  info: (message: any, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(message, ...args);
    }
  },
  warn: (message: any, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(message, ...args);
    }
  },
  error: (message: any, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(message, ...args);
    }
  },
  debug: (message: any, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(message, ...args);
    }
  }
};

export default logger;
