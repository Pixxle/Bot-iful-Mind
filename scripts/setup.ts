import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { config } from 'dotenv';

config();

async function setupLocalDynamoDB(): Promise<void> {
  const client = new DynamoDBClient({
    endpoint: 'http://localhost:8000',
    region: 'local',
    credentials: {
      accessKeyId: 'dummy',
      secretAccessKey: 'dummy',
    },
  });

  const tableName = process.env.DYNAMODB_TABLE_NAME || 'bot-iful-mind-rate-limits';

  try {
    await client.send(
      new CreateTableCommand({
        TableName: tableName,
        KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST',
      })
    );

    console.log(`Created DynamoDB table: ${tableName}`);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'ResourceInUseException'
    ) {
      console.log(`Table ${tableName} already exists`);
    } else {
      console.error('Error creating table:', error);
      throw error;
    }
  }
}

async function main(): Promise<void> {
  console.log('Setting up local development environment...');

  await setupLocalDynamoDB();

  console.log('Setup complete!');
  console.log('\nNext steps:');
  console.log('1. Copy .env.example to .env and fill in your values');
  console.log('2. Run "docker-compose up -d" to start local DynamoDB');
  console.log('3. Run "npm run dev" to start the bot in development mode');
}

main().catch(console.error);
