import { v4 as uuidv4 } from 'uuid';
import { useSystemStore } from '@/store/system-store';
import { 
  SystemStatus, 
  SystemConstraints, 
  SystemResourceUsage,
  Agent,
  AgentMessage,
} from '@/types/agent-types';

/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
  timestamp: Date;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  gpu?: number;
  temperature: number;
  power: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  agentCount: number;
  activeTasks: number;
  queueLength: number;
}

/**
 * Resource Prediction
 */
export interface ResourcePrediction {
  timestamp: Date;
  predictedCpu: number;
  predictedMemory: number;
  predictedDisk: number;
  predictedNetwork: number;
  confidence: number;
  timeHorizon: number; // in minutes
  factors: string[];
}

/**
 * Optimization Strategy
 */
export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  conditions: string[]; // JavaScript condition strings
  actions: string[]; // JavaScript action strings
  priority: number;
  enabled: boolean;
  cooldown: number; // in milliseconds
  lastExecuted?: Date;
  successCount: number;
  failureCount: number;
}

/**
 * Resource Allocation
 */
export interface ResourceAllocation {
  agentId: string;
  cpu: number;
  memory: number;
  priority: number;
  maxCpu: number;
  maxMemory: number;
  constraints: string[];
  lastUpdated: Date;
}

/**
 * Performance Profile
 */
export interface PerformanceProfile {
  id: string;
  name: string;
  description: string;
  cpuThreshold: number;
  memoryThreshold: number;
  responseTimeThreshold: number;
  errorRateThreshold: number;
  optimizationStrategies: string[];
  isActive: boolean;
  createdAt: Date;
  lastUsed: Date;
}

/**
 * Performance Optimization Service
 * 
 * Implements advanced performance optimization and predictive resource management with:
 * - Real-time performance monitoring and analysis
 * - Machine learning-based resource prediction
 * - Dynamic resource allocation and optimization
 * - Automated performance tuning
 * - Bottleneck detection and resolution
 * - Predictive scaling and load balancing
 * - Performance profiling and optimization strategies
 * - Resource usage analytics and reporting
 */
export class PerformanceOptimizationService {
  private performanceHistory: PerformanceMetrics[] = [];
  private resourcePredictions: ResourcePrediction[] = [];
  private optimizationStrategies: OptimizationStrategy[] = [];
  private resourceAllocations: Map<string, ResourceAllocation> = new Map();
  private performanceProfiles: Map<string, PerformanceProfile> = new Map();
  private activeOptimizations: Map<string, any> = new Map();
  private monitoringInterval: number | null = null;
  private predictionInterval: number | null = null;
  private optimizationInterval: number | null = null;
  private maxHistorySize = 1000;
  private predictionModel: any = null;

  constructor() {
    this.initializeOptimizationStrategies();
    this.initializePerformanceProfiles();
    this.startPerformanceMonitoring();
    this.startResourcePrediction();
    this.startOptimizationEngine();
  }

