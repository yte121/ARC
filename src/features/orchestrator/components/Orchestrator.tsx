import { useEffect, useState } from 'react';
import { useSystemStore } from '@/store/system-store';
import { AgentFactory } from '@/features/agents/services/AgentFactory';
import { SystemMonitor } from '@/features/system/components/SystemMonitor';
import { CommandCenter } from '@/features/command/components/CommandCenter';
import { AgentWorkspace } from '@/features/agents/components/AgentWorkspace';
import { TaskManager } from '@/features/tasks/components/TaskManager';
import { CommunicationVisualizer } from '@/features/communication/components/CommunicationVisualizer';
import { ModelConfiguration } from '@/features/models/components/ModelConfiguration';
import { ModelPerformanceMetrics } from '@/features/models/components/ModelPerformanceMetrics';
import { ModelTester } from '@/features/models/components/ModelTester';
import { ModelIntegration } from '@/features/models/components/ModelIntegration';
import { AgentStatus, SystemStatus, AgentSpecialization, ReasoningTier } from '@/types/agent-types';
import { HierarchicalReasoningService } from '@/features/reasoning/services/HierarchicalReasoning';
import { CommunicationService } from '@/features/communication/services/CommunicationService';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  AlertTriangle, 
  BrainCircuit, 
  Clock, 
  Cpu, 
  LineChart, 
  MessageSquare, 
  Network, 
  Shield, 
  Activity,
  Bot,
  Settings
} from 'lucide-react';

/**
 * Orchestrator Component
 * 
 * Core component that manages the multi-agent system and coordinates all activities.
 * Serves as the primary control center for the entire application.
 */
