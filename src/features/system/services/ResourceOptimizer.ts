import { useSystemStore } from '@/store/system-store';
import { SystemConstraints, SystemResourceUsage, SystemStatus } from '@/types/agent-types';

/**
 * Resource Optimizer
 * 
 * Advanced resource optimization with:
 * - Predictive resource allocation
 * - Dynamic load balancing
 * - Resource usage forecasting
 * - Cost optimization
 * - Performance-based scaling
 * - Intelligent task scheduling
 */
export class ResourceOptimizer {
  private constraints: SystemConstraints;
  private resourceHistory: Array<{
    timestamp: Date;
    resourceUsage: SystemResourceUsage;
    systemLoad: number;
    agentEfficiency: number;
  }> = [];
  private maxHistorySize = 200;
  private optimizationEnabled = true;
  private lastOptimization = Date.now();
  private optimizationInterval = 60000; // 1 minute
  private predictionModel: ResourcePredictionModel;
  private costTracker: CostTracker;

  constructor(constraints: SystemConstraints) {
    this.constraints = { ...constraints };
    this.predictionModel = new ResourcePredictionModel();
    this.costTracker = new CostTracker();
    this.startOptimizationLoop();
  }

  /**
   * Get current constraints
   */
  getConstraints(): SystemConstraints {
    return { ...this.constraints };
  }

  /**
   * Update constraints
   */
  updateConstraints(newConstraints: Partial<SystemConstraints>): void {
    this.constraints = { ...this.constraints, ...newConstraints };
    this.predictionModel.updateConstraints(this.constraints);
    console.log('[Resource Optimizer] Constraints updated:', this.constraints);
  }

  /**
   * Optimize resource allocation
   */
  optimizeResourceAllocation(): {
    optimizedConstraints: Partial<SystemConstraints>;
    recommendations: string[];
    costSavings: number;
    performanceImprovement: number;
  } {
    const { resourceUsage, agents, tasks } = useSystemStore.getState();
    
    // Record current state
    this.recordResourceState(resourceUsage);
    
    // Predict future resource needs
    const predictions = this.predictionModel.predictResourceNeeds(resourceUsage, agents, tasks);
    
    // Calculate optimal allocation
    const allocation = this.calculateOptimalAllocation(resourceUsage, predictions);
    
    // Generate recommendations
    const recommendations = this.generateOptimizationRecommendations(resourceUsage, predictions, allocation);
    
    // Calculate cost savings and performance improvements
    const costSavings = this.costTracker.calculatePotentialSavings(allocation);
    const performanceImprovement = this.calculatePerformanceImprovement(allocation);
    
    return {
      optimizedConstraints: allocation,
      recommendations,
      costSavings,
      performanceImprovement
    };
  }

  /**
   * Record resource state
   */
  private recordResourceState(resourceUsage: SystemResourceUsage): void {
    const { agents } = useSystemStore.getState();
    
    // Calculate system load (0-1 scale)
    const systemLoad = this.calculateSystemLoad(resourceUsage, agents);
    
    // Calculate agent efficiency
    const agentEfficiency = this.calculateAgentEfficiency(agents);
    
    this.resourceHistory.push({
      timestamp: new Date(),
      resourceUsage: { ...resourceUsage },
      systemLoad,
      agentEfficiency
    });

    // Maintain history size
    if (this.resourceHistory.length > this.maxHistorySize) {
      this.resourceHistory.shift();
    }
  }

  /**
   * Calculate system load
   */
  private calculateSystemLoad(resourceUsage: SystemResourceUsage, agents: any[]): number {
    const cpuWeight = 0.3;
    const memoryWeight = 0.3;
    const agentWeight = 0.2;
    const taskWeight = 0.2;

    const cpuLoad = resourceUsage.cpuUtilization / this.constraints.maxCpuUsage;
    const memoryLoad = resourceUsage.memoryUtilization / this.constraints.maxMemoryUsage;
    const agentLoad = agents.length / this.constraints.maxAgents;
    const taskLoad = resourceUsage.pendingTaskCount / Math.max(1, agents.length * 5);

    return (
      cpuLoad * cpuWeight +
      memoryLoad * memoryWeight +
      agentLoad * agentWeight +
      taskLoad * taskWeight
    );
  }

