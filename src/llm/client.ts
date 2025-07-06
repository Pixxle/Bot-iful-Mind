import OpenAI from 'openai';
import { LLMResponse } from '../types';
import { requestContext } from '../utils/requestContext';

export class LLMClient {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const logger = requestContext.getLogger();
    const startTime = Date.now();
    const model = 'gpt-4.1-nano';

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    // Estimate token counts (rough approximation)
    const promptTokens = Math.ceil((systemPrompt || '').length / 4) + Math.ceil(prompt.length / 4);

    logger.info('LLM completion started', {
      component: 'LLM',
      operation: 'completion_start',
      model,
      estimatedPromptTokens: promptTokens,
      systemPromptLength: systemPrompt?.length || 0,
      userPromptLength: prompt.length,
    });

    try {
      const completion = await this.openai.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      });

      const duration = Date.now() - startTime;
      const response = completion.choices[0]?.message?.content || '';
      const actualPromptTokens = completion.usage?.prompt_tokens || promptTokens;
      const completionTokens =
        completion.usage?.completion_tokens || Math.ceil(response.length / 4);

      logger.logLLMCall(model, actualPromptTokens, completionTokens, duration, {
        finishReason: completion.choices[0]?.finish_reason,
        responseLength: response.length,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('LLM completion failed', error as Error, {
        component: 'LLM',
        operation: 'completion_error',
        model,
        duration,
        estimatedPromptTokens: promptTokens,
      });
      throw new Error('Failed to get LLM response');
    }
  }

  async analyzeForToolUse(
    message: string,
    availableTools: Array<{
      name: string;
      description: string;
      parameters?: Record<string, unknown>;
    }>
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

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentDayName = now.toLocaleDateString('en-US', { weekday: 'long' });

    const systemPrompt = `You are a tool router for a Telegram bot. Analyze the user's message and determine if any of the available tools should be used to answer their query.

Current date: ${currentDate} (${currentDayName})

Available tools:
${toolDescriptions}

IMPORTANT: 
- For weather tool, you MUST extract the location from the user's message and include it in toolParameters
- For weather tool, extract date information if provided and CONVERT IT TO YYYY-MM-DD format before passing to tools
- If the user asks about weather but doesn't specify a location, ask them to provide one
- For butcher tool, use it when users ask about Jim Butcher's book progress, latest book, or writing status
- Extract all required parameters from the user's message

DATE CONVERSION RULES:
- "today" → "${currentDate}"
- "tomorrow" → "${new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}"
- For day names like "monday", "tuesday", etc. → convert to the NEXT occurrence of that day in YYYY-MM-DD format
- For "next [day]" like "next wednesday" → convert to the next occurrence of that specific day in YYYY-MM-DD format
- For absolute dates already in YYYY-MM-DD format → keep as-is

Examples with current date ${currentDate} (${currentDayName}):
- "weather tomorrow in Paris" → {"location": "Paris", "date": "${new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}", "units": "metric"}
- "weather in London" → {"location": "London", "units": "metric"}
- "weather next wednesday in Tokyo" → {"location": "Tokyo", "date": "[YYYY-MM-DD for next Wednesday]", "units": "metric"}
- "weather monday in Berlin" → {"location": "Berlin", "date": "[YYYY-MM-DD for next Monday]", "units": "metric"}

CRITICAL: Always convert relative dates to YYYY-MM-DD format. Never pass relative date strings like "tomorrow", "next wednesday", etc. to tools.

Respond in JSON format:
{
  "shouldUseTool": boolean,
  "toolName": "tool name if applicable",
  "toolParameters": { "location": "extracted location", "date": "YYYY-MM-DD format if date specified", "units": "metric" },
  "response": "direct response if no tool is needed"
}`;

    const logger = requestContext.getLogger();

    logger.info('Tool analysis started', {
      component: 'LLM',
      operation: 'tool_analysis',
      messageLength: message.length,
      availableToolsCount: availableTools.length,
      tools: availableTools.map((t) => t.name),
    });

    try {
      const response = await this.complete(message, systemPrompt);
      // Clean response by removing markdown code blocks
      const cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleanedResponse) as LLMResponse;

      logger.info('Tool analysis completed', {
        component: 'LLM',
        operation: 'tool_analysis_complete',
        shouldUseTool: parsed.shouldUseTool,
        selectedTool: parsed.toolName,
        hasParameters: !!parsed.toolParameters,
        responseLength: parsed.response?.length || 0,
      });

      return parsed;
    } catch (error) {
      logger.error('Error analyzing for tool use', error as Error, {
        component: 'LLM',
        operation: 'tool_analysis_error',
        messageLength: message.length,
      });
      return {
        shouldUseTool: false,
        response: "I'll help you with that.",
      };
    }
  }
}
