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
import { logger } from '../src/utils/logger';
import { requestContext } from '../src/utils/requestContext';

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
  
  // Set up request context for logging
  await requestContext.run({
    userId: ctx.userId,
    requestId: logger.generateRequestId()
  }, async () => {
    const contextLogger = requestContext.getLogger();
    contextLogger.info('Bot middleware executed', {
      component: 'Telegram',
      operation: 'middleware',
      userId: ctx.userId,
      updateType: ctx.updateType
    });
    
    await next();
  });
});

bot.start((ctx) => ctx.reply('Welcome! Send me a message or voice note.'));

bot.on('message', async (ctx) => {
  if (!ctx.userId) return;

  await requestContext.run({
    userId: ctx.userId,
    requestId: logger.generateRequestId()
  }, async () => {
    const contextLogger = requestContext.getLogger();
    const startTime = Date.now();

    // Determine message type for logging
    let messageType = 'unknown';
    let textLength = 0;
    
    if ('text' in ctx.message) {
      messageType = 'text';
      textLength = ctx.message.text.length;
    } else if ('voice' in ctx.message) {
      messageType = 'voice';
    }

    requestContext.updateContext({ messageType });
    
    contextLogger.logUserMessage(messageType, textLength, {
      messageId: ctx.message.message_id
    });

    // Check rate limiting
    const canProceed = await rateLimiter.checkAndIncrement(ctx.userId || 'unknown');
    if (!canProceed) {
      contextLogger.warn('Rate limit exceeded', {
        component: 'RateLimit',
        operation: 'block',
        userId: ctx.userId || 'unknown'
      });
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
        
        contextLogger.info('Processing voice message', {
          component: 'VoiceProcessor',
          operation: 'transcribe',
          fileId,
          duration: ctx.message.voice.duration
        });
        
        const transcription = await voiceProcessor.transcribe(fileUrl.href);
        response = await messageHandler.handleTextMessage(transcription.text);
        response = `Transcription: ${transcription.text}\n\n${response}`;
      } else {
        response = 'Please send a text or voice message.';
      }

      await ctx.reply(response);
      
      const duration = Date.now() - startTime;
      contextLogger.logResponse(200, duration, {
        responseLength: response.length
      });
      
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      contextLogger.error('Error handling message', error as Error, {
        component: 'MessageHandler',
        operation: 'handle',
        messageType,
        duration
      });
      await ctx.reply('Sorry, an error occurred while processing your message.');
    }
  });
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const startTime = Date.now();
  const requestId = logger.generateRequestId();
  
  logger.logRequest(req.method || 'UNKNOWN', req.url || '/api/webhook', {
    requestId,
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type']
  });

  try {
    const method = req.method as string;
    if (method === 'POST') {
      const update = req.body as Update;
      
      logger.info('Webhook update received', {
        requestId,
        component: 'Webhook',
        operation: 'update',
        updateType: Object.keys(update).filter(key => key !== 'update_id')[0],
        updateId: update.update_id
      });
      
      await bot.handleUpdate(update);
      
      const duration = Date.now() - startTime;
      logger.logResponse(200, duration, { requestId });
      
      res.status(200).send('OK');
    } else {
      const duration = Date.now() - startTime;
      logger.logResponse(200, duration, { 
        requestId,
        operation: 'health_check'
      });
      res.status(200).json({ status: 'Bot is running' });
    }
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    logger.error('Webhook error', error as Error, {
      requestId,
      component: 'Webhook',
      operation: 'handle',
      duration
    });
    
    logger.logResponse(500, duration, { requestId });
    res.status(500).send('Internal Server Error');
  }
}
