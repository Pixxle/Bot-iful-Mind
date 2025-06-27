import { Tool } from '../types';
import { WeatherTool } from './examples/weather';
import { SearchTool } from './examples/search';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    this.register(new WeatherTool());
    this.register(new SearchTool());
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

  getDescriptions(): Array<{ name: string; description: string }> {
    return this.getAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));
  }
}
