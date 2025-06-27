import { VoiceTranscription } from '../types';
import OpenAI from 'openai';
import axios from 'axios';
import { createWriteStream, createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { tmpdir } from 'os';
import { join } from 'path';

export class VoiceProcessor {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async transcribe(audioUrl: string): Promise<VoiceTranscription> {
    let tempFilePath: string | null = null;

    try {
      tempFilePath = await this.downloadAudio(audioUrl);

      const transcription = await this.openai.audio.transcriptions.create({
        file: createReadStream(tempFilePath),
        model: 'whisper-1',
      });

      return {
        text: transcription.text,
        language: 'en',
      };
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error('Failed to transcribe audio');
    } finally {
      if (tempFilePath) {
        await unlink(tempFilePath).catch(console.error);
      }
    }
  }

  private async downloadAudio(url: string): Promise<string> {
    const response = await axios.get(url, { responseType: 'stream' });
    const tempPath = join(tmpdir(), `voice_${Date.now()}.oga`);
    const writer = createWriteStream(tempPath);

    await pipeline(response.data, writer);

    return tempPath;
  }
}
