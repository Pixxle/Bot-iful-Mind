import { VercelRequest, VercelResponse } from '@vercel/node';
import { Telegraf } from 'telegraf';
import { Update } from 'telegraf/types';
import { config } from 'dotenv';
import { BotContext } from '../src/types';
import { MessageHandler } from '../src/bot/messageHandler';
import { VoiceProcessor } from '../src/bot/voiceProcessor';
import { RateLimiter } from '../src/db/rateLimiter';
import { ToolRegistry } from '../src/tools';
import { LLMClient } from '../src/llm/client';

config();

const bot = new Telegraf<BotContext>(process.env.TELEGRAM_BOT_TOKEN!);
const rateLimiter = new RateLimiter();
const toolRegistry = new ToolRegistry();
const llmClient = new LLMClient();
const messageHandler = new MessageHandler(toolRegistry, llmClient);
const voiceProcessor = new VoiceProcessor();

bot.use(async (ctx, next) => {
  if (ctx.from) {
    ctx.userId = ctx.from.id.toString();
  }
  await next();
});

bot.start((ctx) => ctx.reply('Welcome! Send me a message or voice note.'));

bot.on('message', async (ctx) => {
  if (!ctx.userId) return;

  const canProceed = await rateLimiter.checkAndIncrement(ctx.userId);
  if (!canProceed) {
    await ctx.reply('Daily message limit reached. Please try again tomorrow.');
    return;
  }

  try {
    let response: string;

    if ('text' in ctx.message) {
      response = await messageHandler.handleTextMessage(ctx.message.text);
    } else if ('voice' in ctx.message) {
      const fileId = ctx.message.voice.file_id;
      const fileUrl = await ctx.telegram.getFileLink(fileId);
      const transcription = await voiceProcessor.transcribe(fileUrl.href);
      response = await messageHandler.handleTextMessage(transcription.text);
      response = `Transcription: ${transcription.text}\n\n${response}`;
    } else {
      response = 'Please send a text or voice message.';
    }

    await ctx.reply(response);
  } catch (error: unknown) {
    console.error('Error handling message:', error);
    await ctx.reply('Sorry, an error occurred while processing your message.');
  }
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const method = req.method as string;
    if (method === 'POST') {
      const update = req.body as Update;
      await bot.handleUpdate(update);
      res.status(200).send('OK');
    } else {
      res.status(200).json({ status: 'Bot is running' });
    }
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
}
