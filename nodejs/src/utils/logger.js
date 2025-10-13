const winston = require('winston');
require('winston-daily-rotate-file');
const config = require('../config/config');
const { format, transports } = winston;

// Custom format to handle errors and stack traces
const errorStackFormat = format((info) => {
  if (info instanceof Error) {
    return {
      ...info,
      message: info.message,
      stack: info.stack
    };
  }
  
  if (info.error && info.error instanceof Error) {
    return {
      ...info,
      message: info.message || info.error.message,
      stack: info.error.stack
    };
  }
  
  return info;
});

const consoleFormat = format.combine(
  errorStackFormat(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.colorize(),
  format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    const status = metadata?.status ? ` [STATUS: ${metadata.status}]` : '';
    const stackTrace = stack ? `\n${stack}` : '';
    return `${timestamp} ${level}: ${message}${status}${stackTrace}`;
  })
);

const fileFormat = format.combine(
  errorStackFormat(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.uncolorize(),
  format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    const status = metadata?.status ? ` [STATUS: ${metadata.status}]` : '';
    const stackTrace = stack ? `\n${stack}` : '';
    return `${timestamp} ${level}: ${message}${status}${stackTrace}`;
  })
);

const infoFileTransport = new transports.DailyRotateFile({
  filename: 'storage/info/%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'info',
  maxFiles: '30d',
  format: fileFormat,
});

const errorFileTransport = new transports.DailyRotateFile({
  filename: 'storage/error/%DATE%-error.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: '30d',
  format: fileFormat,
});

const logger = winston.createLogger({
  level: 'debug',
  transports: [
    new transports.Console({
      format: consoleFormat,
    }),
    infoFileTransport,
    errorFileTransport,
  ],
});

module.exports = logger;
