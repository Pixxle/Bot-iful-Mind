import { Tool } from '../types';
import { WeatherTool } from './implementations/weather';
import { SearchTool } from './implementations/search';
import { ButcherTool } from './implementations/butcher';
import { logger } from '../utils/logger';
import { z } from 'zod';

interface ToolDescription {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

interface ZodSchemaDef {
  typeName: string;
  shape?: () => Record<string, unknown>;
  values?: readonly string[];
  innerType?: ZodSchemaDef;
}

interface ZodSchemaWithDef {
  _def: ZodSchemaDef;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    this.register(new WeatherTool());
    this.register(new SearchTool());
    this.register(new ButcherTool());
  }

  register(tool: Tool): void {
    this.tools.set(tool.name.toLowerCase(), tool);
    logger.info('Tool registered', {
      component: 'ToolRegistry',
      operation: 'register',
      toolName: tool.name,
      description: tool.description
    });
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name.toLowerCase());
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getDescriptions(): ToolDescription[] {
    return this.getAll().map((tool) => {
      const schema = tool.getParametersSchema?.();
      return {
        name: tool.name,
        description: tool.description,
        parameters: schema ? this.schemaToObject(schema) : undefined,
      };
    });
  }

  private schemaToObject(schema: z.ZodSchema): Record<string, unknown> | undefined {
    const schemaWithDef = schema as unknown as ZodSchemaWithDef;
    
    if (schemaWithDef._def?.typeName === 'ZodObject') {
      const shape = schemaWithDef._def.shape?.();
      if (!shape) return undefined;
      
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(shape)) {
        const fieldSchema = value as ZodSchemaDef;
        if (fieldSchema.typeName === 'ZodString') {
          result[key] = 'string';
        } else if (fieldSchema.typeName === 'ZodEnum') {
          result[key] = fieldSchema.values;
        } else if (fieldSchema.typeName === 'ZodOptional' && fieldSchema.innerType) {
          const innerResult = this.schemaToObject({ _def: fieldSchema.innerType } as unknown as z.ZodSchema);
          const innerType = typeof innerResult === 'string' ? innerResult : 'unknown';
          result[key] = `optional ${innerType}`;
        }
      }
      return result;
    }
    return undefined;
  }
}
