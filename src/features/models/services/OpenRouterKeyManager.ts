import { ModelProvider } from '@/types/agent-types';
import { useSystemStore } from '@/store/system-store';
import { APIService } from '@/services/APIService';

/**
 * OpenRouterKeyManager
 * 
 * Manages multiple API keys for OpenRouter and handles automatic rotation
 * when rate limits (429 errors) are encountered.
 */
export class OpenRouterKeyManager {
  private apiKeys: string[] = [];
  private currentKeyIndex: number = 0;
  private keyUsage: Map<string, {
    requests: number;
    lastUsed: Date;
    rateLimitedUntil?: Date;
    totalTokens: number;
  }> = new Map();
  private apiService: APIService;

  constructor(apiKeys: string[] = []) {
    this.apiKeys = apiKeys.filter(key => key.trim() !== '');
    this.apiService = new APIService();
    
    // Initialize usage tracking for each key
    this.apiKeys.forEach(key => {
      this.keyUsage.set(key, {
        requests: 0,
        lastUsed: new Date(),
        totalTokens: 0
      });
    });
  }

  /**
   * Update the list of available API keys
   */
  updateApiKeys(newKeys: string[]): void {
    const validKeys = newKeys.filter(key => key.trim() !== '');
    
    // Add new keys
    validKeys.forEach(key => {
      if (!this.apiKeys.includes(key)) {
        this.apiKeys.push(key);
        this.keyUsage.set(key, {
          requests: 0,
          lastUsed: new Date(),
          totalTokens: 0
        });
      }
    });

    // Remove invalid/expired keys
    this.apiKeys = this.apiKeys.filter(key => validKeys.includes(key));
    this.keyUsage.forEach((usage, key) => {
      if (!validKeys.includes(key)) {
        this.keyUsage.delete(key);
      }
    });

    // Reset current index if current key is no longer valid
    if (this.currentKeyIndex >= this.apiKeys.length) {
      this.currentKeyIndex = 0;
    }
  }