  /**
   * Initialize optimization strategies
   */
  private initializeOptimizationStrategies(): void {
    this.optimizationStrategies = [
      // CPU Optimization Strategy
      {
        id: 'cpu_optimization',
        name: 'CPU Load Balancing',
        description: 'Distribute CPU load across available resources',
        conditions: [
          'metrics.cpu > 80',
          'metrics.agentCount > 3',
          'metrics.activeTasks > 10'
        ],
        actions: [
          'redistributeCpuLoad()',
          'prioritizeCriticalTasks()',
          'scaleDownLowPriorityAgents()'
        ],
        priority: 1,
        enabled: true,
        cooldown: 300000, // 5 minutes
        successCount: 0,
        failureCount: 0
      },

      // Memory Optimization Strategy
      {
        id: 'memory_optimization',
        name: 'Memory Management',
        description: 'Optimize memory usage and prevent leaks',
        conditions: [
          'metrics.memory > 85',
          'metrics.memory > metrics.cpu * 1.2',
          'metrics.responseTime > 5000'
        ],
        actions: [
          'garbageCollect()',
          'clearCache()',
          'restartMemoryIntensiveAgents()'
        ],
        priority: 2,
        enabled: true,
        cooldown: 600000, // 10 minutes
        successCount: 0,
        failureCount: 0
      },

      // Network Optimization Strategy
      {
        id: 'network_optimization',
        name: 'Network Optimization',
        description: 'Optimize network bandwidth and latency',
        conditions: [
          'metrics.network > 70',
          'metrics.responseTime > 3000',
          'metrics.queueLength > 20'
        ],
        actions: [
          'compressDataTransfers()',
          'prioritizeCriticalNetworkTraffic()',
          'implementConnectionPooling()'
        ],
        priority: 3,
        enabled: true,
        cooldown: 180000, // 3 minutes
        successCount: 0,
        failureCount: 0
      },

      // Auto-scaling Strategy
      {
        id: 'auto_scaling',
        name: 'Auto-scaling',
        description: 'Automatically scale resources based on demand',
        conditions: [
          'metrics.cpu > 75',
          'metrics.activeTasks > metrics.agentCount * 5',
          'metrics.queueLength > 15'
        ],
        actions: [
          'scaleUpAgents()',
          'distributeWorkload()',
          'optimizeResourceAllocation()'
        ],
        priority: 4,
        enabled: true,
        cooldown: 900000, // 15 minutes
        successCount: 0,
        failureCount: 0
      },

      // Error Rate Optimization Strategy
      {
        id: 'error_rate_optimization',
        name: 'Error Rate Reduction',
        description: 'Reduce error rates and improve reliability',
        conditions: [
          'metrics.errorRate > 5',
          'metrics.responseTime > 8000',
          'metrics.errorRate > metrics.cpu * 0.1'
        ],
        actions: [
          'restartFailingAgents()',
          'implementRetryLogic()',
          'logAndAnalyzeErrors()'
        ],
        priority: 5,
        enabled: true,
        cooldown: 120000, // 2 minutes
        successCount: 0,
        failureCount: 0
      }
    ];
  }

  /**
   * Initialize performance profiles
   */
  private initializePerformanceProfiles(): void {
    const profiles: PerformanceProfile[] = [
      {
        id: 'high_performance',
        name: 'High Performance',
        description: 'Maximum performance with resource intensive operations',
        cpuThreshold: 90,
        memoryThreshold: 85,
        responseTimeThreshold: 1000,
        errorRateThreshold: 1,
        optimizationStrategies: ['cpu_optimization', 'memory_optimization', 'auto_scaling'],
        isActive: false,
        createdAt: new Date(),
        lastUsed: new Date()
      },
      {
        id: 'balanced',
        name: 'Balanced',
        description: 'Balanced performance and resource usage',
        cpuThreshold: 75,
        memoryThreshold: 70,
        responseTimeThreshold: 3000,
        errorRateThreshold: 2,
        optimizationStrategies: ['cpu_optimization', 'memory_optimization'],
        isActive: true,
        createdAt: new Date(),
        lastUsed: new Date()
      },
      {
        id: 'power_saving',
        name: 'Power Saving',
        description: 'Minimal resource usage with reduced performance',
        cpuThreshold: 50,
        memoryThreshold: 60,
        responseTimeThreshold: 5000,
        errorRateThreshold: 3,
        optimizationStrategies: ['memory_optimization'],
        isActive: false,
        createdAt: new Date(),
        lastUsed: new Date()
      }
    ];

    profiles.forEach(profile => {
      this.performanceProfiles.set(profile.id, profile);
    });
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.monitoringInterval = window.setInterval(() => {
      this.collectPerformanceMetrics();
    }, 5000); // Collect metrics every 5 seconds
  }

  /**
   * Start resource prediction
   */
  private startResourcePrediction(): void {
    this.predictionInterval = window.setInterval(() => {
      this.generateResourcePredictions();
    }, 30000); // Generate predictions every 30 seconds
  }

  /**
   * Start optimization engine
   */
  private startOptimizationEngine(): void {
    this.optimizationInterval = window.setInterval(() => {
      this.runOptimizationEngine();
    }, 60000); // Run optimization every minute
  }

