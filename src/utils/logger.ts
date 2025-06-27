import winston from 'winston';
import { randomUUID } from 'crypto';

export interface LogContext {
  requestId?: string;
  userId?: string;
  component?: string;
  tool?: string;
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

class Logger {
  public winston: winston.Logger;
  private static instance: Logger;

  constructor() {
    const isDev = process.env.NODE_ENV !== 'production';
    
    // Create winston logger instance
    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        isDev 
          ? winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            )
          : winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          handleExceptions: true,
          handleRejections: true,
        })
      ],
      exitOnError: false
    });
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public formatMessage(message: string, context?: LogContext): Record<string, unknown> {
    const logEntry = {
      message,
      ...context,
      timestamp: new Date().toISOString(),
    };

    return logEntry;
  }

  debug(message: string, context?: LogContext): void {
    this.winston.debug(this.formatMessage(message, context));
  }

  info(message: string, context?: LogContext): void {
    this.winston.info(this.formatMessage(message, context));
  }

  warn(message: string, context?: LogContext): void {
    this.winston.warn(this.formatMessage(message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const logContext = {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };
    
    this.winston.error(this.formatMessage(message, logContext));
  }

  // Specialized logging methods
  logRequest(method: string, path: string, context?: LogContext): void {
    this.info('Request received', {
      ...context,
      component: 'API',
      operation: 'request',
      method,
      path
    });
  }

  logResponse(statusCode: number, duration: number, context?: LogContext): void {
    this.info('Request completed', {
      ...context,
      component: 'API',
      operation: 'response',
      statusCode,
      duration
    });
  }

  logToolExecution(toolName: string, duration: number, success: boolean, context?: LogContext): void {
    this.info(`Tool execution ${success ? 'completed' : 'failed'}`, {
      ...context,
      component: 'ToolExecution',
      tool: toolName,
      operation: 'execute',
      duration,
      success
    });
  }

  logLLMCall(model: string, promptTokens: number, completionTokens: number, duration: number, context?: LogContext): void {
    this.info('LLM API call completed', {
      ...context,
      component: 'LLM',
      operation: 'completion',
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      duration
    });
  }

  logDatabaseOperation(operation: string, table: string, duration: number, success: boolean, context?: LogContext): void {
    this.info(`Database ${operation} ${success ? 'completed' : 'failed'}`, {
      ...context,
      component: 'Database',
      operation,
      table,
      duration,
      success
    });
  }

  logUserMessage(messageType: string, textLength?: number, context?: LogContext): void {
    this.info('User message received', {
      ...context,
      component: 'MessageHandler',
      operation: 'receive',
      messageType,
      textLength
    });
  }

  logRateLimit(userId: string, remaining: number, resetTime: number, context?: LogContext): void {
    this.info('Rate limit checked', {
      ...context,
      component: 'RateLimit',
      operation: 'check',
      userId,
      remaining,
      resetTime
    });
  }

  // Utility method to generate request IDs
  generateRequestId(): string {
    return `req_${randomUUID().slice(0, 8)}`;
  }

  // Method to create child logger with persistent context
  child(context: LogContext): ChildLogger {
    return new ChildLogger(this, context);
  }
}

class ChildLogger {
  constructor(private parent: Logger, private context: LogContext) {}

  debug(message: string, additionalContext?: LogContext): void {
    this.parent.debug(message, { ...this.context, ...additionalContext });
  }

  info(message: string, additionalContext?: LogContext): void {
    this.parent.info(message, { ...this.context, ...additionalContext });
  }

  warn(message: string, additionalContext?: LogContext): void {
    this.parent.warn(message, { ...this.context, ...additionalContext });
  }

  error(message: string, error?: Error, additionalContext?: LogContext): void {
    this.parent.error(message, error, { ...this.context, ...additionalContext });
  }

  logRequest(method: string, path: string, additionalContext?: LogContext): void {
    this.parent.logRequest(method, path, { ...this.context, ...additionalContext });
  }

  logResponse(statusCode: number, duration: number, additionalContext?: LogContext): void {
    this.parent.logResponse(statusCode, duration, { ...this.context, ...additionalContext });
  }

  logToolExecution(toolName: string, duration: number, success: boolean, additionalContext?: LogContext): void {
    this.parent.logToolExecution(toolName, duration, success, { ...this.context, ...additionalContext });
  }

  logLLMCall(model: string, promptTokens: number, completionTokens: number, duration: number, additionalContext?: LogContext): void {
    this.parent.logLLMCall(model, promptTokens, completionTokens, duration, { ...this.context, ...additionalContext });
  }

  logDatabaseOperation(operation: string, table: string, duration: number, success: boolean, additionalContext?: LogContext): void {
    this.parent.logDatabaseOperation(operation, table, duration, success, { ...this.context, ...additionalContext });
  }

  logUserMessage(messageType: string, textLength?: number, additionalContext?: LogContext): void {
    this.parent.logUserMessage(messageType, textLength, { ...this.context, ...additionalContext });
  }

  logRateLimit(userId: string, remaining: number, resetTime: number, additionalContext?: LogContext): void {
    this.parent.logRateLimit(userId, remaining, resetTime, { ...this.context, ...additionalContext });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
export { ChildLogger };