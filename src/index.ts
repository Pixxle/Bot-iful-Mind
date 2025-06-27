import { config } from 'dotenv';
import { TelegramBot } from './bot/telegram';

config();

async function main(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }

  const bot = new TelegramBot(token);

  process.once('SIGINT', () => bot.stop());
  process.once('SIGTERM', () => bot.stop());

  await bot.launch();
}

main().catch(console.error);