  /**
   * Calculate agent efficiency
   */
  private calculateAgentEfficiency(agents: any[]): number {
    if (agents.length === 0) return 0;

    let totalEfficiency = 0;
    let activeAgents = 0;

    for (const agent of agents) {
      if (agent.status === 'processing' || agent.status === 'initializing') {
        const efficiency = this.calculateIndividualAgentEfficiency(agent);
        totalEfficiency += efficiency;
        activeAgents++;
      }
    }

    return activeAgents > 0 ? totalEfficiency / activeAgents : 0;
  }

  /**
   * Calculate individual agent efficiency
   */
  private calculateIndividualAgentEfficiency(agent: any): number {
    // Efficiency based on task completion rate, resource usage, and response time
    const completionRate = agent.performance?.tasksCompleted / Math.max(1, agent.performance?.tasksAttempted) || 0;
    const resourceEfficiency = 1 - (agent.performance?.avgResourceUsage || 0) / 100;
    const responseTimeEfficiency = Math.max(0, 1 - (agent.performance?.avgResponseTime || 0) / 10000);

    return (completionRate * 0.4 + resourceEfficiency * 0.3 + responseTimeEfficiency * 0.3);
  }

  /**
   * Calculate optimal allocation
   */
  private calculateOptimalAllocation(
    currentUsage: SystemResourceUsage,
    predictions: ResourcePredictions
  ): Partial<SystemConstraints> {
    const allocation: Partial<SystemConstraints> = {};

    // CPU allocation based on predictions
    const cpuPrediction = predictions.cpuUtilization;
    if (cpuPrediction > this.constraints.maxCpuUsage * 0.9) {
      allocation.maxCpuUsage = Math.min(100, Math.ceil(this.constraints.maxCpuUsage * 1.2));
    } else if (cpuPrediction < this.constraints.maxCpuUsage * 0.5) {
      allocation.maxCpuUsage = Math.max(50, Math.floor(this.constraints.maxCpuUsage * 0.8));
    }

    // Memory allocation based on predictions
    const memoryPrediction = predictions.memoryUtilization;
    if (memoryPrediction > this.constraints.maxMemoryUsage * 0.9) {
      allocation.maxMemoryUsage = Math.min(16384, Math.ceil(this.constraints.maxMemoryUsage * 1.2));
    } else if (memoryPrediction < this.constraints.maxMemoryUsage * 0.5) {
      allocation.maxMemoryUsage = Math.max(1024, Math.floor(this.constraints.maxMemoryUsage * 0.8));
    }

    // Agent allocation based on predictions
    const agentPrediction = predictions.activeAgentCount;
    if (agentPrediction > this.constraints.maxAgents * 0.9) {
      allocation.maxAgents = Math.min(20, Math.ceil(this.constraints.maxAgents * 1.2));
    } else if (agentPrediction < this.constraints.maxAgents * 0.5 && predictions.pendingTaskCount > 10) {
      allocation.maxAgents = Math.min(20, Math.ceil(this.constraints.maxAgents * 1.1));
    }

    // Token allocation based on predictions
    const tokenPrediction = predictions.tokensPerMinute;
    if (tokenPrediction > this.constraints.maxTokensPerMinute * 0.9) {
      allocation.maxTokensPerMinute = Math.min(20000, Math.ceil(this.constraints.maxTokensPerMinute * 1.3));
    } else if (tokenPrediction < this.constraints.maxTokensPerMinute * 0.4) {
      allocation.maxTokensPerMinute = Math.max(500, Math.floor(this.constraints.maxTokensPerMinute * 0.7));
    }

    return allocation;
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    currentUsage: SystemResourceUsage,
    predictions: ResourcePredictions,
    allocation: Partial<SystemConstraints>
  ): string[] {
    const recommendations: string[] = [];

    // CPU recommendations
    if (allocation.maxCpuUsage && allocation.maxCpuUsage > this.constraints.maxCpuUsage) {
      recommendations.push(`Increase CPU limit to ${allocation.maxCpuUsage}% due to predicted high load`);
    } else if (allocation.maxCpuUsage && allocation.maxCpuUsage < this.constraints.maxCpuUsage) {
      recommendations.push(`Reduce CPU limit to ${allocation.maxCpuUsage}% to save resources`);
    }

    // Memory recommendations
    if (allocation.maxMemoryUsage && allocation.maxMemoryUsage > this.constraints.maxMemoryUsage) {
      recommendations.push(`Increase memory limit to ${allocation.maxMemoryUsage}MB due to predicted high usage`);
    } else if (allocation.maxMemoryUsage && allocation.maxMemoryUsage < this.constraints.maxMemoryUsage) {
      recommendations.push(`Reduce memory limit to ${allocation.maxMemoryUsage}MB to save resources`);
    }

    // Agent recommendations
    if (allocation.maxAgents && allocation.maxAgents > this.constraints.maxAgents) {
      recommendations.push(`Increase max agents to ${allocation.maxAgents} to handle predicted load`);
    } else if (allocation.maxAgents && allocation.maxAgents < this.constraints.maxAgents) {
      recommendations.push(`Reduce max agents to ${allocation.maxAgents} to optimize resource usage`);
    }

    // Token recommendations
    if (allocation.maxTokensPerMinute && allocation.maxTokensPerMinute > this.constraints.maxTokensPerMinute) {
      recommendations.push(`Increase token limit to ${allocation.maxTokensPerMinute}/min due to predicted high demand`);
    } else if (allocation.maxTokensPerMinute && allocation.maxTokensPerMinute < this.constraints.maxTokensPerMinute) {
      recommendations.push(`Reduce token limit to ${allocation.maxTokensPerMinute}/min to save costs`);
    }

    // Load balancing recommendations
    if (predictions.loadImbalance > 0.3) {
      recommendations.push('Consider implementing load balancing to distribute work more evenly');
    }

    // Cost optimization recommendations
    const costAnalysis = this.costTracker.analyzeCostEfficiency(currentUsage);
    if (costAnalysis.costPerTask > 0.1) {
      recommendations.push(`High cost per task detected ($${costAnalysis.costPerTask.toFixed(4)}). Consider optimizing task distribution`);
    }

    return recommendations;
  }

