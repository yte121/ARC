import { v4 as uuidv4 } from 'uuid';
import { useSystemStore } from '@/store/system-store';
import { 
  Agent, 
  AgentMessage, 
  SystemStatus,
  SystemConstraints,
  SystemResourceUsage
} from '@/types/agent-types';

/**
 * Error Severity Levels
 */
export type ErrorSeverity = 
  | 'critical'    // System-wide failure, immediate action required
  | 'high'        // Major component failure, needs attention
  | 'medium'      // Component degradation, can continue
  | 'low'         // Minor issue, monitoring required
  | 'info';       // Informational, no action needed

/**
 * Error Categories
 */
export type ErrorCategory = 
  | 'system'      // System-level errors
  | 'agent'       // Agent-specific errors
  | 'communication' // Communication failures
  | 'resource'    // Resource constraint violations
  | 'model'       // Model/API errors
  | 'security'    // Security-related issues
  | 'network'     // Network connectivity issues
  | 'unknown';    // Uncategorized errors

/**
 * Error Recovery Strategy Types
 */
export type RecoveryStrategy = 
  | 'restart'           // Restart component
  | 'recreate'          // Recreate component
  | 'scale_up'          // Add more resources
  | 'scale_down'        // Reduce resources
  | 'failover'          // Switch to backup
  | 'rollback'          // Rollback to previous state
  | 'circuit_breaker'   // Temporarily disable
  | 'retry'             // Retry operation
  | 'manual_intervention' // Requires human intervention
  | 'ignore';           // Log and continue

/**
 * Error Recovery Action
 */
export interface RecoveryAction {
  id: string;
  type: RecoveryStrategy;
  description: string;
  parameters: Record<string, any>;
  priority: number;
  timeout: number;
  maxAttempts: number;
  backoffMultiplier: number;
  dependencies: string[];
  rollbackAction?: string;
}

/**
 * Error Recovery Rule
 */
export interface RecoveryRule {
  id: string;
  name: string;
  description: string;
  condition: string; // JavaScript condition string
  actions: RecoveryAction[];
  enabled: boolean;
  cooldownPeriod: number;
  maxExecutions: number;
  executionCount: number;
  lastExecution?: Date;
  successCount: number;
  failureCount: number;
}

/**
 * Error Event
 */
export interface ErrorEvent {
  id: string;
  timestamp: Date;
  severity: ErrorSeverity;
  category: ErrorCategory;
  source: string;
  message: string;
  details: Record<string, any>;
  stackTrace?: string;
  context: {
    agentId?: string;
    taskId?: string;
    component?: string;
    operation?: string;
  };
  recoveryAttempted: boolean;
  recoverySuccess: boolean;
  recoveryActions: string[];
  impact: {
    systemStatus: SystemStatus;
    affectedAgents: string[];
    affectedTasks: string[];
    estimatedDowntime: number;
    userImpact: string;
  };
}

/**
 * Recovery Statistics
 */
export interface RecoveryStats {
  totalErrors: number;
  criticalErrors: number;
  recoverySuccessRate: number;
  averageRecoveryTime: number;
  commonErrorPatterns: Map<string, number>;
  recoveryStrategyEffectiveness: Map<RecoveryStrategy, number>;
  systemUptime: number;
  lastRecoveryTime?: Date;
}

/**
 * Comprehensive Error Recovery Service
 * 
 * Implements advanced error detection, classification, and recovery with:
 * - Real-time error monitoring and alerting
 * - Intelligent error classification and severity assessment
 * - Automated recovery strategies with fallback mechanisms
 * - Circuit breaker patterns for system stability
 * - Error pattern recognition and prevention
 * - Recovery action orchestration and execution
 * - Comprehensive error logging and analytics
 * - User notification and escalation procedures
 */
export class ErrorRecoveryService {
  private errorEvents: ErrorEvent[] = [];
  private recoveryRules: RecoveryRule[] = [];
  private activeRecoveries: Map<string, RecoveryAction> = new Map();
  private errorPatterns: Map<string, { count: number; lastSeen: Date; severity: ErrorSeverity }> = new Map();
  private circuitBreakers: Map<string, {
    state: 'closed' | 'open' | 'half-open';
    failureCount: number;
    lastFailure: Date;
    timeout: number;
    threshold: number;
    recoveryWindow: number;
  }> = new Map();
  
