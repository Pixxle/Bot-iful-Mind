import { z } from 'zod';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseTool } from '../base';
import { ToolInput, ToolOutput } from '../../types';

const ButcherParametersSchema = z.object({});

type ButcherParameters = z.infer<typeof ButcherParametersSchema>;

interface ButcherData {
  bookName: string;
  progress: string;
  fullTitle: string;
}

export class ButcherTool extends BaseTool {
  name = 'butcher';
  description = 'Get the progress of Jim Butcher\'s latest book';
  protected parametersSchema = ButcherParametersSchema;

  async execute(input: ToolInput): Promise<ToolOutput> {
    try {
      const parameters = input.parameters as ButcherParameters;
      this.validateParameters(parameters);

      const response = await axios.get('https://www.jim-butcher.com/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Find the progress percentage
      const progressElement = $('.wpsm_progress-value');
      const progressText = progressElement.text().trim();
      
      // Find the book title
      const titleElement = $('.wpsm_progress-title');
      const fullTitle = titleElement.clone().children().remove().end().text().trim();
      
      if (!progressText || !fullTitle) {
        return this.createErrorResponse('Could not find progress information on Jim Butcher\'s website');
      }

      // Extract book name from title (remove "Compiling..." part)
      let bookName = fullTitle;
      if (fullTitle.includes('Compiling...')) {
        bookName = fullTitle.replace(/\s*Compiling\.\.\.\s*$/i, '').trim();
      }

      const butcherData: ButcherData = {
        bookName,
        progress: progressText,
        fullTitle
      };

      return this.createSuccessResponse(butcherData);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return this.createErrorResponse('Jim Butcher\'s website is not accessible');
        }
        if (error.code === 'ECONNABORTED') {
          return this.createErrorResponse('Request timed out while fetching Jim Butcher\'s website');
        }
      }

      // Error logging is handled by the base tool class
      return this.createErrorResponse('Failed to fetch book progress from Jim Butcher\'s website');
    }
  }
}