import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { requestContext } from '../utils/requestContext';

export class DynamoDBService {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      ...(process.env.NODE_ENV === 'development' && {
        endpoint: 'http://localhost:8000',
        credentials: {
          accessKeyId: 'dummy',
          secretAccessKey: 'dummy',
        },
      }),
    });

    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'bot-iful-mind-rate-limits';
  }

  async getItem(userId: string): Promise<Record<string, unknown> | null> {
    const logger = requestContext.getLogger();
    const startTime = Date.now();
    
    logger.info('DynamoDB get operation started', {
      component: 'Database',
      operation: 'get_start',
      table: this.tableName,
      userId
    });

    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { userId },
      });

      const response = await this.docClient.send(command);
      const duration = Date.now() - startTime;
      const found = !!response.Item;
      
      logger.logDatabaseOperation('get', this.tableName, duration, true, {
        userId,
        found,
        itemSize: response.Item ? JSON.stringify(response.Item).length : 0
      });

      return response.Item || null;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logDatabaseOperation('get', this.tableName, duration, false, {
        userId,
        error: (error as Error).message
      });
      
      logger.error('Error getting item from DynamoDB', error as Error, {
        component: 'Database',
        operation: 'get_error',
        table: this.tableName,
        userId,
        duration
      });
      throw error;
    }
  }

  async putItem(item: Record<string, unknown>): Promise<void> {
    const logger = requestContext.getLogger();
    const startTime = Date.now();
    
    logger.info('DynamoDB put operation started', {
      component: 'Database',
      operation: 'put_start',
      table: this.tableName,
      itemSize: JSON.stringify(item).length
    });

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: item,
      });

      await this.docClient.send(command);
      const duration = Date.now() - startTime;
      
      logger.logDatabaseOperation('put', this.tableName, duration, true, {
        itemSize: JSON.stringify(item).length
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logDatabaseOperation('put', this.tableName, duration, false, {
        error: (error as Error).message,
        itemSize: JSON.stringify(item).length
      });
      
      logger.error('Error putting item to DynamoDB', error as Error, {
        component: 'Database',
        operation: 'put_error',
        table: this.tableName,
        duration
      });
      throw error;
    }
  }

  async updateItem(
    userId: string,
    updateExpression: string,
    expressionAttributeValues: Record<string, unknown>
  ): Promise<void> {
    const logger = requestContext.getLogger();
    const startTime = Date.now();
    
    logger.info('DynamoDB update operation started', {
      component: 'Database',
      operation: 'update_start',
      table: this.tableName,
      userId,
      updateExpression,
      attributeCount: Object.keys(expressionAttributeValues).length
    });

    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { userId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      });

      await this.docClient.send(command);
      const duration = Date.now() - startTime;
      
      logger.logDatabaseOperation('update', this.tableName, duration, true, {
        userId,
        updateExpression,
        attributeCount: Object.keys(expressionAttributeValues).length
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.logDatabaseOperation('update', this.tableName, duration, false, {
        userId,
        error: (error as Error).message,
        updateExpression
      });
      
      logger.error('Error updating item in DynamoDB', error as Error, {
        component: 'Database',
        operation: 'update_error',
        table: this.tableName,
        userId,
        duration
      });
      throw error;
    }
  }
}
