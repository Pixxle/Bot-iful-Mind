import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { BotContext } from '../types';
import { MessageHandler } from './messageHandler';
import { VoiceProcessor } from './voiceProcessor';
import { RateLimiter } from '../db/rateLimiter';
import { ToolRegistry } from '../tools';
import { LLMClient } from '../llm/client';

export class TelegramBot {
  private bot: Telegraf<BotContext>;
  private messageHandler: MessageHandler;
  private voiceProcessor: VoiceProcessor;
  private rateLimiter: RateLimiter;

  constructor(token: string) {
    this.bot = new Telegraf<BotContext>(token);
    this.rateLimiter = new RateLimiter();

    const toolRegistry = new ToolRegistry();
    const llmClient = new LLMClient();

    this.messageHandler = new MessageHandler(toolRegistry, llmClient);
    this.voiceProcessor = new VoiceProcessor();

    this.setupMiddleware();
    this.setupHandlers();
  }

  private setupMiddleware(): void {
    this.bot.use(async (ctx, next) => {
      if (ctx.from) {
        ctx.userId = ctx.from.id.toString();
      }
      await next();
    });
  }

  private setupHandlers(): void {
    this.bot.start((ctx) => ctx.reply('Welcome! Send me a message or voice note.'));

    this.bot.on(message('text'), async (ctx) => {
      if (!ctx.userId) return;

      const canProceed = await this.rateLimiter.checkAndIncrement(ctx.userId);
      if (!canProceed) {
        await ctx.reply('Daily message limit reached. Please try again tomorrow.');
        return;
      }

      try {
        const response = await this.messageHandler.handleTextMessage(ctx.message.text);
        await ctx.reply(response);
      } catch (error) {
        console.error('Error handling text message:', error);
        await ctx.reply('Sorry, an error occurred while processing your message.');
      }
    });

    this.bot.on(message('voice'), async (ctx) => {
      if (!ctx.userId) return;

      const canProceed = await this.rateLimiter.checkAndIncrement(ctx.userId);
      if (!canProceed) {
        await ctx.reply('Daily message limit reached. Please try again tomorrow.');
        return;
      }

      try {
        const fileId = ctx.message.voice.file_id;
        const fileUrl = await ctx.telegram.getFileLink(fileId);

        const transcription = await this.voiceProcessor.transcribe(fileUrl.href);
        const response = await this.messageHandler.handleTextMessage(transcription.text);

        await ctx.reply(`Transcription: ${transcription.text}\n\n${response}`);
      } catch (error) {
        console.error('Error handling voice message:', error);
        await ctx.reply('Sorry, an error occurred while processing your voice message.');
      }
    });
  }

  async launch(): Promise<void> {
    await this.bot.launch();
    console.log('Bot started');
  }

  stop(): void {
    this.bot.stop();
  }
}
