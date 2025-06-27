import { LLMClient } from './client';

export class ResponseFormatter {
  constructor(private llmClient: LLMClient) {}

  async format(originalQuery: string, toolName: string, toolResponse: unknown): Promise<string> {
    const prompt = `You are a helpful assistant. The user asked: "${originalQuery}"

We used the ${toolName} tool to gather information. Here's what we found:
${JSON.stringify(toolResponse, null, 2)}

Please provide a natural, conversational response that incorporates this information to answer the user's question. Be concise and helpful.`;

    try {
      const formattedResponse = await this.llmClient.complete(prompt);
      return formattedResponse;
    } catch (error) {
      console.error('Error formatting response:', error);
      return `Here's what I found using the ${toolName} tool:\n${JSON.stringify(toolResponse, null, 2)}`;
    }
  }
}
