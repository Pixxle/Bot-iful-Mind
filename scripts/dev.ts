import { config } from 'dotenv';
import axios from 'axios';
import { spawn, ChildProcess } from 'child_process';
import { TelegramBot } from '../src/bot/telegram';

config();

// Ensure we're in development mode for debug logging
process.env.NODE_ENV = 'development';

let ngrokProcess: ChildProcess | null = null;
let bot: TelegramBot | null = null;

async function startNgrokTunnel(): Promise<string> {
  console.log('Starting ngrok tunnel...');

  // Start ngrok process
  ngrokProcess = spawn('ngrok', ['http', '3000'], {
    stdio: 'pipe',
  });

  // Wait for ngrok to start
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // Get tunnel URL from ngrok API
  try {
    const response = await axios.get('http://127.0.0.1:4040/api/tunnels');
    const tunnels = response.data.tunnels;
    const httpTunnel = tunnels.find((t: any) => t.proto === 'https');

    if (!httpTunnel) {
      throw new Error('No HTTPS tunnel found. Make sure ngrok is installed and accessible.');
    }

    const url = httpTunnel.public_url;
    console.log(`✅ ngrok tunnel created: ${url}`);
    return url;
  } catch (error) {
    throw new Error(
      `Failed to get ngrok tunnel: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function setWebhook(tunnelUrl: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }

  const webhookUrl = `${tunnelUrl}/api/webhook`;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
      url: webhookUrl,
      allowed_updates: ['message'],
    });

    console.log(`✅ Webhook set to: ${webhookUrl}`);
  } catch (error) {
    throw new Error(
      `Failed to set webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function clearWebhook(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return;
  }

  try {
    await axios.post(`https://api.telegram.org/bot${token}/deleteWebhook`);
    console.log('✅ Webhook cleared');
  } catch (error) {
    console.error('Failed to clear webhook:', error);
  }
}

async function startBot(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }

  console.log('Starting bot in webhook mode...');
  bot = new TelegramBot(token);
  await bot.launch();
  console.log('✅ Bot started successfully');
}

async function cleanup(): Promise<void> {
  console.log('\n🧹 Cleaning up...');

  // Stop bot
  if (bot) {
    bot.stop();
    console.log('✅ Bot stopped');
  }

  // Clear webhook
  await clearWebhook();

  // Stop ngrok
  if (ngrokProcess) {
    ngrokProcess.kill();
    console.log('✅ ngrok tunnel stopped');
  }
}

async function setupDevelopment(): Promise<void> {
  try {
    console.log('🚀 Starting local development environment...\n');

    // Check if required environment variables are set
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    // Start ngrok tunnel
    const tunnelUrl = await startNgrokTunnel();

    // Set webhook
    await setWebhook(tunnelUrl);

    // Start bot
    await startBot();

    console.log('\n✅ Development environment ready!');
    console.log('📝 Your bot is now running in webhook mode');
    console.log('🌐 Tunnel URL:', tunnelUrl);
    console.log('🔗 Webhook URL:', `${tunnelUrl}/api/webhook`);
    console.log('\nPress Ctrl+C to stop the development server');
  } catch (error) {
    console.error(
      '❌ Failed to start development environment:',
      error instanceof Error ? error.message : error
    );
    await cleanup();
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

setupDevelopment().catch(async (error) => {
  console.error('❌ Development setup failed:', error);
  await cleanup();
  process.exit(1);
});
