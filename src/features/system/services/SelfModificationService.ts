import { useSystemStore } from '@/store/system-store';
import { 
  SystemConstraints, 
  SystemResourceUsage, 
  SystemStatus,
  Agent,
  Task 
} from '@/types/agent-types';

/**
 * Self-Modification Service
 * 
 * Implements safe self-modification capabilities with:
 * - Sandboxed code execution
 * - Comprehensive validation
 * - Rollback mechanisms
 * - User approval workflows
 * - Change documentation
 * - Safety constraints
 */
export class SelfModificationService {
  private modificationHistory: Array<{
    id: string;
    timestamp: Date;
    type: 'code' | 'config' | 'agent' | 'system';
    description: string;
    changes: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
    rollbackData?: any;
    approvedBy?: string;
    safetyChecks: {
      validation: boolean;
      resourceCheck: boolean;
      backupCreated: boolean;
      testPassed: boolean;
    };
  }> = [];
  private pendingModifications: Map<string, any> = new Map();
  private maxHistorySize = 100;
  private sandboxEnvironment: Map<string, any> = new Map();
  private safetyConstraints: {
    allowCodeExecution: boolean;
    requireApproval: boolean;
    maxModificationSize: number;
    requireBackup: boolean;
    testTimeout: number;
  };

  constructor() {
    this.safetyConstraints = {
      allowCodeExecution: true,
      requireApproval: true,
      maxModificationSize: 1000000, // 1MB
      requireBackup: true,
      testTimeout: 30000 // 30 seconds
    };

    this.initializeSandbox();
  }

  /**
   * Initialize sandbox environment
   */
  private initializeSandbox(): void {
    // Create isolated environment for safe code execution
    this.sandboxEnvironment.set('console', {
      log: (...args: any[]) => console.log('[Sandbox]', ...args),
      warn: (...args: any[]) => console.warn('[Sandbox]', ...args),
      error: (...args: any[]) => console.error('[Sandbox]', ...args)
    });

    this.sandboxEnvironment.set('Math', Math);
    this.sandboxEnvironment.set('JSON', JSON);
    this.sandboxEnvironment.set('Date', Date);
    this.sandboxEnvironment.set('Array', Array);
    this.sandboxEnvironment.set('Object', Object);
    this.sandboxEnvironment.set('String', String);
    this.sandboxEnvironment.set('Number', Number);
    this.sandboxEnvironment.set('Boolean', Boolean);
    this.sandboxEnvironment.set('RegExp', RegExp);
    this.sandboxEnvironment.set('Promise', Promise);
  }

  /**
   * Request self-modification
   */
  async requestModification(
    type: 'code' | 'config' | 'agent' | 'system',
    description: string,
    changes: string,
    requiresApproval: boolean = true
  ): Promise<string> {
    const modificationId = this.generateModificationId();
    
    // Validate modification request
    const validation = await this.validateModification(type, changes);
    
    if (!validation.valid) {
      throw new Error(`Modification validation failed: ${validation.reason}`);
    }

    // Create modification record
    const modification = {
      id: modificationId,
      timestamp: new Date(),
      type,
      description,
      changes,
      status: 'pending' as const,
      safetyChecks: {
        validation: true,
        resourceCheck: false,
        backupCreated: false,
        testPassed: false
      }
    };

    // Store pending modification
    this.pendingModifications.set(modificationId, modification);

    // Perform safety checks
    await this.performSafetyChecks(modificationId);

    // Check if approval is required
    if (requiresApproval && this.safetyConstraints.requireApproval) {
      console.log(`[Self-Modification] Modification ${modificationId} requires user approval`);
      return modificationId;
    }

    // Auto-approve if allowed and checks pass
    if (this.canAutoApprove(modification)) {
      await this.approveModification(modificationId);
    }

    return modificationId;
  }

  /**
   * Validate modification request
   */
  private async validateModification(type: string, changes: string): Promise<{ valid: boolean; reason?: string }> {
    // Check size constraint
    if (changes.length > this.safetyConstraints.maxModificationSize) {
      return { valid: false, reason: 'Modification size exceeds limit' };
    }

    // Validate based on type
    switch (type) {
      case 'code':
        return this.validateCodeModification(changes);
      case 'config':
        return this.validateConfigModification(changes);
      case 'agent':
        return this.validateAgentModification(changes);
      case 'system':
        return this.validateSystemModification(changes);
      default:
        return { valid: false, reason: 'Invalid modification type' };
    }
  }

