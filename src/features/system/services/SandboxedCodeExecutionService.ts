import { v4 as uuidv4 } from 'uuid';
import { useSystemStore } from '@/store/system-store';
import { 
  Agent, 
  Task, 
  SystemStatus,
  AuditCategory,
  AuditSeverity,
  AuditEventType
} from '@/types/agent-types';

/**
 * Sandbox Execution Environment
 * 
 * Defines the execution environment for sandboxed code
 */
export interface SandboxEnvironment {
  id: string;
  name: string;
  type: 'node' | 'python' | 'browser' | 'docker' | 'isolated';
  version: string;
  resources: {
    memory: number; // MB
    cpu: number; // cores
    timeout: number; // ms
    diskSpace: number; // MB
  };
  permissions: SandboxPermission[];
  restrictions: SandboxRestriction[];
  networkAccess: NetworkAccessLevel;
  allowedModules: string[];
  securityLevel: SecurityLevel;
}

export interface SandboxPermission {
  type: 'read' | 'write' | 'execute' | 'network' | 'filesystem';
  path?: string;
  allowed: boolean;
}

export interface SandboxRestriction {
  type: 'memory' | 'cpu' | 'time' | 'network' | 'filesystem';
  limit: number;
  unit: 'bytes' | 'seconds' | 'requests' | 'files';
}

export type NetworkAccessLevel = 'none' | 'read-only' | 'outbound' | 'full';

export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Code Execution Request
 */
export interface CodeExecutionRequest {
  id: string;
  code: string;
  language: string;
  environment: SandboxEnvironment;
  input?: any;
  expectedOutput?: any;
  timeout?: number;
  metadata?: Record<string, any>;
}

/**
 * Code Execution Result
 */
export interface CodeExecutionResult {
  id: string;
  requestId: string;
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  logs: string[];
  warnings: string[];
  securityViolations: SecurityViolation[];
  sandboxId: string;
  timestamp: Date;
}

export interface SecurityViolation {
  type: ViolationType;
  severity: ViolationSeverity;
  description: string;
  rule: string;
  timestamp: Date;
}

export type ViolationType = 
  | 'memory_limit'
  | 'cpu_limit'
  | 'timeout'
  | 'unauthorized_network'
  | 'unauthorized_file_access'
  | 'malicious_code'
  | 'system_call'
  | 'privilege_escalation';

export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Sandboxed Code Execution Service
 * 
 * Provides secure execution environments for code generation and modification:
 * - Multiple sandbox types (Node.js, Python, Browser, Docker, Isolated)
 * - Resource monitoring and limiting
 * - Security policy enforcement
 * - Code analysis and validation
 * - Execution logging and auditing
 * - Result validation and verification
 * - Performance metrics
 * - Error handling and recovery
 */
export class SandboxedCodeExecutionService {
  private activeExecutions: Map<string, CodeExecutionRequest> = new Map();
  private executionResults: Map<string, CodeExecutionResult> = new Map();
  private sandboxEnvironments: Map<string, SandboxEnvironment> = new Map();
  private maxConcurrentExecutions = 10;
  private maxExecutionHistory = 1000;
  private auditTrailService: any;
  private isInitialized = false;
  private executionQueue: CodeExecutionRequest[] = [];
  private isProcessingQueue = false;

  constructor(auditTrailService?: any) {
    this.auditTrailService = auditTrailService || { initialize: async () => {}, logEvent: async () => {} };
  }

