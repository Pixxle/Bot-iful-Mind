import { config } from 'dotenv';
import axios from 'axios';

config();

async function clearWebhook(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }

  console.log('Clearing webhook for local development...');

  try {
    // Clear the webhook
    const response = await axios.post(`https://api.telegram.org/bot${token}/deleteWebhook`);

    if (response.data.ok) {
      console.log('✅ Webhook cleared successfully!');
      console.log('The bot is now ready for local development with polling mode.');
    } else {
      console.error('❌ Failed to clear webhook:', response.data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error clearing webhook:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.log('🤖 Telegram Bot Webhook Cleanup');
  console.log('=================================');
  
  await clearWebhook();
  
  console.log('\n✨ Cleanup complete!');
  console.log('\nNext steps:');
  console.log('1. Run "npm run dev" to start local development');
  console.log('2. The bot will use polling mode instead of webhooks');
}

main().catch(console.error);