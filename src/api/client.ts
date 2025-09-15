/**
 * SD WebUI API Client
 * SD WebUI Reforge APIとの通信を管理
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import {
  SDWebUIConfig,
  APIError,
  ValidationError,
  Txt2ImgPayload,
  Img2ImgPayload,
  GenerationResponse,
  PNGInfoPayload,
  PNGInfoResponse,
  ExtrasSingleImagePayload,
  ExtrasResponse,
  InterrogatePayload,
  InterrogateResponse,
} from './types';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
dotenv.config(); // Also load .env

export class SDWebUIClient {
  public readonly baseUrl: string;
  private readonly timeout: number;
  private readonly client: AxiosInstance;

  constructor(baseUrl?: string, timeout = 120000) {
    // Priority: constructor arg > env var > default
    this.baseUrl = (baseUrl || process.env.SD_WEBUI_URL || 'http://localhost:7860').replace(/\/$/, '');
    this.timeout = timeout;

    this.client = axios.create({
      baseURL: `${this.baseUrl}/sdapi/v1`,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error)
    );
  }

  /**
   * Test connection to SD WebUI API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/sd-models');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean payload by removing null and undefined values
   * This prevents 422 validation errors from the API
   */
  cleanPayload<T extends Record<string, any>>(payload: T): Partial<T> {
    const cleaned: any = {};

    for (const [key, value] of Object.entries(payload)) {
      // Skip null and undefined values
      if (value === null || value === undefined) {
        continue;
      }

      // Recursively clean nested objects
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedNested = this.cleanPayload(value);
        // Only add if the nested object has properties
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        // Preserve all other values (including 0, false, empty strings, arrays)
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * Handle API errors with proper error messages
   */
  private handleError(error: AxiosError): never {
    if (error.response) {
      // API returned an error response
      const status = error.response.status;
      const data = error.response.data as any;

      if (status === 422) {
        // Validation error
        const details = data.detail;
        if (Array.isArray(details)) {
          const messages = details.map((d: ValidationError) =>
            `${d.loc.join('.')}: ${d.msg}`
          ).join(', ');
          throw new Error(`Validation error: ${messages}`);
        }
        throw new Error('Validation error: Invalid request parameters');
      }

      throw new Error(`API error ${status}: ${data.detail || data.message || 'Unknown error'}`);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error(`Request timeout after ${this.timeout}ms`);
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error(`Connection failed: SD WebUI is not running or not accessible at ${this.baseUrl}`);
    } else {
      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Make GET request to API
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    try {
      const response = await this.client.get<T>(endpoint, { params });
      return response.data;
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  /**
   * Make POST request to API with automatic payload cleaning
   */
  async post<T = any>(endpoint: string, payload: Record<string, any>): Promise<T> {
    try {
      const cleanedPayload = this.cleanPayload(payload);

      // Debug log
      if (process.env.DEBUG === 'true' && endpoint.includes('txt2img')) {
        console.log('Sending payload to', endpoint);
        console.log('Override settings in payload:', cleanedPayload.override_settings);
      }

      const response = await this.client.post<T>(endpoint, cleanedPayload);
      return response.data;
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  /**
   * Generate images from text
   */
  async txt2img(payload: Txt2ImgPayload): Promise<GenerationResponse> {
    return this.post<GenerationResponse>('/txt2img', payload);
  }

  /**
   * Generate images from image
   */
  async img2img(payload: Img2ImgPayload): Promise<GenerationResponse> {
    return this.post<GenerationResponse>('/img2img', payload);
  }

  /**
   * Extract PNG metadata
   */
  async pngInfo(image: string): Promise<PNGInfoResponse> {
    return this.post<PNGInfoResponse>('/png-info', { image });
  }

  /**
   * Upscale or process single image
   */
  async extrasSingleImage(payload: ExtrasSingleImagePayload): Promise<ExtrasResponse> {
    return this.post<ExtrasResponse>('/extra-single-image', payload);
  }

  /**
   * Alias for extrasSingleImage
   */
  async extraSingleImage(payload: ExtrasSingleImagePayload): Promise<ExtrasResponse> {
    return this.extrasSingleImage(payload);
  }

  /**
   * Generate caption for image
   */
  async interrogate(payload: InterrogatePayload): Promise<InterrogateResponse> {
    return this.post<InterrogateResponse>('/interrogate', payload);
  }

  /**
   * Get available samplers
   */
  async getSamplers(): Promise<any[]> {
    return this.get('/samplers');
  }

  /**
   * Get available schedulers
   */
  async getSchedulers(): Promise<any[]> {
    return this.get('/schedulers');
  }

  /**
   * Get available upscalers
   */
  async getUpscalers(): Promise<any[]> {
    return this.get('/upscalers');
  }

  /**
   * Get current options
   */
  async getOptions(): Promise<any> {
    return this.get('/options');
  }

  /**
   * Set options
   */
  async setOptions(options: Record<string, any>): Promise<any> {
    return this.post('/options', options);
  }

  /**
   * Get available models
   */
  async getModels(): Promise<any[]> {
    return this.get('/sd-models');
  }
}