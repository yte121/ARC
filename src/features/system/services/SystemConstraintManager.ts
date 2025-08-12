import { useSystemStore } from '@/store/system-store';
import { SystemConstraints, SystemResourceUsage, SystemStatus } from '@/types/agent-types';

/**
 * System Constraint Manager
 * 
 * Manages system constraints and resource allocation with:
 * - Dynamic constraint adjustment
 * - Resource allocation optimization
 * - Constraint violation detection
 * - Automatic scaling decisions
 * - Performance-based tuning
 * - User-defined constraint policies
 */
export class SystemConstraintManager {
  private constraints: SystemConstraints;
  private constraintHistory: Array<{
    timestamp: Date;
    constraints: SystemConstraints;
    resourceUsage: SystemResourceUsage;
    violations: string[];
  }> = [];
  private maxHistorySize = 100;
  private autoTuningEnabled = true;
  private lastAdjustment = Date.now();
  private adjustmentInterval = 300000; // 5 minutes

  constructor(initialConstraints: SystemConstraints) {
    this.constraints = { ...initialConstraints };
    this.startAutoTuning();
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
    const oldConstraints = { ...this.constraints };
    this.constraints = { ...this.constraints, ...newConstraints };
    
    // Log constraint change
    this.logConstraintChange(oldConstraints, this.constraints);
    
    // Update system store
    const { updateModelConfig } = useSystemStore.getState();
    updateModelConfig(this.constraints as any);
    
    console.log('[System Constraint Manager] Constraints updated:', this.constraints);
  }

  /**
   * Log constraint change
   */
  private logConstraintChange(oldConstraints: SystemConstraints, newConstraints: SystemConstraints): void {
    const changes: string[] = [];
    
    if (oldConstraints.maxAgents !== newConstraints.maxAgents) {
      changes.push(`maxAgents: ${oldConstraints.maxAgents} → ${newConstraints.maxAgents}`);
    }
    
    if (oldConstraints.maxMemoryUsage !== newConstraints.maxMemoryUsage) {
      changes.push(`maxMemoryUsage: ${oldConstraints.maxMemoryUsage} → ${newConstraints.maxMemoryUsage}`);
    }
    
    if (oldConstraints.maxCpuUsage !== newConstraints.maxCpuUsage) {
      changes.push(`maxCpuUsage: ${oldConstraints.maxCpuUsage} → ${newConstraints.maxCpuUsage}`);
    }
    
    if (oldConstraints.maxTokensPerMinute !== newConstraints.maxTokensPerMinute) {
      changes.push(`maxTokensPerMinute: ${oldConstraints.maxTokensPerMinute} → ${newConstraints.maxTokensPerMinute}`);
    }
    
    if (oldConstraints.timeout !== newConstraints.timeout) {
      changes.push(`timeout: ${oldConstraints.timeout} → ${newConstraints.timeout}`);
    }
    
    console.log(`[System Constraint Manager] Constraint changes: ${changes.join(', ')}`);
  }

  /**
   * Check constraint violations
   */
  checkConstraintViolations(resourceUsage: SystemResourceUsage): string[] {
    const violations: string[] = [];

    // Check CPU constraint
    if (resourceUsage.cpuUtilization > this.constraints.maxCpuUsage) {
      violations.push(`CPU usage (${resourceUsage.cpuUtilization}%) exceeds limit (${this.constraints.maxCpuUsage}%)`);
    }

    // Check memory constraint
    if (resourceUsage.memoryUtilization > this.constraints.maxMemoryUsage) {
      violations.push(`Memory usage (${resourceUsage.memoryUtilization}MB) exceeds limit (${this.constraints.maxMemoryUsage}MB)`);
    }

    // Check agent count constraint
    if (resourceUsage.activeAgentCount > this.constraints.maxAgents) {
      violations.push(`Active agents (${resourceUsage.activeAgentCount}) exceeds limit (${this.constraints.maxAgents})`);
    }

    // Check token rate constraint
    if (resourceUsage.tokensUsedLastMinute > this.constraints.maxTokensPerMinute) {
      violations.push(`Token rate (${resourceUsage.tokensUsedLastMinute}/min) exceeds limit (${this.constraints.maxTokensPerMinute}/min)`);
    }

    return violations;
  }

  /**
   * Get constraint violation severity
   */
  getViolationSeverity(violations: string[]): 'none' | 'warning' | 'critical' {
    if (violations.length === 0) return 'none';
    
    const criticalViolations = violations.filter(violation => 
      violation.includes('exceeds limit') && 
      (violation.includes('90%') || violation.includes('exceeds limit'))
    );
    
    if (criticalViolations.length > 0) return 'critical';
    return 'warning';
  }