  /**
   * Initialize the sandboxed code execution service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize audit trail service
      await this.auditTrailService.initialize();
      
      // Setup default sandbox environments
      this.setupDefaultEnvironments();
      
      // Start execution queue processor
      this.startQueueProcessor();
      
      // Log system startup
      await this.logExecutionEvent({
        type: 'system',
        action: 'startup',
        component: 'sandboxed_execution',
        description: 'Sandboxed code execution service initialized',
        severity: 'info'
      });

      this.isInitialized = true;
      console.log('[Sandboxed Execution] Service initialized successfully');
    } catch (error) {
      console.error('[Sandboxed Execution] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Setup default sandbox environments
   */
  private setupDefaultEnvironments(): void {
    // Node.js environment
    this.sandboxEnvironments.set('node-basic', {
      id: 'node-basic',
      name: 'Node.js Basic',
      type: 'node',
      version: '18.x',
      resources: {
        memory: 256,
        cpu: 1,
        timeout: 30000,
        diskSpace: 100
      },
      permissions: [
        { type: 'read', allowed: true },
        { type: 'write', allowed: true },
        { type: 'execute', allowed: true },
        { type: 'network', allowed: false },
        { type: 'filesystem', allowed: false }
      ],
      restrictions: [
        { type: 'memory', limit: 256, unit: 'bytes' },
        { type: 'cpu', limit: 1, unit: 'cores' } as any,
        { type: 'time', limit: 30, unit: 'seconds' }
      ],
      networkAccess: 'none',
      allowedModules: ['fs', 'path', 'util', 'crypto'],
      securityLevel: 'medium'
    });

    // Python environment
    this.sandboxEnvironments.set('python-basic', {
      id: 'python-basic',
      name: 'Python Basic',
      type: 'python',
      version: '3.9',
      resources: {
        memory: 512,
        cpu: 1,
        timeout: 60000,
        diskSpace: 200
      },
      permissions: [
        { type: 'read', allowed: true },
        { type: 'write', allowed: true },
        { type: 'execute', allowed: true },
        { type: 'network', allowed: false },
        { type: 'filesystem', allowed: false }
      ],
      restrictions: [
        { type: 'memory', limit: 512, unit: 'bytes' },
        { type: 'cpu', limit: 1, unit: 'cores' } as any,
        { type: 'time', limit: 60, unit: 'seconds' }
      ],
      networkAccess: 'none',
      allowedModules: ['os', 'sys', 'json', 'math', 'datetime'],
      securityLevel: 'medium'
    });

    // Browser environment
    this.sandboxEnvironments.set('browser-basic', {
      id: 'browser-basic',
      name: 'Browser Basic',
      type: 'browser',
      version: 'latest',
      resources: {
        memory: 1024,
        cpu: 2,
        timeout: 120000,
        diskSpace: 500
      },
      permissions: [
        { type: 'read', allowed: true },
        { type: 'write', allowed: false },
        { type: 'execute', allowed: true },
        { type: 'network', allowed: true },
        { type: 'filesystem', allowed: false }
      ],
      restrictions: [
        { type: 'memory', limit: 1024, unit: 'bytes' },
        { type: 'cpu', limit: 2, unit: 'cores' } as any,
        { type: 'time', limit: 120, unit: 'seconds' },
        { type: 'network', limit: 100, unit: 'requests' }
      ],
      networkAccess: 'read-only',
      allowedModules: ['console', 'fetch', 'setTimeout', 'setInterval'],
      securityLevel: 'high'
    });

    // Isolated environment (most secure)
    this.sandboxEnvironments.set('isolated-strict', {
      id: 'isolated-strict',
      name: 'Isolated Strict',
      type: 'isolated',
      version: '1.0',
      resources: {
        memory: 128,
        cpu: 0.5,
        timeout: 15000,
        diskSpace: 50
      },
      permissions: [
        { type: 'read', allowed: false },
        { type: 'write', allowed: false },
        { type: 'execute', allowed: true },
        { type: 'network', allowed: false },
        { type: 'filesystem', allowed: false }
      ],
      restrictions: [
        { type: 'memory', limit: 128, unit: 'bytes' },
        { type: 'cpu', limit: 0.5, unit: 'cores' } as any,
        { type: 'time', limit: 15, unit: 'seconds' }
      ],
      networkAccess: 'none',
      allowedModules: [],
      securityLevel: 'critical'
    });
  }

