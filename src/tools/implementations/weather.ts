import { z } from 'zod';
import axios from 'axios';
import { BaseTool } from '../base';
import { ToolInput, ToolOutput } from '../../types';
import { requestContext } from '../../utils/requestContext';

const WeatherParametersSchema = z.object({
  location: z.string().describe('City name or location'),
  units: z.enum(['metric', 'imperial']).optional().default('metric'),
});

type WeatherParameters = z.infer<typeof WeatherParametersSchema>;

interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  location: string;
}

export class WeatherTool extends BaseTool {
  name = 'weather';
  description = 'Get current weather information for a location';
  protected parametersSchema = WeatherParametersSchema;

  async execute(input: ToolInput): Promise<ToolOutput> {
    const logger = requestContext.getLogger();
    const startTime = Date.now();
    
    try {
      const parameters = input.parameters as WeatherParameters;
      this.validateParameters(parameters);

      const apiKey = process.env.WEATHER_API_KEY;
      if (!apiKey) {
        logger.error('Weather API key not configured', undefined, {
          component: 'WeatherTool',
          operation: 'api_key_check'
        });
        return this.createErrorResponse('Weather API key not configured');
      }

      const url = 'https://api.openweathermap.org/data/2.5/weather';
      const requestParams = {
        q: parameters.location,
        appid: apiKey,
        units: parameters.units,
      };

      logger.info('Making OpenWeatherMap API request', {
        component: 'WeatherTool',
        operation: 'api_request',
        url,
        location: parameters.location,
        units: parameters.units,
        apiKeyLength: apiKey.length,
        apiKeyPrefix: apiKey.substring(0, 8) + '...'
      });

      const response = await axios.get(url, {
        params: requestParams,
        timeout: 10000
      });

      const data = response.data as {
        main: { temp: number; humidity: number };
        weather: Array<{ description: string }>;
        wind: { speed: number };
        name: string;
      };

      const weatherData: WeatherData = {
        temperature: Math.round(data.main.temp),
        description: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        location: data.name,
      };

      const duration = Date.now() - startTime;
      logger.info('OpenWeatherMap API request successful', {
        component: 'WeatherTool',
        operation: 'api_success',
        duration,
        location: weatherData.location,
        temperature: weatherData.temperature
      });

      return this.createSuccessResponse(weatherData);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const responseData = error.response?.data as unknown;
        
        logger.error('OpenWeatherMap API error', error, {
          component: 'WeatherTool',
          operation: 'api_error',
          duration,
          status,
          statusText,
          responseData,
          location: (input.parameters as WeatherParameters | undefined)?.location,
          errorCode: error.code,
          errorMessage: error.message
        });

        // Provide specific error messages based on status code
        switch (status) {
          case 401:
            return this.createErrorResponse('Invalid weather API key. Please check your configuration.');
          case 404:
            return this.createErrorResponse(`Location "${(input.parameters as WeatherParameters | undefined)?.location}" not found. Please try a different city name.`);
          case 429:
            return this.createErrorResponse('Weather API rate limit exceeded. Please try again later.');
          case 500:
          case 502:
          case 503:
            return this.createErrorResponse('Weather service is temporarily unavailable. Please try again later.');
          default:
            return this.createErrorResponse(`Weather API error: ${statusText || 'Unknown error'} (${status || 'No status'})`);
        }
      } else {
        // Network or other errors
        logger.error('Weather tool network error', error as Error, {
          component: 'WeatherTool',
          operation: 'network_error',
          duration,
          location: input.parameters?.location
        });
        
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            return this.createErrorResponse('Weather request timed out. Please try again.');
          }
          if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            return this.createErrorResponse('Unable to connect to weather service. Please check your internet connection.');
          }
        }
        
        return this.createErrorResponse('Failed to fetch weather data due to a network error.');
      }
    }
  }
}