  /**
   * Auto-tune constraints based on system performance
   */
  private startAutoTuning(): void {
    setInterval(() => {
      if (this.autoTuningEnabled) {
        this.autoTuneConstraints();
      }
    }, this.adjustmentInterval);
  }

  /**
   * Auto-tune constraints
   */
  private autoTuneConstraints(): void {
    const { resourceUsage, agents, tasks } = useSystemStore.getState();
    
    // Check if enough time has passed since last adjustment
    if (Date.now() - this.lastAdjustment < this.adjustmentInterval) {
      return;
    }

    const violations = this.checkConstraintViolations(resourceUsage);
    const severity = this.getViolationSeverity(violations);

    if (severity === 'critical') {
      this.adjustConstraintsForCriticalLoad(resourceUsage, agents, tasks);
    } else if (severity === 'warning') {
      this.adjustConstraintsForWarningLoad(resourceUsage, agents, tasks);
    } else {
      this.optimizeConstraintsForNormalLoad(resourceUsage, agents, tasks);
    }

    this.lastAdjustment = Date.now();
  }

  /**
   * Adjust constraints for critical load
   */
  private adjustConstraintsForCriticalLoad(
    resourceUsage: SystemResourceUsage,
    agents: any[],
    tasks: any[]
  ): void {
    console.warn('[System Constraint Manager] Critical load detected, adjusting constraints');

    // Reduce max agents if overloaded
    if (resourceUsage.activeAgentCount >= this.constraints.maxAgents) {
      const newMaxAgents = Math.max(1, Math.floor(this.constraints.maxAgents * 0.8));
      this.updateConstraints({ maxAgents: newMaxAgents });
    }

    // Reduce token limit if overloaded
    if (resourceUsage.tokensUsedLastMinute >= this.constraints.maxTokensPerMinute) {
      const newTokenLimit = Math.max(100, Math.floor(this.constraints.maxTokensPerMinute * 0.7));
      this.updateConstraints({ maxTokensPerMinute: newTokenLimit });
    }

    // Increase timeout if system is struggling
    const newTimeout = Math.min(300000, this.constraints.timeout * 1.2);
    this.updateConstraints({ timeout: newTimeout });
  }

  /**
   * Adjust constraints for warning load
   */
  private adjustConstraintsForWarningLoad(
    resourceUsage: SystemResourceUsage,
    agents: any[],
    tasks: any[]
  ): void {
    console.log('[System Constraint Manager] Warning load detected, fine-tuning constraints');

    // Slightly reduce max agents if approaching limit
    const agentUtilization = resourceUsage.activeAgentCount / this.constraints.maxAgents;
    if (agentUtilization > 0.8) {
      const newMaxAgents = Math.max(1, Math.floor(this.constraints.maxAgents * 0.9));
      this.updateConstraints({ maxAgents: newMaxAgents });
    }

    // Slightly reduce token limit if approaching limit
    const tokenUtilization = resourceUsage.tokensUsedLastMinute / this.constraints.maxTokensPerMinute;
    if (tokenUtilization > 0.8) {
      const newTokenLimit = Math.max(100, Math.floor(this.constraints.maxTokensPerMinute * 0.85));
      this.updateConstraints({ maxTokensPerMinute: newTokenLimit });
    }
  }