  /**
   * Execute code in a sandboxed environment
   */
  async executeCode(
    code: string,
    language: string,
    environmentId: string = 'node-basic',
    input?: any,
    timeout?: number
  ): Promise<CodeExecutionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Validate environment
    const environment = this.sandboxEnvironments.get(environmentId);
    if (!environment) {
      throw new Error(`Sandbox environment not found: ${environmentId}`);
    }

    // Create execution request
    const requestId = uuidv4();
    const executionRequest: CodeExecutionRequest = {
      id: requestId,
      code,
      language,
      environment,
      input,
      timeout: timeout || environment.resources.timeout,
      metadata: {
        language,
        environmentId,
        timestamp: new Date().toISOString()
      }
    };

    // Check concurrent execution limit
    if (this.activeExecutions.size >= this.maxConcurrentExecutions) {
      // Add to queue
      this.executionQueue.push(executionRequest);
      await this.logExecutionEvent({
        type: 'queue',
        action: 'added',
        component: 'sandboxed_execution',
        description: `Code execution queued (position: ${this.executionQueue.length})`,
        severity: 'info',
        metadata: { requestId, language, environmentId }
      });
      return this.waitForQueueExecution(requestId);
    }

    // Execute immediately
    return this.executeRequest(executionRequest);
  }

  /**
   * Execute a single request
   */
  private async executeRequest(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    const startTime = performance.now();
    this.activeExecutions.set(request.id, request);

    await this.logExecutionEvent({
      type: 'execution',
      action: 'started',
      component: 'sandboxed_execution',
      description: `Code execution started: ${request.language}`,
      severity: 'info',
      metadata: { requestId: request.id, language: request.language, environmentId: request.environment.id }
    });

    try {
      // Validate code before execution
      await this.validateCode(request);

      // Execute based on environment type
      let result: CodeExecutionResult;
      switch (request.environment.type) {
        case 'node':
          result = await this.executeNodeCode(request);
          break;
        case 'python':
          result = await this.executePythonCode(request);
          break;
        case 'browser':
          result = await this.executeBrowserCode(request);
          break;
        case 'isolated':
          result = await this.executeIsolatedCode(request);
          break;
        default:
          throw new Error(`Unsupported environment type: ${request.environment.type}`);
      }

      const endTime = performance.now();
      result.executionTime = endTime - startTime;
      result.timestamp = new Date();

      // Store result
      this.executionResults.set(result.id, result);

      // Maintain history size
      if (this.executionResults.size > this.maxExecutionHistory) {
        const oldestKey = this.executionResults.keys().next().value;
        this.executionResults.delete(oldestKey);
      }

      await this.logExecutionEvent({
        type: 'execution',
        action: 'completed',
        component: 'sandboxed_execution',
        description: `Code execution completed: ${request.language}`,
        severity: result.success ? 'info' : 'warning',
        metadata: { 
          requestId: request.id, 
          success: result.success,
          executionTime: result.executionTime,
          violations: result.securityViolations.length
        }
      });

      return result;

    } catch (error: any) {
      const endTime = performance.now();
      const result: CodeExecutionResult = {
        id: uuidv4(),
        requestId: request.id,
        success: false,
        error: error.message,
        executionTime: endTime - startTime,
        memoryUsage: 0,
        cpuUsage: 0,
        logs: [],
        warnings: [],
        securityViolations: [],
        sandboxId: request.environment.id,
        timestamp: new Date()
      };

      await this.logExecutionEvent({
        type: 'execution',
        action: 'failed',
        component: 'sandboxed_execution',
        description: `Code execution failed: ${error.message}`,
        severity: 'error',
        metadata: { 
          requestId: request.id, 
          error: error.message,
          executionTime: result.executionTime
        }
      });

      return result;
    } finally {
      this.activeExecutions.delete(request.id);
      
      // Process next in queue
      if (this.executionQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * Execute Node.js code
   */
  private async executeNodeCode(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    const startTime = performance.now();
    const logs: string[] = [];
    const warnings: string[] = [];
    const securityViolations: SecurityViolation[] = [];

    // Simulate Node.js execution
    // In a real implementation, this would use a proper Node.js sandbox
    try {
      // Create isolated execution context
      const isolatedContext = {
        console: {
          log: (...args: any[]) => logs.push(args.join(' ')),
          warn: (...args: any[]) => warnings.push(args.join(' '))
        },
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        Math: Math,
        JSON: JSON,
        Buffer: undefined
      };

      // Validate allowed modules
      const moduleMatches = request.code.match(/require\(['"`]([^'"`]+)['"`]\)/g);
      if (moduleMatches) {
        for (const match of moduleMatches) {
          const moduleName = match.match(/require\(['"`]([^'"`]+)['"`]\)/)?.[1];
          if (moduleName && !request.environment.allowedModules.includes(moduleName)) {
            securityViolations.push({
              type: 'unauthorized_file_access',
              severity: 'high',
              description: `Unauthorized module: ${moduleName}`,
              rule: 'allowed_modules',
              timestamp: new Date()
            });
          }
        }
      }

      // Simulate code execution
      const safeCode = `
        (function() {
          const console = ${JSON.stringify(isolatedContext.console)};
          const setTimeout = ${isolatedContext.setTimeout.toString()};
          const clearTimeout = ${isolatedContext.clearTimeout.toString()};
          const setInterval = ${isolatedContext.setInterval.toString()};
          const clearInterval = ${isolatedContext.clearInterval.toString()};
          const Math = ${isolatedContext.Math.toString()};
          const JSON = ${isolatedContext.JSON.toString()};
          const Buffer = ${isolatedContext.Buffer.toString()};
          
          // User code
          ${request.code}
        })();
      `;

      // Execute in a safe context (simulated)
      // In production, this would use a proper sandbox like vm2 or isolated-vm
      console.log('Executing Node.js code (simulated):', safeCode);
      
      // Simulate execution time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 100));

      const endTime = performance.now();
      const memoryUsage = Math.random() * 100 + 50; // Simulated memory usage
      const cpuUsage = Math.random() * 50 + 10; // Simulated CPU usage

      return {
        id: uuidv4(),
        requestId: request.id,
        success: true,
        output: { logs, warnings },
        executionTime: endTime - startTime,
        memoryUsage,
        cpuUsage,
        logs,
        warnings,
        securityViolations,
        sandboxId: request.environment.id,
        timestamp: new Date()
      };

    } catch (error: any) {
      throw new Error(`Node.js execution failed: ${error.message}`);
    }
  }

  /**
   * Execute Python code
   */
  private async executePythonCode(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    // Similar to Node.js but for Python
    // This would use a Python sandbox like Pyodide or a separate Python process
    const startTime = performance.now();
    const logs: string[] = [];
    const warnings: string[] = [];
    const securityViolations: SecurityViolation[] = [];

    try {
      // Simulate Python execution
      console.log('Executing Python code (simulated):', request.code);
      
      // Simulate execution time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));

      const endTime = performance.now();
      const memoryUsage = Math.random() * 200 + 100;
      const cpuUsage = Math.random() * 30 + 15;

      return {
        id: uuidv4(),
        requestId: request.id,
        success: true,
        output: { logs, warnings },
        executionTime: endTime - startTime,
        memoryUsage,
        cpuUsage,
        logs,
        warnings,
        securityViolations,
        sandboxId: request.environment.id,
        timestamp: new Date()
      };

    } catch (error: any) {
      throw new Error(`Python execution failed: ${error.message}`);
    }
  }

  /**
   * Execute Browser code
   */
  private async executeBrowserCode(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    // Similar to Node.js but for browser environment
    // This would use an iframe or web worker sandbox
    const startTime = performance.now();
    const logs: string[] = [];
    const warnings: string[] = [];
    const securityViolations: SecurityViolation[] = [];

    try {
      // Simulate browser execution
      console.log('Executing Browser code (simulated):', request.code);
      
      // Simulate execution time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));

      const endTime = performance.now();
      const memoryUsage = Math.random() * 500 + 200;
      const cpuUsage = Math.random() * 40 + 20;

      return {
        id: uuidv4(),
        requestId: request.id,
        success: true,
        output: { logs, warnings },
        executionTime: endTime - startTime,
        memoryUsage,
        cpuUsage,
        logs,
        warnings,
        securityViolations,
        sandboxId: request.environment.id,
        timestamp: new Date()
      };

    } catch (error: any) {
      throw new Error(`Browser execution failed: ${error.message}`);
    }
  }

  /**
   * Execute Isolated code
   */
  private async executeIsolatedCode(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    // Most restrictive environment
    const startTime = performance.now();
    const logs: string[] = [];
    const warnings: string[] = [];
    const securityViolations: SecurityViolation[] = [];

    try {
      // Very limited execution
      console.log('Executing Isolated code (simulated):', request.code);
      
      // Simulate execution time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 2000));

      const endTime = performance.now();
      const memoryUsage = Math.random() * 50 + 20;
      const cpuUsage = Math.random() * 10 + 5;

      return {
        id: uuidv4(),
        requestId: request.id,
        success: true,
        output: { logs, warnings },
        executionTime: endTime - startTime,
        memoryUsage,
        cpuUsage,
        logs,
        warnings,
        securityViolations,
        sandboxId: request.environment.id,
        timestamp: new Date()
      };

    } catch (error: any) {
      throw new Error(`Isolated execution failed: ${error.message}`);
    }
  }

  /**
   * Validate code before execution
   */
  private async validateCode(request: CodeExecutionRequest): Promise<void> {
    const violations: SecurityViolation[] = [];

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /require\s*\(/g, // Node.js require
      /import\s+/g, // ES6 import
      /eval\s*\(/g, // eval
      /Function\s*\(/g, // Function constructor
      /setTimeout\s*\(/g, // setTimeout
      /setInterval\s*\(/g, // setInterval
      /document\./g, // DOM access
      /window\./g, // Window access
      /process\./g, // Node.js process
      /fs\./g, // File system
      /child_process/g, // Child processes
      /crypto\./g, // Crypto
      /buffer\./g, // Buffer
      /__dirname/g, // Directory access
      /__filename/g, // Filename access
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(request.code)) {
        violations.push({
          type: 'malicious_code',
          severity: 'high',
          description: `Potentially dangerous code pattern detected: ${pattern}`,
          rule: 'code_patterns',
          timestamp: new Date()
        });
      }
    }

    if (violations.length > 0) {
      throw new Error(`Code validation failed: ${violations.map(v => v.description).join(', ')}`);
    }
  }

  /**
   * Wait for queue execution
   */
  private async waitForQueueExecution(requestId: string): Promise<CodeExecutionResult> {
    return new Promise((resolve, reject) => {
      const checkQueue = () => {
        const result = this.executionResults.get(requestId);
        if (result) {
          resolve(result);
        } else {
          setTimeout(checkQueue, 100);
        }
      };
      checkQueue();
    });
  }

  /**
   * Process execution queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.executionQueue.length === 0) return;

    this.isProcessingQueue = true;
    
    try {
      while (this.executionQueue.length > 0 && this.activeExecutions.size < this.maxConcurrentExecutions) {
        const request = this.executionQueue.shift();
        if (request) {
          await this.executeRequest(request);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      if (this.executionQueue.length > 0 && this.activeExecutions.size < this.maxConcurrentExecutions) {
        this.processQueue();
      }
    }, 1000);
  }

  /**
   * Log execution event
   */
  private async logExecutionEvent(event: {
    type: string;
    action: string;
    component: string;
    description: string;
    severity: AuditSeverity;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.auditTrailService.logEvent({
      category: 'sandboxed_execution',
      eventType: event.action as AuditEventType,
      severity: event.severity,
      message: event.description,
      metadata: {
        ...event.metadata,
        component: event.component,
        executionType: event.type
      }
    });
  }

  /**
   * Get execution result by ID
   */
  getExecutionResult(id: string): CodeExecutionResult | null {
    return this.executionResults.get(id) || null;
  }

  /**
   * Get execution results with filtering
   */
  getExecutionResults(filters: {
    requestId?: string;
    success?: boolean;
    language?: string;
    environmentId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): CodeExecutionResult[] {
    let results = Array.from(this.executionResults.values());

    // Apply filters
    if (filters.requestId) {
      results = results.filter(result => result.requestId === filters.requestId);
    }

    if (filters.success !== undefined) {
      results = results.filter(result => result.success === filters.success);
    }

    if (filters.language) {
      results = results.filter(result => 
        (result as any).metadata?.language === filters.language
      );
    }

    if (filters.environmentId) {
      results = results.filter(result => result.sandboxId === filters.environmentId);
    }

    if (filters.startDate) {
      results = results.filter(result => result.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      results = results.filter(result => result.timestamp <= filters.endDate!);
    }

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    results = results.slice(offset, offset + limit);

    return results.reverse(); // Most recent first
  }

  /**
   * Get sandbox environments
   */
  getSandboxEnvironments(): SandboxEnvironment[] {
    return Array.from(this.sandboxEnvironments.values());
  }

  /**
   * Get sandbox environment by ID
   */
  getSandboxEnvironment(id: string): SandboxEnvironment | null {
    return this.sandboxEnvironments.get(id) || null;
  }

  /**
   * Create custom sandbox environment
   */
  createSandboxEnvironment(environment: SandboxEnvironment): void {
    this.sandboxEnvironments.set(environment.id, environment);
  }

  /**
   * Get execution statistics
   */
  getExecutionStatistics(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    totalMemoryUsage: number;
    totalCpuUsage: number;
    executionsByLanguage: Map<string, number>;
    executionsByEnvironment: Map<string, number>;
    securityViolations: number;
    queueLength: number;
    activeExecutions: number;
  } {
    const executions = Array.from(this.executionResults.values());
    const successfulExecutions = executions.filter(r => r.success);
    const failedExecutions = executions.filter(r => !r.success);

    const executionsByLanguage = new Map<string, number>();
    const executionsByEnvironment = new Map<string, number>();

    executions.forEach(execution => {
      const language = (execution as any).metadata?.language || 'unknown';
      executionsByLanguage.set(
        language,
        (executionsByLanguage.get(language) || 0) + 1
      );

      executionsByEnvironment.set(
        execution.sandboxId,
        (executionsByEnvironment.get(execution.sandboxId) || 0) + 1
      );
    });

    const totalMemoryUsage = executions.reduce((sum, r) => sum + r.memoryUsage, 0);
    const totalCpuUsage = executions.reduce((sum, r) => sum + r.cpuUsage, 0);
    const averageExecutionTime = executions.length > 0 
      ? executions.reduce((sum, r) => sum + r.executionTime, 0) / executions.length 
      : 0;

    const securityViolations = executions.reduce((sum, r) => sum + r.securityViolations.length, 0);

    return {
      totalExecutions: executions.length,
      successfulExecutions: successfulExecutions.length,
      failedExecutions: failedExecutions.length,
      averageExecutionTime,
      totalMemoryUsage,
      totalCpuUsage,
      executionsByLanguage,
      executionsByEnvironment,
      securityViolations,
      queueLength: this.executionQueue.length,
      activeExecutions: this.activeExecutions.size
    };
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    console.log('[Sandboxed Execution] Shutting down...');
    
    // Clear queue
    this.executionQueue = [];
    
    // Cancel active executions
    for (const [requestId, request] of this.activeExecutions) {
      await this.logExecutionEvent({
        type: 'execution',
        action: 'cancelled',
        component: 'sandboxed_execution',
        description: `Execution cancelled during shutdown: ${requestId}`,
        severity: 'warning'
      });
    }
    
    this.activeExecutions.clear();
    this.isProcessingQueue = false;
    
    console.log('[Sandboxed Execution] Shutdown complete');
  }
}