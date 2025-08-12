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
 * Command Priority Levels
 */
export type CommandPriority = 
  | 'supreme'      // Highest priority, immediate override
  | 'critical'     // Critical system commands
  | 'high'         // High priority user commands
  | 'normal'       // Standard user commands
  | 'low'          // Background tasks
  | 'routine';     // Routine maintenance

/**
 * Command Override Types
 */
export type OverrideType = 
  | 'immediate'    // Immediate execution, no questions asked
  | 'confirm'      // Requires user confirmation
  | 'conditional'  // Executes only if conditions are met
  | 'emergency'    // Emergency override, bypasses most checks
  | 'scheduled';   // Scheduled override at specific time

/**
 * Command Status
 */
export type CommandStatus = 
  | 'pending'      // Awaiting execution
  | 'executing'    // Currently being executed
  | 'completed'    // Successfully executed
  | 'failed'       // Execution failed
  | 'cancelled'    // Cancelled by user
  | 'overridden';  // Overridden by higher priority command

/**
 * User Command
 */
export interface UserCommand {
  id: string;
  userId: string;
  timestamp: Date;
  command: string;
  priority: CommandPriority;
  overrideType: OverrideType;
  status: CommandStatus;
  target: {
    agentId?: string;
    taskId?: string;
    system?: boolean;
  };
  parameters: Record<string, any>;
  justification: string;
  expectedOutcome: string;
  constraints: {
    timeout: number;
    requireConfirmation: boolean;
    allowOverride: boolean;
    emergency: boolean;
  };
  execution: {
    startTime?: Date;
    endTime?: Date;
    result?: any;
    error?: string;
    overriddenBy?: string;
  };
  audit: {
    user: string;
    reason: string;
    approvedBy?: string;
    approvalTimestamp?: Date;
  };
}

/**
 * Override Rule
 */
export interface OverrideRule {
  id: string;
  name: string;
  description: string;
  condition: string; // JavaScript condition string
  action: 'allow' | 'block' | 'require_approval' | 'modify';
  modifications?: Record<string, any>;
  priority: number;
  enabled: boolean;
  cooldownPeriod: number;
  lastUsed?: Date;
}

/**
 * Command History Entry
 */
export interface CommandHistory {
  id: string;
  commandId: string;
  action: 'created' | 'executed' | 'completed' | 'failed' | 'cancelled' | 'overridden';
  timestamp: Date;
  userId: string;
  details: Record<string, any>;
  affectedAgents: string[];
  affectedTasks: string[];
}

/**
 * User Command Statistics
 */
export interface CommandStats {
  totalCommands: number;
  supremeCommands: number;
  criticalCommands: number;
  overrideSuccessRate: number;
  averageExecutionTime: number;
  commonOverrideReasons: Map<string, number>;
  systemInterruptions: number;
  userSatisfaction: number;
}

/**
 * User Command Supremacy Service
 * 
 * Implements comprehensive user command supremacy and override capabilities with:
 * - Hierarchical command priority system
 * - Intelligent override detection and execution
 * - Multi-level approval workflows
 * - Command conflict resolution
 * - Emergency override capabilities
 * - Comprehensive audit logging
 * - Real-time command monitoring
 * - User command queuing and scheduling
 * - System protection mechanisms
 */
export class UserCommandSupremacyService {
  private activeCommands: Map<string, UserCommand> = new Map();
  private commandQueue: UserCommand[] = [];
  private overrideRules: OverrideRule[] = [];
  private commandHistory: CommandHistory[] = [];
  private emergencyMode: boolean = false;
  private systemLock: boolean = false;
  private stats: CommandStats = {
    totalCommands: 0,
    supremeCommands: 0,
    criticalCommands: 0,
    overrideSuccessRate: 0,
    averageExecutionTime: 0,
    commonOverrideReasons: new Map(),
    systemInterruptions: 0,
    userSatisfaction: 0
  };

  constructor() {
    this.initializeOverrideRules();
    this.startCommandMonitoring();
  }

