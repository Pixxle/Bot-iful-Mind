import { DynamoDBService } from './dynamodb';
import { RateLimitEntry } from '../types';
import { requestContext } from '../utils/requestContext';

export class RateLimiter {
  private dynamoDB: DynamoDBService;
  private defaultDailyLimit: number;

  constructor() {
    this.dynamoDB = new DynamoDBService();
    this.defaultDailyLimit = parseInt(process.env.DEFAULT_DAILY_MESSAGE_LIMIT || '10', 10);
  }

  async checkAndIncrement(userId: string): Promise<boolean> {
    const logger = requestContext.getLogger();
    
    logger.info('Rate limit check started', {
      component: 'RateLimit',
      operation: 'check_start',
      userId
    });

    try {
      // Admin bypass
      if (userId === '203907755') {
        logger.info('Admin user bypassing rate limit', {
          component: 'RateLimit',
          operation: 'admin_bypass',
          userId
        });
        return true;
      }

      const entry = await this.getOrCreateEntry(userId);

      if (this.shouldReset(entry.resetTime)) {
        logger.info('Rate limit reset triggered', {
          component: 'RateLimit',
          operation: 'reset',
          userId,
          previousCount: entry.messageCount,
          resetTime: entry.resetTime
        });
        await this.resetUserCount(userId);
        logger.logRateLimit(userId, entry.dailyLimit - 1, this.getNextResetTime());
        return true;
      }

      const remaining = entry.dailyLimit - entry.messageCount;
      
      if (entry.messageCount >= entry.dailyLimit) {
        logger.warn('Rate limit exceeded', {
          component: 'RateLimit',
          operation: 'limit_exceeded',
          userId,
          messageCount: entry.messageCount,
          dailyLimit: entry.dailyLimit,
          resetTime: entry.resetTime
        });
        logger.logRateLimit(userId, 0, entry.resetTime);
        return false;
      }

      await this.incrementCount(userId);
      logger.logRateLimit(userId, remaining - 1, entry.resetTime);
      
      logger.info('Rate limit check passed', {
        component: 'RateLimit',
        operation: 'check_passed',
        userId,
        newCount: entry.messageCount + 1,
        remaining: remaining - 1,
        dailyLimit: entry.dailyLimit
      });

      return true;
    } catch (error) {
      logger.error('Error in rate limiting', error as Error, {
        component: 'RateLimit',
        operation: 'check_error',
        userId
      });
      // Fail open - allow request when rate limiting fails
      return true;
    }
  }

  private async getOrCreateEntry(userId: string): Promise<RateLimitEntry> {
    const item = await this.dynamoDB.getItem(userId);

    if (!item) {
      const newEntry: RateLimitEntry = {
        userId,
        messageCount: 0,
        resetTime: this.getNextResetTime(),
        dailyLimit: this.defaultDailyLimit,
      };

      await this.dynamoDB.putItem(newEntry as unknown as Record<string, unknown>);
      return newEntry;
    }

    return item as unknown as RateLimitEntry;
  }

  private shouldReset(resetTime: number): boolean {
    return Date.now() >= resetTime;
  }

  private getNextResetTime(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  private async resetUserCount(userId: string): Promise<void> {
    await this.dynamoDB.updateItem(userId, 'SET messageCount = :count, resetTime = :resetTime', {
      ':count': 0,
      ':resetTime': this.getNextResetTime(),
    });
  }

  private async incrementCount(userId: string): Promise<void> {
    await this.dynamoDB.updateItem(userId, 'SET messageCount = messageCount + :inc', {
      ':inc': 1,
    });
  }
}