export function Orchestrator() {
  const [activeTab, setActiveTab] = useState<string>('command');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  
  const {
    systemStatus,
    updateSystemStatus,
    agents,
    addAgent,
    resourceUsage,
    tasks,
    updateResourceUsage
  } = useSystemStore();
  
  // Initialize the system on component mount
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        // Create the primary orchestrator agent
        if (!agents.some(agent => agent.specialization === 'orchestrator')) {
          addAgent({
            name: 'Primary Orchestrator',
            specialization: 'orchestrator',
            status: 'idle',
            tier: 'strategic',
            description: 'Master orchestration agent that coordinates all system activities',
            capabilities: [
              'System coordination',
              'Agent lifecycle management',
              'Task delegation',
              'Resource allocation',
              'System monitoring'
            ],
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
          });
        }
        
        // Add other core agents
        const coreAgents = [
          {
            name: 'System Monitor',
            specialization: 'systemMonitor' as AgentSpecialization,
            status: 'idle' as AgentStatus,
            tier: 'tactical' as ReasoningTier,
            description: 'Monitors system resources and constraints',
            capabilities: [
              'Resource tracking',
              'Constraint management',
              'Performance optimization',
              'Hardware monitoring',
              'Usage reporting'
            ]
          },
          {
            name: 'Communication Coordinator',
            specialization: 'communicationCoordinator' as AgentSpecialization,
            status: 'idle' as AgentStatus,
            tier: 'tactical' as ReasoningTier,
            description: 'Manages communication protocols between agents',
            capabilities: [
              'Message routing',
              'Protocol management',
              'Communication optimization',
              'Channel security',
              'Metadata processing'
            ]
          },
          {
            name: 'Strategic Planner',
            specialization: 'analyst' as AgentSpecialization,
            status: 'idle' as AgentStatus,
            tier: 'strategic' as ReasoningTier,
            description: 'Analyzes problems and develops high-level strategies',
            capabilities: [
              'Strategic analysis',
              'Problem decomposition',
              'Solution architecture',
              'Resource planning',
              'Cross-agent coordination'
            ]
          },
          {
            name: 'Security Guardian',
            specialization: 'security' as AgentSpecialization,
            status: 'idle' as AgentStatus,
            tier: 'tactical' as ReasoningTier,
            description: 'Ensures system security and validates operations',
            capabilities: [
              'Code validation',
              'Security analysis',
              'Vulnerability detection',
              'Access control',
              'Threat mitigation'
            ]
          }
        ];
        
        // Add each core agent if it doesn't exist already
        for (const agentConfig of coreAgents) {
          if (!agents.some(agent => agent.name === agentConfig.name)) {
            addAgent({
              ...agentConfig,
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
            });
          }
        }
        
        // Update resource usage with actual agent count
        updateResourceUsage({
          activeAgentCount: agents.length + coreAgents.filter(a => 
            !agents.some(existing => existing.name === a.name)
          ).length
        });
        
        // Update system status to operational
        updateSystemStatus('operational');
        
        // Finish initialization
        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to initialize the system:', error);
        updateSystemStatus('degraded');
        setIsInitializing(false);
      }
    };

    if (systemStatus === 'starting') {
      initializeSystem();
    } else {
      setIsInitializing(false);
    }
  }, [agents, addAgent, systemStatus, updateSystemStatus, updateResourceUsage]);

  // Render a loading state while the system initializes
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
        {/* Animated background grid */}
        <div className="fixed inset-0 bg-grid-white/[0.05] bg-[length:20px_20px] pointer-events-none"></div>
        
        {/* Floating particles */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-400 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDuration: `${2 + Math.random() * 3}s`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10">
          <div className="relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-md shadow-2xl shadow-purple-500/20">
            <div className="flex flex-col items-center space-y-6">
              {/* Animated brain icon */}
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <BrainCircuit className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-25 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur-xl opacity-20 animate-ping"></div>
              </div>
              
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Initializing AI Orchestrator
                </h2>
                <p className="text-white/60">
                  Preparing agents and system resources...
                </p>
              </div>
              
              {/* Animated progress indicators */}
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              
              {/* Animated progress bar */}
              <div className="w-full max-w-xs">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate system stats for the header
  const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'failed').length;
  const activeAgents = agents.filter(a => a.status !== 'idle').length;

  // Render the main orchestrator interface
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* System integration component - no UI, just functionality */}
      <ModelIntegration />
      
      {/* Animated background grid */}
      <div className="fixed inset-0 bg-grid-white/[0.05] bg-[length:20px_20px] pointer-events-none"></div>
      
      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
      
      <header className="relative border-b border-white/10 bg-black/30 backdrop-blur-xl p-4 sticky top-0 z-10">
        <div className="container flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {/* Animated logo */}
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <BrainCircuit className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl blur opacity-25 animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                AI Orchestrator
              </h1>
              <StatusBadge status={systemStatus} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 animate-pulse"></div>
              <span className="text-sm font-medium text-white/80">Agents: {agents.length}</span>
            </div>
            
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 animate-pulse"></div>
              <span className="text-sm font-medium text-white/80">Tasks: {pendingTasks}</span>
            </div>
            
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 animate-pulse"></div>
              <span className="text-sm font-medium text-white/80">CPU: {resourceUsage.cpuUtilization.toFixed(1)}%</span>
            </div>
            
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse"></div>
              <span className="text-sm font-medium text-white/80">Memory: {resourceUsage.memoryUtilization.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 container py-6">
        <Tabs
          defaultValue="command"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {/* Futuristic Tabs Navigation */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-30"></div>
            <TabsList className="grid grid-cols-4 md:grid-cols-7 w-full relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-1 gap-1">
              <TabsTrigger
                value="command"
                className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/30 data-[state=active]:to-blue-600/30 data-[state=active]:border-purple-500/50 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/20 rounded-xl transition-all duration-300 border border-white/10"
              >
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-pulse"></div>
                  <BrainCircuit className="h-4 w-4 text-white/80" />
                  <span className="hidden sm:inline text-sm font-medium text-white/80">Command</span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="agents"
                className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/30 data-[state=active]:to-blue-600/30 data-[state=active]:border-purple-500/50 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/20 rounded-xl transition-all duration-300 border border-white/10"
              >
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse"></div>
                  <Network className="h-4 w-4 text-white/80" />
                  <span className="hidden sm:inline text-sm font-medium text-white/80">Agents</span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/30 data-[state=active]:to-blue-600/30 data-[state=active]:border-purple-500/50 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/20 rounded-xl transition-all duration-300 border border-white/10"
              >
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full animate-pulse"></div>
                  <Clock className="h-4 w-4 text-white/80" />
                  <span className="hidden sm:inline text-sm font-medium text-white/80">Tasks</span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="models"
                className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/30 data-[state=active]:to-blue-600/30 data-[state=active]:border-purple-500/50 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/20 rounded-xl transition-all duration-300 border border-white/10"
              >
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full animate-pulse"></div>
                  <Bot className="h-4 w-4 text-white/80" />
                  <span className="hidden sm:inline text-sm font-medium text-white/80">Models</span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="communication"
                className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/30 data-[state=active]:to-blue-600/30 data-[state=active]:border-purple-500/50 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/20 rounded-xl transition-all duration-300 border border-white/10"
              >
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-sky-400 rounded-full animate-pulse"></div>
                  <MessageSquare className="h-4 w-4 text-white/80" />
                  <span className="hidden sm:inline text-sm font-medium text-white/80">Communication</span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/30 data-[state=active]:to-blue-600/30 data-[state=active]:border-purple-500/50 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/20 rounded-xl transition-all duration-300 border border-white/10"
              >
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-violet-400 to-purple-400 rounded-full animate-pulse"></div>
                  <Cpu className="h-4 w-4 text-white/80" />
                  <span className="hidden sm:inline text-sm font-medium text-white/80">System</span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="logs"
                className="relative data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/30 data-[state=active]:to-blue-600/30 data-[state=active]:border-purple-500/50 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/20 rounded-xl transition-all duration-300 border border-white/10"
              >
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-gray-400 to-slate-400 rounded-full animate-pulse"></div>
                  <Activity className="h-4 w-4 text-white/80" />
                  <span className="hidden sm:inline text-sm font-medium text-white/80">Logs</span>
                </span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="command" className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                <CommandCenter onCreateAgent={handleCreateAgent} />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="agents" className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                <AgentWorkspace />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="tasks" className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                <TaskManager />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="models" className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <ModelConfiguration />
                  </div>
                  <div className="space-y-6">
                    <ModelPerformanceMetrics />
                    <ModelTester />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="communication" className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-sky-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                <CommunicationVisualizer />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="system" className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                <SystemMonitor />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="logs" className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-500/10 to-slate-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center">
                <div className="relative">
                  <Activity className="h-16 w-16 text-white/20 mb-6 mx-auto" />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-xl opacity-20 scale-125"></div>
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
                  Advanced System Logs
                </h3>
                <p className="text-white/60 max-w-md mx-auto mb-8">
                  The logging system will be implemented in Phase 4, providing detailed operational insights and diagnostic information.
                </p>
                <div className="flex justify-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
  
  function handleCreateAgent(agentConfig: any) {
    const agentFactory = new AgentFactory();
    const agent = agentFactory.createAgent(agentConfig);
    
    // Add the agent to the system
    addAgent({
      name: agentConfig.name,
      specialization: agentConfig.specialization,
      status: 'initializing',
      tier: agentConfig.tier || 'execution',
      description: agentConfig.description || agent.description,
      capabilities: agentConfig.capabilities || agent.capabilities,
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
    });
    
    // Notify other agents about the new agent
    const communicationService = new CommunicationService();
    const orchestratorAgent = agents.find(a => a.specialization === 'orchestrator');
    
    if (orchestratorAgent) {
      communicationService.broadcastMessage(
        orchestratorAgent,
        {
          action: 'agent_created',
          agentId: agent.id,
          agentName: agent.name,
          specialization: agent.specialization,
          tier: agent.tier
        },
        'notification',
        'normal'
      );
    }
    
    // If it's an execution agent, immediately put it into the agent pool
    if (agent.tier === 'execution') {
      const hierarchicalReasoning = new HierarchicalReasoningService();
      
      // Find pending tasks that could be assigned to this agent
      const pendingTasks = tasks.filter(t => 
        t.status === 'pending' && 
        t.assignedAgentIds.length === 0
      );
      
      if (pendingTasks.length > 0) {
        hierarchicalReasoning.assignExecutionAgents(
          pendingTasks[0].id, 
          [agent.specialization]
        );
      }
    }
  }
}

// Helper component for displaying system status
function StatusBadge({ status }: { status: SystemStatus }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'operational':
        return {
          color: 'from-green-400 to-emerald-400',
          icon: <CheckIcon />,
          glow: 'shadow-green-500/20',
          text: 'text-green-400'
        };
      case 'degraded':
        return {
          color: 'from-amber-400 to-orange-400',
          icon: <AlertTriangle className="h-3 w-3" />,
          glow: 'shadow-amber-500/20',
          text: 'text-amber-400'
        };
      case 'maintenance':
        return {
          color: 'from-blue-400 to-cyan-400',
          icon: <Clock className="h-3 w-3" />,
          glow: 'shadow-blue-500/20',
          text: 'text-blue-400'
        };
      case 'shutdown':
        return {
          color: 'from-red-400 to-rose-400',
          icon: <AlertCircle className="h-3 w-3" />,
          glow: 'shadow-red-500/20',
          text: 'text-red-400'
        };
      default:
        return {
          color: 'from-gray-400 to-slate-400',
          icon: null,
          glow: 'shadow-gray-500/20',
          text: 'text-gray-400'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="relative flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
      <div className="relative">
        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.color} animate-pulse`}></div>
        <div className={`absolute -inset-1 bg-gradient-to-r ${config.color} rounded-full blur opacity-25 ${config.glow}`}></div>
      </div>
      <span className={`capitalize text-sm font-medium ${config.text}`}>
        {status}
      </span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}