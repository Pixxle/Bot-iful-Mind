import { z } from 'zod';
import axios from 'axios';
import { BaseTool } from '../base';
import { ToolInput, ToolOutput } from '../../types';
import { requestContext } from '../../utils/requestContext';

const WeatherParametersSchema = z.object({
  location: z.string().describe('City name or location'),
  units: z.enum(['metric', 'imperial']).optional().default('metric'),
  date: z.string().optional().nullable().describe('Date for forecast (YYYY-MM-DD format, tomorrow, etc.)'),
});

type WeatherParameters = z.infer<typeof WeatherParametersSchema>;

interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  location: string;
  date?: string;
}

// Date parsing utilities
function parseWeatherDate(dateInput: string): Date {
  const today = new Date();
  const lowerInput = dateInput.toLowerCase().trim();

  // Handle relative dates
  if (lowerInput === 'today') {
    return today;
  }

  if (lowerInput === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
  }

  // Handle day names (e.g., "monday", "tuesday")
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = dayNames.indexOf(lowerInput);
  if (dayIndex !== -1) {
    const targetDate = new Date(today);
    const currentDay = today.getDay();
    let daysToAdd = dayIndex - currentDay;
    if (daysToAdd <= 0) {
      daysToAdd += 7; // Next week if the day has passed
    }
    targetDate.setDate(today.getDate() + daysToAdd);
    return targetDate;
  }

  // Handle absolute dates (YYYY-MM-DD)
  const dateMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    return new Date(dateInput);
  }

  // Default to today if parsing fails
  return today;
}

function isDateInForecastRange(date: Date): boolean {
  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 5); // 5-day forecast limit

  return date >= today && date <= maxDate;
}

