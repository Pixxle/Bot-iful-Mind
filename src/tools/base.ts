import { z } from 'zod';
import { Tool, ToolInput, ToolOutput } from '../types';
import { requestContext } from '../utils/requestContext';

export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;

  protected parametersSchema?: z.ZodSchema;

  abstract execute(input: ToolInput): Promise<ToolOutput>;

  getParametersSchema(): z.ZodSchema | undefined {
    return this.parametersSchema;
  }

  // Wrapper method with logging that calls the actual implementation
  async executeWithLogging(input: ToolInput): Promise<ToolOutput> {
    const logger = requestContext.getLogger();
    const startTime = Date.now();
    
    logger.info('Tool execution started', {
      component: 'Tool',
      operation: 'execute_start',
      tool: this.name,
      queryLength: input.query.length,
      parameters: input.parameters
    });

    try {
      const result = await this.execute(input);
      const duration = Date.now() - startTime;
      
      logger.logToolExecution(this.name, duration, result.success, {
        dataSize: result.data ? JSON.stringify(result.data).length : 0,
        error: result.error
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Tool execution failed with exception', error as Error, {
        component: 'Tool',
        operation: 'execute_error',
        tool: this.name,
        duration
      });
      
      return this.createErrorResponse('Tool execution failed due to an unexpected error');
    }
  }

  protected validateParameters(parameters: unknown): void {
    if (this.parametersSchema) {
      this.parametersSchema.parse(parameters);
    }
  }

  protected createSuccessResponse(data: unknown): ToolOutput {
    return {
      success: true,
      data,
    };
  }

  protected createErrorResponse(error: string): ToolOutput {
    return {
      success: false,
      error,
    };
  }
}
