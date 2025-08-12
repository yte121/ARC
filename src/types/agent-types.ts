/**
 * Core agent types for the multi-agent AI system
 */

// Agent states
export type AgentStatus = 
  | 'idle' 
  | 'initializing'
  | 'processing'
  | 'waiting'
  | 'completed'
  | 'failed';

// Agent specializations
export type AgentSpecialization =
  | 'orchestrator'
  | 'codeGenerator'
  | 'systemMonitor'
  | 'communicationCoordinator'
  | 'analyst'
  | 'uiManager'
  | 'security'
  | 'reasoningEngine'
  | 'resourceOptimizer'
  | 'knowledgeManager'
  | 'taskScheduler'
  | 'errorRecovery'
  | 'predictiveAnalyzer';

// Reasoning level
export type ReasoningTier = 
  | 'strategic' 
  | 'tactical' 
  | 'execution';

// AI model types
export type ModelProvider =
  | 'local'
  | 'openrouter'
  | 'openai'
  | 'anthropic';

// Base agent interface
export interface Agent {
  id: string;
  name: string;
  specialization: AgentSpecialization;
  status: AgentStatus;
  tier: ReasoningTier;
  description: string;
  createdAt: Date;
  lastActive: Date;
  capabilities: string[];
  performance: AgentPerformance;
  config?: AgentConfig;
  memory?: AgentMemory;
  security?: AgentSecurity;
  specializationDetails?: AgentSpecializationDetails;
  reasoning?: AgentReasoning;
  adaptability?: AgentAdaptability;
  type?: string; // For backward compatibility
}

// Agent configuration
export interface AgentConfig {
  modelProvider: ModelProvider;
  modelName: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  retryAttempts: number;
  batchSize: number;
  concurrency: number;
  tools?: string[];
}

// Agent memory configuration
export interface AgentMemory {
  shortTerm: any[];
  longTerm: any[];
  workingSet: any[];
  capacity: number;
  retentionPolicy: 'lru' | 'fifo' | 'priority' | 'adaptive';
  compression?: boolean;
  indexing?: boolean;
  semanticIndexing?: boolean;
  versioning?: boolean;
}

// Agent security configuration
export interface AgentSecurity {
  encryptionEnabled: boolean;
  signatureRequired: boolean;
  accessControl: AccessControlRule[];
  auditLog: any[];
  permissions: Permission[];
}

// Access control rules
export interface AccessControlRule {
  resource: string;
  action: string;
  allowedAgents: string[];
  conditions: Record<string, any>;
}

// Permissions
export interface Permission {
  resource: string;
  actions: string[];
  conditions: Record<string, any>;
}

// Agent specialization details
export interface AgentSpecializationDetails {
  domain: string;
  expertise: string[];
  tools: string[];
}

// Agent reasoning capabilities
export interface AgentReasoning {
  patterns: string[];
  strategies: string[];
  contextWindow: number;
}

// Agent adaptability
export interface AgentAdaptability {
  learningRate: number;
  adaptationThreshold: number;
  experienceBuffer: number;
}

// Enhanced agent performance metrics
export interface AgentPerformance {
  successRate: number;
  responseTime: number;
  resourceUsage: ResourceUsage;
  completedTasks: number;
  failedTasks: number;
  averageLatency?: number;
  throughput?: number;
}

// Agent performance metrics
export interface AgentPerformance {
  successRate: number;
  responseTime: number;
  resourceUsage: ResourceUsage;
  completedTasks: number;
  failedTasks: number;
}

// Resource usage metrics
export interface ResourceUsage {
  cpu: number;
  memory: number;
  tokens: number;
  network?: number;
}

// Message structure for inter-agent communication
export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string | null; // null for broadcast
  content: string | object;
  type: MessageType;
  priority: MessagePriority;
  timestamp: Date;
  requiresResponse: boolean;
  responseToMessageId?: string;
  metadata?: Record<string, any>;
}

export type MessageType =
  | 'command'
  | 'query'
  | 'response'
  | 'notification'
  | 'error'
  | 'data'
  | 'status'
  | 'audit';

export type MessagePriority = 
  | 'critical'
  | 'high'
  | 'normal'
  | 'low';

// Task representation
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentIds: string[];
  parentTaskId?: string;
  subtaskIds: string[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  deadline?: Date;
  progress: number;
  result?: any;
  name?: string; // For backward compatibility
}

export type TaskStatus = 
  | 'pending'
  | 'assigned'
  | 'inProgress'
  | 'blocked'
  | 'completed'
  | 'failed';

export type TaskPriority = 
  | 'critical'
  | 'high'
  | 'normal'
  | 'low';

// System constraints
export interface SystemConstraints {
  maxAgents: number;
  maxMemoryUsage: number;
  maxCpuUsage: number;
  maxTokensPerMinute: number;
  timeout: number;
}

// Model configuration
export interface ModelConfig {
  provider: ModelProvider;
  modelName: string;
  temperature: number;
  maxTokens: number;
  apiKey?: string;
  costPerToken: number;
}

// System state
export interface SystemState {
  agents: Agent[];
  tasks: Task[];
  messages: AgentMessage[];
  activeModelConfig: ModelConfig;
  constraints: SystemConstraints;
  systemStatus: SystemStatus;
  resourceUsage: SystemResourceUsage;
}

export type SystemStatus = 
  | 'starting'
  | 'operational'
  | 'degraded'
  | 'maintenance'
  | 'shutdown';

export interface SystemResourceUsage {
  cpuUtilization: number;
  memoryUtilization: number;
  tokensUsedLastMinute: number;
  activeAgentCount: number;
  pendingTaskCount: number;
}

// Audit trail types
export type AuditEventType =
  | 'created'
  | 'modified'
  | 'deleted'
  | 'started'
  | 'stopped'
  | 'startup'
  | 'error'
  | 'warning'
  | 'info'
  | 'api_call'
  | 'api_error'
  | 'interaction'
  | 'security_event'
  | 'system_error'
  | 'metrics'
  | 'configuration_change'
  | 'task_execution'
  | 'communication';

export type AuditSeverity =
  | 'critical'
  | 'error'
  | 'warning'
  | 'info'
  | 'debug';

export type AuditCategory =
  | 'agent'
  | 'task'
  | 'system'
  | 'configuration'
  | 'model'
  | 'user'
  | 'security'
  | 'performance'
  | 'communication'
  | 'error';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  sequenceNumber: number;
  category: AuditCategory;
  eventType: AuditEventType;
  severity: AuditSeverity;
  message: string;
  metadata?: Record<string, any>;
}

export interface AuditTrailConfig {
  enableConsoleLogging: boolean;
  enableFileLogging: boolean;
  enableRealTimeReporting: boolean;
  maxEvents: number;
  sensitiveDataMasking: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  retentionPeriod: number; // milliseconds
}