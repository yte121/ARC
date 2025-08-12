import { v4 as uuidv4 } from 'uuid';
import {
  Agent,
  AgentSpecialization,
  ReasoningTier,
  ModelProvider,
  SystemConstraints,
  AgentAdaptability,
  AgentSecurity,
  AgentMemory,
  AgentPerformance,
  AgentConfig,
  AgentReasoning,
  AgentSpecializationDetails
} from '@/types/agent-types';
import { useSystemStore } from '@/store/system-store';
import { OpenRouterServiceWithKeyRotation } from '@/features/models/services/OpenRouterKeyManager';

/**
 * Enhanced Agent Factory Service
 * 
 * Creates sophisticated, context-aware agents with dynamic capabilities.
 * Supports advanced specializations, adaptive configurations, and intelligent resource allocation.
 */
export class EnhancedAgentFactory {
  private systemConstraints: SystemConstraints;
  private openRouterService: OpenRouterServiceWithKeyRotation;

  constructor() {
    const store = useSystemStore.getState();
    this.systemConstraints = store.constraints;
    this.openRouterService = new OpenRouterServiceWithKeyRotation();
  }

  /**
   * Creates a specialized agent with enhanced capabilities
   */
  createAgent(config: EnhancedAgentFactoryConfig): Agent {
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
      performance: this.initializePerformanceMetrics(),
      reasoning: {
        patterns: config.reasoningPatterns || this.getDefaultReasoningPatterns(config.specialization),
        strategies: config.reasoningStrategies || this.getDefaultReasoningStrategies(config.specialization),
        contextWindow: config.contextWindow || this.getDefaultContextWindow(config.specialization)
      } as AgentReasoning,
      adaptability: {
        learningRate: config.learningRate || 0.1,
        adaptationThreshold: config.adaptationThreshold || 0.8,
        experienceBuffer: config.experienceBuffer || 1000
      } as AgentAdaptability
    };
    
