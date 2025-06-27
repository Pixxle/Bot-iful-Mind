import { AsyncLocalStorage } from 'async_hooks';
import { logger } from './logger';

export interface RequestContext {
  requestId: string;
  userId?: string;
  startTime: number;
  messageType?: string;
  toolUsed?: string;
}

class RequestContextManager {
  private static instance: RequestContextManager;
  public storage = new AsyncLocalStorage<RequestContext>();

  static getInstance(): RequestContextManager {
    if (!RequestContextManager.instance) {
      RequestContextManager.instance = new RequestContextManager();
    }
    return RequestContextManager.instance;
  }

  // Start a new request context
  run<T>(context: Partial<RequestContext>, fn: () => Promise<T>): Promise<T> {
    const requestContext: RequestContext = {
      requestId: context.requestId || logger.generateRequestId(),
      startTime: Date.now(),
      ...context
    };

    return this.storage.run(requestContext, fn);
  }

  // Get current request context
  getContext(): RequestContext | undefined {
    return this.storage.getStore();
  }

  // Update current context
  updateContext(updates: Partial<RequestContext>): void {
    const current = this.getContext();
    if (current) {
      Object.assign(current, updates);
    }
  }

  // Get request duration
  getRequestDuration(): number {
    const context = this.getContext();
    return context ? Date.now() - context.startTime : 0;
  }

  // Create a logger with current context
  getLogger() {
    const context = this.getContext();
    if (context) {
      return logger.child({
        requestId: context.requestId,
        userId: context.userId,
        messageType: context.messageType,
        toolUsed: context.toolUsed
      });
    }
    return logger;
  }
}

// Export singleton instance
export const requestContext = RequestContextManager.getInstance();