  /**
   * Calculate performance improvement
   */
  private calculatePerformanceImprovement(allocation: Partial<SystemConstraints>): number {
    let improvement = 0;

    // CPU improvement
    if (allocation.maxCpuUsage) {
      const cpuImprovement = (allocation.maxCpuUsage - this.constraints.maxCpuUsage) / this.constraints.maxCpuUsage;
      improvement += cpuImprovement * 0.3;
    }

    // Memory improvement
    if (allocation.maxMemoryUsage) {
      const memoryImprovement = (allocation.maxMemoryUsage - this.constraints.maxMemoryUsage) / this.constraints.maxMemoryUsage;
      improvement += memoryImprovement * 0.2;
    }

    // Agent improvement
    if (allocation.maxAgents) {
      const agentImprovement = (allocation.maxAgents - this.constraints.maxAgents) / this.constraints.maxAgents;
      improvement += agentImprovement * 0.3;
    }

    // Token improvement
    if (allocation.maxTokensPerMinute) {
      const tokenImprovement = (allocation.maxTokensPerMinute - this.constraints.maxTokensPerMinute) / this.constraints.maxTokensPerMinute;
      improvement += tokenImprovement * 0.2;
    }

    return Math.round(improvement * 100);
  }

  /**
   * Start optimization loop
   */
  private startOptimizationLoop(): void {
    setInterval(() => {
      if (this.optimizationEnabled) {
        this.performOptimization();
      }
    }, this.optimizationInterval);
  }

  /**
   * Perform optimization
   */
  private performOptimization(): void {
    const optimization = this.optimizeResourceAllocation();
    
    if (Object.keys(optimization.optimizedConstraints).length > 0) {
      this.updateConstraints(optimization.optimizedConstraints);
      console.log('[Resource Optimizer] Optimization applied:', optimization.optimizedConstraints);
    }
  }

