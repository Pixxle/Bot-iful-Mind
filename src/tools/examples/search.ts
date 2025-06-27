import { z } from 'zod';
import axios from 'axios';
import { BaseTool } from '../base';
import { ToolInput, ToolOutput } from '../../types';

const SearchParametersSchema = z.object({
  query: z.string().describe('Search query'),
  limit: z.number().optional().default(5),
});

type SearchParameters = z.infer<typeof SearchParametersSchema>;

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export class SearchTool extends BaseTool {
  name = 'search';
  description = 'Search the web for information';
  protected parametersSchema = SearchParametersSchema;

  async execute(input: ToolInput): Promise<ToolOutput> {
    try {
      const parameters = input.parameters as SearchParameters;
      this.validateParameters(parameters);

      const apiKey = process.env.SEARCH_API_KEY;
      const searchEngineId = process.env.SEARCH_ENGINE_ID;

      if (!apiKey || !searchEngineId) {
        return this.mockSearch(parameters);
      }

      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: apiKey,
          cx: searchEngineId,
          q: parameters.query,
          num: parameters.limit,
        },
      });

      interface GoogleSearchItem {
        title: string;
        snippet: string;
        link: string;
      }

      interface GoogleSearchResponse {
        items?: GoogleSearchItem[];
      }

      const searchData = response.data as GoogleSearchResponse;
      const results: SearchResult[] =
        searchData.items?.map((item) => ({
          title: item.title,
          snippet: item.snippet,
          url: item.link,
        })) || [];

      return this.createSuccessResponse({ results });
    } catch (error) {
      console.error('Search tool error:', error);
      return this.createErrorResponse('Failed to perform search');
    }
  }

  private mockSearch(parameters: SearchParameters): ToolOutput {
    const mockResults: SearchResult[] = [
      {
        title: `Results for "${parameters.query}"`,
        snippet:
          'This is a mock search result. Configure SEARCH_API_KEY and SEARCH_ENGINE_ID to use real search.',
        url: 'https://example.com',
      },
    ];

    return this.createSuccessResponse({ results: mockResults });
  }
}