function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
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
          operation: 'api_key_check',
        });
        return this.createErrorResponse('Weather API key not configured');
      }

      // Determine if we need current weather or forecast
      const isCurrentWeather = parameters.date == null;
      let weatherData: WeatherData;

      if (isCurrentWeather) {
        weatherData = await this.getCurrentWeather(parameters, apiKey, logger);
      } else {
        weatherData = await this.getForecastWeather(parameters, apiKey, logger);
      }

      const duration = Date.now() - startTime;
      logger.info('Weather API request successful', {
        component: 'WeatherTool',
        operation: isCurrentWeather ? 'current_weather_success' : 'forecast_weather_success',
        duration,
        location: weatherData.location,
        temperature: weatherData.temperature,
        date: weatherData.date,
      });

      return this.createSuccessResponse(weatherData);
    } catch (error) {
      const duration = Date.now() - startTime;

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const responseData = error.response?.data as unknown;

        logger.error('Weather API error', error, {
          component: 'WeatherTool',
          operation: 'api_error',
          duration,
          status,
          statusText,
          responseData,
          location: (input.parameters as WeatherParameters | undefined)?.location,
          date: (input.parameters as WeatherParameters | undefined)?.date,
          errorCode: error.code,
          errorMessage: error.message,
        });

        // Provide specific error messages based on status code
        switch (status) {
          case 401:
            return this.createErrorResponse(
              'Invalid weather API key. Please check your configuration.'
            );
          case 404:
            return this.createErrorResponse(
              `Location "${(input.parameters as WeatherParameters | undefined)?.location}" not found. Please try a different city name.`
            );
          case 429:
            return this.createErrorResponse(
              'Weather API rate limit exceeded. Please try again later.'
            );
          case 500:
          case 502:
          case 503:
            return this.createErrorResponse(
              'Weather service is temporarily unavailable. Please try again later.'
            );
          default:
            return this.createErrorResponse(
              `Weather API error: ${statusText || 'Unknown error'} (${status || 'No status'})`
            );
        }
      } else {
        // Network or other errors
        logger.error('Weather tool network error', error as Error, {
          component: 'WeatherTool',
          operation: 'network_error',
          duration,
          location: input.parameters?.location,
          date: input.parameters?.date,
        });

        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            return this.createErrorResponse('Weather request timed out. Please try again.');
          }
          if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            return this.createErrorResponse(
              'Unable to connect to weather service. Please check your internet connection.'
            );
          }
          if (error.message.includes('Date out of range')) {
            return this.createErrorResponse(error.message);
          }
        }

        return this.createErrorResponse('Failed to fetch weather data due to a network error.');
      }
    }
  }

  private async getCurrentWeather(
    parameters: WeatherParameters,
    apiKey: string,
    logger: ReturnType<typeof requestContext.getLogger>
  ): Promise<WeatherData> {
    const url = 'https://api.openweathermap.org/data/2.5/weather';
    const requestParams = {
      q: parameters.location,
      appid: apiKey,
      units: parameters.units,
    };

    logger.info('Making OpenWeatherMap current weather API request', {
      component: 'WeatherTool',
      operation: 'current_weather_api_request',
      url,
      location: parameters.location,
      units: parameters.units,
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
    });

    const response = await axios.get(url, {
      params: requestParams,
      timeout: 10000,
    });

    // Debug log full API response in development mode
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('OpenWeatherMap current weather API full response', {
        component: 'WeatherTool',
        operation: 'api_response_debug',
        responseData: response.data,
        responseStatus: response.status,
        responseHeaders: response.headers,
        location: parameters.location,
      });
    }

    const data = response.data as {
      main: { temp: number; humidity: number };
      weather: Array<{ description: string }>;
      wind: { speed: number };
      name: string;
    };

    return {
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      location: data.name,
    };
  }

  private async getForecastWeather(
    parameters: WeatherParameters,
    apiKey: string,
    logger: ReturnType<typeof requestContext.getLogger>
  ): Promise<WeatherData> {
    // Parse the date
    const targetDate = parseWeatherDate(parameters.date!);

    // Validate date is within forecast range
    if (!isDateInForecastRange(targetDate)) {
      const today = new Date();
      throw new Error(
        `Date out of range for forecast (max 5 days ahead). Requested: ${formatDateForApi(targetDate)}, Current: ${formatDateForApi(today)}`
      );
    }

    const url = 'https://api.openweathermap.org/data/2.5/forecast';
    const requestParams = {
      q: parameters.location,
      appid: apiKey,
      units: parameters.units,
    };

    logger.info('Making OpenWeatherMap forecast API request', {
      component: 'WeatherTool',
      operation: 'forecast_api_request',
      url,
      location: parameters.location,
      units: parameters.units,
      targetDate: formatDateForApi(targetDate),
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
    });

    const response = await axios.get(url, {
      params: requestParams,
      timeout: 10000,
    });

    // Debug log full API response in development mode
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('OpenWeatherMap forecast API full response', {
        component: 'WeatherTool',
        operation: 'api_response_debug',
        responseData: response.data,
        responseStatus: response.status,
        responseHeaders: response.headers,
        location: parameters.location,
        targetDate: formatDateForApi(targetDate),
      });
    }

    interface ForecastItem {
      dt: number;
      main: { temp: number; humidity: number };
      weather: Array<{ description: string }>;
      wind: { speed: number };
      dt_txt: string;
    }

    interface ForecastResponse {
      list: ForecastItem[];
      city: { name: string };
    }

    const data = response.data as ForecastResponse;

    // Find the forecast item closest to the target date
    const targetDateStr = formatDateForApi(targetDate);
    const forecastItem =
      data.list.find((item) => {
        const itemDate = new Date(item.dt * 1000);
        const itemDateStr = formatDateForApi(itemDate);
        return itemDateStr === targetDateStr;
      }) || data.list[0]; // Fallback to first item if exact date not found

    return {
      temperature: Math.round(forecastItem.main.temp),
      description: forecastItem.weather[0].description,
      humidity: forecastItem.main.humidity,
      windSpeed: forecastItem.wind.speed,
      location: data.city.name,
      date: targetDateStr,
    };
  }
}
