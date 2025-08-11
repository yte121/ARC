import { v4 as uuidv4 } from 'uuid';
import { 
  Agent, 
  AgentSpecialization,
  ReasoningTier,
  ModelProvider
} from '@/types/agent-types';

/**
 * Agent Factory Service
 * 
 * Responsible for creating and configuring specialized agents.
 * Uses factory pattern to generate different types of agents.
 */
export class AgentFactory {
  /**
   * Creates a specialized agent based on the provided configuration
   */
  createAgent(config: AgentFactoryConfig): Agent {
    // Create the base agent structure
    const baseAgent: Agent = {
      id: uuidv4(),
      name: config.name,
      specialization: config.specialization,
      status: 'initializing',
      tier: config.tier || this.getDefaultTierForSpecialization(config.specialization),
      description: config.description || this.getDefaultDescriptionForSpecialization(config.specialization),
      createdAt: new Date(),
      lastActive: new Date(),
      capabilities: config.capabilities || this.getDefaultCapabilitiesForSpecialization(config.specialization),
      performance: {
        successRate: 100,
        responseTime: 0,
        resourceUsage: {
          cpu: 0,
          memory: 0,
          tokens: 0
        },
        completedTasks: 0,
        failedTasks: 0
      }
    };
    
    // Add specialized properties based on the agent type
    switch (config.specialization) {
      case 'codeGenerator':
        return {
          ...baseAgent,
          // Add code generator specific properties
          config: {
            modelProvider: 'openai' as ModelProvider,
            modelName: 'gpt-4',
            temperature: 0.3,
            maxTokens: 2000,
            timeout: 60000,
            retryAttempts: 3,
            batchSize: 1,
            concurrency: 1
          },
          memory: {
            shortTerm: [],
            longTerm: [],
            workingSet: [],
            capacity: 1000,
            retentionPolicy: 'lru' as const
          },
          security: {
            encryptionEnabled: true,
            signatureRequired: true,
            accessControl: [
              {
                resource: 'code_generation',
                action: 'generate',
                allowedAgents: ['orchestrator', 'analyst'],
                conditions: { requiresApproval: true }
              }
            ],
            auditLog: [],
            permissions: [
              {
                resource: 'code_repository',
                actions: ['read', 'write'],
                conditions: { sandboxed: true }
              }
            ]
          }
        };
        
      case 'systemMonitor':
        return {
          ...baseAgent,
          // Add system monitor specific properties
          config: {
            modelProvider: 'local' as ModelProvider,
            modelName: 'llama-2-7b',
            temperature: 0.1,
            maxTokens: 500,
            timeout: 30000,
            retryAttempts: 2,
            batchSize: 10,
            concurrency: 5
          },
          memory: {
            shortTerm: [],
            longTerm: [],
            workingSet: [],
            capacity: 5000,
            retentionPolicy: 'priority' as const
          },
          security: {
            encryptionEnabled: true,
            signatureRequired: false,
            accessControl: [
              {
                resource: 'system_metrics',
                action: 'read',
                allowedAgents: ['*'],
                conditions: { realTime: true }
              }
            ],
            auditLog: [],
            permissions: [
              {
                resource: 'system_health',
                actions: ['read', 'alert'],
                conditions: { monitoring: true }
              }
            ]
          }
        };
        
      case 'communicationCoordinator':
        return {
          ...baseAgent,
          // Add communication coordinator specific properties
          config: {
            modelProvider: 'anthropic' as ModelProvider,
            modelName: 'claude-3-haiku-20240307',
            temperature: 0.5,
            maxTokens: 1000,
            timeout: 45000,
            retryAttempts: 3,
            batchSize: 5,
            concurrency: 3
          },
          memory: {
            shortTerm: [],
            longTerm: [],
            workingSet: [],
            capacity: 2000,
            retentionPolicy: 'fifo' as const
          },
          security: {
            encryptionEnabled: true,
            signatureRequired: true,
            accessControl: [
              {
                resource: 'message_routing',
                action: 'route',
                allowedAgents: ['*'],
                conditions: { authenticated: true }
              }
            ],
            auditLog: [],
            permissions: [
              {
                resource: 'communication_protocols',
                actions: ['read', 'write', 'route'],
                conditions: { encrypted: true }
              }
            ]
          }
        };
        
      case 'analyst':
        return {
          ...baseAgent,
          // Add analyst specific properties
          config: {
            modelProvider: 'openai' as ModelProvider,
            modelName: 'gpt-4',
            temperature: 0.7,
            maxTokens: 3000,
            timeout: 90000,
            retryAttempts: 2,
            batchSize: 1,
            concurrency: 2
          },
          memory: {
            shortTerm: [],
            longTerm: [],
            workingSet: [],
            capacity: 3000,
            retentionPolicy: 'priority' as const
          },
          security: {
            encryptionEnabled: true,
            signatureRequired: true,
            accessControl: [
              {
                resource: 'analysis_tools',
                action: 'analyze',
                allowedAgents: ['orchestrator', 'codeGenerator'],
                conditions: { requiresContext: true }
              }
            ],
            auditLog: [],
            permissions: [
              {
                resource: 'data_analysis',
                actions: ['read', 'analyze', 'report'],
                conditions: { dataRetention: true }
              }
            ]
          }
        };
        
      case 'uiManager':
        return {
          ...baseAgent,
          // Add UI manager specific properties
          config: {
            modelProvider: 'openai' as ModelProvider,
            modelName: 'gpt-3.5-turbo',
            temperature: 0.4,
            maxTokens: 1500,
            timeout: 30000,
            retryAttempts: 2,
            batchSize: 1,
            concurrency: 1
          },
          memory: {
            shortTerm: [],
            longTerm: [],
            workingSet: [],
            capacity: 1000,
            retentionPolicy: 'lru' as const
          },
          security: {
            encryptionEnabled: true,
            signatureRequired: false,
            accessControl: [
              {
                resource: 'user_interface',
                action: 'update',
                allowedAgents: ['orchestrator', 'analyst'],
                conditions: { userApproved: true }
              }
            ],
            auditLog: [],
            permissions: [
              {
                resource: 'ui_components',
                actions: ['read', 'update', 'render'],
                conditions: { responsive: true }
              }
            ]
          }
        };
        
      case 'security':
        return {
          ...baseAgent,
          // Add security specific properties
          config: {
            modelProvider: 'anthropic' as ModelProvider,
            modelName: 'claude-3-sonnet-20240229',
            temperature: 0.2,
            maxTokens: 1000,
            timeout: 60000,
            retryAttempts: 1,
            batchSize: 1,
            concurrency: 1
          },
          memory: {
            shortTerm: [],
            longTerm: [],
            workingSet: [],
            capacity: 5000,
            retentionPolicy: 'priority' as const
          },
          security: {
            encryptionEnabled: true,
            signatureRequired: true,
            accessControl: [
              {
                resource: 'security_operations',
                action: 'validate',
                allowedAgents: ['orchestrator'],
                conditions: { requiresAuthentication: true }
              }
            ],
            auditLog: [],
            permissions: [
              {
                resource: 'security_policies',
                actions: ['read', 'enforce', 'audit'],
                conditions: { compliance: true }
              }
            ]
          }
        };
        
      case 'orchestrator':
      default:
        return {
          ...baseAgent,
          // Add orchestrator specific properties
          config: {
            modelProvider: 'openai' as ModelProvider,
            modelName: 'gpt-4',
            temperature: 0.6,
            maxTokens: 2000,
            timeout: 120000,
            retryAttempts: 3,
            batchSize: 1,
            concurrency: 1
          },
          memory: {
            shortTerm: [],
            longTerm: [],
            workingSet: [],
            capacity: 10000,
            retentionPolicy: 'priority' as const
          },
          security: {
            encryptionEnabled: true,
            signatureRequired: true,
            accessControl: [
              {
                resource: 'system_orchestration',
                action: 'coordinate',
                allowedAgents: ['*'],
                conditions: { authorized: true }
              }
            ],
            auditLog: [],
            permissions: [
              {
                resource: 'system_management',
                actions: ['read', 'write', 'execute', 'coordinate'],
                conditions: { elevated: true }
              }
            ]
          }
        };
    }
  }
  
