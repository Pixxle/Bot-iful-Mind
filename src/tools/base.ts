import { z } from 'zod';
import { Tool, ToolInput, ToolOutput } from '../types';

export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;

  protected parametersSchema?: z.ZodSchema;

  abstract execute(input: ToolInput): Promise<ToolOutput>;

  getParametersSchema(): z.ZodSchema | undefined {
    return this.parametersSchema;
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
