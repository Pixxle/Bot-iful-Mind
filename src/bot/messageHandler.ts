import { ToolRegistry } from '../tools';
import { LLMClient } from '../llm/client';
import { ToolRouter } from '../llm/toolRouter';
import { ResponseFormatter } from '../llm/responseFormatter';

export class MessageHandler {
  private toolRouter: ToolRouter;
  private responseFormatter: ResponseFormatter;

  constructor(
    private toolRegistry: ToolRegistry,
    llmClient: LLMClient
  ) {
    this.toolRouter = new ToolRouter(llmClient, toolRegistry);
    this.responseFormatter = new ResponseFormatter(llmClient);
  }

  async handleTextMessage(text: string): Promise<string> {
    try {
      const routingDecision = await this.toolRouter.route(text);

      if (!routingDecision.shouldUseTool) {
        return routingDecision.response || "I couldn't process your request.";
      }

      const tool = this.toolRegistry.get(routingDecision.toolName!);
      if (!tool) {
        return 'The requested tool is not available.';
      }

      const toolResult = await tool.execute({
        query: text,
        parameters: routingDecision.toolParameters,
      });

      if (!toolResult.success) {
        return `Error using tool: ${toolResult.error}`;
      }

      const formattedResponse = await this.responseFormatter.format(
        text,
        routingDecision.toolName!,
        toolResult.data
      );

      return formattedResponse;
    } catch (error) {
      console.error('Error in message handling:', error);
      throw error;
    }
  }
}