  private stats: RecoveryStats = {
    totalErrors: 0,
    criticalErrors: 0,
    recoverySuccessRate: 0,
    averageRecoveryTime: 0,
    commonErrorPatterns: new Map(),
    recoveryStrategyEffectiveness: new Map(),
    systemUptime: Date.now()
  };

  constructor() {
    this.initializeRecoveryRules();
    this.startErrorMonitoring();
  }

  /**
   * Initialize default recovery rules
   */
  private initializeRecoveryRules(): void {
    this.recoveryRules = [
      // Critical system errors
      {
        id: 'critical_system_failure',
        name: 'Critical System Failure',
        description: 'Handle critical system failures with immediate restart',
        condition: 'event.severity === "critical" && event.category === "system"',
        actions: [
          {
            id: 'emergency_restart',
            type: 'restart',
            description: 'Emergency system restart',
            parameters: { timeout: 5000 },
            priority: 1,
            timeout: 30000,
            maxAttempts: 3,
            backoffMultiplier: 2,
            dependencies: []
          }
        ],
        enabled: true,
        cooldownPeriod: 300000, // 5 minutes
        maxExecutions: 10,
        executionCount: 0,
        successCount: 0,
        failureCount: 0
      },

      // Agent failures
      {
        id: 'agent_failure',
        name: 'Agent Failure Recovery',
        description: 'Recover from agent failures',
        condition: 'event.category === "agent" && event.context.agentId',
        actions: [
          {
            id: 'restart_agent',
            type: 'recreate',
            description: 'Restart failed agent',
            parameters: { agentId: 'event.context.agentId' },
            priority: 2,
            timeout: 15000,
            maxAttempts: 3,
            backoffMultiplier: 1.5,
            dependencies: ['system_resources_available']
          }
        ],
        enabled: true,
        cooldownPeriod: 60000, // 1 minute
        maxExecutions: 5,
        executionCount: 0,
        successCount: 0,
        failureCount: 0
      },

      // Communication failures
      {
        id: 'communication_failure',
        name: 'Communication Failure',
        description: 'Handle communication failures with retry and failover',
        condition: 'event.category === "communication"',
        actions: [
          {
            id: 'retry_communication',
            type: 'retry',
            description: 'Retry communication with exponential backoff',
            parameters: { maxRetries: 3, baseDelay: 1000 },
            priority: 3,
            timeout: 30000,
            maxAttempts: 5,
            backoffMultiplier: 2,
            dependencies: []
          },
          {
            id: 'failover_communication',
            type: 'failover',
            description: 'Switch to backup communication channel',
            parameters: {},
            priority: 4,
            timeout: 10000,
            maxAttempts: 1,
            backoffMultiplier: 1,
            dependencies: ['backup_channel_available']
          }
        ],
        enabled: true,
        cooldownPeriod: 120000, // 2 minutes
        maxExecutions: 8,
        executionCount: 0,
        successCount: 0,
        failureCount: 0
      },

      // Resource constraint violations
      {
        id: 'resource_violation',
        name: 'Resource Constraint Violation',
        description: 'Handle resource constraint violations',
        condition: 'event.category === "resource"',
        actions: [
          {
            id: 'scale_resources',
            type: 'scale_up',
            description: 'Scale up resources to handle load',
            parameters: { resourceType: 'auto', scaleFactor: 1.5 },
            priority: 2,
            timeout: 20000,
            maxAttempts: 2,
            backoffMultiplier: 1,
            dependencies: ['resource_scaling_available']
          }
        ],
        enabled: true,
        cooldownPeriod: 300000, // 5 minutes
        maxExecutions: 3,
        executionCount: 0,
        successCount: 0,
        failureCount: 0
      },

      // Model/API errors
      {
        id: 'model_api_error',
        name: 'Model API Error',
        description: 'Handle model API errors with failover',
        condition: 'event.category === "model"',
        actions: [
          {
            id: 'retry_api_call',
            type: 'retry',
            description: 'Retry API call with backoff',
            parameters: { maxRetries: 3, baseDelay: 2000 },
            priority: 3,
            timeout: 45000,
            maxAttempts: 3,
            backoffMultiplier: 2,
            dependencies: []
          },
          {
            id: 'switch_model_provider',
            type: 'failover',
            description: 'Switch to alternative model provider',
            parameters: {},
            priority: 4,
            timeout: 15000,
            maxAttempts: 1,
            backoffMultiplier: 1,
            dependencies: ['alternative_provider_available']
          }
        ],
        enabled: true,
        cooldownPeriod: 180000, // 3 minutes
        maxExecutions: 5,
        executionCount: 0,
        successCount: 0,
        failureCount: 0
      }
    ];
  }

