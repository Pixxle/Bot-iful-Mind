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
    availableTools: Array<{ name: string; description: string; parameters?: any }>
  ): Promise<LLMResponse> {
    const toolDescriptions = availableTools
      .map((t) => {
        let desc = `- ${t.name}: ${t.description}`;
        if (t.parameters) {
          desc += `\n  Parameters: ${JSON.stringify(t.parameters)}`;
        }
        return desc;
      })
      .join('\n');

    const systemPrompt = `You are a tool router for a Telegram bot. Analyze the user's message and determine if any of the available tools should be used to answer their query.

Available tools:
${toolDescriptions}

IMPORTANT: 
- For weather tool, you MUST extract the location from the user's message and include it in toolParameters
- If the user asks about weather but doesn't specify a location, ask them to provide one
- For butcher tool, use it when users ask about Jim Butcher's book progress, latest book, or writing status
- Extract all required parameters from the user's message

Respond in JSON format:
{
  "shouldUseTool": boolean,
  "toolName": "tool name if applicable",
  "toolParameters": { "location": "extracted location", "units": "metric" },
  "response": "direct response if no tool is needed"
}`;

    try {
      const response = await this.complete(message, systemPrompt);
      // Clean response by removing markdown code blocks
      const cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      return JSON.parse(cleanedResponse) as LLMResponse;
    } catch (error) {
      console.error('Error analyzing for tool use:', error);
      return {
        shouldUseTool: false,
        response: "I'll help you with that.",
      };
    }
  }
}
