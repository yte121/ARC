import { ModelConfig, ModelProvider, SystemConstraints } from '@/types/agent-types';
import { useSystemStore } from '@/store/system-store';
import { APIService } from '@/services/APIService';
import { LocalModelService } from './LocalModelService';
import { OpenRouterService } from './OpenRouterService';
import { OpenRouterServiceWithKeyRotation } from './OpenRouterKeyManager';

/**
 * Model Health Status
 */
interface ModelHealthStatus {
  provider: ModelProvider;
  model: string;
  isHealthy: boolean;
  latency: number;
  successRate: number;
  lastChecked: Date;
  errorRate: number;
  consecutiveFailures: number;
  averageResponseTime: number;
  lastFailureReason?: string;
}

/**
 * Failover Configuration
 */
interface FailoverConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  healthCheckInterval: number;
  performanceThreshold: number;
  enablePredictiveFailover: boolean;
  enableLoadBalancing: boolean;
  preferredProviders: ModelProvider[];
  backupProviders: ModelProvider[];
}

/**
 * Model Failover Service
 * 
 * Implements intelligent model failover with:
 * - Real-time health monitoring
 * - Performance-based routing
 * - Predictive failover decisions
 * - Load balancing across providers
 * - Automatic recovery mechanisms
 * - Cost optimization
 */
export class ModelFailoverService {
  private localService: LocalModelService;
  private openRouterService: OpenRouterService;
  private openRouterServiceWithRotation: OpenRouterServiceWithKeyRotation;
  private apiService: APIService;
  private modelConfig: ModelConfig;
  private constraints: SystemConstraints;
  private healthStatus: Map<string, ModelHealthStatus> = new Map();
  private failoverConfig: FailoverConfig;
  private healthCheckInterval: number | null = null;
  private requestHistory: Array<{
    timestamp: Date;
    provider: ModelProvider;
    model: string;
    success: boolean;
    latency: number;
    tokens: number;
    cost?: number;
  }> = [];
  private maxHistorySize = 1000;

  constructor() {
    const store = useSystemStore.getState();
    this.modelConfig = store.activeModelConfig;
    this.constraints = store.constraints;
    this.localService = new LocalModelService();
    this.openRouterService = new OpenRouterService();
    this.openRouterServiceWithRotation = new OpenRouterServiceWithKeyRotation();
    this.apiService = new APIService();
    
    // Initialize failover configuration
    this.failoverConfig = {
      enabled: true,
      maxRetries: 3,
      retryDelay: 1000,
      healthCheckInterval: 30000, // 30 seconds
      performanceThreshold: 2000, // 2 seconds
      enablePredictiveFailover: true,
      enableLoadBalancing: true,
      preferredProviders: ['local', 'openrouter'],
      backupProviders: ['openai', 'anthropic']
    };

    this.initializeHealthMonitoring();
  }

  /**
   * Initialize health monitoring
   */
  private initializeHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = window.setInterval(() => {
      this.performHealthChecks();
    }, this.failoverConfig.healthCheckInterval);

