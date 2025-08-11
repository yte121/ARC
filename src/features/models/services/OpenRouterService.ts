import { ModelConfig, SystemConstraints, ModelProvider } from '@/types/agent-types';
import { useSystemStore } from '@/store/system-store';
import { APIService } from '@/services/APIService';

/**
 * OpenRouterService
 * 
 * Handles integration with OpenRouter API via backend service.
 */
export class OpenRouterService {
  private modelConfig: ModelConfig;
  private constraints: SystemConstraints;
  private apiService: APIService;

  constructor() {
    const store = useSystemStore.getState();
    this.modelConfig = store.activeModelConfig;
    this.constraints = store.constraints;
    this.apiService = new APIService();
  }

  /**
   * Updates the current model configuration from the store
   */
  refreshConfig(): void {
    const store = useSystemStore.getState();
    this.modelConfig = store.activeModelConfig;
    this.constraints = store.constraints;
  }

  /**
   * Get available OpenRouter models from backend
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.apiService.getModels('openrouter');
      return models.map((model: any) => model.name);
    } catch (error) {
      console.error('Failed to fetch OpenRouter models:', error);
      return [];
    }
  }

  /**
   * Check if a model is available on OpenRouter
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    const models = await this.getAvailableModels();
    return models.includes(modelName);
  }

  /**
   * Generate response from OpenRouter API via backend
   */
  async generateResponse(
    prompt: string,
    model?: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<ModelResponse> {
    this.refreshConfig();
    
    const startTime = performance.now();
    
    // Use provided parameters or defaults from config
    const useModel = model || this.modelConfig.modelName;
    const useTemperature = temperature !== undefined ? temperature : this.modelConfig.temperature;
    const useMaxTokens = maxTokens || this.modelConfig.maxTokens;
    
    // Check if we're within system constraints
    const { tokensUsedLastMinute } = useSystemStore.getState().resourceUsage;
    if (tokensUsedLastMinute >= this.constraints.maxTokensPerMinute) {
      throw new Error('Rate limit exceeded: Maximum tokens per minute reached');
    }
    
    try {
      // Make real API call to backend
      const response = await this.apiService.generateModelResponse({
        prompt,
        modelName: useModel,
        provider: 'openrouter' as ModelProvider,
        temperature: useTemperature,
        maxTokens: useMaxTokens
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      // Update resource usage
      const { updateResourceUsage } = useSystemStore.getState();
      updateResourceUsage({
        tokensUsedLastMinute: tokensUsedLastMinute + response.totalTokens
      });
      
      return {
        text: response.text,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
        totalTokens: response.totalTokens,
        modelName: useModel,
        latency
      };
    } catch (error) {
      console.error('Error generating response from OpenRouter:', error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test connection to OpenRouter API
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.apiService.testModelConnection('openrouter', this.modelConfig.modelName);
    } catch (error) {
      console.error('Failed to test OpenRouter connection:', error);
      return false;
    }
  }

  /**
   * Get model capabilities from OpenRouter
   */
  async getModelCapabilities(modelName: string): Promise<any> {
    try {
      return await this.apiService.getModelCapabilities('openrouter', modelName);
    } catch (error) {
      console.error('Failed to get OpenRouter model capabilities:', error);
      return null;
    }
  }

  /**
   * Get API key status and quota information
   */
  async getApiKeyStatus(): Promise<any> {
    try {
      return await this.apiService.getApiKeyStatus('openrouter');
    } catch (error) {
      console.error('Failed to get OpenRouter API key status:', error);
      return null;
    }
  }
}

/**
 * Response from a model generation
 */
export interface ModelResponse {
  text: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  modelName: string;
  latency: number;
}