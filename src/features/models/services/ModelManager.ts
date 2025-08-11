import { ModelConfig, ModelProvider, SystemConstraints } from '@/types/agent-types';
import { useSystemStore } from '@/store/system-store';
import { APIService } from '@/services/APIService';
import { LocalModelService } from './LocalModelService';
import { OpenRouterService } from './OpenRouterService';

/**
 * ModelManager
 * 
 * Manages AI model selection, configuration, and failover logic.
 */
export class ModelManager {
  private localService: LocalModelService;
  private openRouterService: OpenRouterService;
  private apiService: APIService;
  private modelConfig: ModelConfig;
  private constraints: SystemConstraints;

  constructor() {
    const store = useSystemStore.getState();
    this.modelConfig = store.activeModelConfig;
    this.constraints = store.constraints;
    this.localService = new LocalModelService();
    this.openRouterService = new OpenRouterService();
    this.apiService = new APIService();
  }

  /**
   * Updates the current configuration from the store
   */
  refreshConfig(): void {
    const store = useSystemStore.getState();
    this.modelConfig = store.activeModelConfig;
    this.constraints = store.constraints;
  }

  /**
   * Get available models for a specific provider
   */
  async getAvailableModels(provider: ModelProvider): Promise<string[]> {
    try {
      switch (provider) {
        case 'local':
          return await this.localService.getAvailableModels();
        case 'openrouter':
          return await this.openRouterService.getAvailableModels();
        case 'openai':
        case 'anthropic':
          return await this.apiService.getModels(provider);
        default:
          return [];
      }
    } catch (error) {
      console.error(`Failed to get models for provider ${provider}:`, error);
      return [];
    }
  }

  /**
   * Generate response using the currently configured model
   */
  async generateResponse(
    prompt: string,
    model?: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<any> {
    this.refreshConfig();
    
    const useModel = model || this.modelConfig.modelName;
    const useTemperature = temperature !== undefined ? temperature : this.modelConfig.temperature;
    const useMaxTokens = maxTokens || this.modelConfig.maxTokens;
    
    try {
      // Try primary model first
      return await this.generateWithProvider(
        this.modelConfig.provider,
        prompt,
        useModel,
        useTemperature,
        useMaxTokens
      );
    } catch (error) {
      console.warn(`Primary model failed, attempting failover:`, error);
      
      // Attempt failover to alternative providers
      return await this.attemptFailover(prompt, useModel, useTemperature, useMaxTokens);
    }
  }

  /**
   * Generate response with specific provider
   */
  private async generateWithProvider(
    provider: ModelProvider,
    prompt: string,
    model: string,
    temperature: number,
    maxTokens: number
  ): Promise<any> {
    switch (provider) {
      case 'local':
        return await this.localService.generateResponse(prompt, model, temperature, maxTokens);
      case 'openrouter':
        return await this.openRouterService.generateResponse(prompt, model, temperature, maxTokens);
      case 'openai':
      case 'anthropic':
        return await this.apiService.generateModelResponse({
          prompt,
          modelName: model,
          provider,
          temperature,
          maxTokens
        });
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Attempt failover to alternative providers
   */
  private async attemptFailover(
    prompt: string,
    model: string,
    temperature: number,
    maxTokens: number
  ): Promise<any> {
    const failoverProviders: ModelProvider[] = ['openrouter', 'openai', 'anthropic', 'local'];
    
    // Remove the primary provider from failover list
    const alternativeProviders = failoverProviders.filter(p => p !== this.modelConfig.provider);
    
    for (const provider of alternativeProviders) {
      try {
        console.log(`Attempting failover to ${provider}...`);
        return await this.generateWithProvider(provider, prompt, model, temperature, maxTokens);
      } catch (error) {
        console.warn(`Failover to ${provider} failed:`, error);
        continue;
      }
    }
    
    throw new Error('All model providers failed');
  }

  /**
   * Test connection to a specific model
   */
  async testModelConnection(provider: ModelProvider, modelName: string): Promise<boolean> {
    try {
      switch (provider) {
        case 'local':
          return await this.localService.testModelConnection(modelName);
        case 'openrouter':
          return await this.openRouterService.testConnection();
        case 'openai':
        case 'anthropic':
          return await this.apiService.testModelConnection(provider, modelName);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Failed to test connection for ${provider}/${modelName}:`, error);
      return false;
    }
  }

  /**
   * Get model capabilities
   */
  async getModelCapabilities(provider: ModelProvider, modelName: string): Promise<any> {
    try {
      switch (provider) {
        case 'local':
          return await this.localService.getModelCapabilities(modelName);
        case 'openrouter':
          return await this.openRouterService.getModelCapabilities(modelName);
        case 'openai':
        case 'anthropic':
          return await this.apiService.getModelCapabilities(provider, modelName);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to get capabilities for ${provider}/${modelName}:`, error);
      return null;
    }
  }

  /**
   * Update model configuration
   */
  async updateModelConfig(config: Partial<ModelConfig>): Promise<void> {
    try {
      await this.apiService.updateModelConfig(config);
      
      // Update local store
      const { updateModelConfig } = useSystemStore.getState();
      updateModelConfig(config);
      
      // Refresh local config
      this.refreshConfig();
    } catch (error) {
      console.error('Failed to update model config:', error);
      throw error;
    }
  }

  /**
   * Get system performance metrics
   */
  async getPerformanceMetrics(): Promise<any> {
    try {
      return await this.apiService.getPerformanceMetrics();
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return null;
    }
  }

  /**
   * Get API key status for all providers
   */
  async getApiKeyStatus(): Promise<Record<ModelProvider, any>> {
    const status: Record<ModelProvider, any> = {} as Record<ModelProvider, any>;
    
    try {
      const providers: ModelProvider[] = ['openai', 'anthropic', 'openrouter'];
      
      for (const provider of providers) {
        try {
          status[provider] = await this.apiService.getApiKeyStatus(provider);
        } catch (error) {
          status[provider] = { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
    } catch (error) {
      console.error('Failed to get API key status:', error);
    }
    
    return status;
  }

  /**
   * Validate model configuration
   */
  async validateConfig(config: ModelConfig): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Test connection to the configured model
      const isConnected = await this.testModelConnection(config.provider, config.modelName);
      if (!isConnected) {
        errors.push(`Cannot connect to ${config.provider}/${config.modelName}`);
      }
      
      // Validate temperature range
      if (config.temperature < 0 || config.temperature > 2) {
        errors.push('Temperature must be between 0 and 2');
      }
      
      // Validate max tokens
      if (config.maxTokens < 1 || config.maxTokens > 8192) {
        errors.push('Max tokens must be between 1 and 8192');
      }
      
      // Check API key for external providers
      if (config.provider !== 'local') {
        const apiStatus = await this.apiService.getApiKeyStatus(config.provider);
        if (!apiStatus?.valid) {
          errors.push(`${config.provider} API key is not valid`);
        }
      }
    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}