    // Initial health check
    this.performHealthChecks();
  }

  /**
   * Perform health checks on all available models
   */
  private async performHealthChecks(): Promise<void> {
    const providers: ModelProvider[] = ['local', 'openrouter', 'openai', 'anthropic'];
    
    for (const provider of providers) {
      try {
        await this.checkModelHealth(provider);
      } catch (error) {
        console.warn(`Health check failed for ${provider}:`, error);
      }
    }
  }

  /**
   * Check health of a specific model
   */
  private async checkModelHealth(provider: ModelProvider): Promise<void> {
    const key = `${provider}:${this.modelConfig.modelName}`;
    const existingStatus = this.healthStatus.get(key);
    
    const startTime = performance.now();
    let isHealthy = false;
    let latency = 0;
    let lastFailureReason: string | undefined;

    try {
      // Test connection with a simple prompt
      const testPrompt = 'Hello';
      const response = await this.generateWithProvider(provider, testPrompt, this.modelConfig.modelName, 0.1, 10);
      
      latency = performance.now() - startTime;
      isHealthy = latency < this.failoverConfig.performanceThreshold && response.text;
      
      if (existingStatus) {
        // Update success rate
        const totalRequests = existingStatus.successRate * 100 + (isHealthy ? 1 : 0);
        const newSuccessRate = totalRequests / 100;
        
        // Update average response time
        const totalLatency = existingStatus.averageResponseTime * existingStatus.successRate + latency;
        const newAverageResponseTime = totalLatency / newSuccessRate;
        
        this.healthStatus.set(key, {
          ...existingStatus,
          isHealthy,
          latency,
          successRate: newSuccessRate,
          lastChecked: new Date(),
          averageResponseTime: newAverageResponseTime,
          consecutiveFailures: isHealthy ? 0 : existingStatus.consecutiveFailures + 1,
          lastFailureReason: isHealthy ? undefined : 'Health check failed'
        });
      } else {
        this.healthStatus.set(key, {
          provider,
          model: this.modelConfig.modelName,
          isHealthy,
          latency,
          successRate: isHealthy ? 1 : 0,
          lastChecked: new Date(),
          errorRate: isHealthy ? 0 : 1,
          consecutiveFailures: isHealthy ? 0 : 1,
          averageResponseTime: latency,
          lastFailureReason
        });
      }
    } catch (error: any) {
      latency = performance.now() - startTime;
      isHealthy = false;
      lastFailureReason = error.message;
      
      if (existingStatus) {
        const totalRequests = existingStatus.successRate * 100 + 1;
        const newSuccessRate = (existingStatus.successRate * 100) / totalRequests;
        const newErrorRate = 1 - newSuccessRate;
        
        this.healthStatus.set(key, {
          ...existingStatus,
          isHealthy,
          latency,
          successRate: newSuccessRate,
          lastChecked: new Date(),
          errorRate: newErrorRate,
          consecutiveFailures: existingStatus.consecutiveFailures + 1,
          lastFailureReason
        });
      } else {
        this.healthStatus.set(key, {
          provider,
          model: this.modelConfig.modelName,
          isHealthy,
          latency,
          successRate: 0,
          lastChecked: new Date(),
          errorRate: 1,
          consecutiveFailures: 1,
          averageResponseTime: latency,
          lastFailureReason
        });
      }
    }
  }

  /**
   * Generate response with intelligent failover
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
    
    if (!this.failoverConfig.enabled) {
      // Use simple generation without failover
      return await this.generateWithProvider(
        this.modelConfig.provider,
        prompt,
        useModel,
        useTemperature,
        useMaxTokens
      );
    }

    // Try providers in order of preference based on health
    const providers = this.getProviderPriority();
    
    let lastError: Error | null = null;
    
    for (const provider of providers) {
      for (let attempt = 0; attempt < this.failoverConfig.maxRetries; attempt++) {
        try {
          const startTime = performance.now();
          
          // Check if provider is healthy
          const providerKey = `${provider}:${useModel}`;
          const healthStatus = this.healthStatus.get(providerKey);
          
          if (healthStatus && !healthStatus.isHealthy && healthStatus.consecutiveFailures > 3) {
            console.warn(`Skipping unhealthy provider ${provider} (consecutive failures: ${healthStatus.consecutiveFailures})`);
            continue;
          }
          
          console.log(`Attempting request with ${provider}/${useModel} (attempt ${attempt + 1})`);
          
          const response = await this.generateWithProvider(
            provider,
            prompt,
            useModel,
            useTemperature,
            useMaxTokens
          );
          
          const latency = performance.now() - startTime;
          
          // Record successful request
          this.recordRequest(provider, useModel, true, latency, response.totalTokens);
          
          return {
            ...response,
            provider,
            latency,
            modelName: useModel
          };
          
        } catch (error: any) {
          lastError = error;
          console.warn(`Attempt ${attempt + 1} failed for ${provider}:`, error.message);
          
          // Record failed request
          this.recordRequest(provider, useModel, false, 0, 0, error.message);
          
          // Check if we should try next provider immediately
          if (this.shouldSkipToNextProvider(provider, error)) {
            break;
          }
          
          // Add delay before retry
          if (attempt < this.failoverConfig.maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, this.failoverConfig.retryDelay));
          }
        }
      }
    }
    
    throw new Error(`All providers failed after ${this.failoverConfig.maxRetries} attempts each. Last error: ${lastError?.message}`);
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
        return await this.openRouterServiceWithRotation.generateResponse(prompt, model, temperature, maxTokens);
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
   * Get provider priority based on health and performance
   */
  private getProviderPriority(): ModelProvider[] {
    const providers: ModelProvider[] = ['local', 'openrouter', 'openai', 'anthropic'];
    const scoredProviders = providers.map(provider => {
      const key = `${provider}:${this.modelConfig.modelName}`;
      const healthStatus = this.healthStatus.get(key);
      
      let score = 0;
      
      // Base score from preferred providers
      if (this.failoverConfig.preferredProviders.includes(provider)) {
        score += 100;
      }
      
      // Health score
      if (healthStatus) {
        score += healthStatus.isHealthy ? 50 : 0;
        score += healthStatus.successRate * 30;
        score += Math.max(0, 50 - healthStatus.consecutiveFailures * 10);
        score += Math.max(0, 30 - healthStatus.latency / 100); // Lower latency is better
      }
      
      return { provider, score };
    });
    
    // Sort by score (highest first)
    scoredProviders.sort((a, b) => b.score - a.score);
    
    return scoredProviders.map(p => p.provider);
  }

  /**
   * Check if we should skip to next provider
   */
  private shouldSkipToNextProvider(provider: ModelProvider, error: any): boolean {
    // Skip on certain errors that indicate provider issues
    const skipErrors = [
      '429', // Rate limit
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND'
    ];
    
    return skipErrors.some(skipError => 
      error.message.includes(skipError) || error.status?.toString() === skipError
    );
  }

  /**
   * Record request in history
   */
  private recordRequest(
    provider: ModelProvider,
    model: string,
    success: boolean,
    latency: number,
    tokens: number,
    error?: string
  ): void {
    this.requestHistory.push({
      timestamp: new Date(),
      provider,
      model,
      success,
      latency,
      tokens,
      cost: this.calculateCost(provider, tokens)
    });
    
    // Maintain history size
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory.shift();
    }
    
    // Update health status
    const key = `${provider}:${model}`;
    const existingStatus = this.healthStatus.get(key);
    if (existingStatus) {
      const totalRequests = this.requestHistory.length;
      const successCount = this.requestHistory.filter(r => r.success).length;
      const successRate = successCount / totalRequests;
      
      this.healthStatus.set(key, {
        ...existingStatus,
        successRate,
        errorRate: 1 - successRate,
        lastChecked: new Date(),
        consecutiveFailures: success ? 0 : existingStatus.consecutiveFailures + 1,
        lastFailureReason: error
      });
    }
  }

  /**
   * Calculate cost for a request
   */
  private calculateCost(provider: ModelProvider, tokens: number): number {
    // Simplified cost calculation
    const costPer1kTokens = {
      local: 0,
      openrouter: 0.002,
      openai: 0.002,
      anthropic: 0.003
    };
    
    return (tokens / 1000) * (costPer1kTokens[provider] || 0);
  }

  /**
   * Get health status for all providers
   */
  getHealthStatus(): ModelHealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    totalRequests: number;
    successRate: number;
    averageLatency: number;
    totalCost: number;
    providerStats: Record<ModelProvider, any>;
  } {
    if (this.requestHistory.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageLatency: 0,
        totalCost: 0,
        providerStats: {
          local: {},
          openrouter: {},
          openai: {},
          anthropic: {}
        }
      };
    }
    
    const totalRequests = this.requestHistory.length;
    const successCount = this.requestHistory.filter(r => r.success).length;
    const successRate = successCount / totalRequests;
    const averageLatency = this.requestHistory.reduce((sum, r) => sum + r.latency, 0) / totalRequests;
    const totalCost = this.requestHistory.reduce((sum, r) => sum + (r.cost || 0), 0);
    
    const providerStats: Record<ModelProvider, any> = {} as Record<ModelProvider, any>;
    
    // Group by provider
    const providerGroups = this.requestHistory.reduce((acc, request) => {
      if (!acc[request.provider]) {
        acc[request.provider] = [];
      }
      acc[request.provider].push(request);
      return acc;
    }, {} as Record<ModelProvider, typeof this.requestHistory>);
    
    // Calculate stats per provider
    for (const [provider, requests] of Object.entries(providerGroups)) {
      const providerKey = provider as ModelProvider;
      const providerSuccessCount = requests.filter(r => r.success).length;
      
      providerStats[providerKey] = {
        totalRequests: requests.length,
        successRate: providerSuccessCount / requests.length,
        averageLatency: requests.reduce((sum, r) => sum + r.latency, 0) / requests.length,
        totalCost: requests.reduce((sum, r) => sum + (r.cost || 0), 0),
        totalTokens: requests.reduce((sum, r) => sum + r.tokens, 0)
      };
    }
    
    return {
      totalRequests,
      successRate,
      averageLatency,
      totalCost,
      providerStats
    };
  }

  /**
   * Update failover configuration
   */
  updateFailoverConfig(config: Partial<FailoverConfig>): void {
    this.failoverConfig = { ...this.failoverConfig, ...config };
    
    // Restart health monitoring with new interval
    this.initializeHealthMonitoring();
  }

  /**
   * Get current failover configuration
   */
  getFailoverConfig(): FailoverConfig {
    return { ...this.failoverConfig };
  }

  /**
   * Refresh configuration from store
   */
  private refreshConfig(): void {
    const store = useSystemStore.getState();
    this.modelConfig = store.activeModelConfig;
    this.constraints = store.constraints;
  }

  /**
   * Force health check for a specific provider
   */
  async forceHealthCheck(provider: ModelProvider): Promise<void> {
    await this.checkModelHealth(provider);
  }

  /**
   * Get recommended provider based on current conditions
   */
  getRecommendedProvider(): ModelProvider {
    const providers = this.getProviderPriority();
    return providers[0] || 'local';
  }

  /**
   * Shutdown service
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}