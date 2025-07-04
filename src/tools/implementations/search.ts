import { z } from 'zod';
import axios from 'axios';
import { BaseTool } from '../base';
import { ToolInput, ToolOutput } from '../../types';
import { requestContext } from '../../utils/requestContext';

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
    const logger = requestContext.getLogger();
    const startTime = Date.now();

    try {
      const parameters = input.parameters as SearchParameters;
      this.validateParameters(parameters);

      const apiKey = process.env.SEARCH_API_KEY;
      const searchEngineId = process.env.SEARCH_ENGINE_ID;

      if (!apiKey || !searchEngineId) {
        logger.info('Using mock search - API credentials not configured', {
          component: 'SearchTool',
          operation: 'fallback_to_mock',
          query: parameters.query,
          limit: parameters.limit,
          hasApiKey: !!apiKey,
          hasSearchEngineId: !!searchEngineId,
        });
        return this.mockSearch(parameters);
      }

      const url = 'https://www.googleapis.com/customsearch/v1';
      const requestParams = {
        key: apiKey,
        cx: searchEngineId,
        q: parameters.query,
        num: parameters.limit,
      };

      logger.info('Making Google Custom Search API request', {
        component: 'SearchTool',
        operation: 'api_request',
        url,
        query: parameters.query,
        limit: parameters.limit,
        apiKeyLength: apiKey.length,
        searchEngineIdLength: searchEngineId.length,
      });

      const response = await axios.get(url, {
        params: requestParams,
        timeout: 10000,
      });

      // Debug log full API response in development mode
      if (process.env.NODE_ENV !== 'production') {
        logger.debug('Google Custom Search API full response', {
          component: 'SearchTool',
          operation: 'api_response_debug',
          responseData: response.data,
          responseStatus: response.status,
          responseHeaders: response.headers,
          query: parameters.query
        });
      }

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

      const duration = Date.now() - startTime;
      logger.info('Google Custom Search API request successful', {
        component: 'SearchTool',
        operation: 'api_success',
        duration,
        query: parameters.query,
        resultsCount: results.length,
        totalResults: searchData.items?.length || 0,
      });

      return this.createSuccessResponse({ results });
    } catch (error) {
      const duration = Date.now() - startTime;

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const responseData = error.response?.data as unknown;

        logger.error('Google Custom Search API error', error, {
          component: 'SearchTool',
          operation: 'api_error',
          duration,
          status,
          statusText,
          responseData,
          query: (input.parameters as SearchParameters | undefined)?.query,
          errorCode: error.code,
          errorMessage: error.message,
        });

        // Provide specific error messages based on status code
        switch (status) {
          case 400:
            return this.createErrorResponse(
              'Invalid search query. Please try a different search term.'
            );
          case 401:
            return this.createErrorResponse(
              'Invalid search API key. Please check your configuration.'
            );
          case 403:
            return this.createErrorResponse(
              'Search API access forbidden. Please check your API key and permissions.'
            );
          case 429:
            return this.createErrorResponse(
              'Search API rate limit exceeded. Please try again later.'
            );
          case 500:
          case 502:
          case 503:
            return this.createErrorResponse(
              'Search service is temporarily unavailable. Please try again later.'
            );
          default:
            return this.createErrorResponse(
              `Search API error: ${statusText || 'Unknown error'} (${status || 'No status'})`
            );
        }
      } else {
        // Network or other errors
        logger.error('Search tool network error', error as Error, {
          component: 'SearchTool',
          operation: 'network_error',
          duration,
          query: input.parameters?.query,
        });

        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            return this.createErrorResponse('Search request timed out. Please try again.');
          }
          if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            return this.createErrorResponse(
              'Unable to connect to search service. Please check your internet connection.'
            );
          }
        }

        return this.createErrorResponse('Failed to perform search due to a network error.');
      }
    }
  }

  private mockSearch(parameters: SearchParameters): ToolOutput {
    const logger = requestContext.getLogger();

    logger.info('Returning mock search results', {
      component: 'SearchTool',
      operation: 'mock_search',
      query: parameters.query,
      limit: parameters.limit,
    });

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