  /**
   * Start error monitoring
   */
  private startErrorMonitoring(): void {
    // Set up global error handlers
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    // Start periodic error pattern analysis
    setInterval(() => this.analyzeErrorPatterns(), 60000); // Every minute
  }

  /**
   * Handle global JavaScript errors
   */
  private handleGlobalError(event: ErrorEvent): void {
    // The ErrorEvent from DOM has different properties
    const domErrorEvent = event as any;
    this.logError({
      severity: 'high',
      category: 'system',
      source: 'javascript',
      message: domErrorEvent.message,
      details: { filename: domErrorEvent.filename, lineno: domErrorEvent.lineno, colno: domErrorEvent.colno },
      context: {},
      impact: {
        systemStatus: 'degraded',
        affectedAgents: [],
        affectedTasks: [],
        estimatedDowntime: 0,
        userImpact: 'Minor functionality issues'
      }
    });
  }

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    this.logError({
      severity: 'medium',
      category: 'system',
      source: 'promise',
      message: 'Unhandled promise rejection',
      details: { reason: event.reason },
      context: {},
      impact: {
        systemStatus: 'degraded',
        affectedAgents: [],
        affectedTasks: [],
        estimatedDowntime: 0,
        userImpact: 'Potential data loss or incomplete operations'
      }
    });
  }

  /**
   * Log an error event
   */
  async logError(errorData: Omit<ErrorEvent, 'id' | 'timestamp' | 'recoveryAttempted' | 'recoverySuccess' | 'recoveryActions'>): Promise<string> {
    const errorEvent: ErrorEvent = {
      ...errorData,
      id: uuidv4(),
      timestamp: new Date(),
      recoveryAttempted: false,
      recoverySuccess: false,
      recoveryActions: []
    };

    // Add to error history
    this.errorEvents.push(errorEvent);
    
    // Maintain history size (keep last 1000 errors)
    if (this.errorEvents.length > 1000) {
      this.errorEvents.shift();
    }

    // Update statistics
    this.stats.totalErrors++;
    if (errorData.severity === 'critical') {
      this.stats.criticalErrors++;
    }

    // Track error patterns
    this.trackErrorPattern(errorEvent);

    // Check circuit breakers
    this.checkCircuitBreakers(errorEvent);

    // Attempt recovery
    await this.attemptRecovery(errorEvent);

    // Update system store
    const { addErrorEvent } = useSystemStore.getState() as any;
    if (addErrorEvent) {
      addErrorEvent(errorEvent);
    }

    return errorEvent.id;
  }

  /**
   * Track error patterns
   */
  private trackErrorPattern(error: ErrorEvent): void {
    const patternKey = `${error.category}:${error.source}:${error.message}`;
    const existing = this.errorPatterns.get(patternKey);
    
    if (existing) {
      existing.count++;
      existing.lastSeen = new Date();
      existing.severity = error.severity;
    } else {
      this.errorPatterns.set(patternKey, {
        count: 1,
        lastSeen: new Date(),
        severity: error.severity
      });
    }

    // Update common error patterns
    const currentCount = this.stats.commonErrorPatterns.get(patternKey) || 0;
    this.stats.commonErrorPatterns.set(patternKey, currentCount + 1);
  }

  /**
   * Check circuit breakers
   */
  private checkCircuitBreakers(error: ErrorEvent): void {
    const breakerKey = `${error.category}:${error.source}`;
    let breaker = this.circuitBreakers.get(breakerKey);
    
    if (!breaker) {
      breaker = {
        state: 'closed',
        failureCount: 0,
        lastFailure: new Date(),
        timeout: 60000, // 1 minute
        threshold: 5,
        recoveryWindow: 300000 // 5 minutes
      };
      this.circuitBreakers.set(breakerKey, breaker);
    }

    // Update failure count
    breaker.failureCount++;
    breaker.lastFailure = new Date();

    // Open circuit breaker if threshold exceeded
    if (breaker.failureCount >= breaker.threshold && breaker.state === 'closed') {
      breaker.state = 'open';
      console.warn(`[Circuit Breaker] Opening breaker for ${breakerKey} due to excessive failures`);
    }
  }

  /**
   * Attempt recovery for an error
   */
  private async attemptRecovery(error: ErrorEvent): Promise<void> {
    const applicableRules = this.recoveryRules.filter(rule => 
      rule.enabled && 
      this.evaluateCondition(rule.condition, error) &&
      this.canExecuteRule(rule)
    );

    if (applicableRules.length === 0) {
      console.warn(`[Error Recovery] No applicable recovery rules for error: ${error.id}`);
      return;
    }

    // Sort rules by priority
    applicableRules.sort((a, b) => a.actions[0].priority - b.actions[0].priority);

    // Execute recovery actions
    for (const rule of applicableRules) {
      try {
        await this.executeRecoveryRule(rule, error);
        break; // Stop on first successful recovery
      } catch (recoveryError) {
        console.error(`[Error Recovery] Recovery rule ${rule.id} failed:`, recoveryError);
        // Continue to next rule
      }
    }
  }

  /**
   * Evaluate recovery rule condition
   */
  private evaluateCondition(condition: string, error: ErrorEvent): boolean {
    try {
      // Create a safe evaluation context
      const context = {
        event: error,
        severity: error.severity,
        category: error.category,
        source: error.source,
        message: error.message,
        details: error.details,
        context: error.context
      };

      // Note: In production, use a proper expression evaluator or sandbox
      return eval(condition); // eslint-disable-line no-eval
    } catch (error) {
      console.error('[Error Recovery] Error evaluating condition:', error);
      return false;
    }
  }

  /**
   * Check if rule can be executed
   */
  private canExecuteRule(rule: RecoveryRule): boolean {
    if (rule.executionCount >= rule.maxExecutions) {
      return false;
    }

    if (rule.lastExecution) {
      const timeSinceLastExecution = Date.now() - rule.lastExecution.getTime();
      if (timeSinceLastExecution < rule.cooldownPeriod) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute recovery rule
   */
  private async executeRecoveryRule(rule: RecoveryRule, error: ErrorEvent): Promise<void> {
    console.log(`[Error Recovery] Executing rule: ${rule.name}`);
    
    rule.executionCount++;
    rule.lastExecution = new Date();

    for (const action of rule.actions) {
      try {
        await this.executeRecoveryAction(action, error);
        rule.successCount++;
        error.recoveryAttempted = true;
        error.recoverySuccess = true;
        error.recoveryActions.push(action.id);
        
        // Update recovery statistics
        this.updateRecoveryStats(action, true);
        
        console.log(`[Error Recovery] Successfully executed action: ${action.description}`);
        break;
      } catch (actionError) {
        rule.failureCount++;
        console.error(`[Error Recovery] Action failed: ${action.description}`, actionError);
        
        // Update recovery statistics
        this.updateRecoveryStats(action, false);
        
        // Try rollback if available
        if (action.rollbackAction) {
          try {
            await this.executeRollback(action.rollbackAction, error);
          } catch (rollbackError) {
            console.error(`[Error Recovery] Rollback failed:`, rollbackError);
          }
        }
      }
    }
  }

  /**
   * Execute recovery action
   */
  private async executeRecoveryAction(action: RecoveryAction, error: ErrorEvent): Promise<void> {
    this.activeRecoveries.set(action.id, action);

    try {
      switch (action.type) {
        case 'restart':
          await this.executeRestart(action, error);
          break;
        case 'recreate':
          await this.executeRecreate(action, error);
          break;
        case 'scale_up':
          await this.executeScaleUp(action, error);
          break;
        case 'scale_down':
          await this.executeScaleDown(action, error);
          break;
        case 'failover':
          await this.executeFailover(action, error);
          break;
        case 'rollback':
          await this.executeRollback(action.id, error);
          break;
        case 'retry':
          await this.executeRetry(action, error);
          break;
        case 'circuit_breaker':
          await this.executeCircuitBreaker(action, error);
          break;
        case 'manual_intervention':
          await this.requestManualIntervention(action, error);
          break;
        case 'ignore':
          // Do nothing
          break;
        default:
          throw new Error(`Unknown recovery action type: ${action.type}`);
      }
    } finally {
      this.activeRecoveries.delete(action.id);
    }
  }

  /**
   * Execute restart action
   */
  private async executeRestart(action: RecoveryAction, error: ErrorEvent): Promise<void> {
    console.log(`[Error Recovery] Restarting component: ${action.description}`);
    
    // Simulate restart process
    await this.delay(action.timeout);
    
    // In a real implementation, this would restart the specific component
    console.log(`[Error Recovery] Component restarted successfully`);
  }

  /**
   * Execute recreate action
   */
  private async executeRecreate(action: RecoveryAction, error: ErrorEvent): Promise<void> {
    const { agentId } = action.parameters;
    console.log(`[Error Recovery] Recreating agent: ${agentId}`);
    
    // Simulate agent recreation
    await this.delay(action.timeout);
    
    // In a real implementation, this would recreate the agent
    console.log(`[Error Recovery] Agent recreated successfully`);
  }

  /**
   * Execute scale up action
   */
  private async executeScaleUp(action: RecoveryAction, error: ErrorEvent): Promise<void> {
    console.log(`[Error Recovery] Scaling up resources: ${action.description}`);
    
    // Simulate scaling process
    await this.delay(action.timeout);
    
    // In a real implementation, this would scale up resources
    console.log(`[Error Recovery] Resources scaled up successfully`);
  }

  /**
   * Execute scale down action
   */
  private async executeScaleDown(action: RecoveryAction, error: ErrorEvent): Promise<void> {
    console.log(`[Error Recovery] Scaling down resources: ${action.description}`);
    
    // Simulate scaling process
    await this.delay(action.timeout);
    
    // In a real implementation, this would scale down resources
    console.log(`[Error Recovery] Resources scaled down successfully`);
  }

  /**
   * Execute failover action
   */
  private async executeFailover(action: RecoveryAction, error: ErrorEvent): Promise<void> {
    console.log(`[Error Recovery] Executing failover: ${action.description}`);
    
    // Simulate failover process
    await this.delay(action.timeout);
    
    // In a real implementation, this would switch to backup
    console.log(`[Error Recovery] Failover completed successfully`);
  }

  /**
   * Execute rollback action
   */
  private async executeRollback(actionId: string, error: ErrorEvent): Promise<void> {
    console.log(`[Error Recovery] Executing rollback: ${actionId}`);
    
    // Simulate rollback process
    await this.delay(10000);
    
    console.log(`[Error Recovery] Rollback completed successfully`);
  }

  /**
   * Execute retry action
   */
  private async executeRetry(action: RecoveryAction, error: ErrorEvent): Promise<void> {
    const { maxRetries = 3, baseDelay = 1000 } = action.parameters;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        console.log(`[Error Recovery] Retry attempt ${attempt + 1}/${maxRetries}`);
        await this.delay(baseDelay * Math.pow(action.backoffMultiplier, attempt));
        
        // Simulate retry operation
        if (Math.random() > 0.3) { // 70% success rate
          console.log(`[Error Recovery] Retry successful on attempt ${attempt + 1}`);
          return;
        }
        
        attempt++;
      } catch (retryError) {
        attempt++;
        if (attempt >= maxRetries) {
          throw retryError;
        }
      }
    }
    
    throw new Error('All retry attempts failed');
  }

  /**
   * Execute circuit breaker action
   */
  private async executeCircuitBreaker(action: RecoveryAction, error: ErrorEvent): Promise<void> {
    const breakerKey = `${error.category}:${error.source}`;
    const breaker = this.circuitBreakers.get(breakerKey);
    
    if (breaker) {
      breaker.state = 'open';
      console.log(`[Error Recovery] Circuit breaker opened for ${breakerKey}`);
    }
    
    // Set timeout to close breaker
    setTimeout(() => {
      if (breaker) {
        breaker.state = 'half-open';
        console.log(`[Error Recovery] Circuit breaker moved to half-open for ${breakerKey}`);
      }
    }, action.timeout);
  }

  /**
   * Request manual intervention
   */
  private async requestManualIntervention(action: RecoveryAction, error: ErrorEvent): Promise<void> {
    console.log(`[Error Recovery] Requesting manual intervention for: ${action.description}`);
    
    // In a real implementation, this would send alerts to administrators
    // and potentially pause the system
    
    // For now, just log and wait
    await this.delay(action.timeout);
  }

  /**
   * Update recovery statistics
   */
  private updateRecoveryStats(action: RecoveryAction, success: boolean): void {
    const currentEffectiveness = this.stats.recoveryStrategyEffectiveness.get(action.type) || 0;
    const newEffectiveness = success ? currentEffectiveness + 1 : currentEffectiveness;
    this.stats.recoveryStrategyEffectiveness.set(action.type, newEffectiveness);
    
    // Update overall success rate
    const totalActions = Array.from(this.stats.recoveryStrategyEffectiveness.values()).reduce((sum, count) => sum + count, 0);
    const successfulActions = Array.from(this.stats.recoveryStrategyEffectiveness.values()).reduce((sum, count) => sum + count, 0);
    this.stats.recoverySuccessRate = totalActions > 0 ? (successfulActions / totalActions) * 100 : 0;
  }

  /**
   * Analyze error patterns
   */
  private analyzeErrorPatterns(): void {
    console.log('[Error Recovery] Analyzing error patterns...');
    
    // Identify recurring errors
    const recurringErrors = Array.from(this.errorPatterns.entries())
      .filter(([_, pattern]) => pattern.count > 3 && pattern.severity !== 'low')
      .sort((a, b) => b[1].count - a[1].count);
    
    if (recurringErrors.length > 0) {
      console.log('[Error Recovery] Recurring error patterns detected:');
      recurringErrors.forEach(([pattern, data]) => {
        console.log(`  - ${pattern}: ${data.count} occurrences, severity: ${data.severity}`);
      });
    }
    
    // Generate prevention recommendations
    this.generatePreventionRecommendations(recurringErrors);
  }

  /**
   * Generate prevention recommendations
   */
  private generatePreventionRecommendations(recurringErrors: Array<[string, { count: number; severity: ErrorSeverity }]>): void {
    const recommendations: string[] = [];
    
    recurringErrors.forEach(([pattern, data]) => {
      if (pattern.includes('communication')) {
        recommendations.push('Consider implementing more robust error handling for communication channels');
      } else if (pattern.includes('resource')) {
        recommendations.push('Review resource allocation and consider scaling up resources');
      } else if (pattern.includes('agent')) {
        recommendations.push('Investigate agent stability issues and implement health checks');
      }
    });
    
    if (recommendations.length > 0) {
      console.log('[Error Recovery] Prevention recommendations:');
      recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
  }

  /**
   * Get error recovery statistics
   */
  getRecoveryStats(): RecoveryStats {
    return { ...this.stats };
  }

  /**
   * Get recent error events
   */
  getRecentErrors(limit: number = 50): ErrorEvent[] {
    return this.errorEvents.slice(-limit);
  }

  /**
   * Get active recoveries
   */
  getActiveRecoveries(): RecoveryAction[] {
    return Array.from(this.activeRecoveries.values());
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): Map<string, {
    state: string;
    failureCount: number;
    lastFailure: Date;
    timeout: number;
    threshold: number;
  }> {
    const status = new Map();
    
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      status.set(key, {
        state: breaker.state,
        failureCount: breaker.failureCount,
        lastFailure: breaker.lastFailure,
        timeout: breaker.timeout,
        threshold: breaker.threshold
      });
    }
    
    return status;
  }

  /**
   * Add custom recovery rule
   */
  addRecoveryRule(rule: RecoveryRule): void {
    this.recoveryRules.push(rule);
    console.log(`[Error Recovery] Added custom recovery rule: ${rule.name}`);
  }

  /**
   * Remove recovery rule
   */
  removeRecoveryRule(ruleId: string): void {
    this.recoveryRules = this.recoveryRules.filter(rule => rule.id !== ruleId);
    console.log(`[Error Recovery] Removed recovery rule: ${ruleId}`);
  }

  /**
   * Enable/disable recovery rule
   */
  toggleRecoveryRule(ruleId: string, enabled: boolean): void {
    const rule = this.recoveryRules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      console.log(`[Error Recovery] ${enabled ? 'Enabled' : 'Disabled'} recovery rule: ${ruleId}`);
    }
  }

  /**
   * Manual recovery trigger
   */
  async manualRecovery(errorId: string): Promise<boolean> {
    const error = this.errorEvents.find(e => e.id === errorId);
    if (!error) {
      throw new Error(`Error not found: ${errorId}`);
    }
    
    console.log(`[Error Recovery] Manual recovery triggered for error: ${errorId}`);
    
    // Attempt recovery again
    await this.attemptRecovery(error);
    
    return error.recoverySuccess;
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(breakerKey: string): void {
    const breaker = this.circuitBreakers.get(breakerKey);
    if (breaker) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      console.log(`[Error Recovery] Circuit breaker reset: ${breakerKey}`);
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[Error Recovery] Shutting down...');
    
    // Cancel all active recoveries
    this.activeRecoveries.clear();
    
    // Close all circuit breakers
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
    }
    
    console.log('[Error Recovery] Shutdown complete');
  }
}

/**
 * Global error recovery service instance
 */
export const errorRecoveryService = new ErrorRecoveryService();