  /**
   * Initialize default override rules
   */
  private initializeOverrideRules(): void {
    this.overrideRules = [
      // Emergency override rules
      {
        id: 'emergency_override',
        name: 'Emergency Override',
        description: 'Allow emergency overrides without restrictions',
        condition: 'command.overrideType === "emergency"',
        action: 'allow',
        priority: 1,
        enabled: true,
        cooldownPeriod: 0
      },

      // Supreme priority rules
      {
        id: 'supreme_priority',
        name: 'Supreme Priority Commands',
        description: 'Supreme priority commands always execute',
        condition: 'command.priority === "supreme"',
        action: 'allow',
        priority: 2,
        enabled: true,
        cooldownPeriod: 300000 // 5 minutes
      },

      // Critical system commands
      {
        id: 'critical_system',
        name: 'Critical System Commands',
        description: 'Critical system commands require confirmation',
        condition: 'command.priority === "critical" && command.target.system',
        action: 'require_approval',
        priority: 3,
        enabled: true,
        cooldownPeriod: 600000 // 10 minutes
      },

      // High priority agent commands
      {
        id: 'high_priority_agent',
        name: 'High Priority Agent Commands',
        description: 'High priority agent commands can override normal operations',
        condition: 'command.priority === "high" && command.target.agentId',
        action: 'allow',
        priority: 4,
        enabled: true,
        cooldownPeriod: 300000 // 5 minutes
      },

      // System protection rules
      {
        id: 'system_protection',
        name: 'System Protection',
        description: 'Prevent commands that would compromise system integrity',
        condition: 'command.parameters.force && !command.emergency',
        action: 'block',
        priority: 5,
        enabled: true,
        cooldownPeriod: 0
      },

      // Resource protection rules
      {
        id: 'resource_protection',
        name: 'Resource Protection',
        description: 'Prevent commands that would exceed resource limits',
        condition: 'command.parameters.resourceRequest > availableResources',
        action: 'require_approval',
        priority: 6,
        enabled: true,
        cooldownPeriod: 0
      }
    ];
  }

  /**
   * Start command monitoring
   */
  private startCommandMonitoring(): void {
    // Start periodic command queue processing
    setInterval(() => this.processCommandQueue(), 1000);
    
    // Start command status monitoring
    setInterval(() => this.updateCommandStatus(), 5000);
    
    // Start emergency mode monitoring
    setInterval(() => this.checkEmergencyMode(), 10000);
  }

  /**
   * Execute a user command with supremacy
   */
  async executeUserCommand(
    userId: string,
    command: string,
    priority: CommandPriority = 'normal',
    overrideType: OverrideType = 'confirm',
    target?: {
      agentId?: string;
      taskId?: string;
      system?: boolean;
    },
    parameters: Record<string, any> = {},
    justification: string = '',
    expectedOutcome: string = ''
  ): Promise<string> {
    const commandId = uuidv4();
    const timestamp = new Date();

    // Create user command
    const userCommand: UserCommand = {
      id: commandId,
      userId,
      timestamp,
      command,
      priority,
      overrideType,
      status: 'pending',
      target: target || {},
      parameters,
      justification,
      expectedOutcome,
      constraints: {
        timeout: 30000, // 30 seconds default timeout
        requireConfirmation: overrideType === 'confirm',
        allowOverride: true,
        emergency: overrideType === 'emergency'
      },
      execution: {},
      audit: {
        user: userId,
        reason: justification
      }
    };

    // Log command creation
    this.logCommandHistory(commandId, 'created', {
      userId,
      command,
      priority,
      overrideType
    });

    // Update statistics
    this.stats.totalCommands++;
    if (priority === 'supreme') {
      this.stats.supremeCommands++;
    } else if (priority === 'critical') {
      this.stats.criticalCommands++;
    }

    // Check for override rules
    const overrideResult = await this.checkOverrideRules(userCommand);
    
    if (overrideResult.action === 'block') {
      userCommand.status = 'failed';
      this.logCommandHistory(commandId, 'failed', { reason: 'Blocked by override rule' });
      throw new Error('Command blocked by override rule');
    }

    if (overrideResult.action === 'require_approval') {
      userCommand.status = 'pending';
      this.commandQueue.push(userCommand);
      return commandId;
    }

    // Execute immediately if allowed
    if (overrideResult.action === 'allow') {
      await this.executeCommand(userCommand);
      return commandId;
    }

    // Apply modifications if specified
    if (overrideResult.modifications) {
      Object.assign(userCommand.parameters, overrideResult.modifications);
    }

    // Add to queue for processing
    this.commandQueue.push(userCommand);
    
    // Sort queue by priority
    this.sortCommandQueue();

    return commandId;
  }

