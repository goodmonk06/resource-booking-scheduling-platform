import { Injectable, Scope } from '@nestjs/common';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  [key: string]: any;
}

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService {
  private context: string = 'Application';
  private correlationId?: string;

  setContext(context: string): void {
    this.context = context;
  }

  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      correlationId: this.correlationId,
      message,
      ...context,
    };

    // In production, this would integrate with Winston, Pino, or a log aggregation service
    // For now, structured JSON logging to console
    const logMethod = level === LogLevel.ERROR ? console.error : console.log;
    logMethod(JSON.stringify(logEntry));
  }

  // Helper method for creating child loggers with additional context
  child(context: LogContext): LoggerService {
    const childLogger = new LoggerService();
    childLogger.context = this.context;
    childLogger.correlationId = this.correlationId;
    Object.assign(childLogger, context);
    return childLogger;
  }
}