  /**
   * Get the current API key
   */
  getCurrentApiKey(): string | null {
    if (this.apiKeys.length === 0) {
      return null;
    }
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * Get the current key usage information
   */
  getCurrentKeyUsage(): any {
    const currentKey = this.getCurrentApiKey();
    if (!currentKey) return null;
    
    return this.keyUsage.get(currentKey);
  }

  /**
   * Mark a key as rate-limited until a specific time
   */
  markKeyAsRateLimited(key: string, until: Date): void {
    const usage = this.keyUsage.get(key);
    if (usage) {
      usage.rateLimitedUntil = until;
      console.log(`Key ${key.substring(0, 8)}... marked as rate-limited until ${until.toISOString()}`);
    }
  }

  /**
   * Check if current key is rate-limited
   */
  isCurrentKeyRateLimited(): boolean {
    const currentKey = this.getCurrentApiKey();
    if (!currentKey) return true;
    
    const usage = this.keyUsage.get(currentKey);
    if (!usage?.rateLimitedUntil) return false;
    
    return new Date() < usage.rateLimitedUntil;
  }

  /**
   * Rotate to the next available API key
   */
  rotateToNextKey(): string | null {
    if (this.apiKeys.length === 0) {
      return null;
    }

    // Find the next available key that's not rate-limited
    for (let i = 0; i < this.apiKeys.length; i++) {
      const nextIndex = (this.currentKeyIndex + i + 1) % this.apiKeys.length;
      const nextKey = this.apiKeys[nextIndex];
      const usage = this.keyUsage.get(nextKey);
      
      if (usage && (!usage.rateLimitedUntil || new Date() >= usage.rateLimitedUntil)) {
        this.currentKeyIndex = nextIndex;
        console.log(`Rotated to key ${nextKey.substring(0, 8)}... (index ${this.currentKeyIndex})`);
        return nextKey;
      }
    }

    // All keys are rate-limited
    console.warn('All API keys are currently rate-limited');
    return null;
  }

  /**
   * Record a successful request with the current key
   */
  recordRequest(tokenCount: number = 0): void {
    const currentKey = this.getCurrentApiKey();
    if (!currentKey) return;

    const usage = this.keyUsage.get(currentKey);
    if (usage) {
      usage.requests++;
      usage.lastUsed = new Date();
      usage.totalTokens += tokenCount;
    }
  }

  /**
   * Get key statistics
   */
  getKeyStats(): Array<{
    key: string;
    requests: number;
    lastUsed: Date;
    rateLimitedUntil?: Date;
    totalTokens: number;
    isCurrent: boolean;
    isAvailable: boolean;
  }> {
    return this.apiKeys.map(key => {
      const usage = this.keyUsage.get(key);
      const isCurrent = key === this.getCurrentApiKey();
      const isAvailable = usage && (!usage.rateLimitedUntil || new Date() >= usage.rateLimitedUntil);
      
      return {
        key: key.substring(0, 8) + '...',
        requests: usage?.requests || 0,
        lastUsed: usage?.lastUsed || new Date(),
        rateLimitedUntil: usage?.rateLimitedUntil,
        totalTokens: usage?.totalTokens || 0,
        isCurrent,
        isAvailable
      };
    });
  }

  /**
   * Reset usage statistics for all keys
   */
  resetUsage(): void {
    this.keyUsage.forEach((usage, key) => {
      usage.requests = 0;
      usage.totalTokens = 0;
      usage.rateLimitedUntil = undefined;
    });
    console.log('API key usage statistics reset');
  }

  /**
   * Get the number of available keys (not rate-limited)
   */
  getAvailableKeyCount(): number {
    return this.apiKeys.filter(key => {
      const usage = this.keyUsage.get(key);
      return usage && (!usage.rateLimitedUntil || new Date() >= usage.rateLimitedUntil);
    }).length;
  }

  /**
   * Check if we have any available keys
   */
  hasAvailableKeys(): boolean {
    return this.getAvailableKeyCount() > 0;
  }

  /**
   * Get recommended delay before next request based on current key usage
   */
  getRecommendedDelay(): number {
    const currentKey = this.getCurrentApiKey();
    if (!currentKey) return 1000;

    const usage = this.keyUsage.get(currentKey);
    if (!usage) return 1000;

    // If rate-limited, return time until rate limit expires
    if (usage.rateLimitedUntil) {
      const timeUntilAvailable = usage.rateLimitedUntil.getTime() - Date.now();
      return Math.max(1000, timeUntilAvailable);
    }

    // Base delay based on request count
    const baseDelay = Math.min(1000, usage.requests * 100);
    
    // Add some randomness to avoid synchronized requests
    const randomDelay = Math.random() * 500;
    
    return baseDelay + randomDelay;
  }
}

/**
 * Enhanced OpenRouter Service with key rotation
 */
export class OpenRouterServiceWithKeyRotation {
  private keyManager: OpenRouterKeyManager;
  private modelConfig: any;
  private constraints: any;
  private apiService: APIService;
  private retryAttempts: number = 0;
  private maxRetryAttempts: number = 3;

  constructor(apiKeys: string[] = []) {
    this.keyManager = new OpenRouterKeyManager(apiKeys);
    this.apiService = new APIService();
    this.refreshConfig();
  }

  /**
   * Update API keys
   */
  updateApiKeys(apiKeys: string[]): void {
    this.keyManager.updateApiKeys(apiKeys);
  }

  /**
   * Get current key statistics
   */
  getKeyStats(): any[] {
    return this.keyManager.getKeyStats();
  }

