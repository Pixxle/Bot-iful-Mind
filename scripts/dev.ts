import { config } from 'dotenv';
import axios from 'axios';
import { TelegramBot } from '../src/bot/telegram';

config();

async function setupDevelopment(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }

  console.log('Starting local development environment...');

  // Get tunnel URL from running ngrok instance
  const response = await axios.get('http://127.0.0.1:4040/api/tunnels');
  const tunnels = response.data.tunnels;
  const httpTunnel = tunnels.find((t: any) => t.proto === 'https');

  if (!httpTunnel) {
    throw new Error('No HTTPS tunnel found. Make sure ngrok is running with: ngrok http 3000');
  }

  const url = httpTunnel.public_url;

  console.log(`ngrok tunnel created: ${url}`);

  const webhookUrl = `${url}/api/webhook`;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
      url: webhookUrl,
      allowed_updates: ['message'],
    });

    console.log(`Webhook set to: ${webhookUrl}`);
  } catch (error) {
    console.error('Failed to set webhook:', error);
    process.exit(1);
  }

  console.log('Starting bot in polling mode for local development...');
  const bot = new TelegramBot(token);

  process.once('SIGINT', () => {
    console.log('Shutting down...');
    bot.stop();
    process.exit(0);
  });

  await bot.launch();
}

setupDevelopment().catch(console.error);
