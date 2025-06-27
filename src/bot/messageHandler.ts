import { ToolRegistry } from '../tools';
import { LLMClient } from '../llm/client';
import { ToolRouter } from '../llm/toolRouter';
import { ResponseFormatter } from '../llm/responseFormatter';
import { requestContext } from '../utils/requestContext';

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
    const logger = requestContext.getLogger();
    const startTime = Date.now();
    
    logger.info('Starting message processing', {
      component: 'MessageHandler',
      operation: 'start',
      textLength: text.length,
      textPreview: text.substring(0, 100)
    });

    try {
      // Route the message to determine tool usage
      const routingStart = Date.now();
      const routingDecision = await this.toolRouter.route(text);
      const routingDuration = Date.now() - routingStart;
      
      logger.info('Message routing completed', {
        component: 'MessageHandler',
        operation: 'route',
        shouldUseTool: routingDecision.shouldUseTool,
        toolName: routingDecision.toolName,
        duration: routingDuration
      });

      if (!routingDecision.shouldUseTool) {
        logger.info('Direct response provided', {
          component: 'MessageHandler',
          operation: 'direct_response',
          responseLength: routingDecision.response?.length || 0
        });
        return routingDecision.response || "I couldn't process your request.";
      }

      // Update context with tool being used
      requestContext.updateContext({ toolUsed: routingDecision.toolName });

      const tool = this.toolRegistry.get(routingDecision.toolName!);
      if (!tool) {
        logger.warn('Tool not found', {
          component: 'MessageHandler',
          operation: 'tool_lookup',
          toolName: routingDecision.toolName
        });
        return 'The requested tool is not available.';
      }

      // Execute the tool with built-in logging
      const toolResult = await tool.executeWithLogging?.({
        query: text,
        parameters: routingDecision.toolParameters,
      }) || await tool.execute({
        query: text,
        parameters: routingDecision.toolParameters,
      });

      if (!toolResult.success) {
        logger.error('Tool execution failed', undefined, {
          component: 'MessageHandler',
          operation: 'tool_execute',
          toolName: routingDecision.toolName,
          error: toolResult.error
        });
        return `Error using tool: ${toolResult.error}`;
      }

      // Format the response
      const formatStart = Date.now();
      const formattedResponse = await this.responseFormatter.format(
        text,
        routingDecision.toolName!,
        toolResult.data
      );
      const formatDuration = Date.now() - formatStart;

      logger.info('Response formatting completed', {
        component: 'MessageHandler',
        operation: 'format',
        toolName: routingDecision.toolName,
        duration: formatDuration,
        responseLength: formattedResponse.length
      });

      const totalDuration = Date.now() - startTime;
      logger.info('Message processing completed', {
        component: 'MessageHandler',
        operation: 'complete',
        toolName: routingDecision.toolName,
        totalDuration,
        routingDuration,
        formatDuration
      });

      return formattedResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error in message handling', error as Error, {
        component: 'MessageHandler',
        operation: 'handle',
        duration,
        textLength: text.length
      });
      throw error;
    }
  }
}
