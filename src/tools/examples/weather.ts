import { z } from 'zod';
import axios from 'axios';
import { BaseTool } from '../base';
import { ToolInput, ToolOutput } from '../../types';

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
    try {
      const parameters = input.parameters as WeatherParameters;
      this.validateParameters(parameters);

      const apiKey = process.env.WEATHER_API_KEY;
      if (!apiKey) {
        return this.createErrorResponse('Weather API key not configured');
      }

      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
        params: {
          q: parameters.location,
          appid: apiKey,
          units: parameters.units,
        },
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

      return this.createSuccessResponse(weatherData);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return this.createErrorResponse('Location not found');
      }

      // Error logging is handled by the base tool class
      return this.createErrorResponse('Failed to fetch weather data');
    }
  }
}
