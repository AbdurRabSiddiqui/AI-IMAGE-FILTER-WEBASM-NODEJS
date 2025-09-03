type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const prefixMap: Record<LogLevel, string> = {
  debug: '[DEBUG]',
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERROR]'
};

function log(level: LogLevel, message: string, ...args: unknown[]) {
  const prefix = prefixMap[level];
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](prefix, message, ...args);
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => log('debug', message, ...args),
  info: (message: string, ...args: unknown[]) => log('info', message, ...args),
  warn: (message: string, ...args: unknown[]) => log('warn', message, ...args),
  error: (message: string, ...args: unknown[]) => log('error', message, ...args)
};


