import { useSystemStore } from '@/store/system-store';
import { 
  SystemConstraints, 
  SystemResourceUsage, 
  SystemStatus,
  Agent,
  Task 
} from '@/types/agent-types';

/**
 * System Monitor
 * 
 * Comprehensive system monitoring and constraint management with:
 * - Real-time resource usage tracking
 * - Constraint validation and enforcement
 * - Performance metrics collection
 * - Health status assessment
 * - Predictive resource management
 * - Alert and notification system
 */
export class SystemMonitor {
  private monitoringInterval: number | null = null;
  private resourceHistory: SystemResourceUsage[] = [];
  private maxHistorySize = 100;
  private alertThresholds: {
    cpu: { warning: number; critical: number };
    memory: { warning: number; critical: number };
    agents: { warning: number; critical: number };
    tasks: { warning: number; critical: number };
    responseTime: { warning: number; critical: number };
  };
  private lastResourceCheck = Date.now();
  private resourceCheckInterval = 5000; // 5 seconds

  constructor() {
    this.alertThresholds = {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 75, critical: 90 },
      agents: { warning: 7, critical: 9 },
      tasks: { warning: 20, critical: 50 },
      responseTime: { warning: 5000, critical: 10000 }
    };

    this.startMonitoring();
  }

  /**
   * Start system monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = window.setInterval(() => {
      this.collectResourceUsage();
      this.validateConstraints();
      this.assessSystemHealth();
      this.predictResourceNeeds();
    }, this.resourceCheckInterval);
  }

  /**
   * Collect resource usage data
   */
  private collectResourceUsage(): void {
    try {
      // Collect actual system metrics (in real implementation)
      const currentUsage = this.getCurrentResourceUsage();
      
      // Add to history
      this.resourceHistory.push(currentUsage);
      
      // Maintain history size
      if (this.resourceHistory.length > this.maxHistorySize) {
        this.resourceHistory.shift();
      }

      // Update system store
      const { updateResourceUsage } = useSystemStore.getState();
      updateResourceUsage(currentUsage);

    } catch (error) {
      console.error('[System Monitor] Error collecting resource usage:', error);
    }
  }

  /**
   * Get current resource usage
   */
  private getCurrentResourceUsage(): SystemResourceUsage {
    // In a real implementation, this would collect actual system metrics
    // For now, we'll simulate based on current system state
    const { agents, tasks, resourceUsage } = useSystemStore.getState();
    
    // Simulate CPU usage based on active agents and tasks
    const baseCpuUsage = Math.min(100, (agents.length * 5) + (tasks.length * 2));
    const cpuUtilization = Math.random() * 10 + baseCpuUsage; // Add some randomness

    // Simulate memory usage
    const baseMemoryUsage = Math.min(100, agents.length * 8 + tasks.length * 1);
    const memoryUtilization = Math.random() * 5 + baseMemoryUsage;

    // Count active tasks
    const activeTasks = tasks.filter(task => 
      task.status === 'pending' || task.status === 'inProgress' || task.status === 'assigned'
    ).length;

    return {
      cpuUtilization: Math.round(cpuUtilization),
      memoryUtilization: Math.round(memoryUtilization),
      tokensUsedLastMinute: Math.floor(Math.random() * 1000),
      activeAgentCount: agents.length,
      pendingTaskCount: activeTasks
    };
  }

  /**
   * Validate system constraints
   */
  private validateConstraints(): void {
    const { constraints, resourceUsage } = useSystemStore.getState();
    const violations: string[] = [];

    // Check CPU constraint
    if (resourceUsage.cpuUtilization > constraints.maxCpuUsage) {
      violations.push(`CPU usage (${resourceUsage.cpuUtilization}%) exceeds limit (${constraints.maxCpuUsage}%)`);
    }

    // Check memory constraint
    if (resourceUsage.memoryUtilization > constraints.maxMemoryUsage) {
      violations.push(`Memory usage (${resourceUsage.memoryUtilization}MB) exceeds limit (${constraints.maxMemoryUsage}MB)`);
    }

    // Check agent count constraint
    if (resourceUsage.activeAgentCount > constraints.maxAgents) {
      violations.push(`Active agents (${resourceUsage.activeAgentCount}) exceeds limit (${constraints.maxAgents})`);
    }

    // Check token rate constraint
    if (resourceUsage.tokensUsedLastMinute > constraints.maxTokensPerMinute) {
      violations.push(`Token rate (${resourceUsage.tokensUsedLastMinute}/min) exceeds limit (${constraints.maxTokensPerMinute}/min)`);
    }

    // Handle violations
    if (violations.length > 0) {
      this.handleConstraintViolations(violations);
    }
  }

  /**
   * Handle constraint violations
   */
  private handleConstraintViolations(violations: string[]): void {
    console.warn('[System Monitor] Constraint violations detected:', violations);
    
    const { updateSystemStatus, updateResourceUsage } = useSystemStore.getState();
    
    // Update system status based on violation severity
    const criticalViolations = violations.filter(violation => 
      violation.includes('exceeds limit') && 
      (violation.includes('90%') || violation.includes('exceeds limit'))
    );

    if (criticalViolations.length > 0) {
      updateSystemStatus('degraded');
    } else {
      updateSystemStatus('operational');
    }

    // Implement corrective actions
    this.implementCorrectiveActions(violations);
  }

  /**
   * Implement corrective actions
   */
  private implementCorrectiveActions(violations: string[]): void {
    const { agents, tasks, updateAgentStatus, updateTaskStatus } = useSystemStore.getState();

    for (const violation of violations) {
      if (violation.includes('CPU usage') || violation.includes('Memory usage')) {
        // Scale down non-critical agents
        this.scaleDownAgents();
      }

      if (violation.includes('Active agents')) {
        // Terminate idle agents
        this.terminateIdleAgents();
      }

      if (violation.includes('Token rate')) {
        // Throttle model requests
        this.throttleModelRequests();
      }

      if (violation.includes('pending tasks')) {
        // Reprioritize tasks
        this.reprioritizeTasks();
      }
    }
  }

  /**
   * Scale down non-critical agents
   */
  private scaleDownAgents(): void {
    const { agents, updateAgentStatus } = useSystemStore.getState();
    
    // Find non-critical agents to scale down
    const agentsToScale = agents
      .filter(agent => agent.status === 'processing' && agent.specialization !== 'orchestrator')
      .slice(0, 2); // Scale down up to 2 agents

    for (const agent of agentsToScale) {
      updateAgentStatus(agent.id, 'waiting');
      console.log(`[System Monitor] Scaled down agent: ${agent.id}`);
    }
  }

  /**
   * Terminate idle agents
   */
  private terminateIdleAgents(): void {
    const { agents, removeAgent } = useSystemStore.getState();
    
    // Find idle agents
    const idleAgents = agents.filter(agent => 
      agent.status === 'waiting' &&
      Date.now() - new Date(agent.lastActive).getTime() > 300000 // 5 minutes
    );

    for (const agent of idleAgents) {
      removeAgent(agent.id);
      console.log(`[System Monitor] Terminated idle agent: ${agent.id}`);
    }
  }

  /**
   * Throttle model requests
   */
  private throttleModelRequests(): void {
    // In a real implementation, this would throttle API calls
    console.log('[System Monitor] Throttling model requests');
    
    // Update system store to indicate throttling
    const { updateResourceUsage } = useSystemStore.getState();
    updateResourceUsage({ tokensUsedLastMinute: 0 });
  }

  /**
   * Reprioritize tasks
   */
  private reprioritizeTasks(): void {
    const { tasks, updateTaskStatus } = useSystemStore.getState();
    
    // Move low-priority pending tasks to queue
    const lowPriorityTasks = tasks.filter(task => 
      task.status === 'pending' && task.priority === 'low'
    );

    for (const task of lowPriorityTasks) {
      updateTaskStatus(task.id, 'pending');
      console.log(`[System Monitor] Reprioritized task: ${task.id}`);
    }
  }

  /**
   * Assess system health
   */
  private assessSystemHealth(): void {
    const { resourceUsage, constraints, agents, tasks } = useSystemStore.getState();
    
    const healthScore = this.calculateHealthScore(resourceUsage, constraints, agents, tasks);
    const healthStatus = this.determineHealthStatus(healthScore, resourceUsage);

    // Update system status if needed
    const { updateSystemStatus } = useSystemStore.getState();
    if (healthStatus !== 'operational') {
      updateSystemStatus(healthStatus);
    }

    // Log health assessment
    console.log(`[System Monitor] Health assessment: ${healthStatus} (score: ${healthScore})`);
  }

  /**
   * Calculate health score
   */
  private calculateHealthScore(
    resourceUsage: SystemResourceUsage,
    constraints: SystemConstraints,
    agents: Agent[],
    tasks: Task[]
  ): number {
    let score = 100;

    // CPU usage impact
    const cpuScore = Math.max(0, 100 - (resourceUsage.cpuUtilization / constraints.maxCpuUsage) * 100);
    score -= (100 - cpuScore) * 0.3;

    // Memory usage impact
    const memoryScore = Math.max(0, 100 - (resourceUsage.memoryUtilization / constraints.maxMemoryUsage) * 100);
    score -= (100 - memoryScore) * 0.3;

    // Agent utilization impact
    const agentUtilization = agents.length > 0 ? resourceUsage.activeAgentCount / agents.length : 0;
    const agentScore = Math.max(0, 100 - agentUtilization * 100);
    score -= (100 - agentScore) * 0.2;

    // Task queue impact
    const taskQueueScore = Math.max(0, 100 - (resourceUsage.pendingTaskCount / 50) * 100);
    score -= (100 - taskQueueScore) * 0.2;

    return Math.round(score);
  }

  /**
   * Determine health status
   */
  private determineHealthStatus(healthScore: number, resourceUsage: SystemResourceUsage): SystemStatus {
    if (healthScore < 50) {
      return 'degraded';
    }
    
    if (healthScore < 75) {
      return 'operational';
    }
    
    // Check for critical resource usage
    if (resourceUsage.cpuUtilization > 95 || resourceUsage.memoryUtilization > 95) {
      return 'degraded';
    }
    
    return 'operational';
  }

  /**
   * Predict resource needs
   */
  private predictResourceNeeds(): void {
    if (this.resourceHistory.length < 10) {
      return; // Need enough history for predictions
    }

    const predictions = this.analyzeResourceTrends();
    this.generateResourceRecommendations(predictions);
  }

  /**
   * Analyze resource trends
   */
  private analyzeResourceTrends(): {
    cpu: { current: number; trend: 'increasing' | 'decreasing' | 'stable'; predicted: number };
    memory: { current: number; trend: 'increasing' | 'decreasing' | 'stable'; predicted: number };
    agents: { current: number; trend: 'increasing' | 'decreasing' | 'stable'; predicted: number };
    tasks: { current: number; trend: 'increasing' | 'decreasing' | 'stable'; predicted: number };
  } {
    const recentData = this.resourceHistory.slice(-10);
    const currentUsage = this.resourceHistory[this.resourceHistory.length - 1];

    // Simple trend analysis
    const cpuTrend = this.calculateTrend(recentData.map(d => d.cpuUtilization));
    const memoryTrend = this.calculateTrend(recentData.map(d => d.memoryUtilization));
    const agentsTrend = this.calculateTrend(recentData.map(d => d.activeAgentCount));
    const tasksTrend = this.calculateTrend(recentData.map(d => d.pendingTaskCount));

    return {
      cpu: {
        current: currentUsage.cpuUtilization,
        trend: cpuTrend.trend,
        predicted: cpuTrend.predicted
      },
      memory: {
        current: currentUsage.memoryUtilization,
        trend: memoryTrend.trend,
        predicted: memoryTrend.predicted
      },
      agents: {
        current: currentUsage.activeAgentCount,
        trend: agentsTrend.trend,
        predicted: agentsTrend.predicted
      },
      tasks: {
        current: currentUsage.pendingTaskCount,
        trend: tasksTrend.trend,
        predicted: tasksTrend.predicted
      }
    };
  }

  /**
   * Calculate trend from data points
   */
  private calculateTrend(dataPoints: number[]): { trend: 'increasing' | 'decreasing' | 'stable'; predicted: number } {
    if (dataPoints.length < 2) {
      return { trend: 'stable', predicted: dataPoints[0] || 0 };
    }

    const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
    const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const threshold = 5; // Percentage threshold for trend detection
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    let predicted = secondAvg;

    if (secondAvg > firstAvg + threshold) {
      trend = 'increasing';
      predicted = secondAvg + (secondAvg - firstAvg) * 0.5; // Extrapolate
    } else if (secondAvg < firstAvg - threshold) {
      trend = 'decreasing';
      predicted = secondAvg - (firstAvg - secondAvg) * 0.5; // Extrapolate
    }

    return { trend, predicted: Math.round(predicted) };
  }

  /**
   * Generate resource recommendations
   */
  private generateResourceRecommendations(predictions: any): void {
    const recommendations: string[] = [];

    if (predictions.cpu.trend === 'increasing' && predictions.cpu.predicted > 80) {
      recommendations.push('Consider scaling down non-critical agents to reduce CPU usage');
    }

    if (predictions.memory.trend === 'increasing' && predictions.memory.predicted > 80) {
      recommendations.push('Monitor memory usage closely, consider optimizing agent memory allocation');
    }

    if (predictions.agents.trend === 'increasing' && predictions.agents.predicted > 8) {
      recommendations.push('Agent count increasing, monitor system performance');
    }

    if (predictions.tasks.trend === 'increasing' && predictions.tasks.predicted > 30) {
      recommendations.push('Task queue growing, consider adding more agents or optimizing task processing');
    }

    if (recommendations.length > 0) {
      console.log('[System Monitor] Resource recommendations:', recommendations);
    }
  }

  /**
   * Get system health report
   */
  getHealthReport(): {
    status: SystemStatus;
    score: number;
    resourceUsage: SystemResourceUsage;
    constraints: SystemConstraints;
    alerts: string[];
    recommendations: string[];
    history: SystemResourceUsage[];
  } {
    const { resourceUsage, constraints, systemStatus, agents, tasks } = useSystemStore.getState();
    
    const score = this.calculateHealthScore(resourceUsage, constraints, agents, tasks);
    const alerts = this.generateAlerts();
    const recommendations = this.generateRecommendations();

    return {
      status: systemStatus,
      score,
      resourceUsage,
      constraints,
      alerts,
      recommendations,
      history: [...this.resourceHistory]
    };
  }

  /**
   * Generate alerts
   */
  private generateAlerts(): string[] {
    const alerts: string[] = [];
    const { resourceUsage } = useSystemStore.getState();

    if (resourceUsage.cpuUtilization > this.alertThresholds.cpu.critical) {
      alerts.push(`CRITICAL: CPU usage at ${resourceUsage.cpuUtilization}%`);
    } else if (resourceUsage.cpuUtilization > this.alertThresholds.cpu.warning) {
      alerts.push(`WARNING: CPU usage at ${resourceUsage.cpuUtilization}%`);
    }

    if (resourceUsage.memoryUtilization > this.alertThresholds.memory.critical) {
      alerts.push(`CRITICAL: Memory usage at ${resourceUsage.memoryUtilization}%`);
    } else if (resourceUsage.memoryUtilization > this.alertThresholds.memory.warning) {
      alerts.push(`WARNING: Memory usage at ${resourceUsage.memoryUtilization}%`);
    }

    if (resourceUsage.activeAgentCount > this.alertThresholds.agents.critical) {
      alerts.push(`CRITICAL: High agent count (${resourceUsage.activeAgentCount})`);
    } else if (resourceUsage.activeAgentCount > this.alertThresholds.agents.warning) {
      alerts.push(`WARNING: Elevated agent count (${resourceUsage.activeAgentCount})`);
    }

    return alerts;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const { resourceUsage, constraints } = useSystemStore.getState();

    // CPU recommendations
    if (resourceUsage.cpuUtilization > constraints.maxCpuUsage * 0.8) {
      recommendations.push('Consider optimizing CPU-intensive operations');
    }

    // Memory recommendations
    if (resourceUsage.memoryUtilization > constraints.maxMemoryUsage * 0.8) {
      recommendations.push('Monitor memory usage and consider cleanup operations');
    }

    // Agent recommendations
    if (resourceUsage.activeAgentCount > constraints.maxAgents * 0.8) {
      recommendations.push('Approaching agent limit, monitor system performance');
    }

    // Task recommendations
    if (resourceUsage.pendingTaskCount > 40) {
      recommendations.push('High task queue volume, consider scaling up resources');
    }

    return recommendations;
  }

  /**
   * Update constraint thresholds
   */
  updateConstraintThresholds(newThresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
    console.log('[System Monitor] Updated constraint thresholds:', this.alertThresholds);
  }

  /**
   * Update system constraints
   */
  updateSystemConstraints(newConstraints: Partial<SystemConstraints>): void {
    const { updateModelConfig } = useSystemStore.getState();
    updateModelConfig(newConstraints as any);
    console.log('[System Monitor] Updated system constraints:', newConstraints);
  }

  /**
   * Get resource usage history
   */
  getResourceHistory(limit?: number): SystemResourceUsage[] {
    if (limit) {
      return this.resourceHistory.slice(-limit);
    }
    return [...this.resourceHistory];
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      window.clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Restart monitoring
   */
  restartMonitoring(): void {
    this.stopMonitoring();
    this.startMonitoring();
  }

  /**
   * Reset monitoring data
   */
  resetMonitoring(): void {
    this.resourceHistory = [];
    this.lastResourceCheck = Date.now();
  }
}

