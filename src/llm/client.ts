import OpenAI from 'openai';
import { LLMResponse } from '../types';

export class LLMClient {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      messages.push({ role: 'user', content: prompt });

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      throw new Error('Failed to get LLM response');
    }
  }

  async analyzeForToolUse(
    message: string,
    availableTools: Array<{ name: string; description: string }>
  ): Promise<LLMResponse> {
    const systemPrompt = `You are a tool router for a Telegram bot. Analyze the user's message and determine if any of the available tools should be used to answer their query.

Available tools:
${availableTools.map((t) => `- ${t.name}: ${t.description}`).join('\n')}

Respond in JSON format:
{
  "shouldUseTool": boolean,
  "toolName": "tool name if applicable",
  "toolParameters": { ... },
  "response": "direct response if no tool is needed"
}`;

    try {
      const response = await this.complete(message, systemPrompt);
      return JSON.parse(response) as LLMResponse;
    } catch (error) {
      console.error('Error analyzing for tool use:', error);
      return {
        shouldUseTool: false,
        response: "I'll help you with that.",
      };
    }
  }
}
