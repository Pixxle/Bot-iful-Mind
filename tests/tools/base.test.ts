import { BaseTool } from '../../src/tools/base';
import { ToolInput, ToolOutput } from '../../src/types';

class TestTool extends BaseTool {
  name = 'test';
  description = 'Test tool for unit tests';

  async execute(input: ToolInput): Promise<ToolOutput> {
    if (input.query === 'error') {
      return this.createErrorResponse('Test error');
    }
    return this.createSuccessResponse({ query: input.query });
  }
}

describe('BaseTool', () => {
  let tool: TestTool;

  beforeEach(() => {
    tool = new TestTool();
  });

  it('should have name and description', () => {
    expect(tool.name).toBe('test');
    expect(tool.description).toBe('Test tool for unit tests');
  });

  it('should create success response', async () => {
    const result = await tool.execute({ query: 'test query' });
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ query: 'test query' });
    expect(result.error).toBeUndefined();
  });

  it('should create error response', async () => {
    const result = await tool.execute({ query: 'error' });
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Test error');
    expect(result.data).toBeUndefined();
  });
});