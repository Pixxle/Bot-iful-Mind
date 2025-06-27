import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

export class DynamoDBService {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'bot-iful-mind-rate-limits';
  }

  async getItem(userId: string): Promise<Record<string, unknown> | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { userId },
      });

      const response = await this.docClient.send(command);
      return response.Item || null;
    } catch (error) {
      console.error('Error getting item from DynamoDB:', error);
      throw error;
    }
  }

  async putItem(item: Record<string, unknown>): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: item,
      });

      await this.docClient.send(command);
    } catch (error) {
      console.error('Error putting item to DynamoDB:', error);
      throw error;
    }
  }

  async updateItem(
    userId: string,
    updateExpression: string,
    expressionAttributeValues: Record<string, unknown>
  ): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { userId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      });

      await this.docClient.send(command);
    } catch (error) {
      console.error('Error updating item in DynamoDB:', error);
      throw error;
    }
  }
}
