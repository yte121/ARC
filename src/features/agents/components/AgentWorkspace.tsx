import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Bot, 
  Brain, 
  Code, 
  Monitor, 
  MessageSquare, 
  Search, 
  Palette, 
  Shield,
  Play,
  Pause,
  X,
  Users,
  Activity,
  Zap
} from 'lucide-react';
import { useSystemStore } from '@/store/system-store';
import { APIService } from '@/services/APIService';
import { Agent, AgentStatus, AgentSpecialization, ReasoningTier } from '@/types/agent-types';

export function AgentWorkspace() {
  const { agents, removeAgent, updateAgentStatus } = useSystemStore();
  const [filterStatus, setFilterStatus] = useState<AgentStatus | 'all'>('all');
  const [filterTier, setFilterTier] = useState<ReasoningTier | 'all'>('all');
  const [filterSpecialization, setFilterSpecialization] = useState<AgentSpecialization | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentSpecialization, setNewAgentSpecialization] = useState<AgentSpecialization>('analyst');
  const [newAgentTier, setNewAgentTier] = useState<ReasoningTier>('execution');
  const [isLoading, setIsLoading] = useState(false);
  
  const apiService = new APIService();

  // Real agent management
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const fetchedAgents = await apiService.getAgents();
        // Update store with fetched agents
        useSystemStore.setState({ agents: fetchedAgents });
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    };

    fetchAgents();
  }, []);

  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) return;

    setIsLoading(true);
    try {
      const agentData = {
        name: newAgentName,
        specialization: newAgentSpecialization,
        tier: newAgentTier,
        status: 'initializing' as AgentStatus,
        performance: {
          responseTime: 0,
          successRate: 100,
          tasksCompleted: 0,
          tokensUsed: 0
        }
      };

      const newAgent = await apiService.createAgent(agentData);
      
      // Update store
      useSystemStore.setState(prev => ({
        agents: [...prev.agents, newAgent]
      }));

      // Reset form
      setNewAgentName('');
      setNewAgentSpecialization('analyst');
      setNewAgentTier('execution');
      setIsCreateDialogOpen(false);
      
      // Real agent initialization
      setTimeout(async () => {
        try {
          await apiService.updateAgentStatus(newAgent.id, 'idle');
          updateAgentStatus(newAgent.id, 'idle');
        } catch (error) {
          console.error('Failed to update agent status:', error);
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to create agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAgent = async (agentId: string) => {
    try {
      await apiService.deleteAgent(agentId);
      removeAgent(agentId);
    } catch (error) {
      console.error('Failed to remove agent:', error);
    }
  };

  const handleStatusChange = async (agentId: string, status: AgentStatus) => {
    try {
      await apiService.updateAgentStatus(agentId, status);
      updateAgentStatus(agentId, status);
    } catch (error) {
      console.error('Failed to update agent status:', error);
    }
  };

  // Filter agents based on selected filters
  const filteredAgents = agents.filter(agent => {
    if (filterStatus !== 'all' && agent.status !== filterStatus) return false;
    if (filterTier !== 'all' && agent.tier !== filterTier) return false;
    if (filterSpecialization !== 'all' && agent.specialization !== filterSpecialization) return false;
    return true;
  });

  const getSpecializationIcon = (specialization: AgentSpecialization) => {
    switch (specialization) {
      case 'orchestrator':
        return <Brain className="h-5 w-5" />;
      case 'codeGenerator':
        return <Code className="h-5 w-5" />;
      case 'systemMonitor':
        return <Monitor className="h-5 w-5" />;
      case 'communicationCoordinator':
        return <MessageSquare className="h-5 w-5" />;
      case 'analyst':
        return <Search className="h-5 w-5" />;
      case 'uiManager':
        return <Palette className="h-5 w-5" />;
      case 'security':
        return <Shield className="h-5 w-5" />;
      default:
        return <Bot className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'idle':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTierColor = (tier: ReasoningTier) => {
    switch (tier) {
      case 'strategic':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'tactical':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'execution':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filterStatus}
            onValueChange={(value) => setFilterStatus(value as AgentStatus | 'all')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="initializing">Initializing</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={filterTier}
            onValueChange={(value) => setFilterTier(value as ReasoningTier | 'all')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="strategic">Strategic</SelectItem>
              <SelectItem value="tactical">Tactical</SelectItem>
              <SelectItem value="execution">Execution</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={filterSpecialization}
            onValueChange={(value) => setFilterSpecialization(value as AgentSpecialization | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter Specialization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specializations</SelectItem>
              <SelectItem value="orchestrator">Orchestrator</SelectItem>
              <SelectItem value="codeGenerator">Code Generator</SelectItem>
              <SelectItem value="systemMonitor">System Monitor</SelectItem>
              <SelectItem value="communicationCoordinator">Communication Coordinator</SelectItem>
              <SelectItem value="analyst">Analyst</SelectItem>
              <SelectItem value="uiManager">UI Manager</SelectItem>
              <SelectItem value="security">Security</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Create Agent Button */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
              <DialogDescription>
                Configure a new specialized agent to add to the system.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right text-sm font-medium">
                  Name
                </Label>
                <Input
                  id="name"
                  placeholder="Agent name"
                  className="col-span-3"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="specialization" className="text-right text-sm font-medium">
                  Specialization
                </Label>
                <Select
                  value={newAgentSpecialization}
                  onValueChange={(value) => setNewAgentSpecialization(value as AgentSpecialization)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orchestrator">Orchestrator</SelectItem>
                    <SelectItem value="codeGenerator">Code Generator</SelectItem>
                    <SelectItem value="systemMonitor">System Monitor</SelectItem>
                    <SelectItem value="communicationCoordinator">Communication Coordinator</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="uiManager">UI Manager</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tier" className="text-right text-sm font-medium">
                  Reasoning Tier
                </Label>
                <Select
                  value={newAgentTier}
                  onValueChange={(value) => setNewAgentTier(value as ReasoningTier)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strategic">Strategic</SelectItem>
                    <SelectItem value="tactical">Tactical</SelectItem>
                    <SelectItem value="execution">Execution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAgent} disabled={isLoading || !newAgentName.trim()}>
                {isLoading ? 'Creating...' : 'Create Agent'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No agents found</h3>
            <p className="text-muted-foreground mb-4">
              {agents.length === 0 ? 'Create your first agent to get started' : 'No agents match the current filters'}
            </p>
            {agents.length === 0 && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Agent
              </Button>
            )}
          </div>
        ) : (
          filteredAgents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onRemove={handleRemoveAgent}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface AgentCardProps {
  agent: Agent;
  onRemove: (agentId: string) => void;
  onStatusChange: (agentId: string, status: AgentStatus) => void;
}

function AgentCard({ agent, onRemove, onStatusChange }: AgentCardProps) {
  const getSpecializationIcon = (specialization: AgentSpecialization) => {
    switch (specialization) {
      case 'orchestrator':
        return <Brain className="h-5 w-5 text-purple-500" />;
      case 'codeGenerator':
        return <Code className="h-5 w-5 text-blue-500" />;
      case 'systemMonitor':
        return <Monitor className="h-5 w-5 text-green-500" />;
      case 'communicationCoordinator':
        return <MessageSquare className="h-5 w-5 text-orange-500" />;
      case 'analyst':
        return <Search className="h-5 w-5 text-indigo-500" />;
      case 'uiManager':
        return <Palette className="h-5 w-5 text-pink-500" />;
      case 'security':
        return <Shield className="h-5 w-5 text-red-500" />;
      default:
        return <Bot className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'idle':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTierColor = (tier: ReasoningTier) => {
    switch (tier) {
      case 'strategic':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'tactical':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'execution':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getSpecializationIcon(agent.specialization)}
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <p className="text-sm text-muted-foreground capitalize">
                {agent.specialization.replace(/([A-Z])/g, ' $1').trim()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(agent.id)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status and Tier */}
        <div className="flex items-center gap-2">
          <Badge className={`text-xs ${getStatusColor(agent.status)}`}>
            {agent.status}
          </Badge>
          <Badge className={`text-xs ${getTierColor(agent.tier)}`}>
            {agent.tier}
          </Badge>
        </div>
        
        {/* Performance Metrics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Response Time</span>
            <span className="font-medium">{agent.performance.responseTime}ms</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Success Rate</span>
            <span className="font-medium">{agent.performance.successRate}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Tasks Completed</span>
            <span className="font-medium">{agent.performance.tasksCompleted}</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {agent.status === 'idle' && (
            <Button
              size="sm"
              onClick={() => onStatusChange(agent.id, 'processing')}
              className="flex-1"
            >
              <Play className="mr-2 h-3 w-3" />
              Start
            </Button>
          )}
          
          {agent.status === 'processing' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(agent.id, 'idle')}
              className="flex-1"
            >
              <Pause className="mr-2 h-3 w-3" />
              Pause
            </Button>
          )}
          
          <Select
            value={agent.status}
            onValueChange={(value) => onStatusChange(agent.id, value as AgentStatus)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}