  /**
   * Get the default reasoning tier for a specialization
   */
  private getDefaultTierForSpecialization(specialization: AgentSpecialization): ReasoningTier {
    switch (specialization) {
      case 'orchestrator':
        return 'strategic';
      case 'analyst':
      case 'communicationCoordinator':
        return 'tactical';
      case 'codeGenerator':
      case 'systemMonitor':
      case 'uiManager':
      case 'security':
        return 'execution';
      default:
        return 'tactical';
    }
  }
  
  /**
   * Get the default description for a specialization
   */
  private getDefaultDescriptionForSpecialization(specialization: AgentSpecialization): string {
    switch (specialization) {
      case 'orchestrator':
        return 'Coordinates all system activities and manages agent lifecycle';
      case 'codeGenerator':
        return 'Generates and modifies code based on requirements';
      case 'systemMonitor':
        return 'Monitors system resources and ensures constraints are respected';
      case 'communicationCoordinator':
        return 'Manages communication protocols between agents';
      case 'analyst':
        return 'Analyzes problems and develops solution strategies';
      case 'uiManager':
        return 'Manages the user interface and handles user interactions';
      case 'security':
        return 'Ensures system security and validates code modifications';
      default:
        return 'Specialized agent with custom capabilities';
    }
  }
  
  /**
   * Get the default capabilities for a specialization
   */
  private getDefaultCapabilitiesForSpecialization(specialization: AgentSpecialization): string[] {
    switch (specialization) {
      case 'orchestrator':
        return [
          'System coordination',
          'Agent lifecycle management',
          'Task delegation',
          'Resource allocation'
        ];
      case 'codeGenerator':
        return [
          'Code generation',
          'Code modification',
          'Code review',
          'Testing'
        ];
      case 'systemMonitor':
        return [
          'Resource monitoring',
          'Performance tracking',
          'Constraint management',
          'Usage reporting'
        ];
      case 'communicationCoordinator':
        return [
          'Message routing',
          'Protocol management',
          'Communication optimization',
          'Channel security'
        ];
      case 'analyst':
        return [
          'Problem decomposition',
          'Solution synthesis',
          'Pattern recognition',
          'Strategic planning'
        ];
      case 'uiManager':
        return [
          'Interface rendering',
          'User interaction handling',
          'Display optimization',
          'Visual feedback'
        ];
      case 'security':
        return [
          'Code validation',
          'Security analysis',
          'Vulnerability detection',
          'Access control'
        ];
      default:
        return ['Specialized processing'];
    }
  }
}

/**
 * Configuration for creating a new agent
 */
interface AgentFactoryConfig {
  name: string;
  specialization: AgentSpecialization;
  tier?: ReasoningTier;
  description?: string;
  capabilities?: string[];
}