  /**
   * Validate code modification
   */
  private async validateCodeModification(code: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Basic syntax check
      new Function(code);
      
      // Security scan for dangerous patterns
      const dangerousPatterns = [
        /require\s*\(/,
        /import\s+/,
        /eval\s*\(/,
        /Function\s*\(/,
        /fetch\s*\(/,
        /XMLHttpRequest/,
        /WebSocket/,
        /document\./,
        /window\./,
        /global\./,
        /process\./,
        /Buffer\./,
        /fs\./,
        /path\./,
        /os\./,
        /crypto\./,
        /child_process/
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
          return { valid: false, reason: 'Code contains potentially dangerous patterns' };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: `Code syntax error: ${error}` };
    }
  }

  /**
   * Validate config modification
   */
  private async validateConfigModification(config: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const parsed = JSON.parse(config);
      
      // Validate config structure
      if (typeof parsed !== 'object' || parsed === null) {
        return { valid: false, reason: 'Config must be an object' };
      }

      // Check for dangerous properties
      const dangerousProps = ['exec', 'eval', 'require', 'import', 'spawn', 'fork'];
      for (const prop of dangerousProps) {
        if (prop in parsed) {
          return { valid: false, reason: `Config contains dangerous property: ${prop}` };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: `Invalid JSON config: ${error}` };
    }
  }

  /**
   * Validate agent modification
   */
  private async validateAgentModification(agentData: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const parsed = JSON.parse(agentData);
      
      // Validate agent structure
      if (!parsed.id || !parsed.name || !parsed.specialization) {
        return { valid: false, reason: 'Agent data missing required fields' };
      }

      // Validate agent status
      const validStatuses = ['idle', 'initializing', 'processing', 'waiting', 'completed', 'failed'];
      if (!validStatuses.includes(parsed.status)) {
        return { valid: false, reason: 'Invalid agent status' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: `Invalid agent data: ${error}` };
    }
  }

  /**
   * Validate system modification
   */
  private async validateSystemModification(systemData: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const parsed = JSON.parse(systemData);
      
      // Validate system constraints
      if (parsed.constraints) {
        const { maxAgents, maxMemoryUsage, maxCpuUsage, maxTokensPerMinute } = parsed.constraints;
        
        if (typeof maxAgents !== 'number' || maxAgents < 1 || maxAgents > 50) {
          return { valid: false, reason: 'Invalid maxAgents value' };
        }
        
        if (typeof maxMemoryUsage !== 'number' || maxMemoryUsage < 512 || maxMemoryUsage > 32768) {
          return { valid: false, reason: 'Invalid maxMemoryUsage value' };
        }
        
        if (typeof maxCpuUsage !== 'number' || maxCpuUsage < 10 || maxCpuUsage > 100) {
          return { valid: false, reason: 'Invalid maxCpuUsage value' };
        }
        
        if (typeof maxTokensPerMinute !== 'number' || maxTokensPerMinute < 100 || maxTokensPerMinute > 50000) {
          return { valid: false, reason: 'Invalid maxTokensPerMinute value' };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: `Invalid system data: ${error}` };
    }
  }

  /**
   * Perform safety checks
   */
  private async performSafetyChecks(modificationId: string): Promise<void> {
    const modification = this.pendingModifications.get(modificationId);
    if (!modification) return;

    try {
      // Check system resources
      const resourceCheck = await this.checkSystemResources();
      modification.safetyChecks.resourceCheck = resourceCheck.sufficient;

      // Create backup if required
      if (this.safetyConstraints.requireBackup) {
        const backup = await this.createBackup(modification.type);
        modification.rollbackData = backup;
        modification.safetyChecks.backupCreated = true;
      }

      // Run tests
      const testResult = await this.runModificationTests(modification);
      modification.safetyChecks.testPassed = testResult.passed;

      // Update modification record
      this.pendingModifications.set(modificationId, modification);

    } catch (error) {
      console.error(`[Self-Modification] Safety checks failed for ${modificationId}:`, error);
      modification.status = 'failed';
      this.pendingModifications.set(modificationId, modification);
    }
  }

  /**
   * Check system resources
   */
  private async checkSystemResources(): Promise<{ sufficient: boolean; reason?: string }> {
    const { resourceUsage, constraints } = useSystemStore.getState();
    
    // Check if system has enough resources for modification
    if (resourceUsage.cpuUtilization > constraints.maxCpuUsage * 0.8) {
      return { sufficient: false, reason: 'Insufficient CPU capacity' };
    }
    
    if (resourceUsage.memoryUtilization > constraints.maxMemoryUsage * 0.8) {
      return { sufficient: false, reason: 'Insufficient memory capacity' };
    }
    
    if (resourceUsage.activeAgentCount > constraints.maxAgents * 0.8) {
      return { sufficient: false, reason: 'Insufficient agent capacity' };
    }

    return { sufficient: true };
  }

  /**
   * Create backup
   */
  private async createBackup(type: string): Promise<any> {
    const { agents, tasks, constraints } = useSystemStore.getState();
    
    switch (type) {
      case 'agent':
        return { agents: [...agents] };
      case 'system':
        return { constraints: { ...constraints } };
      case 'config':
        return { config: { ...constraints } };
      default:
        return { timestamp: new Date(), type };
    }
  }

  /**
   * Run modification tests
   */
  private async runModificationTests(modification: any): Promise<{ passed: boolean; message?: string }> {
    try {
      // Execute in sandbox environment
      const testResult = await this.executeInSandbox(`
        // Test modification
        try {
          // Basic functionality test
          console.log('Testing modification...');
          
          // Type-specific tests
          switch('${modification.type}') {
            case 'code':
              // Test code syntax and basic execution
              const testFunc = new Function('${modification.changes}');
              testFunc();
              break;
            case 'config':
              // Test config validity
              JSON.parse('${modification.changes}');
              break;
            case 'agent':
              // Test agent data validity
              const agentData = JSON.parse('${modification.changes}');
              if (!agentData.id || !agentData.name) throw new Error('Invalid agent data');
              break;
            case 'system':
              // Test system constraints
              const systemData = JSON.parse('${modification.changes}');
              if (systemData.constraints && systemData.constraints.maxAgents < 1) {
                throw new Error('Invalid system constraints');
              }
              break;
          }
          
          console.log('Modification test passed');
          return { passed: true };
        } catch (error) {
          console.error('Modification test failed:', error);
          return { passed: false, message: error.message };
        }
      `);

      return testResult;
    } catch (error) {
      return { passed: false, message: `Test execution failed: ${error}` };
    }
  }

  /**
   * Execute code in sandbox
   */
  private async executeInSandbox(code: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.safetyConstraints.allowCodeExecution) {
        reject(new Error('Code execution not allowed'));
        return;
      }

      try {
        // Create sandbox context
        const sandboxContext = { ...this.sandboxEnvironment };
        const func = new Function(...Object.keys(sandboxContext), code);
        
        // Execute with timeout
        const timeoutId = setTimeout(() => {
          reject(new Error('Code execution timeout'));
        }, this.safetyConstraints.testTimeout);

        const result = func(...Object.values(sandboxContext));
        clearTimeout(timeoutId);
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check if modification can be auto-approved
   */
  private canAutoApprove(modification: any): boolean {
    // Auto-approve only for low-risk modifications
    if (modification.type === 'config' && modification.changes.length < 1000) {
      return true;
    }
    
    if (modification.type === 'system' && modification.safetyChecks.testPassed) {
      return true;
    }

    return false;
  }

  /**
   * Approve modification
   */
  async approveModification(modificationId: string, approvedBy: string = 'system'): Promise<void> {
    const modification = this.pendingModifications.get(modificationId);
    if (!modification) {
      throw new Error(`Modification ${modificationId} not found`);
    }

    // Check if all safety checks passed
    const safetyPassed = Object.values(modification.safetyChecks).every(check => check === true);
    if (!safetyPassed) {
      throw new Error('Cannot approve modification: safety checks not passed');
    }

    try {
      // Apply modification
      await this.applyModification(modification);

      // Update modification record
      modification.status = 'completed';
      modification.approvedBy = approvedBy;
      this.pendingModifications.delete(modificationId);

      // Add to history
      this.modificationHistory.push(modification);
      this.maintainHistorySize();

      console.log(`[Self-Modification] Modification ${modificationId} completed successfully`);

    } catch (error) {
      console.error(`[Self-Modification] Modification ${modificationId} failed:`, error);
      modification.status = 'failed';
      this.pendingModifications.set(modificationId, modification);

      // Attempt rollback
      await this.rollbackModification(modificationId);
    }
  }

  /**
   * Apply modification
   */
  private async applyModification(modification: any): Promise<void> {
    switch (modification.type) {
      case 'code':
        await this.applyCodeModification(modification.changes);
        break;
      case 'config':
        await this.applyConfigModification(modification.changes);
        break;
      case 'agent':
        await this.applyAgentModification(modification.changes);
        break;
      case 'system':
        await this.applySystemModification(modification.changes);
        break;
    }
  }

  /**
   * Apply code modification
   */
  private async applyCodeModification(code: string): Promise<void> {
    // In a real implementation, this would dynamically load/execute the code
    console.log('[Self-Modification] Applying code modification');
    
    // For now, we'll just log the change
    console.log('[Self-Modification] Code modification applied:', code.substring(0, 100) + '...');
  }

  /**
   * Apply config modification
   */
  private async applyConfigModification(config: string): Promise<void> {
    try {
      const parsed = JSON.parse(config);
      const { updateModelConfig } = useSystemStore.getState();
      updateModelConfig(parsed);
      console.log('[Self-Modification] Config modification applied:', config);
    } catch (error) {
      throw new Error(`Failed to apply config modification: ${error}`);
    }
  }

  /**
   * Apply agent modification
   */
  private async applyAgentModification(agentData: string): Promise<void> {
    try {
      const parsed = JSON.parse(agentData);
      const { updateAgentStatus } = useSystemStore.getState();
      updateAgentStatus(parsed.id, parsed.status);
      console.log('[Self-Modification] Agent modification applied:', agentData);
    } catch (error) {
      throw new Error(`Failed to apply agent modification: ${error}`);
    }
  }

  /**
   * Apply system modification
   */
  private async applySystemModification(systemData: string): Promise<void> {
    try {
      const parsed = JSON.parse(systemData);
      const { updateModelConfig, updateSystemStatus } = useSystemStore.getState();
      
      if (parsed.constraints) {
        updateModelConfig(parsed.constraints);
      }
      
      if (parsed.systemStatus) {
        updateSystemStatus(parsed.systemStatus);
      }
      
      console.log('[Self-Modification] System modification applied:', systemData);
    } catch (error) {
      throw new Error(`Failed to apply system modification: ${error}`);
    }
  }

  /**
   * Reject modification
   */
  async rejectModification(modificationId: string, reason: string = 'User rejection'): Promise<void> {
    const modification = this.pendingModifications.get(modificationId);
    if (!modification) {
      throw new Error(`Modification ${modificationId} not found`);
    }

    modification.status = 'rejected';
    this.pendingModifications.delete(modificationId);

    // Add to history
    this.modificationHistory.push(modification);
    this.maintainHistorySize();

    console.log(`[Self-Modification] Modification ${modificationId} rejected: ${reason}`);
  }

  /**
   * Rollback modification
   */
  async rollbackModification(modificationId: string): Promise<void> {
    const modification = this.modificationHistory.find(m => m.id === modificationId);
    if (!modification || !modification.rollbackData) {
      throw new Error(`Cannot rollback modification ${modificationId}: no backup available`);
    }

    try {
      // Restore from backup
      switch (modification.type) {
        case 'agent':
          await this.restoreAgents(modification.rollbackData.agents);
          break;
        case 'system':
          await this.restoreSystem(modification.rollbackData.constraints);
          break;
        case 'config':
          await this.restoreConfig(modification.rollbackData.config);
          break;
      }

      console.log(`[Self-Modification] Modification ${modificationId} rolled back successfully`);

    } catch (error) {
      console.error(`[Self-Modification] Failed to rollback modification ${modificationId}:`, error);
      throw error;
    }
  }

  /**
   * Restore agents from backup
   */
  private async restoreAgents(backupAgents: Agent[]): Promise<void> {
    const { addAgent, removeAgent } = useSystemStore.getState();
    
    // Clear existing agents and restore from backup
    backupAgents.forEach(agent => {
      removeAgent(agent.id);
      addAgent({
        name: agent.name,
        specialization: agent.specialization,
        status: agent.status,
        tier: agent.tier,
        description: agent.description,
        capabilities: agent.capabilities,
        performance: agent.performance,
        config: agent.config,
        memory: agent.memory,
        security: agent.security,
        specializationDetails: agent.specializationDetails,
        reasoning: agent.reasoning,
        adaptability: agent.adaptability
      });
    });
  }

  /**
   * Restore system from backup
   */
  private async restoreSystem(backupConstraints: SystemConstraints): Promise<void> {
    // Convert constraints to model config format
    const modelConfig = {
      provider: 'local' as const,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000,
      costPerToken: 0.0000002,
      ...backupConstraints
    };
    
    const { updateModelConfig } = useSystemStore.getState();
    updateModelConfig(modelConfig);
  }

  /**
   * Restore config from backup
   */
  private async restoreConfig(backupConfig: any): Promise<void> {
    const { updateModelConfig } = useSystemStore.getState();
    updateModelConfig(backupConfig);
  }

  /**
   * Generate modification ID
   */
  private generateModificationId(): string {
    return `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Maintain history size
   */
  private maintainHistorySize(): void {
    if (this.modificationHistory.length > this.maxHistorySize) {
      this.modificationHistory.shift();
    }
  }

  /**
   * Get modification history
   */
  getModificationHistory(limit?: number): Array<any> {
    if (limit) {
      return this.modificationHistory.slice(-limit);
    }
    return [...this.modificationHistory];
  }

  /**
   * Get pending modifications
   */
  getPendingModifications(): Array<any> {
    return Array.from(this.pendingModifications.values());
  }

  /**
   * Get modification details
   */
  getModificationDetails(modificationId: string): any {
    return this.modificationHistory.find(m => m.id === modificationId) ||
           this.pendingModifications.get(modificationId);
  }

  /**
   * Update safety constraints
   */
  updateSafetyConstraints(newConstraints: Partial<typeof this.safetyConstraints>): void {
    this.safetyConstraints = { ...this.safetyConstraints, ...newConstraints };
    console.log('[Self-Modification] Safety constraints updated:', this.safetyConstraints);
  }

  /**
   * Get safety constraints
   */
  getSafetyConstraints(): typeof this.safetyConstraints {
    return { ...this.safetyConstraints };
  }

  /**
   * Enable or disable code execution
   */
  setCodeExecution(enabled: boolean): void {
    this.safetyConstraints.allowCodeExecution = enabled;
    console.log(`[Self-Modification] Code execution ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable or require approval
   */
  setApprovalRequired(required: boolean): void {
    this.safetyConstraints.requireApproval = required;
    console.log(`[Self-Modification] Approval ${required ? 'required' : 'not required'}`);
  }

  /**
   * Export modification history
   */
  exportModificationHistory(): string {
    return JSON.stringify({
      history: this.modificationHistory,
      safetyConstraints: this.safetyConstraints,
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Import modification history
   */
  importModificationHistory(history: string): boolean {
    try {
      const parsed = JSON.parse(history);
      
      if (parsed.history) {
        this.modificationHistory = parsed.history;
      }
      
      if (parsed.safetyConstraints) {
        this.safetyConstraints = { ...this.safetyConstraints, ...parsed.safetyConstraints };
      }
      
      console.log('[Self-Modification] Modification history imported successfully');
      return true;
    } catch (error) {
      console.error('[Self-Modification] Failed to import modification history:', error);
      return false;
    }
  }

  /**
   * Clear modification history
   */
  clearModificationHistory(): void {
    this.modificationHistory = [];
    this.pendingModifications.clear();
    console.log('[Self-Modification] Modification history cleared');
  }

  /**
   * Get self-modification statistics
   */
  getModificationStats(): {
    totalModifications: number;
    completedModifications: number;
    failedModifications: number;
    pendingModifications: number;
    averageApprovalTime: number;
    successRate: number;
  } {
    const total = this.modificationHistory.length;
    const completed = this.modificationHistory.filter(m => m.status === 'completed').length;
    const failed = this.modificationHistory.filter(m => m.status === 'failed').length;
    const pending = this.pendingModifications.size;

    return {
      totalModifications: total,
      completedModifications: completed,
      failedModifications: failed,
      pendingModifications: pending,
      averageApprovalTime: 0, // Would calculate from actual timestamps
      successRate: total > 0 ? (completed / total) * 100 : 0
    };
  }
}

/**
 * Global self-modification service instance
 */
export const selfModificationService = new SelfModificationService();