  /**
   * Optimize constraints for normal load
   */
  private optimizeConstraintsForNormalLoad(
    resourceUsage: SystemResourceUsage,
    agents: any[],
    tasks: any[]
  ): void {
    console.log('[System Constraint Manager] Normal load detected, optimizing constraints');

    // Increase max agents if underutilized and there are pending tasks
    const agentUtilization = resourceUsage.activeAgentCount / this.constraints.maxAgents;
    const pendingTasks = tasks.filter(task => task.status === 'pending').length;
    
    if (agentUtilization < 0.6 && pendingTasks > 5) {
      const newMaxAgents = Math.min(20, Math.ceil(this.constraints.maxAgents * 1.1));
      this.updateConstraints({ maxAgents: newMaxAgents });
    }

    // Increase token limit if underutilized
    const tokenUtilization = resourceUsage.tokensUsedLastMinute / this.constraints.maxTokensPerMinute;
    if (tokenUtilization < 0.5) {
      const newTokenLimit = Math.min(10000, Math.ceil(this.constraints.maxTokensPerMinute * 1.2));
      this.updateConstraints({ maxTokensPerMinute: newTokenLimit });
    }

    // Optimize timeout based on average response time
    const avgResponseTime = this.calculateAverageResponseTime();
    if (avgResponseTime > 5000) {
      const newTimeout = Math.min(300000, this.constraints.timeout * 1.1);
      this.updateConstraints({ timeout: newTimeout });
    }
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(): number {
    // In a real implementation, this would calculate from actual response times
    return 2000; // Default value
  }

  /**
   * Enable or disable auto-tuning
   */
  setAutoTuning(enabled: boolean): void {
    this.autoTuningEnabled = enabled;
    console.log(`[System Constraint Manager] Auto-tuning ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get constraint recommendations
   */
  getConstraintRecommendations(resourceUsage: SystemResourceUsage): {
    recommendations: string[];
    suggestedConstraints: Partial<SystemConstraints>;
  } {
    const recommendations: string[] = [];
    const suggestedConstraints: Partial<SystemConstraints> = {};

    // CPU recommendations
    if (resourceUsage.cpuUtilization > this.constraints.maxCpuUsage * 0.9) {
      recommendations.push('Consider increasing CPU limit or optimizing CPU-intensive operations');
      suggestedConstraints.maxCpuUsage = Math.min(100, this.constraints.maxCpuUsage * 1.2);
    } else if (resourceUsage.cpuUtilization < this.constraints.maxCpuUsage * 0.5) {
      recommendations.push('CPU usage is low, consider reducing CPU limit to save resources');
      suggestedConstraints.maxCpuUsage = Math.max(50, this.constraints.maxCpuUsage * 0.8);
    }

    // Memory recommendations
    if (resourceUsage.memoryUtilization > this.constraints.maxMemoryUsage * 0.9) {
      recommendations.push('Consider increasing memory limit or implementing memory optimization');
      suggestedConstraints.maxMemoryUsage = Math.min(16384, this.constraints.maxMemoryUsage * 1.2);
    } else if (resourceUsage.memoryUtilization < this.constraints.maxMemoryUsage * 0.5) {
      recommendations.push('Memory usage is low, consider reducing memory limit');
      suggestedConstraints.maxMemoryUsage = Math.max(1024, this.constraints.maxMemoryUsage * 0.8);
    }

    // Agent recommendations
    const agentUtilization = resourceUsage.activeAgentCount / this.constraints.maxAgents;
    if (agentUtilization > 0.9) {
      recommendations.push('Agent count approaching limit, consider increasing max agents');
      suggestedConstraints.maxAgents = Math.min(20, this.constraints.maxAgents + 2);
    } else if (agentUtilization < 0.5 && resourceUsage.pendingTaskCount > 10) {
      recommendations.push('Low agent utilization with high task queue, consider increasing max agents');
      suggestedConstraints.maxAgents = Math.min(20, this.constraints.maxAgents + 1);
    }

    // Token recommendations
    const tokenUtilization = resourceUsage.tokensUsedLastMinute / this.constraints.maxTokensPerMinute;
    if (tokenUtilization > 0.9) {
      recommendations.push('Token rate approaching limit, consider increasing token limit');
      suggestedConstraints.maxTokensPerMinute = Math.min(20000, this.constraints.maxTokensPerMinute * 1.5);
    } else if (tokenUtilization < 0.3) {
      recommendations.push('Token usage is low, consider reducing token limit');
      suggestedConstraints.maxTokensPerMinute = Math.max(500, this.constraints.maxTokensPerMinute * 0.7);
    }

    return { recommendations, suggestedConstraints };
  }

  /**
   * Apply constraint recommendations
   */
  applyConstraintRecommendations(): void {
    const { resourceUsage } = useSystemStore.getState();
    const { suggestedConstraints } = this.getConstraintRecommendations(resourceUsage);
    
    if (Object.keys(suggestedConstraints).length > 0) {
      this.updateConstraints(suggestedConstraints);
      console.log('[System Constraint Manager] Applied constraint recommendations:', suggestedConstraints);
    }
  }

  /**
   * Get constraint history
   */
  getConstraintHistory(limit?: number): Array<{
    timestamp: Date;
    constraints: SystemConstraints;
    resourceUsage: SystemResourceUsage;
    violations: string[];
  }> {
    if (limit) {
      return this.constraintHistory.slice(-limit);
    }
    return [...this.constraintHistory];
  }

  /**
   * Record constraint state
   */
  recordConstraintState(
    constraints: SystemConstraints,
    resourceUsage: SystemResourceUsage,
    violations: string[]
  ): void {
    this.constraintHistory.push({
      timestamp: new Date(),
      constraints: { ...constraints },
      resourceUsage: { ...resourceUsage },
      violations: [...violations]
    });

    // Maintain history size
    if (this.constraintHistory.length > this.maxHistorySize) {
      this.constraintHistory.shift();
    }
  }

  /**
   * Get constraint analysis
   */
  getConstraintAnalysis(): {
    currentConstraints: SystemConstraints;
    currentUtilization: {
      cpu: number;
      memory: number;
      agents: number;
      tokens: number;
    };
    violations: string[];
    recommendations: string[];
    trend: 'improving' | 'stable' | 'degrading';
  } {
    const { resourceUsage } = useSystemStore.getState();
    const violations = this.checkConstraintViolations(resourceUsage);
    const { recommendations } = this.getConstraintRecommendations(resourceUsage);

    // Calculate utilization percentages
    const utilization = {
      cpu: (resourceUsage.cpuUtilization / this.constraints.maxCpuUsage) * 100,
      memory: (resourceUsage.memoryUtilization / this.constraints.maxMemoryUsage) * 100,
      agents: (resourceUsage.activeAgentCount / this.constraints.maxAgents) * 100,
      tokens: (resourceUsage.tokensUsedLastMinute / this.constraints.maxTokensPerMinute) * 100
    };

    // Determine trend based on recent history
    const trend = this.analyzeConstraintTrend();

    return {
      currentConstraints: this.constraints,
      currentUtilization: utilization,
      violations,
      recommendations,
      trend
    };
  }

  /**
   * Analyze constraint trend
   */
  private analyzeConstraintTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.constraintHistory.length < 5) {
      return 'stable';
    }

    const recentHistory = this.constraintHistory.slice(-5);
    let violationsIncreasing = 0;
    let violationsDecreasing = 0;

    for (let i = 1; i < recentHistory.length; i++) {
      const prevViolations = recentHistory[i - 1].violations.length;
      const currViolations = recentHistory[i].violations.length;
      
      if (currViolations > prevViolations) {
        violationsIncreasing++;
      } else if (currViolations < prevViolations) {
        violationsDecreasing++;
      }
    }

    if (violationsIncreasing > violationsDecreasing) {
      return 'degrading';
    } else if (violationsDecreasing > violationsIncreasing) {
      return 'improving';
    } else {
      return 'stable';
    }
  }

  /**
   * Reset constraints to defaults
   */
  resetToDefaults(): void {
    const defaultConstraints: SystemConstraints = {
      maxAgents: 10,
      maxMemoryUsage: 8192,
      maxCpuUsage: 80,
      maxTokensPerMinute: 5000,
      timeout: 60000
    };

    this.updateConstraints(defaultConstraints);
    console.log('[System Constraint Manager] Constraints reset to defaults');
  }

  /**
   * Export constraints configuration
   */
  exportConstraints(): string {
    return JSON.stringify({
      constraints: this.constraints,
      autoTuningEnabled: this.autoTuningEnabled,
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Import constraints configuration
   */
  importConstraints(config: string): boolean {
    try {
      const parsed = JSON.parse(config);
      
      if (parsed.constraints) {
        this.updateConstraints(parsed.constraints);
      }
      
      if (typeof parsed.autoTuningEnabled === 'boolean') {
        this.setAutoTuning(parsed.autoTuningEnabled);
      }
      
      console.log('[System Constraint Manager] Constraints configuration imported successfully');
      return true;
    } catch (error) {
      console.error('[System Constraint Manager] Failed to import constraints configuration:', error);
      return false;
    }
  }

  /**
   * Get constraint health score
   */
  getConstraintHealthScore(): number {
    const { resourceUsage } = useSystemStore.getState();
    const violations = this.checkConstraintViolations(resourceUsage);
    
    let score = 100;
    
    // Deduct points for violations
    score -= violations.length * 20;
    
    // Deduct points for high utilization
    const avgUtilization = (
      (resourceUsage.cpuUtilization / this.constraints.maxCpuUsage) +
      (resourceUsage.memoryUtilization / this.constraints.maxMemoryUsage) +
      (resourceUsage.activeAgentCount / this.constraints.maxAgents) +
      (resourceUsage.tokensUsedLastMinute / this.constraints.maxTokensPerMinute)
    ) / 4;
    
    score -= avgUtilization * 30;
    
    return Math.max(0, Math.round(score));
  }
}

/**
 * Global constraint manager instance
 */
export const systemConstraintManager = new SystemConstraintManager({
  maxAgents: 10,
  maxMemoryUsage: 8192,
  maxCpuUsage: 80,
  maxTokensPerMinute: 5000,
  timeout: 60000
});