  /**
   * Check override rules for a command
   */
  private async checkOverrideRules(command: UserCommand): Promise<{ action: string; modifications?: Record<string, any> }> {
    const applicableRules = this.overrideRules
      .filter(rule => rule.enabled && this.evaluateCondition(rule.condition, command))
      .sort((a, b) => a.priority - b.priority);

    for (const rule of applicableRules) {
      // Check cooldown period
      if (rule.lastUsed) {
        const timeSinceLastUse = Date.now() - rule.lastUsed.getTime();
        if (timeSinceLastUse < rule.cooldownPeriod) {
          continue;
        }
      }

      rule.lastUsed = new Date();

      switch (rule.action) {
        case 'allow':
          return { action: 'allow' };
        case 'block':
          return { action: 'block' };
        case 'require_approval':
          return { action: 'require_approval' };
        case 'modify':
          return { 
            action: 'allow', 
            modifications: rule.modifications 
          };
      }
    }

    return { action: 'allow' };
  }

  /**
   * Evaluate rule condition
   */
  private evaluateCondition(condition: string, command: UserCommand): boolean {
    try {
      const context = {
        command,
        priority: command.priority,
        overrideType: command.overrideType,
        target: command.target,
        parameters: command.parameters,
        emergency: command.constraints.emergency,
        systemLock: this.systemLock,
        emergencyMode: this.emergencyMode
      };

      // Note: In production, use a proper expression evaluator or sandbox
      return eval(condition); // eslint-disable-line no-eval
    } catch (error) {
      console.error('[User Command Supremacy] Error evaluating condition:', error);
      return false;
    }
  }

  /**
   * Execute a command
   */
  private async executeCommand(command: UserCommand): Promise<void> {
    command.status = 'executing';
    command.execution.startTime = new Date();
    
    this.logCommandHistory(command.id, 'executed', {
      startTime: command.execution.startTime
    });

    try {
      // Check for system lock
      if (this.systemLock && command.priority !== 'supreme' && command.overrideType !== 'emergency') {
        throw new Error('System is locked, only supreme or emergency commands allowed');
      }

      // Check for emergency mode
      if (this.emergencyMode && command.priority !== 'supreme') {
        throw new Error('System is in emergency mode, only supreme commands allowed');
      }

      // Execute the command based on target
      let result: any;
      
      if (command.target.system) {
        result = await this.executeSystemCommand(command);
      } else if (command.target.agentId) {
        result = await this.executeAgentCommand(command);
      } else if (command.target.taskId) {
        result = await this.executeTaskCommand(command);
      } else {
        result = await this.executeGeneralCommand(command);
      }

      // Update command result
      command.execution.result = result;
      command.execution.endTime = new Date();
      command.status = 'completed';

      this.logCommandHistory(command.id, 'completed', {
        result,
        executionTime: command.execution.endTime.getTime() - command.execution.startTime.getTime()
      });

      // Update statistics
      this.updateExecutionStats(command.execution.endTime.getTime() - command.execution.startTime.getTime());

    } catch (error) {
      command.execution.error = error instanceof Error ? error.message : String(error);
      command.execution.endTime = new Date();
      command.status = 'failed';

      this.logCommandHistory(command.id, 'failed', {
        error: command.execution.error,
        executionTime: command.execution.endTime.getTime() - command.execution.startTime.getTime()
      });

      throw error;
    }
  }

  /**
   * Execute system command
   */
  private async executeSystemCommand(command: UserCommand): Promise<any> {
    console.log(`[User Command Supremacy] Executing system command: ${command.command}`);
    
    // Simulate system command execution
    await this.delay(command.constraints.timeout);
    
    switch (command.command) {
      case 'shutdown':
        console.log('[User Command Supremacy] System shutdown initiated');
        return { status: 'shutdown_initiated', message: 'System is shutting down' };
      
      case 'restart':
        console.log('[User Command Supremacy] System restart initiated');
        return { status: 'restart_initiated', message: 'System is restarting' };
      
      case 'lock':
        this.systemLock = true;
        console.log('[User Command Supremacy] System locked');
        return { status: 'system_locked', message: 'System is now locked' };
      
      case 'unlock':
        this.systemLock = false;
        console.log('[User Command Supremacy] System unlocked');
        return { status: 'system_unlocked', message: 'System is now unlocked' };
      
      case 'emergency_mode':
        this.emergencyMode = true;
        console.log('[User Command Supremacy] Emergency mode activated');
        return { status: 'emergency_mode', message: 'Emergency mode activated' };
      
      default:
        throw new Error(`Unknown system command: ${command.command}`);
    }
  }

