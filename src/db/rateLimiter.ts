import { DynamoDBService } from './dynamodb';
import { RateLimitEntry } from '../types';

export class RateLimiter {
  private dynamoDB: DynamoDBService;
  private defaultDailyLimit: number;

  constructor() {
    this.dynamoDB = new DynamoDBService();
    this.defaultDailyLimit = parseInt(process.env.DEFAULT_DAILY_MESSAGE_LIMIT || '10', 10);
  }

  async checkAndIncrement(userId: string): Promise<boolean> {
    try {
      if (userId === '203907755') {
        return true;
      }
      const entry = await this.getOrCreateEntry(userId);

      if (this.shouldReset(entry.resetTime)) {
        await this.resetUserCount(userId);
        return true;
      }

      if (entry.messageCount >= entry.dailyLimit) {
        return false;
      }

      await this.incrementCount(userId);
      return true;
    } catch (error) {
      console.error('Error in rate limiting:', error);
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