  /**
   * Collect performance metrics
   */
  private async collectPerformanceMetrics(): Promise<void> {
    try {
      const metrics = await this.getCurrentMetrics();
      
      const performanceMetrics: PerformanceMetrics = {
        timestamp: new Date(),
        cpu: metrics.cpu,
        memory: metrics.memory,
        disk: metrics.disk,
        network: metrics.network,
        gpu: metrics.gpu,
        temperature: metrics.temperature,
        power: metrics.power,
        responseTime: metrics.responseTime,
        throughput: metrics.throughput,
        errorRate: metrics.errorRate,
        agentCount: metrics.agentCount,
        activeTasks: metrics.activeTasks,
        queueLength: metrics.queueLength
      };

      // Add to history
      this.performanceHistory.push(performanceMetrics);
      
      // Maintain history size
      if (this.performanceHistory.length > this.maxHistorySize) {
        this.performanceHistory.shift();
      }

      // Update system store
      const { updateResourceUsage } = useSystemStore.getState();
      updateResourceUsage({
        cpuUtilization: performanceMetrics.cpu,
        memoryUtilization: performanceMetrics.memory,
        tokensUsedLastMinute: performanceMetrics.throughput * 10, // Estimate
        activeAgentCount: performanceMetrics.agentCount,
        pendingTaskCount: performanceMetrics.activeTasks
      });

    } catch (error) {
      console.error('Error collecting performance metrics:', error);
    }
  }

  /**
   * Get current system metrics
   */
  private async getCurrentMetrics(): Promise<PerformanceMetrics> {
    // Simulate getting current metrics
    // In a real implementation, this would collect actual system metrics
    const now = Date.now();
    const baseLoad = 30 + Math.sin(now / 10000) * 20; // Oscillating load
    
    return {
      timestamp: new Date(),
      cpu: Math.max(0, Math.min(100, baseLoad + (Math.random() - 0.5) * 10)),
      memory: Math.max(0, Math.min(100, baseLoad * 0.8 + (Math.random() - 0.5) * 8)),
      disk: Math.max(0, Math.min(100, baseLoad * 0.6 + (Math.random() - 0.5) * 6)),
      network: Math.max(0, Math.min(100, baseLoad * 0.7 + (Math.random() - 0.5) * 7)),
      gpu: Math.max(0, Math.min(100, baseLoad * 0.9 + (Math.random() - 0.5) * 9)),
      temperature: Math.max(20, Math.min(90, 40 + baseLoad * 0.4 + (Math.random() - 0.5) * 5)),
      power: Math.max(0, Math.min(100, baseLoad * 0.85 + (Math.random() - 0.5) * 8)),
      responseTime: Math.max(10, Math.min(10000, 100 + baseLoad * 50 + (Math.random() - 0.5) * 100)),
      throughput: Math.max(1, Math.min(1000, 100 - baseLoad * 2 + (Math.random() - 0.5) * 20)),
      errorRate: Math.max(0, Math.min(20, baseLoad * 0.1 + (Math.random() - 0.5) * 2)),
      agentCount: Math.floor(3 + Math.random() * 7),
      activeTasks: Math.floor(5 + Math.random() * 15),
      queueLength: Math.floor(2 + Math.random() * 8)
    };
  }

  /**
   * Generate resource predictions
   */
  private async generateResourcePredictions(): Promise<void> {
    try {
      if (this.performanceHistory.length < 10) {
        return; // Need enough history for predictions
      }

      // Analyze recent trends
      const recentMetrics = this.performanceHistory.slice(-20);
      const trends = this.analyzeTrends(recentMetrics);
      
      // Generate predictions for different time horizons
      const timeHorizons = [5, 15, 30, 60]; // minutes
      
      for (const timeHorizon of timeHorizons) {
        const prediction = await this.predictResourceUsage(trends, timeHorizon);
        this.resourcePredictions.push(prediction);
      }

      // Maintain prediction history
      if (this.resourcePredictions.length > 100) {
        this.resourcePredictions.shift();
      }

    } catch (error) {
      console.error('Error generating resource predictions:', error);
    }
  }

  /**
   * Analyze trends from performance metrics
   */
  private analyzeTrends(metrics: PerformanceMetrics[]): {
    cpuTrend: number;
    memoryTrend: number;
    networkTrend: number;
    responseTimeTrend: number;
    errorRateTrend: number;
  } {
    if (metrics.length < 2) {
      return {
        cpuTrend: 0,
        memoryTrend: 0,
        networkTrend: 0,
        responseTimeTrend: 0,
        errorRateTrend: 0
      };
    }

    const halfPoint = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, halfPoint);
    const secondHalf = metrics.slice(halfPoint);

    const calculateAverage = (arr: PerformanceMetrics[], key: keyof PerformanceMetrics) => {
      return arr.reduce((sum, metric) => sum + (metric[key] as number), 0) / arr.length;
    };