    // Add specialized properties based on the agent type
    switch (config.specialization) {
      case 'codeGenerator':
        return this.createCodeGeneratorAgent(baseAgent, config);
        
      case 'systemMonitor':
        return this.createSystemMonitorAgent(baseAgent, config);
        
      case 'communicationCoordinator':
        return this.createCommunicationCoordinatorAgent(baseAgent, config);
        
      case 'analyst':
        return this.createAnalystAgent(baseAgent, config);
        
      case 'uiManager':
        return this.createUIManagerAgent(baseAgent, config);
        
      case 'security':
        return this.createSecurityAgent(baseAgent, config);
        
      case 'orchestrator':
        return this.createOrchestratorAgent(baseAgent, config);

      // Enhanced specializations
      case 'reasoningEngine':
        return this.createReasoningEngineAgent(baseAgent, config);
        
      case 'resourceOptimizer':
        return this.createResourceOptimizerAgent(baseAgent, config);
        
      case 'knowledgeManager':
        return this.createKnowledgeManagerAgent(baseAgent, config);
        
      case 'taskScheduler':
        return this.createTaskSchedulerAgent(baseAgent, config);
        
      case 'errorRecovery':
        return this.createErrorRecoveryAgent(baseAgent, config);
        
      case 'predictiveAnalyzer':
        return this.createPredictiveAnalyzerAgent(baseAgent, config);
        
      default:
        return this.createOrchestratorAgent(baseAgent, config);
    }
  }

  /**
   * Creates a Code Generator Agent with enhanced capabilities
   */
  private createCodeGeneratorAgent(baseAgent: Agent, config: EnhancedAgentFactoryConfig): Agent {
    return {
      ...baseAgent,
      config: {
        modelProvider: this.selectOptimalModelProvider('codeGeneration'),
        modelName: this.selectOptimalModel('codeGeneration'),
        temperature: 0.2,
        maxTokens: 4000,
        timeout: 120000,
        retryAttempts: 3,
        batchSize: 1,
        concurrency: this.calculateConcurrency('codeGeneration', config.priority || 'normal'),
        tools: ['codeAnalysis', 'syntaxValidation', 'unitTestGeneration', 'documentation']
      },
      memory: {
        shortTerm: [],
        longTerm: [],
        workingSet: [],
        capacity: 5000,
        retentionPolicy: 'lru' as const,
        compression: true,
        indexing: true
      },
      security: {
        encryptionEnabled: true,
        signatureRequired: true,
        accessControl: [
          {
            resource: 'code_generation',
            action: 'generate',
            allowedAgents: ['orchestrator', 'analyst', 'security'],
            conditions: { requiresApproval: true, sandboxed: true }
          }
        ],
        auditLog: [],
        permissions: [
          {
            resource: 'code_repository',
            actions: ['read', 'write', 'execute'],
            conditions: { sandboxed: true, readOnly: false }
          },
          {
            resource: 'testing_framework',
            actions: ['read', 'write', 'execute'],
            conditions: { isolated: true }
          }
        ]
      },
      specializationDetails: {
        domain: 'software_development',
        expertise: ['programming_languages', 'algorithms', 'software_architecture'],
        tools: ['ide_integration', 'version_control', 'testing', 'deployment']
      }
    };
  }

  /**
   * Creates a System Monitor Agent with adaptive capabilities
   */
  private createSystemMonitorAgent(baseAgent: Agent, config: EnhancedAgentFactoryConfig): Agent {
    return {
      ...baseAgent,
      config: {
        modelProvider: 'local' as ModelProvider,
        modelName: 'llama-2-7b',
        temperature: 0.1,
        maxTokens: 1000,
        timeout: 30000,
        retryAttempts: 2,
        batchSize: 20,
        concurrency: this.calculateConcurrency('monitoring', config.priority || 'high'),
        tools: ['performance_monitoring', 'resource_tracking', 'alert_system', 'predictive_analysis']
      },
      memory: {
        shortTerm: [],
        longTerm: [],
        workingSet: [],
        capacity: 10000,
        retentionPolicy: 'priority' as const,
        compression: false,
        indexing: true
      },
      security: {
        encryptionEnabled: true,
        signatureRequired: false,
        accessControl: [
          {
            resource: 'system_metrics',
            action: 'read',
            allowedAgents: ['*'],
            conditions: { realTime: true, rateLimited: true }
          }
        ],
        auditLog: [],
        permissions: [
          {
            resource: 'system_health',
            actions: ['read', 'alert', 'diagnose'],
            conditions: { monitoring: true, nonIntrusive: true }
          }
        ]
      },
      specializationDetails: {
        domain: 'system_management',
        expertise: ['performance_optimization', 'resource_management', 'predictive_maintenance'],
        tools: ['metrics_collection', 'alerting', 'dashboard', 'reporting']
      }
    };
  }

  /**
   * Creates a Communication Coordinator Agent with advanced routing
   */
  private createCommunicationCoordinatorAgent(baseAgent: Agent, config: EnhancedAgentFactoryConfig): Agent {
    return {
      ...baseAgent,
      config: {
        modelProvider: this.selectOptimalModelProvider('communication'),
        modelName: this.selectOptimalModel('communication'),
        temperature: 0.4,
        maxTokens: 2000,
        timeout: 60000,
        retryAttempts: 3,
        batchSize: 10,
        concurrency: this.calculateConcurrency('communication', config.priority || 'normal'),
        tools: ['message_routing', 'protocol_management', 'encryption', 'compression']
      },
      memory: {
        shortTerm: [],
        longTerm: [],
        workingSet: [],
        capacity: 8000,
        retentionPolicy: 'fifo' as const,
        compression: true,
        indexing: true
      },
      security: {
        encryptionEnabled: true,
        signatureRequired: true,
        accessControl: [
          {
            resource: 'message_routing',
            action: 'route',
            allowedAgents: ['*'],
            conditions: { authenticated: true, encrypted: true }
          }
        ],
        auditLog: [],
        permissions: [
          {
            resource: 'communication_protocols',
            actions: ['read', 'write', 'route', 'optimize'],
            conditions: { encrypted: true, integrityChecked: true }
          }
        ]
      },
      specializationDetails: {
        domain: 'networking',
        expertise: ['protocol_design', 'message_routing', 'load_balancing', 'security'],
        tools: ['websocket', 'messaging', 'streaming', 'caching']
      }
    };
  }

  /**
   * Creates an Analyst Agent with advanced reasoning capabilities
   */
  private createAnalystAgent(baseAgent: Agent, config: EnhancedAgentFactoryConfig): Agent {
    return {
      ...baseAgent,
      config: {
        modelProvider: this.selectOptimalModelProvider('analysis'),
        modelName: this.selectOptimalModel('analysis'),
        temperature: 0.6,
        maxTokens: 6000,
        timeout: 180000,
        retryAttempts: 2,
        batchSize: 1,
        concurrency: this.calculateConcurrency('analysis', config.priority || 'normal'),
        tools: ['data_analysis', 'pattern_recognition', 'statistical_analysis', 'visualization']
      },
      memory: {
        shortTerm: [],
        longTerm: [],
        workingSet: [],
        capacity: 15000,
        retentionPolicy: 'priority' as const,
        compression: true,
        indexing: true
      },
      security: {
        encryptionEnabled: true,
        signatureRequired: true,
        accessControl: [
          {
            resource: 'analysis_tools',
            action: 'analyze',
            allowedAgents: ['orchestrator', 'codeGenerator', 'predictiveAnalyzer'],
            conditions: { requiresContext: true, dataRetention: true }
          }
        ],
        auditLog: [],
        permissions: [
          {
            resource: 'data_analysis',
            actions: ['read', 'analyze', 'report', 'visualize'],
            conditions: { dataRetention: true, anonymized: true }
          }
        ]
      },
      specializationDetails: {
        domain: 'data_science',
        expertise: ['statistical_analysis', 'machine_learning', 'data_visualization', 'predictive_modeling'],
        tools: ['statistical_packages', 'ml_frameworks', 'visualization_tools', 'data_processing']
      }
    };
  }

  /**
   * Creates a Reasoning Engine Agent with advanced reasoning patterns
   */
  private createReasoningEngineAgent(baseAgent: Agent, config: EnhancedAgentFactoryConfig): Agent {
    return {
      ...baseAgent,
      config: {
        modelProvider: this.selectOptimalModelProvider('reasoning'),
        modelName: this.selectOptimalModel('reasoning'),
        temperature: 0.3,
        maxTokens: 8000,
        timeout: 240000,
        retryAttempts: 3,
        batchSize: 1,
        concurrency: this.calculateConcurrency('reasoning', config.priority || 'high'),
        tools: ['reasoning_patterns', 'tree_of_thoughts', 'react_framework', 'chain_of_thought']
      },
      memory: {
        shortTerm: [],
        longTerm: [],
        workingSet: [],
        capacity: 20000,
        retentionPolicy: 'priority' as const,
        compression: true,
        indexing: true
      },
      security: {
        encryptionEnabled: true,
        signatureRequired: true,
        accessControl: [
          {
            resource: 'reasoning_engine',
            action: 'reason',
            allowedAgents: ['orchestrator', 'analyst'],
            conditions: { validated: true, audited: true }
          }
        ],
        auditLog: [],
        permissions: [
          {
            resource: 'reasoning_algorithms',
            actions: ['read', 'execute', 'optimize'],
            conditions: { verified: true, tested: true }
          }
        ]
      },
      specializationDetails: {
        domain: 'artificial_intelligence',
        expertise: ['reasoning_patterns', 'logical_inference', 'decision_making', 'problem_solving'],
        tools: ['reasoning_frameworks', 'algorithms', 'optimization', 'validation']
      }
    };
  }

  /**
   * Creates a Resource Optimizer Agent with adaptive capabilities
   */
  private createResourceOptimizerAgent(baseAgent: Agent, config: EnhancedAgentFactoryConfig): Agent {
    return {
      ...baseAgent,
      config: {
        modelProvider: 'local' as ModelProvider,
        modelName: 'llama-2-7b',
        temperature: 0.2,
        maxTokens: 2000,
        timeout: 90000,
        retryAttempts: 2,
        batchSize: 5,
        concurrency: this.calculateConcurrency('optimization', config.priority || 'high'),
        tools: ['resource_monitoring', 'performance_analysis', 'load_balancing', 'predictive_optimization']
      },
      memory: {
        shortTerm: [],
        longTerm: [],
        workingSet: [],
        capacity: 12000,
        retentionPolicy: 'priority' as const,
        compression: true,
        indexing: true
      },
      security: {
        encryptionEnabled: true,
        signatureRequired: false,
        accessControl: [
          {
            resource: 'resource_optimization',
            action: 'optimize',
            allowedAgents: ['orchestrator', 'systemMonitor'],
            conditions: { nonIntrusive: true, reversible: true }
          }
        ],
        auditLog: [],
        permissions: [
          {
            resource: 'system_resources',
            actions: ['read', 'analyze', 'optimize'],
            conditions: { conservative: true, monitored: true }
          }
        ]
      },
      specializationDetails: {
        domain: 'system_optimization',
        expertise: ['resource_management', 'performance_tuning', 'load_balancing', 'predictive_optimization'],
        tools: ['monitoring_tools', 'optimization_algorithms', 'load_balancers', 'resource_schedulers']
      }
    };
  }

  /**
   * Creates a Knowledge Manager Agent with advanced memory capabilities
   */
  private createKnowledgeManagerAgent(baseAgent: Agent, config: EnhancedAgentFactoryConfig): Agent {
    return {
      ...baseAgent,
      config: {
        modelProvider: this.selectOptimalModelProvider('knowledge'),
        modelName: this.selectOptimalModel('knowledge'),
        temperature: 0.5,
        maxTokens: 4000,
        timeout: 120000,
        retryAttempts: 3,
        batchSize: 3,
        concurrency: this.calculateConcurrency('knowledge', config.priority || 'normal'),
        tools: ['knowledge_base', 'semantic_search', 'document_processing', 'information_extraction']
      },
      memory: {
        shortTerm: [],
        longTerm: [],
        workingSet: [],
        capacity: 50000,
        retentionPolicy: 'adaptive' as const,
        compression: true,
        indexing: true,
        semanticIndexing: true,
        versioning: true
      },
      security: {
        encryptionEnabled: true,
        signatureRequired: true,
        accessControl: [
          {
            resource: 'knowledge_base',
            action: 'access',
            allowedAgents: ['orchestrator', 'analyst', 'reasoningEngine'],
            conditions: { authenticated: true, rateLimited: true }
          }
        ],
        auditLog: [],
        permissions: [
          {
            resource: 'knowledge_assets',
            actions: ['read', 'write', 'query', 'update'],
            conditions: { versioned: true, backedUp: true }
          }
        ]
      },
      specializationDetails: {
        domain: 'knowledge_management',
        expertise: ['information_retrieval', 'semantic_analysis', 'document_processing', 'knowledge_graphs'],
        tools: ['search_engines', 'nlp_tools', 'document_processing', 'knowledge_bases']
      }
    };
  }

  /**
   * Creates a Task Scheduler Agent with advanced scheduling capabilities
   */
  private createTaskSchedulerAgent(baseAgent: Agent, config: EnhancedAgentFactoryConfig): Agent {
    return {
      ...baseAgent,
      config: {
        modelProvider: 'local' as ModelProvider,
        modelName: 'llama-2-7b',
        temperature: 0.3,
        maxTokens: 2000,
        timeout: 60000,
        retryAttempts: 2,
        batchSize: 20,
        concurrency: this.calculateConcurrency('scheduling', config.priority || 'high'),
        tools: ['task_scheduling', 'priority_management', 'resource_allocation', 'dependency_resolution']
      },
      memory: {
        shortTerm: [],
        longTerm: [],
        workingSet: [],
        capacity: 10000,
        retentionPolicy: 'priority' as const,
        compression: true,
        indexing: true
      },
      security: {
        encryptionEnabled: true,
        signatureRequired: false,
        accessControl: [
          {
            resource: 'task_scheduling',
            action: 'schedule',
            allowedAgents: ['orchestrator', 'resourceOptimizer'],
            conditions: { audited: true, reversible: true }
          }
        ],
        auditLog: [],
        permissions: [
          {
            resource: 'task_queue',
            actions: ['read', 'write', 'prioritize', 'execute'],
            conditions: { monitored: true, throttled: true }
          }
        ]
      },
      specializationDetails: {
        domain: 'task_management',
        expertise: ['scheduling_algorithms', 'priority_management', 'resource_allocation', 'dependency_resolution'],
        tools: ['schedulers', 'priority_queues', 'resource_managers', 'dependency_trackers']
      }
    };
  }

  /**
   * Creates an Error Recovery Agent with advanced recovery capabilities
   */
  private createErrorRecoveryAgent(baseAgent: Agent, config: EnhancedAgentFactoryConfig): Agent {
    return {
      ...baseAgent,
      config: {
        modelProvider: this.selectOptimalModelProvider('recovery'),
        modelName: this.selectOptimalModel('recovery'),
        temperature: 0.4,
        maxTokens: 3000,
        timeout: 180000,
        retryAttempts: 5,
        batchSize: 1,
        concurrency: this.calculateConcurrency('recovery', config.priority || 'critical'),
        tools: ['error_detection', 'recovery_strategies', 'rollback_mechanisms', 'health_check']
      },
      memory: {
        shortTerm: [],
        longTerm: [],
        workingSet: [],
        capacity: 8000,
        retentionPolicy: 'priority' as const,
        compression: true,
        indexing: true
      },
      security: {
        encryptionEnabled: true,
        signatureRequired: true,
        accessControl: [
          {
            resource: 'error_recovery',
            action: 'recover',
            allowedAgents: ['orchestrator', 'security'],
            conditions: { approved: true, tested: true }
          }
        ],
        auditLog: [],
        permissions: [
          {
            resource: 'recovery_operations',
            actions: ['read', 'write', 'execute', 'rollback'],
            conditions: { isolated: true, reversible: true }
          }
        ]
      },
      specializationDetails: {
        domain: 'system_reliability',
        expertise: ['error_detection', 'recovery_strategies', 'rollback_mechanisms', 'system_health'],
        tools: ['error_monitors', 'recovery_tools', 'rollback_systems', 'health_checkers']
      }
    };
  }

  /**
   * Creates a Predictive Analyzer Agent with advanced prediction capabilities
   */
  private createPredictiveAnalyzerAgent(baseAgent: Agent, config: EnhancedAgentFactoryConfig): Agent {
    return {
      ...baseAgent,
      config: {
        modelProvider: this.selectOptimalModelProvider('prediction'),
        modelName: this.selectOptimalModel('prediction'),
        temperature: 0.3,
        maxTokens: 6000,
        timeout: 300000,
        retryAttempts: 2,
        batchSize: 1,
        concurrency: this.calculateConcurrency('prediction', config.priority || 'normal'),
        tools: ['predictive_modeling', 'time_series_analysis', 'anomaly_detection', 'forecasting']
      },
      memory: {
        shortTerm: [],
        longTerm: [],
        workingSet: [],
        capacity: 20000,
        retentionPolicy: 'priority' as const,
        compression: true,
        indexing: true
      },
      security: {
        encryptionEnabled: true,
        signatureRequired: true,
        accessControl: [
          {
            resource: 'predictive_analysis',
            action: 'analyze',
            allowedAgents: ['orchestrator', 'analyst', 'reasoningEngine'],
            conditions: { validated: true, audited: true }
          }
        ],
        auditLog: [],
        permissions: [
          {
            resource: 'predictive_models',
            actions: ['read', 'train', 'execute', 'validate'],
            conditions: { tested: true, versioned: true }
          }
        ]
      },
      specializationDetails: {
        domain: 'predictive_analytics',
        expertise: ['time_series_analysis', 'anomaly_detection', 'forecasting', 'predictive_modeling'],
        tools: ['ml_frameworks', 'statistical_models', 'time_series_tools', 'anomaly_detectors']
      }
    };
  }

  /**
   * Creates a UI Manager Agent
   */
  private createUIManagerAgent(baseAgent: Agent, config: EnhancedAgentFactoryConfig): Agent {
    return {
      ...baseAgent,
      config: {
        modelProvider: 'local' as ModelProvider,
        modelName: 'llama-2-7b',
        temperature: 0.3,
        maxTokens: 2000,
        timeout: 60000,
        retryAttempts: 2,
        batchSize: 5,
        concurrency: this.calculateConcurrency('ui', config.priority || 'normal'),
        tools: ['interface_rendering', 'user_interaction', 'display_optimization', 'accessibility']
      },
      memory: {
        shortTerm: [],
        longTerm: [],
        workingSet: [],
        capacity: 8000,
        retentionPolicy: 'lru' as const,
        compression: true,
        indexing: true
      },
      security: {
        encryptionEnabled: true,
        signatureRequired: false,
        accessControl: [
          {
            resource: 'ui_management',
            action: 'manage',
            allowedAgents: ['orchestrator', '*'],
            conditions: { read_only: true }
          }
        ],
        auditLog: [],
        permissions: [
          {
            resource: 'user_interface',
            actions: ['read', 'render', 'update'],
            conditions: { non_invasive: true }
          }
        ]
      },
      specializationDetails: {
        domain: 'user_interface',
        expertise: ['interface_design', 'user_experience', 'accessibility', 'responsive_design'],
        tools: ['rendering_engines', 'interaction_frameworks', 'accessibility_tools', 'design_systems']
      }
    };
  }

  /**
   * Creates a Security Agent
   */
  private createSecurityAgent(baseAgent: Agent, config: EnhancedAgentFactoryConfig): Agent {
    return {
      ...baseAgent,
      config: {
        modelProvider: this.selectOptimalModelProvider('security'),
        modelName: this.selectOptimalModel('security'),
        temperature: 0.1,
        maxTokens: 4000,
        timeout: 120000,
        retryAttempts: 3,
        batchSize: 1,
        concurrency: this.calculateConcurrency('security', config.priority || 'high'),
        tools: ['code_validation', 'security_analysis', 'vulnerability_detection', 'access_control']
      },
      memory: {
        shortTerm: [],
        longTerm: [],
        workingSet: [],
        capacity: 10000,
        retentionPolicy: 'priority' as const,
        compression: true,
        indexing: true
      },
      security: {
        encryptionEnabled: true,
        signatureRequired: true,
        accessControl: [
          {
            resource: 'security_validation',
            action: 'validate',
            allowedAgents: ['orchestrator'],
            conditions: { approved: true, audited: true }
          }
        ],
        auditLog: [],
        permissions: [
          {
            resource: 'security_systems',
            actions: ['read', 'write', 'validate', 'audit'],
            conditions: { isolated: true, monitored: true }
          }
        ]
      },
      specializationDetails: {
        domain: 'cybersecurity',
        expertise: ['code_validation', 'vulnerability_assessment', 'access_control', 'compliance'],
        tools: ['security_scanners', 'vulnerability_databases', 'access_control_systems', 'audit_tools']
      }
    };
  }

  /**
   * Creates an Orchestrator Agent
   */
  private createOrchestratorAgent(baseAgent: Agent, config: EnhancedAgentFactoryConfig): Agent {
    return {
      ...baseAgent,
      config: {
        modelProvider: this.selectOptimalModelProvider('orchestration'),
        modelName: this.selectOptimalModel('orchestration'),
        temperature: 0.2,
        maxTokens: 8000,
        timeout: 180000,
        retryAttempts: 3,
        batchSize: 1,
        concurrency: this.calculateConcurrency('orchestration', config.priority || 'high'),
        tools: ['coordination', 'delegation', 'optimization', 'planning']
      },
      memory: {
        shortTerm: [],
        longTerm: [],
        workingSet: [],
        capacity: 20000,
        retentionPolicy: 'priority' as const,
        compression: true,
        indexing: true
      },
      security: {
        encryptionEnabled: true,
        signatureRequired: true,
        accessControl: [
          {
            resource: 'orchestration',
            action: 'coordinate',
            allowedAgents: ['orchestrator'],
            conditions: { validated: true, audited: true }
          }
        ],
        auditLog: [],
        permissions: [
          {
            resource: 'system_coordination',
            actions: ['read', 'write', 'coordinate', 'optimize'],
            conditions: { monitored: true, reversible: true }
          }
        ]
      },
      specializationDetails: {
        domain: 'system_orchestration',
        expertise: ['coordination', 'delegation', 'resource_allocation', 'strategic_planning'],
        tools: ['coordination_frameworks', 'resource_managers', 'planning_systems', 'optimization_tools']
      }
    };
  }

  /**
   * Helper methods for agent creation
   */
  private initializePerformanceMetrics(): AgentPerformance {
    return {
      successRate: 100,
      responseTime: 0,
      resourceUsage: {
        cpu: 0,
        memory: 0,
        tokens: 0,
        network: 0
      },
      completedTasks: 0,
      failedTasks: 0,
      averageLatency: 0,
      throughput: 0
    };
  }

  private selectOptimalModelProvider(taskType: string): ModelProvider {
    // Use OpenRouter for complex tasks, local for simple monitoring
    const complexTasks = ['codeGeneration', 'analysis', 'reasoning', 'communication', 'knowledge', 'prediction', 'recovery', 'security', 'orchestration'];
    return complexTasks.includes(taskType) ? 'openrouter' : 'local';
  }

  private selectOptimalModel(taskType: string): string {
    // Model selection based on task complexity
    const modelMappings: Record<string, string> = {
      codeGeneration: 'gpt-4',
      analysis: 'claude-3-sonnet',
      reasoning: 'gpt-4',
      communication: 'claude-3-haiku',
      knowledge: 'gpt-4',
      prediction: 'claude-3-sonnet',
      recovery: 'gpt-4',
      monitoring: 'llama-2-7b',
      scheduling: 'llama-2-7b',
      optimization: 'llama-2-7b',
      security: 'gpt-4',
      orchestration: 'gpt-4',
      ui: 'llama-2-7b'
    };
    return modelMappings[taskType] || 'gpt-4';
  }

  private calculateConcurrency(taskType: string, priority: string): number {
    const baseConcurrency = {
      monitoring: 5,
      scheduling: 10,
      optimization: 3,
      codeGeneration: 1,
      analysis: 2,
      reasoning: 1,
      communication: 3,
      knowledge: 2,
      prediction: 1,
      recovery: 1,
      security: 1,
      orchestration: 1,
      ui: 3
    };

    const priorityMultiplier = {
      low: 0.5,
      normal: 1,
      high: 1.5,
      critical: 2
    };

    return Math.floor(baseConcurrency[taskType as keyof typeof baseConcurrency] * priorityMultiplier[priority as keyof typeof priorityMultiplier]);
  }

  private getDefaultTierForSpecialization(specialization: AgentSpecialization): ReasoningTier {
    const tierMapping: Record<AgentSpecialization, ReasoningTier> = {
      orchestrator: 'strategic',
      analyst: 'tactical',
      communicationCoordinator: 'tactical',
      codeGenerator: 'execution',
      systemMonitor: 'execution',
      uiManager: 'execution',
      security: 'execution',
      reasoningEngine: 'strategic',
      resourceOptimizer: 'tactical',
      knowledgeManager: 'tactical',
      taskScheduler: 'tactical',
      errorRecovery: 'execution',
      predictiveAnalyzer: 'strategic'
    };
    return tierMapping[specialization] || 'tactical';
  }

  private getDefaultDescriptionForSpecialization(specialization: AgentSpecialization): string {
    const descriptions: Record<AgentSpecialization, string> = {
      orchestrator: 'Coordinates all system activities and manages agent lifecycle',
      codeGenerator: 'Generates and modifies code based on requirements with advanced capabilities',
      systemMonitor: 'Monitors system resources and ensures constraints are respected with predictive analysis',
      communicationCoordinator: 'Manages communication protocols between agents with advanced routing',
      analyst: 'Analyzes problems and develops solution strategies using advanced reasoning',
      uiManager: 'Manages the user interface and handles user interactions with adaptive rendering',
      security: 'Ensures system security and validates code modifications with comprehensive checks',
      reasoningEngine: 'Advanced reasoning engine implementing sophisticated reasoning patterns',
      resourceOptimizer: 'Optimizes system resources and performance with predictive algorithms',
      knowledgeManager: 'Manages knowledge base with advanced semantic search and document processing',
      taskScheduler: 'Intelligent task scheduling with priority management and resource allocation',
      errorRecovery: 'Advanced error detection and recovery with rollback mechanisms',
      predictiveAnalyzer: 'Predictive analysis and forecasting using advanced machine learning'
    };
    return descriptions[specialization] || 'Specialized agent with custom capabilities';
  }

  private getDefaultCapabilitiesForSpecialization(specialization: AgentSpecialization): string[] {
    const capabilities: Record<AgentSpecialization, string[]> = {
      orchestrator: [
        'System coordination',
        'Agent lifecycle management',
        'Task delegation',
        'Resource allocation',
        'Strategic planning'
      ],
      codeGenerator: [
        'Code generation',
        'Code modification',
        'Code review',
        'Testing',
        'Documentation',
        'Refactoring'
      ],
      systemMonitor: [
        'Resource monitoring',
        'Performance tracking',
        'Constraint management',
        'Usage reporting',
        'Predictive analysis'
      ],
      communicationCoordinator: [
        'Message routing',
        'Protocol management',
        'Communication optimization',
        'Channel security',
        'Load balancing'
      ],
      analyst: [
        'Problem decomposition',
        'Solution synthesis',
        'Pattern recognition',
        'Strategic planning',
        'Data analysis'
      ],
      uiManager: [
        'Interface rendering',
        'User interaction handling',
        'Display optimization',
        'Visual feedback',
        'Accessibility'
      ],
      security: [
        'Code validation',
        'Security analysis',
        'Vulnerability detection',
        'Access control',
        'Compliance'
      ],
      reasoningEngine: [
        'Advanced reasoning',
        'Logical inference',
        'Decision making',
        'Problem solving',
        'Strategy optimization'
      ],
      resourceOptimizer: [
        'Resource monitoring',
        'Performance tuning',
        'Load balancing',
        'Predictive optimization',
        'Efficiency analysis'
      ],
      knowledgeManager: [
        'Knowledge organization',
        'Information retrieval',
        'Document processing',
        'Semantic search',
        'Knowledge graphs'
      ],
      taskScheduler: [
        'Task scheduling',
        'Priority management',
        'Resource allocation',
        'Dependency resolution',
        'Load balancing'
      ],
      errorRecovery: [
        'Error detection',
        'Recovery strategies',
        'Rollback mechanisms',
        'Health monitoring',
        'System reliability'
      ],
      predictiveAnalyzer: [
        'Predictive modeling',
        'Time series analysis',
        'Anomaly detection',
        'Forecasting',
        'Trend analysis'
      ]
    };
    return capabilities[specialization] || ['Specialized processing'];
  }

  private getDefaultReasoningPatterns(specialization: AgentSpecialization): string[] {
    const patterns: Record<AgentSpecialization, string[]> = {
      orchestrator: ['strategic', 'hierarchical', 'cooperative'],
      codeGenerator: ['procedural', 'template', 'pattern'],
      systemMonitor: ['observational', 'statistical', 'predictive'],
      communicationCoordinator: ['routing', 'optimization', 'load_balancing'],
      analyst: ['deductive', 'inductive', 'abductive', 'statistical'],
      uiManager: ['user_centric', 'adaptive', 'responsive'],
      security: ['validation', 'verification', 'compliance'],
      reasoningEngine: ['react', 'tree_of_thoughts', 'chain_of_thought', 'analogical'],
      resourceOptimizer: ['optimization', 'predictive', 'adaptive'],
      knowledgeManager: ['semantic', 'hierarchical', 'associative'],
      taskScheduler: ['optimization', 'priority_based', 'resource_constrained'],
      errorRecovery: ['diagnostic', 'prescriptive', 'preventive'],
      predictiveAnalyzer: ['statistical', 'machine_learning', 'time_series']
    };
    return patterns[specialization] || ['general'];
  }

  private getDefaultReasoningStrategies(specialization: AgentSpecialization): string[] {
    const strategies: Record<AgentSpecialization, string[]> = {
      orchestrator: ['coordination', 'delegation', 'optimization'],
      codeGenerator: ['generation', 'refinement', 'validation'],
      systemMonitor: ['monitoring', 'alerting', 'optimization'],
      communicationCoordinator: ['routing', 'compression', 'encryption'],
      analyst: ['analysis', 'synthesis', 'evaluation'],
      uiManager: ['rendering', 'interaction', 'accessibility'],
      security: ['validation', 'protection', 'auditing'],
      reasoningEngine: ['inference', 'optimization', 'generalization'],
      resourceOptimizer: ['monitoring', 'optimization', 'prediction'],
      knowledgeManager: ['organization', 'retrieval', 'processing'],
      taskScheduler: ['scheduling', 'prioritization', 'allocation'],
      errorRecovery: ['detection', 'recovery', 'prevention'],
      predictiveAnalyzer: ['modeling', 'forecasting', 'analysis']
    };
    return strategies[specialization] || ['general'];
  }

  private getDefaultContextWindow(specialization: AgentSpecialization): number {
    const windows: Record<AgentSpecialization, number> = {
      orchestrator: 10000,
      codeGenerator: 8000,
      systemMonitor: 5000,
      communicationCoordinator: 6000,
      analyst: 12000,
      uiManager: 4000,
      security: 6000,
      reasoningEngine: 15000,
      resourceOptimizer: 8000,
      knowledgeManager: 20000,
      taskScheduler: 10000,
      errorRecovery: 8000,
      predictiveAnalyzer: 15000
    };
    return windows[specialization] || 8000;
  }
}

/**
 * Enhanced configuration for creating a new agent
 */
export interface EnhancedAgentFactoryConfig {
  name: string;
  specialization: AgentSpecialization;
  tier?: ReasoningTier;
  description?: string;
  capabilities?: string[];
  priority?: 'low' | 'normal' | 'high' | 'critical';
  reasoningPatterns?: string[];
  reasoningStrategies?: string[];
  contextWindow?: number;
  learningRate?: number;
  adaptationThreshold?: number;
  experienceBuffer?: number;
}