/**
 * System Metrics Collector
 * 
 * Collects detailed system metrics for analysis
 */
export class SystemMetricsCollector {
  private metrics: Map<string, number[]> = new Map();
  private collectionInterval: number | null = null;
  private maxDataPoints = 1000;

  constructor() {
    this.startCollection();
  }

  /**
   * Start metrics collection
   */
  private startCollection(): void {
    this.collectionInterval = window.setInterval(() => {
      this.collectMetrics();
    }, 1000); // Collect every second
  }

  /**
   * Collect system metrics
   */
  private collectMetrics(): void {
    const metrics = {
      timestamp: Date.now(),
      memory: this.getMemoryUsage(),
      cpu: this.getCPUUsage(),
      network: this.getNetworkUsage(),
      disk: this.getDiskUsage(),
      agents: this.getAgentMetrics(),
      tasks: this.getTaskMetrics()
    };

    // Store metrics
    for (const [key, value] of Object.entries(metrics)) {
      if (key !== 'timestamp') {
        if (!this.metrics.has(key)) {
          this.metrics.set(key, []);
        }
        
        const metricData = this.metrics.get(key)!;
        metricData.push(value);
        
        // Maintain data size
        if (metricData.length > this.maxDataPoints) {
          metricData.shift();
        }
      }
    }
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    // In real implementation, this would get actual memory usage
    return Math.random() * 100;
  }

  /**
   * Get CPU usage
   */
  private getCPUUsage(): number {
    // In real implementation, this would get actual CPU usage
    return Math.random() * 100;
  }

  /**
   * Get network usage
   */
  private getNetworkUsage(): number {
    // In real implementation, this would get actual network usage
    return Math.random() * 1000;
  }

  /**
   * Get disk usage
   */
  private getDiskUsage(): number {
    // In real implementation, this would get actual disk usage
    return Math.random() * 100;
  }

  /**
   * Get agent metrics
   */
  private getAgentMetrics(): number {
    const { agents } = useSystemStore.getState();
    return agents.length;
  }

  /**
   * Get task metrics
   */
  private getTaskMetrics(): number {
    const { tasks } = useSystemStore.getState();
    return tasks.length;
  }

  /**
   * Get metrics for specific category
   */
  getMetrics(category: string, limit?: number): number[] {
    const data = this.metrics.get(category) || [];
    if (limit) {
      return data.slice(-limit);
    }
    return [...data];
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    for (const [key, value] of this.metrics) {
      result[key] = [...value];
    }
    return result;
  }

  /**
   * Stop collection
   */
  stopCollection(): void {
    if (this.collectionInterval) {
      window.clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }
}