    return {
      cpuTrend: calculateAverage(secondHalf, 'cpu') - calculateAverage(firstHalf, 'cpu'),
      memoryTrend: calculateAverage(secondHalf, 'memory') - calculateAverage(firstHalf, 'memory'),
      networkTrend: calculateAverage(secondHalf, 'network') - calculateAverage(firstHalf, 'network'),
      responseTimeTrend: calculateAverage(secondHalf, 'responseTime') - calculateAverage(firstHalf, 'responseTime'),
      errorRateTrend: calculateAverage(secondHalf, 'errorRate') - calculateAverage(firstHalf, 'errorRate')
    };
  }

  /**
   * Predict resource usage
   */
  private async predictResourceUsage(
    trends: any, 
    timeHorizon: number
  ): Promise<ResourcePrediction> {
    // Simple linear prediction based on trends
    // In a real implementation, this would use machine learning models
    
    const currentMetrics = this.performanceHistory[this.performanceHistory.length - 1];
    const decayFactor = Math.exp(-timeHorizon / 60); // Decay over time
    
    const predictedCpu = Math.max(0, Math.min(100, 
      currentMetrics.cpu + trends.cpuTrend * timeHorizon * decayFactor
    ));
    
    const predictedMemory = Math.max(0, Math.min(100, 
      currentMetrics.memory + trends.memoryTrend * timeHorizon * decayFactor
    ));
    
    const predictedNetwork = Math.max(0, Math.min(100, 
      currentMetrics.network + trends.networkTrend * timeHorizon * decayFactor
    ));

    // Calculate confidence based on data quality and trend stability
    const confidence = this.calculatePredictionConfidence(trends, timeHorizon);

    return {
      timestamp: new Date(),
      predictedCpu,
      predictedMemory,
      predictedDisk: predictedMemory * 0.8, // Estimate based on memory
      predictedNetwork,
      confidence,
      timeHorizon,
      factors: [
        `CPU trend: ${trends.cpuTrend.toFixed(2)}`,
        `Memory trend: ${trends.memoryTrend.toFixed(2)}`,
        `Network trend: ${trends.networkTrend.toFixed(2)}`,
        `Time horizon: ${timeHorizon} minutes`
      ]
    };
  }

  /**
   * Calculate prediction confidence
   */
  private calculatePredictionConfidence(trends: any, timeHorizon: number): number {
    // Simple confidence calculation based on trend stability
    const trendStability = Math.abs(trends.cpuTrend) + Math.abs(trends.memoryTrend) + Math.abs(trends.networkTrend);
    const stabilityFactor = Math.max(0, 1 - trendStability / 10);
    const timeFactor = Math.max(0, 1 - timeHorizon / 120); // Lower confidence for longer predictions
    
    return Math.max(0.1, Math.min(0.95, stabilityFactor * timeFactor));
  }

  /**
   * Run optimization engine
   */
  private async runOptimizationEngine(): Promise<void> {
    try {
      const currentMetrics = this.performanceHistory[this.performanceHistory.length - 1];
      if (!currentMetrics) return;

      // Check each optimization strategy
      for (const strategy of this.optimizationStrategies) {
        if (!strategy.enabled) continue;

        // Check cooldown
        if (strategy.lastExecuted) {
          const timeSinceLastExecution = Date.now() - strategy.lastExecuted.getTime();
          if (timeSinceLastExecution < strategy.cooldown) continue;
        }

        // Evaluate conditions
        const conditionsMet = this.evaluateStrategyConditions(strategy, currentMetrics);
        
        if (conditionsMet) {
          await this.executeOptimizationStrategy(strategy, currentMetrics);
        }
      }

    } catch (error) {
      console.error('Error running optimization engine:', error);
    }
  }

  /**
   * Evaluate strategy conditions
   */
  private evaluateStrategyConditions(strategy: OptimizationStrategy, metrics: PerformanceMetrics): boolean {
    try {
      const context = { metrics, strategy };
      
      return strategy.conditions.every(condition => {
        // Create a safe evaluation context
        const safeCondition = condition
          .replace(/metrics\./g, 'context.metrics.')
          .replace(/Math\./g, 'Math.');
        
        return eval(safeCondition); // eslint-disable-line no-eval
      });
    } catch (error) {
      console.error(`Error evaluating conditions for strategy ${strategy.id}:`, error);
      return false;
    }
  }

  /**
   * Execute optimization strategy
   */
  private async executeOptimizationStrategy(
    strategy: OptimizationStrategy, 
    metrics: PerformanceMetrics
  ): Promise<void> {
    try {
      console.log(`[Performance Optimization] Executing strategy: ${strategy.name}`);
      
      // Execute actions
      for (const action of strategy.actions) {
        await this.executeOptimizationAction(action, strategy);
      }

      // Update strategy statistics
      strategy.lastExecuted = new Date();
      strategy.successCount++;

      // Log optimization
      this.logOptimization(strategy, metrics);

    } catch (error) {
      console.error(`Error executing optimization strategy ${strategy.id}:`, error);
      strategy.failureCount++;
    }
  }

  /**
   * Execute optimization action
   */
  private async executeOptimizationAction(action: string, strategy: OptimizationStrategy): Promise<void> {
    try {
      // Simulate action execution
      console.log(`[Performance Optimization] Executing action: ${action}`);
      
      // In a real implementation, this would perform actual optimization actions
      switch (action) {
        case 'redistributeCpuLoad()':
          await this.redistributeCpuLoad();
          break;
        case 'prioritizeCriticalTasks()':
          await this.prioritizeCriticalTasks();
          break;
        case 'scaleDownLowPriorityAgents()':
          await this.scaleDownLowPriorityAgents();
          break;
        case 'garbageCollect()':
          await this.performGarbageCollection();
          break;
        case 'clearCache()':
          await this.clearCache();
          break;
        case 'restartMemoryIntensiveAgents()':
          await this.restartMemoryIntensiveAgents();
          break;
        case 'compressDataTransfers()':
          await this.compressDataTransfers();
          break;
        case 'prioritizeCriticalNetworkTraffic()':
          await this.prioritizeCriticalNetworkTraffic();
          break;
        case 'implementConnectionPooling()':
          await this.implementConnectionPooling();
          break;
        case 'scaleUpAgents()':
          await this.scaleUpAgents();
          break;
        case 'distributeWorkload()':
          await this.distributeWorkload();
          break;
        case 'optimizeResourceAllocation()':
          await this.optimizeResourceAllocation();
          break;
        case 'restartFailingAgents()':
          await this.restartFailingAgents();
          break;
        case 'implementRetryLogic()':
          await this.implementRetryLogic();
          break;
        case 'logAndAnalyzeErrors()':
          await this.logAndAnalyzeErrors();
          break;
        default:
          console.warn(`Unknown optimization action: ${action}`);
      }

    } catch (error) {
      console.error(`Error executing action ${action}:`, error);
      throw error;
    }
  }

  /**
   * Optimize CPU load distribution
   */
  private async redistributeCpuLoad(): Promise<void> {
    // Simulate CPU load redistribution
    console.log('[Performance Optimization] Redistributing CPU load...');
    
    // Update resource allocations
    for (const [agentId, allocation] of this.resourceAllocations) {
      if (allocation.cpu > 80) {
        allocation.cpu = Math.max(20, allocation.cpu - 10);
        allocation.lastUpdated = new Date();
      }
    }
  }

  /**
   * Prioritize critical tasks
   */
  private async prioritizeCriticalTasks(): Promise<void> {
    console.log('[Performance Optimization] Prioritizing critical tasks...');
    // Implement task prioritization logic
  }

  /**
   * Scale down low priority agents
   */
  private async scaleDownLowPriorityAgents(): Promise<void> {
    console.log('[Performance Optimization] Scaling down low priority agents...');
    // Implement agent scaling logic
  }

  /**
   * Perform garbage collection
   */
  private async performGarbageCollection(): Promise<void> {
    console.log('[Performance Optimization] Performing garbage collection...');
    // Simulate garbage collection
  }

  /**
   * Clear cache
   */
  private async clearCache(): Promise<void> {
    console.log('[Performance Optimization] Clearing cache...');
    // Implement cache clearing logic
  }

  /**
   * Restart memory intensive agents
   */
  private async restartMemoryIntensiveAgents(): Promise<void> {
    console.log('[Performance Optimization] Restarting memory intensive agents...');
    // Implement agent restart logic
  }

  /**
   * Compress data transfers
   */
  private async compressDataTransfers(): Promise<void> {
    console.log('[Performance Optimization] Compressing data transfers...');
    // Implement data compression logic
  }

  /**
   * Prioritize critical network traffic
   */
  private async prioritizeCriticalNetworkTraffic(): Promise<void> {
    console.log('[Performance Optimization] Prioritizing critical network traffic...');
    // Implement network prioritization logic
  }

  /**
   * Implement connection pooling
   */
  private async implementConnectionPooling(): Promise<void> {
    console.log('[Performance Optimization] Implementing connection pooling...');
    // Implement connection pooling logic
  }

  /**
   * Scale up agents
   */
  private async scaleUpAgents(): Promise<void> {
    console.log('[Performance Optimization] Scaling up agents...');
    // Implement agent scaling logic
  }

  /**
   * Distribute workload
   */
  private async distributeWorkload(): Promise<void> {
    console.log('[Performance Optimization] Distributing workload...');
    // Implement workload distribution logic
  }

  /**
   * Optimize resource allocation
   */
  private async optimizeResourceAllocation(): Promise<void> {
    console.log('[Performance Optimization] Optimizing resource allocation...');
    // Implement resource allocation optimization
  }

  /**
   * Restart failing agents
   */
  private async restartFailingAgents(): Promise<void> {
    console.log('[Performance Optimization] Restarting failing agents...');
    // Implement agent restart logic
  }

  /**
   * Implement retry logic
   */
  private async implementRetryLogic(): Promise<void> {
    console.log('[Performance Optimization] Implementing retry logic...');
    // Implement retry logic
  }

  /**
   * Log and analyze errors
   */
  private async logAndAnalyzeErrors(): Promise<void> {
    console.log('[Performance Optimization] Logging and analyzing errors...');
    // Implement error analysis logic
  }

  /**
   * Log optimization
   */
  private logOptimization(strategy: OptimizationStrategy, metrics: PerformanceMetrics): void {
    const logEntry = {
      timestamp: new Date(),
      strategyId: strategy.id,
      strategyName: strategy.name,
      metrics: { ...metrics },
      success: true
    };

    // In a real implementation, this would be stored in a database or sent to a logging service
    console.log('[Performance Optimization] Log:', logEntry);
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetricsData(): PerformanceMetrics | null {
    return this.performanceHistory[this.performanceHistory.length - 1] || null;
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(limit?: number): PerformanceMetrics[] {
    if (limit) {
      return this.performanceHistory.slice(-limit);
    }
    return [...this.performanceHistory];
  }

  /**
   * Get resource predictions
   */
  getResourcePredictions(): ResourcePrediction[] {
    return [...this.resourcePredictions];
  }

  /**
   * Get optimization strategies
   */
  getOptimizationStrategies(): OptimizationStrategy[] {
    return [...this.optimizationStrategies];
  }

  /**
   * Add optimization strategy
   */
  addOptimizationStrategy(strategy: OptimizationStrategy): void {
    this.optimizationStrategies.push(strategy);
    console.log(`[Performance Optimization] Added strategy: ${strategy.name}`);
  }

  /**
   * Remove optimization strategy
   */
  removeOptimizationStrategy(strategyId: string): void {
    this.optimizationStrategies = this.optimizationStrategies.filter(s => s.id !== strategyId);
    console.log(`[Performance Optimization] Removed strategy: ${strategyId}`);
  }

  /**
   * Enable/disable optimization strategy
   */
  toggleOptimizationStrategy(strategyId: string, enabled: boolean): void {
    const strategy = this.optimizationStrategies.find(s => s.id === strategyId);
    if (strategy) {
      strategy.enabled = enabled;
      console.log(`[Performance Optimization] ${enabled ? 'Enabled' : 'Disabled'} strategy: ${strategyId}`);
    }
  }

  /**
   * Get performance profiles
   */
  getPerformanceProfiles(): PerformanceProfile[] {
    return Array.from(this.performanceProfiles.values());
  }

  /**
   * Set active performance profile
   */
  setActivePerformanceProfile(profileId: string): boolean {
    const profile = this.performanceProfiles.get(profileId);
    if (profile) {
      // Deactivate all profiles
      for (const p of this.performanceProfiles.values()) {
        p.isActive = false;
      }
      
      // Activate selected profile
      profile.isActive = true;
      profile.lastUsed = new Date();
      
      console.log(`[Performance Optimization] Activated profile: ${profile.name}`);
      return true;
    }
    return false;
  }

  /**
   * Create custom performance profile
   */
  createPerformanceProfile(profile: Omit<PerformanceProfile, 'id' | 'createdAt' | 'lastUsed'>): string {
    const newProfile: PerformanceProfile = {
      ...profile,
      id: uuidv4(),
      createdAt: new Date(),
      lastUsed: new Date()
    };

    this.performanceProfiles.set(newProfile.id, newProfile);
    console.log(`[Performance Optimization] Created profile: ${newProfile.name}`);
    return newProfile.id;
  }

  /**
   * Get resource allocations
   */
  getResourceAllocations(): Map<string, ResourceAllocation> {
    return new Map(this.resourceAllocations);
  }

  /**
   * Update resource allocation
   */
  updateResourceAllocation(agentId: string, allocation: Partial<ResourceAllocation>): void {
    const current = this.resourceAllocations.get(agentId);
    if (current) {
      Object.assign(current, allocation);
      current.lastUpdated = new Date();
    } else {
      this.resourceAllocations.set(agentId, {
        agentId,
        cpu: 50,
        memory: 50,
        priority: 1,
        maxCpu: 100,
        maxMemory: 100,
        constraints: [],
        lastUpdated: new Date(),
        ...allocation
      });
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    currentMetrics: PerformanceMetrics | null;
    predictions: ResourcePrediction[];
    activeStrategies: number;
    totalOptimizations: number;
    systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
    recommendations: string[];
  } {
    const currentMetrics = this.getCurrentMetricsData();
    const predictions = this.getResourcePredictions();
    const activeStrategies = this.optimizationStrategies.filter(s => s.enabled).length;
    const totalOptimizations = this.optimizationStrategies.reduce((sum, s) => sum + s.successCount, 0);

    // Calculate system health
    let systemHealth: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
    const recommendations: string[] = [];

    if (currentMetrics) {
      if (currentMetrics.cpu > 90 || currentMetrics.memory > 90) {
        systemHealth = 'critical';
        recommendations.push('Immediate action required: High resource usage detected');
      } else if (currentMetrics.cpu > 80 || currentMetrics.memory > 80) {
        systemHealth = 'warning';
        recommendations.push('Monitor resource usage: Consider optimization');
      } else if (currentMetrics.cpu > 70 || currentMetrics.memory > 70) {
        systemHealth = 'good';
        recommendations.push('System performance is acceptable');
      }
    }

    // Add prediction-based recommendations
    if (predictions.length > 0) {
      const latestPrediction = predictions[predictions.length - 1];
      if (latestPrediction.predictedCpu > 85 && latestPrediction.confidence > 0.7) {
        recommendations.push(`Predicted CPU spike: ${latestPrediction.predictedCpu.toFixed(1)}% in ${latestPrediction.timeHorizon} minutes`);
      }
    }

    return {
      currentMetrics,
      predictions,
      activeStrategies,
      totalOptimizations,
      systemHealth,
      recommendations
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): {
    period: string;
    summary: any;
    metrics: PerformanceMetrics[];
    predictions: ResourcePrediction[];
    optimizations: any[];
    recommendations: string[];
  } {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    
    const periodMetrics = this.performanceHistory.filter(m => 
      m.timestamp >= startTime && m.timestamp <= endTime
    );
    
    const periodPredictions = this.resourcePredictions.filter(p => 
      p.timestamp >= startTime && p.timestamp <= endTime
    );

    const summary = this.getPerformanceSummary();
    const recommendations = [...summary.recommendations];

    // Add trend analysis
    if (periodMetrics.length > 10) {
      const trends = this.analyzeTrends(periodMetrics);
      if (trends.cpuTrend > 1) {
        recommendations.push('CPU usage is trending upward: Consider scaling up resources');
      }
      if (trends.memoryTrend > 1) {
        recommendations.push('Memory usage is trending upward: Check for memory leaks');
      }
      if (trends.errorRateTrend > 0.1) {
        recommendations.push('Error rate is increasing: Investigate system stability');
      }
    }

    return {
      period: `${startTime.toISOString()} to ${endTime.toISOString()}`,
      summary,
      metrics: periodMetrics,
      predictions: periodPredictions,
      optimizations: Array.from(this.activeOptimizations.values()),
      recommendations
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[Performance Optimization] Shutting down...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.predictionInterval) {
      clearInterval(this.predictionInterval);
    }
    
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
    }
    
    this.performanceHistory = [];
    this.resourcePredictions = [];
    this.activeOptimizations.clear();
    
    console.log('[Performance Optimization] Shutdown complete');
  }
}

/**
 * Global performance optimization service instance
 */
export const performanceOptimizationService = new PerformanceOptimizationService();