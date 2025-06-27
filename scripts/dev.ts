import { config } from 'dotenv';
import * as ngrok from 'ngrok';
import axios from 'axios';
import { TelegramBot } from '../src/bot/telegram';

config();

async function setupDevelopment(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const port = process.env.PORT || 3000;

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }

  console.log('Starting local development environment...');

  const url = await ngrok.connect({
    port: Number(port),
    proto: 'http',
  });

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
    void ngrok.kill();
    process.exit(0);
  });

  await bot.launch();
}

setupDevelopment().catch(console.error);
