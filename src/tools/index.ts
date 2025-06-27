import { Tool } from '../types';
import { WeatherTool } from './examples/weather';
import { SearchTool } from './examples/search';
import { ButcherTool } from './examples/butcher';

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
    console.log(`Registered tool: ${tool.name}`);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name.toLowerCase());
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getDescriptions(): Array<{ name: string; description: string; parameters?: any }> {
    return this.getAll().map((tool) => {
      const schema = tool.getParametersSchema?.();
      return {
        name: tool.name,
        description: tool.description,
        parameters: schema ? this.schemaToObject(schema) : undefined,
      };
    });
  }

  private schemaToObject(schema: any): any {
    if (schema._def?.typeName === 'ZodObject') {
      const shape = schema._def.shape();
      const result: any = {};
      for (const [key, value] of Object.entries(shape)) {
        const fieldSchema = value as any;
        if (fieldSchema._def?.typeName === 'ZodString') {
          result[key] = 'string';
        } else if (fieldSchema._def?.typeName === 'ZodEnum') {
          result[key] = fieldSchema._def.values;
        } else if (fieldSchema._def?.typeName === 'ZodOptional') {
          result[key] = `optional ${this.schemaToObject(fieldSchema._def.innerType)}`;
        }
      }
      return result;
    }
    return undefined;
  }
}