  /**
   * Generate response with automatic key rotation on 429 errors
   */
  async generateResponse(
    prompt: string,
    model?: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<any> {
    this.refreshConfig();
    
    const startTime = performance.now();
    const useModel = model || this.modelConfig.modelName;
    const useTemperature = temperature !== undefined ? temperature : this.modelConfig.temperature;
    const useMaxTokens = maxTokens || this.modelConfig.maxTokens;
    
    // Check if we have any available keys
    if (!this.keyManager.hasAvailableKeys()) {
      throw new Error('All API keys are rate-limited. Please wait or add more keys.');
    }
    
    // Get recommended delay
    const delay = this.keyManager.getRecommendedDelay();
    if (delay > 1000) {
      console.log(`Waiting ${delay.toFixed(0)}ms before request due to rate limiting...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetryAttempts; attempt++) {
      try {
        const currentKey = this.keyManager.getCurrentApiKey();
        if (!currentKey) {
          throw new Error('No API keys available');
        }
        
        console.log(`Attempting request with key ${currentKey.substring(0, 8)}... (attempt ${attempt + 1})`);
        
        // Make API call with current key
        const response = await this.apiService.generateModelResponse({
          prompt,
          modelName: useModel,
          provider: 'openrouter' as ModelProvider,
          temperature: useTemperature,
          maxTokens: useMaxTokens,
          apiKey: currentKey
        });
        
        // Record successful request
        this.keyManager.recordRequest(response.totalTokens);
        this.retryAttempts = 0; // Reset retry counter on success
        
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        // Update resource usage
        const { updateResourceUsage } = useSystemStore.getState();
        updateResourceUsage({
          tokensUsedLastMinute: useSystemStore.getState().resourceUsage.tokensUsedLastMinute + response.totalTokens
        });
        
        return {
          text: response.text,
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          totalTokens: response.totalTokens,
          modelName: useModel,
          latency,
          apiKeyUsed: currentKey.substring(0, 8) + '...'
        };
        
      } catch (error: any) {
        lastError = error;
        console.warn(`Attempt ${attempt + 1} failed:`, error.message);
        
        // Handle 429 rate limit error
        if (error.status === 429 || error.message.includes('429') || error.message.includes('rate limit')) {
          console.warn('Rate limit encountered, rotating API key...');
          
          // Mark current key as rate-limited for 5 minutes (adjust based on response headers if available)
          const currentKey = this.keyManager.getCurrentApiKey();
          if (currentKey) {
            const retryAfter = error.response?.headers?.['retry-after'] || 300; // Default 5 minutes
            const rateLimitUntil = new Date(Date.now() + (typeof retryAfter === 'string' ? parseInt(retryAfter) * 1000 : retryAfter * 1000));
            this.keyManager.markKeyAsRateLimited(currentKey, rateLimitUntil);
          }
          
          // Try to rotate to next key
          const nextKey = this.keyManager.rotateToNextKey();
          if (!nextKey) {
            throw new Error('All API keys are rate-limited. Please wait or add more keys.');
          }
          
          // Continue to next attempt with new key
          continue;
        }
        
        // For non-429 errors, don't retry (unless it's a network error)
        if (error.code !== 'ECONNRESET' && error.code !== 'ETIMEDOUT') {
          break;
        }
        
        // Add exponential backoff for network errors
        const backoffDelay = Math.min(5000, 1000 * Math.pow(2, attempt));
        console.log(`Retrying in ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
    
    // If we get here, all attempts failed
    throw new Error(`Failed after ${this.maxRetryAttempts} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Test connection with current key
   */
  async testConnection(): Promise<boolean> {
    try {
      const currentKey = this.keyManager.getCurrentApiKey();
      if (!currentKey) {
        return false;
      }
      
      return await this.apiService.testModelConnection('openrouter', this.modelConfig.modelName);
    } catch (error) {
      console.error('Failed to test OpenRouter connection:', error);
      return false;
    }
  }

  /**
   * Get model capabilities
   */
  async getModelCapabilities(modelName: string): Promise<any> {
    try {
      const currentKey = this.keyManager.getCurrentApiKey();
      if (!currentKey) {
        return null;
      }
      
      return await this.apiService.getModelCapabilities('openrouter', modelName);
    } catch (error) {
      console.error('Failed to get OpenRouter model capabilities:', error);
      return null;
    }
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
   * Get key statistics for UI display
   */
  public getKeyManager(): OpenRouterKeyManager {
    return this.keyManager;
  }
}