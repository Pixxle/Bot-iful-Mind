import { LLMClient } from './client';
import { ToolRegistry } from '../tools';
import { LLMResponse } from '../types';

export class ToolRouter {
  constructor(
    private llmClient: LLMClient,
    private toolRegistry: ToolRegistry
  ) {}

  async route(message: string): Promise<LLMResponse> {
    const availableTools = this.toolRegistry.getDescriptions();

    try {
      const routingDecision = await this.llmClient.analyzeForToolUse(message, availableTools);

      if (routingDecision.shouldUseTool && routingDecision.toolName) {
        const tool = this.toolRegistry.get(routingDecision.toolName);
        if (!tool) {
          return {
            shouldUseTool: false,
            response: `Tool "${routingDecision.toolName}" not found. Let me help you directly.`,
          };
        }
      }

      return routingDecision;
    } catch (error) {
      console.error('Error in tool routing:', error);
      return {
        shouldUseTool: false,
        response: "I'll help you with your question.",
      };
    }
  }
}
