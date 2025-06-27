import { Context } from 'telegraf';
import { Update } from 'telegraf/types';

export interface BotContext extends Context<Update> {
  userId?: string;
  messageCount?: number;
}

export interface Tool {
  name: string;
  description: string;
  execute: (input: ToolInput) => Promise<ToolOutput>;
}

export interface ToolInput {
  query: string;
  parameters?: Record<string, unknown>;
}

export interface ToolOutput {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface LLMResponse {
  shouldUseTool: boolean;
  toolName?: string;
  toolParameters?: Record<string, unknown>;
  response?: string;
}

export interface RateLimitEntry {
  userId: string;
  messageCount: number;
  resetTime: number;
  dailyLimit: number;
}

export interface VoiceTranscription {
  text: string;
  language?: string;
  duration?: number;
}