  /**
   * Execute agent command
   */
  private async executeAgentCommand(command: UserCommand): Promise<any> {
    const { agentId } = command.target;
    console.log(`[User Command Supremacy] Executing agent command for ${agentId}: ${command.command}`);
    
    // Simulate agent command execution
    await this.delay(command.constraints.timeout);
    
    switch (command.command) {
      case 'stop':
        console.log(`[User Command Supremacy] Agent ${agentId} stopped`);
        return { status: 'agent_stopped', agentId, message: 'Agent stopped successfully' };
      
      case 'restart':
        console.log(`[User Command Supremacy] Agent ${agentId} restarted`);
        return { status: 'agent_restarted', agentId, message: 'Agent restarted successfully' };
      
      case 'pause':
        console.log(`[User Command Supremacy] Agent ${agentId} paused`);
        return { status: 'agent_paused', agentId, message: 'Agent paused successfully' };
      
      case 'resume':
        console.log(`[User Command Supremacy] Agent ${agentId} resumed`);
        return { status: 'agent_resumed', agentId, message: 'Agent resumed successfully' };
      
      case 'update':
        console.log(`[User Command Supremacy] Agent ${agentId} updated`);
        return { status: 'agent_updated', agentId, message: 'Agent updated successfully' };
      
      default:
        throw new Error(`Unknown agent command: ${command.command}`);
    }
  }

  /**
   * Execute task command
   */
  private async executeTaskCommand(command: UserCommand): Promise<any> {
    const { taskId } = command.target;
    console.log(`[User Command Supremacy] Executing task command for ${taskId}: ${command.command}`);
    
    // Simulate task command execution
    await this.delay(command.constraints.timeout);
    
    switch (command.command) {
      case 'cancel':
        console.log(`[User Command Supremacy] Task ${taskId} cancelled`);
        return { status: 'task_cancelled', taskId, message: 'Task cancelled successfully' };
      
      case 'pause':
        console.log(`[User Command Supremacy] Task ${taskId} paused`);
        return { status: 'task_paused', taskId, message: 'Task paused successfully' };
      
      case 'resume':
        console.log(`[User Command Supremacy] Task ${taskId} resumed`);
        return { status: 'task_resumed', taskId, message: 'Task resumed successfully' };
      
      case 'priority':
        const newPriority = command.parameters.priority;
        console.log(`[User Command Supremacy] Task ${taskId} priority changed to ${newPriority}`);
        return { status: 'task_priority_changed', taskId, priority: newPriority, message: 'Task priority updated' };
      
      default:
        throw new Error(`Unknown task command: ${command.command}`);
    }
  }

  /**
   * Execute general command
   */
  private async executeGeneralCommand(command: UserCommand): Promise<any> {
    console.log(`[User Command Supremacy] Executing general command: ${command.command}`);
    
    // Simulate general command execution
    await this.delay(command.constraints.timeout);
    
    switch (command.command) {
      case 'status':
        return { 
          status: 'operational', 
          systemLock: this.systemLock,
          emergencyMode: this.emergencyMode,
          activeCommands: this.activeCommands.size,
          queueLength: this.commandQueue.length
        };
      
      case 'stats':
        return { ...this.stats };
      
      case 'cleanup':
        console.log('[User Command Supremacy] System cleanup initiated');
        return { status: 'cleanup_initiated', message: 'System cleanup started' };
      
      default:
        throw new Error(`Unknown general command: ${command.command}`);
    }
  }

  /**
   * Process command queue
   */
  private async processCommandQueue(): Promise<void> {
    if (this.commandQueue.length === 0) {
      return;
    }

    // Get highest priority command
    const command = this.commandQueue[0];
    
    // Check if command can be executed
    if (command.status === 'pending' && this.canExecuteCommand(command)) {
      this.commandQueue.shift();
      await this.executeCommand(command);
    }
  }

