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
  | 'security';

// Reasoning level
export type ReasoningTier = 
  | 'strategic' 
  | 'tactical' 
  | 'execution';

// AI model types
export type ModelProvider = 
  | 'local' 
  | 'openrouter';

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
  | 'status';

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