import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSystemStore } from '@/store/system-store';
import { EnhancedAgentFactory } from '@/features/agents/services/EnhancedAgentFactory';
import { AdvancedReasoningPatternsService } from '@/features/reasoning/services/AdvancedReasoningPatterns';
import { RealTimeCommunicationService } from '@/features/communication/services/RealTimeCommunicationService';
import { SelfModificationService } from '@/features/system/services/SelfModificationService';
import { useWebSocket, useAgentPresence, useMessageHistory } from '@/features/communication/hooks/useWebSocket';
import {
  Agent,
  Task,
  SystemResourceUsage,
  SystemConstraints,
  AgentSpecialization,
  ReasoningTier
} from '@/types/agent-types';

interface CommandCenterProps {
  agentFactory?: EnhancedAgentFactory;
  reasoningService?: AdvancedReasoningPatternsService;
  communicationService?: RealTimeCommunicationService;
  modificationService?: SelfModificationService;
}

interface CommandSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  command: string;
  parameters?: Record<string, any>;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  agentFactory = new EnhancedAgentFactory(),
  reasoningService = new AdvancedReasoningPatternsService(),
  communicationService = new RealTimeCommunicationService(),
  modificationService = new SelfModificationService()
}) => {
  const [inputCommand, setInputCommand] = useState('');
  const [conversation, setConversation] = useState<Array<{
    id: string;
    type: 'user' | 'system' | 'agent';
    content: string;
    timestamp: Date;
    agentId?: string;
    agentName?: string;
  }>>([]);
  const [suggestions] = useState<CommandSuggestion[]>([
    {
      id: '1',
      title: 'Create Code Generation Agent',
      description: 'Create a specialized agent for autonomous programming',
      category: 'agents',
      command: 'create_agent',
      parameters: { type: 'code_generation', name: 'CodeMaster' }
    },
    {
      id: '2',
      title: 'Monitor System Resources',
      description: 'Check current system resource utilization',
      category: 'system',
      command: 'monitor_resources'
    },
    {
      id: '3',
      title: 'Optimize Performance',
      description: 'Optimize system based on current hardware',
      category: 'optimization',
      command: 'optimize_performance'
    },
    {
      id: '4',
      title: 'Implement Hierarchical Reasoning',
      description: 'Set up hierarchical reasoning for complex problems',
      category: 'reasoning',
      command: 'setup_reasoning',
      parameters: { pattern: 'tree_of_thoughts' }
    },
    {
      id: '5',
      title: 'Analyze System Performance',
      description: 'Generate comprehensive system performance report',
      category: 'analysis',
      command: 'analyze_performance'
    },
    {
      id: '6',
      title: 'Create Task Management Workflow',
      description: 'Set up automated task management and prioritization',
      category: 'workflow',
      command: 'create_workflow',
      parameters: { type: 'task_management' }
    },
    {
      id: '7',
      title: 'Configure Model Parameters',
      description: 'Configure AI model parameters for better accuracy',
      category: 'models',
      command: 'configure_model',
      parameters: { temperature: 0.7, maxTokens: 2000 }
    },
    {
      id: '8',
      title: 'Generate System Health Report',
      description: 'Generate detailed system health and performance report',
      category: 'reports',
      command: 'generate_report',
      parameters: { type: 'health' }
    },
    {
      id: '9',
      title: 'Create Backup Configuration',
      description: 'Create backup of current system configuration',
      category: 'maintenance',
      command: 'backup_config'
    },
    {
      id: '10',
      title: 'Set Up Testing Pipeline',
      description: 'Configure automated testing and validation pipeline',
      category: 'development',
      command: 'setup_testing',
      parameters: { framework: 'jest', coverage: 80 }
    }
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<CommandSuggestion | null>(null);
  const [activeAgents, setActiveAgents] = useState<Agent[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  const conversationEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // WebSocket hooks
  const ws = useWebSocket();
  const { agentPresence, getOnlineAgents, getAgentStatus } = useAgentPresence();
  const { messages } = useMessageHistory(100);

  const { agents, tasks, systemStatus: systemStatusState, resourceUsage } = useSystemStore.getState();

  // Update data
  useEffect(() => {
    setActiveAgents(agents);
    setPendingTasks(tasks.filter(t => t.status === 'pending'));
    setSystemStatus({
      status: systemStatusState,
      resources: resourceUsage,
      constraints: {
        maxAgents: 10,
        maxMemoryUsage: 8192,
        maxCpuUsage: 80,
        maxTokensPerMinute: 5000
      }
    });
  }, [agents, tasks, systemStatusState, resourceUsage]);

  // Update conversation from WebSocket messages
  useEffect(() => {
    if (messages.length > 0) {
      const formattedMessages: Array<{
        id: string;
        type: 'user' | 'system' | 'agent';
        content: string;
        timestamp: Date;
        agentId?: string;
        agentName?: string;
      }> = messages.map(msg => ({
        id: msg.id,
        type: msg.fromAgentId === 'user' ? 'user' : msg.fromAgentId === 'system' ? 'system' : 'agent',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        timestamp: msg.timestamp,
        agentId: msg.fromAgentId !== 'user' && msg.fromAgentId !== 'system' ? msg.fromAgentId : undefined,
        agentName: activeAgents.find(a => a.id === msg.fromAgentId)?.name
      }));
      setConversation(prev => [...prev, ...formattedMessages]);
    }
  }, [messages, activeAgents]);

  // Auto-scroll to bottom
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputCommand.trim() || isProcessing) return;

    const command = inputCommand.trim();
    const userMessageId = `msg_${Date.now()}`;
    
    // Add user message to conversation
    setConversation(prev => [...prev, {
      id: userMessageId,
      type: 'user',
      content: command,
      timestamp: new Date()
    }]);

    setInputCommand('');
    setIsProcessing(true);

    try {
      // Process command
      const result = await processCommand(command);
      
      // Add system response
      setConversation(prev => [...prev, {
        id: `sys_${Date.now()}`,
        type: 'system',
        content: result.response,
        timestamp: new Date()
      }]);

      // Add agent responses if any
      if (result.agentResponses && result.agentResponses.length > 0) {
        result.agentResponses.forEach((response: any) => {
          setConversation(prev => [...prev, {
            id: `agent_${Date.now()}_${Math.random()}`,
            type: 'agent',
            content: response.content,
            timestamp: new Date(),
            agentId: response.agentId,
            agentName: response.agentName
          }]);
        });
      }

    } catch (error) {
      setConversation(prev => [...prev, {
        id: `err_${Date.now()}`,
        type: 'system',
        content: `Error: ${error}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const processCommand = async (command: string): Promise<any> => {
    const normalizedCommand = command.toLowerCase();
    
    // Check for exact matches with suggestions
    const matchedSuggestion = suggestions.find(s => 
      s.command.toLowerCase() === normalizedCommand || 
      s.title.toLowerCase() === normalizedCommand
    );

    if (matchedSuggestion) {
      return await executeSuggestion(matchedSuggestion);
    }

    // Handle natural language commands
    if (normalizedCommand.includes('create') && normalizedCommand.includes('agent')) {
      return await createAgentFromCommand(command);
    }

    if (normalizedCommand.includes('monitor') || normalizedCommand.includes('check')) {
      return await monitorSystemFromCommand(command);
    }

    if (normalizedCommand.includes('optimize') || normalizedCommand.includes('improve')) {
      return await optimizeSystemFromCommand(command);
    }

    if (normalizedCommand.includes('analyze') || normalizedCommand.includes('report')) {
      return await analyzeSystemFromCommand(command);
    }

    if (normalizedCommand.includes('setup') || normalizedCommand.includes('configure')) {
      return await setupSystemFromCommand(command);
    }

    // Default response
    return {
      response: `I understand you want to: "${command}". I'm processing your request...`,
      agentResponses: []
    };
  };

  const executeSuggestion = async (suggestion: CommandSuggestion): Promise<any> => {
    switch (suggestion.command) {
      case 'create_agent':
        return await createAgentFromSuggestion(suggestion);
      case 'monitor_resources':
        return await monitorResources();
      case 'optimize_performance':
        return await optimizePerformance();
      case 'setup_reasoning':
        return await setupReasoning(suggestion.parameters);
      case 'analyze_performance':
        return await analyzePerformance();
      case 'create_workflow':
        return await createWorkflow(suggestion.parameters);
      case 'configure_model':
        return await configureModel(suggestion.parameters);
      case 'generate_report':
        return await generateReport(suggestion.parameters);
      case 'backup_config':
        return await backupConfig();
      case 'setup_testing':
        return await setupTesting(suggestion.parameters);
      default:
        return { response: `Command "${suggestion.command}" not recognized.` };
    }
  };

  const createAgentFromSuggestion = async (suggestion: CommandSuggestion): Promise<any> => {
    try {
      const agent = await agentFactory.createAgent({
        name: suggestion.parameters?.name || 'NewAgent',
        specialization: suggestion.parameters?.type || 'general',
        tier: 'execution' as ReasoningTier,
        description: `Created via command: ${suggestion.title}`,
        capabilities: ['reasoning', 'communication', 'learning'],
        reasoningPatterns: ['react'],
        reasoningStrategies: ['problem_solving'],
        contextWindow: 1000,
        learningRate: 0.1,
        adaptationThreshold: 0.8,
        experienceBuffer: 100
      });

      return {
        response: `✅ Successfully created agent "${agent.name}" (ID: ${agent.id})`,
        agentResponses: [{
          agentId: agent.id,
          agentName: agent.name,
          content: `Agent "${agent.name}" has been initialized and is ready for tasks.`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to create agent: ${error}`);
    }
  };

  const createAgentFromCommand = async (command: string): Promise<any> => {
    const agentName = extractParameter(command, 'name') || 'AutoAgent';
    const specialization = extractParameter(command, 'type') || 'general';
    
    try {
      const agent = await agentFactory.createAgent({
        name: agentName,
        specialization: specialization as AgentSpecialization,
        tier: 'execution' as ReasoningTier,
        description: `Created via natural language command: ${command}`,
        capabilities: ['reasoning', 'communication', 'learning'],
        reasoningPatterns: ['react'],
        reasoningStrategies: ['problem_solving'],
        contextWindow: 1000,
        learningRate: 0.1,
        adaptationThreshold: 0.8,
        experienceBuffer: 100
      });

      return {
        response: `✅ Successfully created "${specialization}" agent "${agent.name}"`,
        agentResponses: [{
          agentId: agent.id,
          agentName: agent.name,
          content: `I'm ready to help with ${specialization} tasks!`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to create agent: ${error}`);
    }
  };

  const monitorResources = async (): Promise<any> => {
    const { resourceUsage, constraints } = useSystemStore.getState();
    
    const healthScore = calculateResourceHealth(resourceUsage, constraints);
    
    return {
      response: `📊 System Resources:\n` +
                `• CPU: ${resourceUsage.cpuUtilization.toFixed(1)}%\n` +
                `• Memory: ${formatBytes(resourceUsage.memoryUtilization)}\n` +
                `• Active Agents: ${resourceUsage.activeAgentCount}\n` +
                `• Token Rate: ${resourceUsage.tokensUsedLastMinute}/min\n` +
                `• Health Score: ${healthScore}%`,
      agentResponses: []
    };
  };

  const monitorSystemFromCommand = async (command: string): Promise<any> => {
    return await monitorResources();
  };

  const optimizePerformance = async (): Promise<any> => {
    try {
      const { resourceUsage, constraints } = useSystemStore.getState();
      
      // Simulate optimization
      const recommendations = [];
      
      if (resourceUsage.cpuUtilization > 70) {
        recommendations.push('Consider reducing concurrent agent tasks');
      }
      
      if (resourceUsage.memoryUtilization > 70) {
        recommendations.push('Monitor memory usage and consider cleanup');
      }
      
      if (resourceUsage.activeAgentCount > constraints.maxAgents * 0.8) {
        recommendations.push('Agent count approaching limit, consider scaling down');
      }

      const optimized = recommendations.length === 0;
      
      return {
        response: optimized 
          ? '✅ System is already optimized for current workload'
          : `🔧 Optimization Recommendations:\n${recommendations.map(r => `• ${r}`).join('\n')}`,
        agentResponses: []
      };
    } catch (error) {
      throw new Error(`Failed to optimize system: ${error}`);
    }
  };

  const optimizeSystemFromCommand = async (command: string): Promise<any> => {
    return await optimizePerformance();
  };

  const setupReasoning = async (parameters: any): Promise<any> => {
    try {
      const pattern = parameters?.pattern || 'tree_of_thoughts';
      
      await reasoningService.startReasoningSession(`Setup ${pattern} reasoning pattern`, undefined, `setup_${pattern}`);

      return {
        response: `✅ Hierarchical reasoning initialized with "${pattern}" pattern`,
        agentResponses: []
      };
    } catch (error) {
      throw new Error(`Failed to setup reasoning: ${error}`);
    }
  };

  const analyzePerformance = async (): Promise<any> => {
    const { agents, tasks, resourceUsage } = useSystemStore.getState();
    
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const avgTaskTime = calculateAverageTaskTime(tasks);
    const agentEfficiency = calculateAgentEfficiency(agents);
    
    return {
      response: `📈 Performance Analysis:\n` +
                `• Total Tasks: ${tasks.length}\n` +
                `• Completed: ${completedTasks}\n` +
                `• Success Rate: ${((completedTasks / tasks.length) * 100).toFixed(1)}%\n` +
                `• Avg Task Time: ${avgTaskTime}s\n` +
                `• Agent Efficiency: ${agentEfficiency}%\n` +
                `• Resource Utilization: ${resourceUsage.cpuUtilization.toFixed(1)}% CPU`,
      agentResponses: []
    };
  };

  const analyzeSystemFromCommand = async (command: string): Promise<any> => {
    return await analyzePerformance();
  };

  const createWorkflow = async (parameters: any): Promise<any> => {
    try {
      const workflowType = parameters?.type || 'task_management';
      
      // Create workflow agents
      const workflowAgent = await agentFactory.createAgent({
        name: 'WorkflowManager',
        specialization: workflowType,
        tier: 'tactical' as ReasoningTier,
        description: 'Manages task workflows and prioritization',
        capabilities: ['task_management', 'prioritization', 'coordination'],
        reasoningPatterns: ['react', 'tree_of_thoughts'],
        reasoningStrategies: ['coordination', 'optimization'],
        contextWindow: 2000,
        learningRate: 0.15,
        adaptationThreshold: 0.7,
        experienceBuffer: 150
      });

      return {
        response: `✅ ${workflowType} workflow created with agent "${workflowAgent.name}"`,
        agentResponses: [{
          agentId: workflowAgent.id,
          agentName: workflowAgent.name,
          content: `Workflow manager is ready to coordinate tasks and optimize processes.`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to create workflow: ${error}`);
    }
  };

  const setupSystemFromCommand = async (command: string): Promise<any> => {
    const hasWorkflow = command.includes('workflow') || command.includes('task');
    const hasReasoning = command.includes('reasoning') || command.includes('think');
    
    if (hasWorkflow) {
      return await createWorkflow({ type: 'task_management' });
    }
    
    if (hasReasoning) {
      return await setupReasoning({ pattern: 'tree_of_thoughts' });
    }
    
    return { response: 'Setup command recognized. Please specify what you want to setup.' };
  };

  const configureModel = async (parameters: any): Promise<any> => {
    try {
      const { updateModelConfig } = useSystemStore.getState();
      
      updateModelConfig({
        temperature: parameters?.temperature || 0.7,
        maxTokens: parameters?.maxTokens || 1000,
        provider: 'local'
      });

      return {
        response: `✅ Model configured with:\n` +
                  `• Temperature: ${parameters?.temperature || 0.7}\n` +
                  `• Max Tokens: ${parameters?.maxTokens || 1000}`,
        agentResponses: []
      };
    } catch (error) {
      throw new Error(`Failed to configure model: ${error}`);
    }
  };

  const generateReport = async (parameters: any): Promise<any> => {
    const reportType = parameters?.type || 'health';
    
    switch (reportType) {
      case 'health':
        return await analyzePerformance();
      default:
        return { response: `Report type "${reportType}" not supported.` };
    }
  };

  const backupConfig = async (): Promise<any> => {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        agents: useSystemStore.getState().agents,
        tasks: useSystemStore.getState().tasks,
        constraints: useSystemStore.getState().constraints,
        config: useSystemStore.getState().activeModelConfig
      };

      return {
        response: `✅ Configuration backup created at ${backup.timestamp}\n` +
                  `• ${backup.agents.length} agents\n` +
                  `• ${backup.tasks.length} tasks\n` +
                  `• System constraints preserved`,
        agentResponses: []
      };
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  };

  const setupTesting = async (parameters: any): Promise<any> => {
    try {
      const testingAgent = await agentFactory.createAgent({
        name: 'TestingAgent',
        specialization: 'analyst' as AgentSpecialization,
        tier: 'execution' as ReasoningTier,
        description: 'Automated testing and validation',
        capabilities: ['testing', 'validation', 'quality_assurance'],
        reasoningPatterns: ['react', 'chain_of_thought'],
        reasoningStrategies: ['analysis', 'validation'],
        contextWindow: 1500,
        learningRate: 0.2,
        adaptationThreshold: 0.6,
        experienceBuffer: 200
      });

      return {
        response: `✅ Testing pipeline setup complete\n` +
                  `• Framework: ${parameters?.framework || 'jest'}\n` +
                  `• Coverage Target: ${parameters?.coverage || 80}%\n` +
                  `• Testing Agent: ${testingAgent.name}`,
        agentResponses: [{
          agentId: testingAgent.id,
          agentName: testingAgent.name,
          content: `Testing agent is ready to validate system functionality.`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to setup testing: ${error}`);
    }
  };

  const extractParameter = (command: string, param: string): string | null => {
    const regex = new RegExp(`${param}\\s*[:=]\\s*([^\\s]+)`, 'i');
    const match = command.match(regex);
    return match ? match[1] : null;
  };

  const calculateResourceHealth = (usage: SystemResourceUsage, constraints: SystemConstraints): number => {
    const cpuHealth = Math.max(0, 100 - (usage.cpuUtilization / constraints.maxCpuUsage) * 100);
    const memoryHealth = Math.max(0, 100 - (usage.memoryUtilization / constraints.maxMemoryUsage) * 100);
    const agentHealth = Math.max(0, 100 - (usage.activeAgentCount / constraints.maxAgents) * 100);
    
    return Math.round((cpuHealth + memoryHealth + agentHealth) / 3);
  };

  const calculateAverageTaskTime = (tasks: Task[]): number => {
    const completed = tasks.filter(t => t.status === 'completed' && t.startedAt && t.completedAt);
    if (completed.length === 0) return 0;
    
    const totalTime = completed.reduce((sum, task) => {
      return sum + (task.completedAt!.getTime() - task.startedAt!.getTime());
    }, 0);
    
    return Math.round(totalTime / completed.length / 1000);
  };

  const calculateAgentEfficiency = (agents: Agent[]): number => {
    if (agents.length === 0) return 0;
    
    const totalEfficiency = agents.reduce((sum, agent) => {
      const agentTasks = useSystemStore.getState().tasks.filter(t => t.assignedAgentIds?.includes(agent.id));
      const completedTasks = agentTasks.filter(t => t.status === 'completed').length;
      const efficiency = agentTasks.length > 0 ? (completedTasks / agentTasks.length) * 100 : 0;
      return sum + efficiency;
    }, 0);
    
    return Math.round(totalEfficiency / agents.length);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSuggestionClick = (suggestion: CommandSuggestion) => {
    setInputCommand(suggestion.command);
    setSelectedSuggestion(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CMD</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Command Center
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant={systemStatus?.status === 'operational' ? 'default' : 'secondary'}>
              {systemStatus?.status?.toUpperCase() || 'UNKNOWN'}
            </Badge>
            <Badge variant={ws.connectionStatus === 'connected' ? 'default' : 'secondary'}>
              {ws.connectionStatus.toUpperCase()}
            </Badge>
            <Badge variant="outline">
              {activeAgents.length} Active Agents
            </Badge>
            <Badge variant="outline">
              {getOnlineAgents().length} Online
            </Badge>
            <Badge variant="outline">
              {pendingTasks.length} Pending Tasks
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar with Suggestions */}
        <div className="w-80 border-r bg-white/50 dark:bg-slate-800/50 p-4 overflow-y-auto">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Quick Commands</h2>
            <p className="text-sm text-muted-foreground">Click to execute common commands</p>
          </div>
          
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                  selectedSuggestion?.id === suggestion.id ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300' : 'bg-white dark:bg-slate-700'
                }`}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-medium text-sm">{suggestion.title}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {suggestion.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                <div className="mt-2 text-xs font-mono text-blue-600 dark:text-blue-400">
                  {suggestion.command}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Conversation Area */}
          <div className="flex-1 overflow-y-auto p-4">
            <ScrollArea className="h-full">
              <div className="space-y-4">
                {conversation.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : message.type === 'agent' ? 'justify-start' : 'justify-center'}`}
                  >
                    <div
                      className={`max-w-2xl rounded-lg p-4 ${
                        message.type === 'user'
                          ? 'bg-blue-500 text-white'
                          : message.type === 'agent'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      {message.type === 'agent' && message.agentName && (
                        <div className="text-xs font-semibold mb-1 opacity-80">
                          {message.agentName}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className={`text-xs mt-2 opacity-70`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-center">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        <span className="text-sm">Processing command...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={conversationEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="border-t bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 p-4">
            <form onSubmit={handleCommandSubmit} className="flex space-x-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Type your command or question..."
                value={inputCommand}
                onChange={(e) => setInputCommand(e.target.value)}
                className="flex-1"
                disabled={isProcessing}
              />
              <Button type="submit" disabled={!inputCommand.trim() || isProcessing}>
                Send
              </Button>
            </form>
            
            {selectedSuggestion && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                <span className="font-medium">Selected:</span> {selectedSuggestion.title}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-6 px-2"
                  onClick={() => setSelectedSuggestion(null)}
                >
                  ×
                </Button>
              </div>
            )}
            
            <div className="mt-2 text-xs text-muted-foreground">
              Use ⌘+K (or Ctrl+K) to focus • Try "create agent" or "monitor resources"
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};