  /**
   * Check if command can be executed
   */
  private canExecuteCommand(command: UserCommand): boolean {
    // Check system lock
    if (this.systemLock && command.priority !== 'supreme') {
      return false;
    }

    // Check emergency mode
    if (this.emergencyMode && command.priority !== 'supreme') {
      return false;
    }

    // Check for conflicting commands
    for (const activeCommand of this.activeCommands.values()) {
      if (this.hasConflict(command, activeCommand)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check for command conflicts
   */
  private hasConflict(command1: UserCommand, command2: UserCommand): boolean {
    // Check if commands target the same resource
    if (command1.target.agentId && command2.target.agentId && 
        command1.target.agentId === command2.target.agentId) {
      return true;
    }

    if (command1.target.taskId && command2.target.taskId && 
        command1.target.taskId === command2.target.taskId) {
      return true;
    }

    // Check for conflicting operations
    const conflictingOperations = [
      ['stop', 'restart'],
      ['pause', 'resume'],
      ['cancel', 'priority']
    ];

    for (const [op1, op2] of conflictingOperations) {
      if ((command1.command === op1 && command2.command === op2) ||
          (command1.command === op2 && command2.command === op1)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sort command queue by priority
   */
  private sortCommandQueue(): void {
    const priorityOrder = ['supreme', 'critical', 'high', 'normal', 'low', 'routine'];
    
    this.commandQueue.sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.priority);
      const bIndex = priorityOrder.indexOf(b.priority);
      return aIndex - bIndex;
    });
  }

  /**
   * Update command status
   */
  private updateCommandStatus(): void {
    const now = new Date();
    
    for (const [commandId, command] of this.activeCommands) {
      if (command.execution.startTime) {
        const executionTime = now.getTime() - command.execution.startTime.getTime();
        
        if (executionTime > command.constraints.timeout) {
          command.status = 'failed';
          command.execution.error = 'Command execution timeout';
          command.execution.endTime = now;
          
          this.logCommandHistory(commandId, 'failed', { 
            error: 'Command execution timeout',
            executionTime 
          });
          
          this.activeCommands.delete(commandId);
        }
      }
    }
  }

  /**
   * Check emergency mode
   */
  private checkEmergencyMode(): void {
    // In a real implementation, this would check system conditions
    // For now, we'll simulate emergency mode checks
    
    if (this.emergencyMode) {
      // Check if emergency conditions have been resolved
      const emergencyResolved = Math.random() > 0.1; // 90% chance resolved
      
      if (emergencyResolved) {
        this.emergencyMode = false;
        console.log('[User Command Supremacy] Emergency mode resolved');
      }
    }
  }

  /**
   * Override an active command
   */
  async overrideCommand(
    commandId: string,
    overrideCommand: string,
    overridePriority: CommandPriority = 'supreme',
    justification: string = ''
  ): Promise<string> {
    const command = this.activeCommands.get(commandId);
    if (!command) {
      throw new Error(`Command not found: ${commandId}`);
    }

    const overrideId = uuidv4();
    const timestamp = new Date();

    // Create override command
    const overrideCommandObj: UserCommand = {
      id: overrideId,
      userId: 'system',
      timestamp,
      command: overrideCommand,
      priority: overridePriority,
      overrideType: 'immediate',
      status: 'executing',
      target: command.target,
      parameters: { originalCommandId: commandId },
      justification: `Override: ${justification}`,
      expectedOutcome: `Override original command: ${command.command}`,
      constraints: {
        timeout: 15000,
        requireConfirmation: false,
        allowOverride: true,
        emergency: overridePriority === 'supreme'
      },
      execution: {
        startTime: timestamp
      },
      audit: {
        user: 'system',
        reason: `Override of command ${commandId}: ${justification}`
      }
    };

    // Mark original command as overridden
    command.status = 'overridden';
    command.execution.overriddenBy = overrideId;
    command.execution.endTime = timestamp;

    this.logCommandHistory(commandId, 'overridden', {
      overrideId,
      overrideCommand,
      justification
    });

    // Execute override command
    this.activeCommands.set(overrideId, overrideCommandObj);
    await this.executeCommand(overrideCommandObj);

    return overrideId;
  }

  /**
   * Cancel a pending or executing command
   */
  async cancelCommand(commandId: string, reason: string = ''): Promise<boolean> {
    const command = this.activeCommands.get(commandId) || 
                   this.commandQueue.find(cmd => cmd.id === commandId);
    
    if (!command) {
      return false;
    }

    if (command.status === 'pending') {
      // Remove from queue
      const index = this.commandQueue.findIndex(cmd => cmd.id === commandId);
      if (index > -1) {
        this.commandQueue.splice(index, 1);
      }
    } else if (command.status === 'executing') {
      // Mark as cancelled
      command.status = 'cancelled';
      command.execution.endTime = new Date();
      this.activeCommands.delete(commandId);
    }

    this.logCommandHistory(commandId, 'cancelled', { reason });
    return true;
  }

  /**
   * Approve a pending command
   */
  async approveCommand(commandId: string, approverId: string): Promise<boolean> {
    const command = this.commandQueue.find(cmd => cmd.id === commandId);
    if (!command || command.status !== 'pending') {
      return false;
    }

    command.audit.approvedBy = approverId;
    command.audit.approvalTimestamp = new Date();
    command.constraints.requireConfirmation = false;

    console.log(`[User Command Supremacy] Command ${commandId} approved by ${approverId}`);
    return true;
  }

  /**
   * Log command history
   */
  private logCommandHistory(
    commandId: string,
    action: CommandHistory['action'],
    details: Record<string, any> = {}
  ): void {
    const historyEntry: CommandHistory = {
      id: uuidv4(),
      commandId,
      action,
      timestamp: new Date(),
      userId: 'system',
      details,
      affectedAgents: details.agentId ? [details.agentId] : [],
      affectedTasks: details.taskId ? [details.taskId] : []
    };

    this.commandHistory.push(historyEntry);
    
    // Maintain history size (keep last 1000 entries)
    if (this.commandHistory.length > 1000) {
      this.commandHistory.shift();
    }
  }

  /**
   * Update execution statistics
   */
  private updateExecutionStats(executionTime: number): void {
    // Update average execution time
    const totalExecutions = this.stats.totalCommands - this.commandQueue.length;
    this.stats.averageExecutionTime = 
      (this.stats.averageExecutionTime * (totalExecutions - 1) + executionTime) / totalExecutions;
  }

  /**
   * Get command status
   */
  getCommandStatus(commandId: string): UserCommand | null {
    return this.activeCommands.get(commandId) || 
           this.commandQueue.find(cmd => cmd.id === commandId) || null;
  }

  /**
   * Get all active commands
   */
  getActiveCommands(): UserCommand[] {
    return Array.from(this.activeCommands.values());
  }

  /**
   * Get command queue
   */
  getCommandQueue(): UserCommand[] {
    return [...this.commandQueue];
  }

  /**
   * Get command history
   */
  getCommandHistory(limit?: number): CommandHistory[] {
    if (limit) {
      return this.commandHistory.slice(-limit);
    }
    return [...this.commandHistory];
  }

  /**
   * Get command statistics
   */
  getCommandStats(): CommandStats {
    return { ...this.stats };
  }

  /**
   * Add custom override rule
   */
  addOverrideRule(rule: OverrideRule): void {
    this.overrideRules.push(rule);
    console.log(`[User Command Supremacy] Added override rule: ${rule.name}`);
  }

  /**
   * Remove override rule
   */
  removeOverrideRule(ruleId: string): void {
    this.overrideRules = this.overrideRules.filter(rule => rule.id !== ruleId);
    console.log(`[User Command Supremacy] Removed override rule: ${ruleId}`);
  }

  /**
   * Enable/disable override rule
   */
  toggleOverrideRule(ruleId: string, enabled: boolean): void {
    const rule = this.overrideRules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      console.log(`[User Command Supremacy] ${enabled ? 'Enabled' : 'Disabled'} override rule: ${ruleId}`);
    }
  }

  /**
   * Activate emergency mode
   */
  activateEmergencyMode(): void {
    this.emergencyMode = true;
    console.log('[User Command Supremacy] Emergency mode activated');
  }

  /**
   * Deactivate emergency mode
   */
  deactivateEmergencyMode(): void {
    this.emergencyMode = false;
    console.log('[User Command Supremacy] Emergency mode deactivated');
  }

  /**
   * Lock system
   */
  lockSystem(): void {
    this.systemLock = true;
    console.log('[User Command Supremacy] System locked');
  }

  /**
   * Unlock system
   */
  unlockSystem(): void {
    this.systemLock = false;
    console.log('[User Command Supremacy] System unlocked');
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    emergencyMode: boolean;
    systemLock: boolean;
    activeCommands: number;
    queueLength: number;
    overrideRulesCount: number;
  } {
    return {
      emergencyMode: this.emergencyMode,
      systemLock: this.systemLock,
      activeCommands: this.activeCommands.size,
      queueLength: this.commandQueue.length,
      overrideRulesCount: this.overrideRules.length
    };
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
    console.log('[User Command Supremacy] Shutting down...');
    
    // Cancel all pending commands
    this.commandQueue = [];
    
    // Cancel all active commands
    for (const command of this.activeCommands.values()) {
      command.status = 'cancelled';
      command.execution.endTime = new Date();
    }
    this.activeCommands.clear();
    
    console.log('[User Command Supremacy] Shutdown complete');
  }
}

/**
 * Global user command supremacy service instance
 */
export const userCommandSupremacyService = new UserCommandSupremacyService();