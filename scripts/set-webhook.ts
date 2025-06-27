import { config } from 'dotenv';
import axios from 'axios';

config();

async function setWebhook(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = 'https://vinterfjard-webhooks.vercel.app/api/webhook';

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }

  console.log('Setting webhook for production deployment...');
  console.log(`Webhook URL: ${webhookUrl}`);

  try {
    // Set the webhook
    const setResponse = await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
      url: webhookUrl,
      allowed_updates: ['message'],
    });

    if (setResponse.data.ok) {
      console.log('✅ Webhook set successfully!');
      
      // Get webhook info to confirm
      const infoResponse = await axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const webhookInfo = infoResponse.data.result;
      
      console.log('\nWebhook Information:');
      console.log(`URL: ${webhookInfo.url}`);
      console.log(`Has custom certificate: ${webhookInfo.has_custom_certificate}`);
      console.log(`Pending update count: ${webhookInfo.pending_update_count}`);
      if (webhookInfo.last_error_date) {
        console.log(`Last error: ${webhookInfo.last_error_message} (${new Date(webhookInfo.last_error_date * 1000).toISOString()})`);
      } else {
        console.log('No recent errors');
      }
    } else {
      console.error('❌ Failed to set webhook:', setResponse.data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.log('🤖 Telegram Bot Webhook Setup');
  console.log('================================');
  
  await setWebhook();
  
  console.log('\n✨ Setup complete!');
  console.log('\nNext steps:');
  console.log('1. Your bot is now configured to receive webhooks from Telegram');
  console.log('2. Send a message to your bot to test the deployment');
  console.log('3. Check the Vercel function logs if you encounter any issues');
}

main().catch(console.error);