  /**
   * Enable or disable optimization
   */
  setOptimizationEnabled(enabled: boolean): void {
    this.optimizationEnabled = enabled;
    console.log(`[Resource Optimizer] Optimization ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get resource optimization analysis
   */
  getOptimizationAnalysis(): {
    currentEfficiency: number;
    predictedLoad: number;
    optimizationPotential: number;
    costEfficiency: number;
    recommendations: string[];
  } {
    const { resourceUsage, agents, tasks } = useSystemStore.getState();
    
    // Calculate current efficiency
    const currentEfficiency = this.calculateSystemEfficiency(resourceUsage, agents);
    
    // Predict future load
    const predictions = this.predictionModel.predictResourceNeeds(resourceUsage, agents, tasks);
    const predictedLoad = predictions.cpuUtilization / this.constraints.maxCpuUsage;
    
    // Calculate optimization potential
    const optimizationPotential = this.calculateOptimizationPotential();
    
    // Calculate cost efficiency
    const costEfficiency = this.costTracker.calculateCostEfficiency(resourceUsage);
    
    // Get recommendations
    const optimization = this.optimizeResourceAllocation();
    const recommendations = optimization.recommendations;

    return {
      currentEfficiency,
      predictedLoad,
      optimizationPotential,
      costEfficiency,
      recommendations
    };
  }

  /**
   * Calculate system efficiency
   */
  private calculateSystemEfficiency(resourceUsage: SystemResourceUsage, agents: any[]): number {
    const cpuEfficiency = 1 - Math.abs(resourceUsage.cpuUtilization - this.constraints.maxCpuUsage * 0.7) / this.constraints.maxCpuUsage;
    const memoryEfficiency = 1 - Math.abs(resourceUsage.memoryUtilization - this.constraints.maxMemoryUsage * 0.7) / this.constraints.maxMemoryUsage;
    const agentEfficiency = this.calculateAgentEfficiency(agents);
    
    return (cpuEfficiency * 0.3 + memoryEfficiency * 0.3 + agentEfficiency * 0.4);
  }

  /**
   * Calculate optimization potential
   */
  private calculateOptimizationPotential(): number {
    if (this.resourceHistory.length < 10) return 0;

    const recentHistory = this.resourceHistory.slice(-10);
    const avgEfficiency = recentHistory.reduce((sum, entry) => sum + entry.agentEfficiency, 0) / recentHistory.length;
    const avgLoad = recentHistory.reduce((sum, entry) => sum + entry.systemLoad, 0) / recentHistory.length;

    // Optimization potential is higher when efficiency is low or load is inconsistent
    return Math.round((1 - avgEfficiency + avgLoad * 0.5) * 100);
  }

  /**
   * Get resource forecast
   */
  getResourceForecast(hours: number = 24): Array<{
    timestamp: Date;
    cpuUtilization: number;
    memoryUtilization: number;
    activeAgentCount: number;
    tokensPerMinute: number;
  }> {
    const { resourceUsage, agents, tasks } = useSystemStore.getState();
    return this.predictionModel.generateForecast(resourceUsage, agents, tasks, hours);
  }

  /**
   * Get optimization history
   */
  getOptimizationHistory(limit?: number): Array<{
    timestamp: Date;
    action: string;
    before: SystemConstraints;
    after: SystemConstraints;
    impact: number;
  }> {
    // In a real implementation, this would track optimization history
    return [];
  }

  /**
   * Export optimization configuration
   */
  exportOptimizationConfig(): string {
    return JSON.stringify({
      constraints: this.constraints,
      optimizationEnabled: this.optimizationEnabled,
      resourceHistory: this.resourceHistory.slice(-20), // Last 20 entries
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Import optimization configuration
   */
  importOptimizationConfig(config: string): boolean {
    try {
      const parsed = JSON.parse(config);
      
      if (parsed.constraints) {
        this.updateConstraints(parsed.constraints);
      }
      
      if (typeof parsed.optimizationEnabled === 'boolean') {
        this.setOptimizationEnabled(parsed.optimizationEnabled);
      }
      
      console.log('[Resource Optimizer] Optimization configuration imported successfully');
      return true;
    } catch (error) {
      console.error('[Resource Optimizer] Failed to import optimization configuration:', error);
      return false;
    }
  }
}

/**
 * Resource Prediction Model
 */
class ResourcePredictionModel {
  private constraints: SystemConstraints;
  private modelWeights: {
    cpu: number;
    memory: number;
    agents: number;
    tokens: number;
  };

  constructor() {
    this.constraints = {
      maxAgents: 10,
      maxMemoryUsage: 8192,
      maxCpuUsage: 80,
      maxTokensPerMinute: 5000,
      timeout: 60000
    };
    this.modelWeights = {
      cpu: 0.25,
      memory: 0.25,
      agents: 0.25,
      tokens: 0.25
    };
  }

  updateConstraints(constraints: SystemConstraints): void {
    this.constraints = { ...constraints };
  }

  predictResourceNeeds(
    currentUsage: SystemResourceUsage,
    agents: any[],
    tasks: any[]
  ): ResourcePredictions {
    const predictions: ResourcePredictions = {
      cpuUtilization: this.predictCpuUsage(currentUsage, agents, tasks),
      memoryUtilization: this.predictMemoryUsage(currentUsage, agents, tasks),
      activeAgentCount: this.predictAgentCount(agents, tasks),
      tokensPerMinute: this.predictTokenUsage(currentUsage, tasks),
      loadImbalance: this.predictLoadImbalance(agents),
      pendingTaskCount: tasks.filter(t => t.status === 'pending').length
    };

    return predictions;
  }

  private predictCpuUsage(currentUsage: SystemResourceUsage, agents: any[], tasks: any[]): number {
    const baseLoad = currentUsage.cpuUtilization;
    const agentLoad = agents.length * 2; // Each agent adds ~2% CPU
    const taskLoad = tasks.length * 0.5; // Each task adds ~0.5% CPU
    
    // Apply trend analysis
    const trend = this.analyzeTrend('cpu', currentUsage);
    
    return Math.min(100, baseLoad + agentLoad + taskLoad + trend);
  }

  private predictMemoryUsage(currentUsage: SystemResourceUsage, agents: any[], tasks: any[]): number {
    const baseUsage = currentUsage.memoryUtilization;
    const agentMemory = agents.length * 100; // Each agent uses ~100MB
    const taskMemory = tasks.length * 10; // Each task uses ~10MB
    
    const trend = this.analyzeTrend('memory', currentUsage);
    
    return Math.min(16384, baseUsage + agentMemory + taskMemory + trend);
  }

  private predictAgentCount(agents: any[], tasks: any[]): number {
    const currentAgents = agents.length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const activeTasks = tasks.filter(t => t.status === 'processing').length;
    
    // Calculate optimal agent count based on task load
    const optimalAgents = Math.min(20, Math.max(1, Math.ceil(pendingTasks / 3) + activeTasks));
    
    return optimalAgents;
  }

  private predictTokenUsage(currentUsage: SystemResourceUsage, tasks: any[]): number {
    const currentRate = currentUsage.tokensUsedLastMinute;
    const taskLoad = tasks.length * 50; // Each task generates ~50 tokens/min
    
    const trend = this.analyzeTrend('tokens', currentUsage);
    
    return Math.min(20000, currentRate + taskLoad + trend);
  }

  private predictLoadImbalance(agents: any[]): number {
    if (agents.length === 0) return 0;
    
    // Calculate standard deviation of agent loads
    const loads = agents.map(agent => agent.performance?.currentLoad || 0);
    const avgLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
    const variance = loads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / loads.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev / avgLoad; // Coefficient of variation
  }

  private analyzeTrend(resourceType: string, currentUsage: SystemResourceUsage): number {
    // Simple trend analysis - in a real implementation, this would use more sophisticated ML
    const trends: { [key: string]: number } = {
      cpu: currentUsage.cpuUtilization > 70 ? 5 : currentUsage.cpuUtilization < 30 ? -2 : 0,
      memory: currentUsage.memoryUtilization > 6000 ? 100 : currentUsage.memoryUtilization < 2000 ? -50 : 0,
      tokens: currentUsage.tokensUsedLastMinute > 4000 ? 200 : currentUsage.tokensUsedLastMinute < 1000 ? -100 : 0
    };
    
    return trends[resourceType] || 0;
  }

  generateForecast(
    currentUsage: SystemResourceUsage,
    agents: any[],
    tasks: any[],
    hours: number
  ): Array<{
    timestamp: Date;
    cpuUtilization: number;
    memoryUtilization: number;
    activeAgentCount: number;
    tokensPerMinute: number;
  }> {
    const forecast = [];
    const now = new Date();
    
    for (let i = 1; i <= hours; i++) {
      const futureTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      const predictions = this.predictResourceNeeds(currentUsage, agents, tasks);
      
      forecast.push({
        timestamp: futureTime,
        cpuUtilization: predictions.cpuUtilization,
        memoryUtilization: predictions.memoryUtilization,
        activeAgentCount: predictions.activeAgentCount,
        tokensPerMinute: predictions.tokensPerMinute
      });
    }
    
    return forecast;
  }
}

/**
 * Cost Tracker
 */
class CostTracker {
  private costHistory: Array<{
    timestamp: Date;
    totalCost: number;
    costPerTask: number;
    costPerToken: number;
    costPerAgent: number;
  }> = [];
  private maxHistorySize = 100;

  calculatePotentialSavings(allocation: Partial<SystemConstraints>): number {
    // Calculate potential cost savings from optimization
    let savings = 0;
    
    if (allocation.maxCpuUsage && allocation.maxCpuUsage < 80) {
      savings += (80 - allocation.maxCpuUsage) * 0.01; // $0.01 per CPU percentage
    }
    
    if (allocation.maxMemoryUsage && allocation.maxMemoryUsage < 8192) {
      savings += (8192 - allocation.maxMemoryUsage) * 0.0001; // $0.0001 per MB
    }
    
    if (allocation.maxAgents && allocation.maxAgents < 10) {
      savings += (10 - allocation.maxAgents) * 0.1; // $0.10 per agent
    }
    
    if (allocation.maxTokensPerMinute && allocation.maxTokensPerMinute < 5000) {
      savings += (5000 - allocation.maxTokensPerMinute) * 0.00001; // $0.00001 per token
    }
    
    return Math.round(savings * 100) / 100;
  }

  analyzeCostEfficiency(resourceUsage: SystemResourceUsage): {
    totalCost: number;
    costPerTask: number;
    costPerToken: number;
    costPerAgent: number;
    efficiency: number;
  } {
    // Simulated cost calculation
    const cpuCost = resourceUsage.cpuUtilization * 0.01; // $0.01 per CPU percentage
    const memoryCost = resourceUsage.memoryUtilization * 0.0001; // $0.0001 per MB
    const agentCost = resourceUsage.activeAgentCount * 0.1; // $0.10 per agent
    const tokenCost = resourceUsage.tokensUsedLastMinute * 0.00001; // $0.00001 per token
    
    const totalCost = cpuCost + memoryCost + agentCost + tokenCost;
    const costPerTask = totalCost / Math.max(1, resourceUsage.pendingTaskCount + resourceUsage.activeAgentCount);
    const costPerToken = totalCost / Math.max(1, resourceUsage.tokensUsedLastMinute);
    const costPerAgent = totalCost / Math.max(1, resourceUsage.activeAgentCount);
    
    // Efficiency is cost per task relative to baseline
    const baselineCostPerTask = 0.05; // $0.05 per task baseline
    const efficiency = Math.max(0, 1 - (costPerTask - baselineCostPerTask) / baselineCostPerTask);
    
    return {
      totalCost: Math.round(totalCost * 100) / 100,
      costPerTask: Math.round(costPerTask * 10000) / 10000,
      costPerToken: Math.round(costPerToken * 100000) / 100000,
      costPerAgent: Math.round(costPerAgent * 100) / 100,
      efficiency: Math.round(efficiency * 100)
    };
  }

  calculateCostEfficiency(resourceUsage: SystemResourceUsage): number {
    const analysis = this.analyzeCostEfficiency(resourceUsage);
    return analysis.efficiency;
  }
}

/**
 * Type definitions
 */
interface ResourcePredictions {
  cpuUtilization: number;
  memoryUtilization: number;
  activeAgentCount: number;
  tokensPerMinute: number;
  loadImbalance: number;
  pendingTaskCount: number;
}

/**
 * Global resource optimizer instance
 */
export const resourceOptimizer = new ResourceOptimizer({
  maxAgents: 10,
  maxMemoryUsage: 8192,
  maxCpuUsage: 80,
  maxTokensPerMinute: 5000,
  timeout: 60000
});