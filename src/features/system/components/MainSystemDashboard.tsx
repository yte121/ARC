import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSystemStore } from '@/store/system-store';
import { SystemDashboard } from './SystemDashboard';
import { SelfModificationManager } from './SelfModificationManager';
import { SystemMonitor } from '@/features/system/services/SystemMonitor';
import { SystemConstraintManager } from '@/features/system/services/SystemConstraintManager';
import { SelfModificationService } from '@/features/system/services/SelfModificationService';
import { 
  SystemStatus, 
  SystemResourceUsage, 
  SystemConstraints,
  Agent,
  Task 
} from '@/types/agent-types';

interface MainSystemDashboardProps {
  monitor?: SystemMonitor;
  constraintManager?: SystemConstraintManager;
  modificationService?: SelfModificationService;
}

export const MainSystemDashboard: React.FC<MainSystemDashboardProps> = ({
  monitor = new SystemMonitor(),
  constraintManager = new SystemConstraintManager({
    maxAgents: 10,
    maxMemoryUsage: 8192,
    maxCpuUsage: 80,
    maxTokensPerMinute: 5000,
    timeout: 60000
  }),
  modificationService = new SelfModificationService()
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemHealth, setSystemHealth] = useState(100);
  const [recentAlerts, setRecentAlerts] = useState<string[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<any[]>([]);
  const [taskEfficiency, setTaskEfficiency] = useState<any[]>([]);
  const [isSystemOptimized, setIsSystemOptimized] = useState(true);

  const { 
    systemStatus, 
    resourceUsage, 
    constraints, 
    agents, 
    tasks 
  } = useSystemStore.getState();

  // Update dashboard data
  useEffect(() => {
    const updateDashboard = () => {
      // Calculate system health score
      const healthScore = calculateSystemHealth();
      setSystemHealth(healthScore);

      // Get recent alerts
      const alerts = monitor.getHealthReport().alerts.slice(0, 5);
      setRecentAlerts(alerts);

      // Calculate agent performance
      const performance = agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        efficiency: calculateAgentEfficiency(agent),
        tasksCompleted: tasks.filter(t => t.assignedAgentIds?.includes(agent.id) && t.status === 'completed').length,
        avgResponseTime: calculateAvgResponseTime(agent.id)
      }));
      setAgentPerformance(performance);

      // Calculate task efficiency
      const efficiency = tasks.slice(0, 10).map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        progress: task.progress,
        efficiency: calculateTaskEfficiency(task),
        assignedAgents: task.assignedAgentIds?.length || 0
      }));
      setTaskEfficiency(efficiency);

      // Check if system is optimized
      const optimized = checkSystemOptimization();
      setIsSystemOptimized(optimized);
    };

    updateDashboard();
    const interval = setInterval(updateDashboard, 5000);

    return () => clearInterval(interval);
  }, [monitor, agents, tasks]);

  const calculateSystemHealth = (): number => {
    const { resourceUsage, constraints } = useSystemStore.getState();
    
    // Calculate health based on various factors
    const cpuHealth = Math.max(0, 100 - (resourceUsage.cpuUtilization / constraints.maxCpuUsage) * 100);
    const memoryHealth = Math.max(0, 100 - (resourceUsage.memoryUtilization / constraints.maxMemoryUsage) * 100);
    const agentHealth = Math.max(0, 100 - (resourceUsage.activeAgentCount / constraints.maxAgents) * 100);
    const tokenHealth = Math.max(0, 100 - (resourceUsage.tokensUsedLastMinute / constraints.maxTokensPerMinute) * 100);
    
    return Math.round((cpuHealth + memoryHealth + agentHealth + tokenHealth) / 4);
  };

  const calculateAgentEfficiency = (agent: Agent): number => {
    const agentTasks = tasks.filter(t => t.assignedAgentIds?.includes(agent.id));
    const completedTasks = agentTasks.filter(t => t.status === 'completed').length;
    const totalTasks = agentTasks.length;
    
    if (totalTasks === 0) return 0;
    
    const completionRate = (completedTasks / totalTasks) * 100;
    const statusMultiplier = agent.status === 'processing' ? 1.2 : agent.status === 'idle' ? 0.8 : 1;
    
    return Math.min(100, Math.round(completionRate * statusMultiplier));
  };

  const calculateAvgResponseTime = (agentId: string): number => {
    const agentTasks = tasks.filter(t => t.assignedAgentIds?.includes(agentId) && t.status === 'completed');
    if (agentTasks.length === 0) return 0;
    
    const totalTime = agentTasks.reduce((sum, task) => {
      if (task.startedAt && task.completedAt) {
        return sum + (task.completedAt.getTime() - task.startedAt.getTime());
      }
      return sum;
    }, 0);
    
    return Math.round(totalTime / agentTasks.length / 1000); // Convert to seconds
  };

  const calculateTaskEfficiency = (task: Task): number => {
    if (task.status === 'completed') return 100;
    if (task.status === 'failed') return 0;
    
    const progressScore = task.progress;
    const assignedScore = Math.min(100, (task.assignedAgentIds?.length || 0) * 25);
    const timeScore = calculateTimeScore(task);
    
    return Math.round((progressScore + assignedScore + timeScore) / 3);
  };

  const calculateTimeScore = (task: Task): number => {
    const now = new Date();
    const createdAt = task.createdAt;
    const elapsed = now.getTime() - createdAt.getTime();
    const expectedDuration = 300000; // 5 minutes expected duration
    
    return Math.max(0, 100 - (elapsed / expectedDuration) * 100);
  };

  const checkSystemOptimization = (): boolean => {
    const { resourceUsage, constraints } = useSystemStore.getState();
    
    return (
      resourceUsage.cpuUtilization < constraints.maxCpuUsage * 0.7 &&
      resourceUsage.memoryUtilization < constraints.maxMemoryUsage * 0.7 &&
      resourceUsage.activeAgentCount < constraints.maxAgents * 0.8 &&
      resourceUsage.tokensUsedLastMinute < constraints.maxTokensPerMinute * 0.8
    );
  };

  const getStatusColor = (status: SystemStatus): string => {
    switch (status) {
      case 'operational': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'starting': return 'bg-blue-500';
      case 'maintenance': return 'bg-orange-500';
      case 'shutdown': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthColor = (health: number): string => {
    if (health > 80) return 'text-green-500';
    if (health > 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">ARC</span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Agentic Reasoning Core
                </h1>
              </div>
              <Badge className={getStatusColor(systemStatus)}>
                {systemStatus.toUpperCase()}
              </Badge>
              <Badge variant={isSystemOptimized ? 'default' : 'secondary'}>
                {isSystemOptimized ? 'OPTIMIZED' : 'NEEDS OPTIMIZATION'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  System Health
                </div>
                <div className={`text-2xl font-bold ${getHealthColor(systemHealth)}`}>
                  {systemHealth}%
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {agents.filter(a => a.status === 'processing').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
                  <div className="text-2xl">🤖</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{agents.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {agents.filter(a => a.status === 'processing').length} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                  <div className="text-2xl">📋</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {tasks.filter(t => t.status === 'pending').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tasks.filter(t => t.status === 'inProgress').length} in progress
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Health</CardTitle>
                  <div className="text-2xl">❤️</div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getHealthColor(systemHealth)}`}>
                    {systemHealth}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {systemHealth > 80 ? 'Excellent' : systemHealth > 60 ? 'Good' : 'Needs Attention'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Resource Usage</CardTitle>
                  <div className="text-2xl">⚡</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(resourceUsage.cpuUtilization)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    CPU Utilization
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Alerts */}
            {recentAlerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Alerts</CardTitle>
                  <CardDescription>System notifications and warnings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentAlerts.map((alert, index) => (
                      <Alert key={index} className={alert.includes('CRITICAL') ? 'border-red-500' : 'border-yellow-500'}>
                        <AlertDescription>{alert}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Performance</CardTitle>
                  <CardDescription>Efficiency and task completion rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {agentPerformance.slice(0, 5).map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            agent.status === 'processing' ? 'bg-green-500' :
                            agent.status === 'idle' ? 'bg-gray-500' : 'bg-yellow-500'
                          }`} />
                          <span className="text-sm font-medium">{agent.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{agent.efficiency}%</div>
                          <div className="text-xs text-muted-foreground">
                            {agent.tasksCompleted} tasks
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Task Efficiency</CardTitle>
                  <CardDescription>Current task progress and efficiency</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {taskEfficiency.slice(0, 5).map((task) => (
                      <div key={task.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{task.title}</span>
                          <span className={task.efficiency > 80 ? 'text-green-500' : task.efficiency > 60 ? 'text-yellow-500' : 'text-red-500'}>
                            {task.efficiency}%
                          </span>
                        </div>
                        <Progress value={task.progress} className="h-1" />
                        <div className="text-xs text-muted-foreground">
                          {task.status} • {task.assignedAgents} agents
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="resources">
            <SystemDashboard monitor={monitor} constraintManager={constraintManager} />
          </TabsContent>

          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <CardTitle>Agent Management</CardTitle>
                <CardDescription>Monitor and manage all AI agents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agents.map((agent) => (
                    <div key={agent.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{agent.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {agent.specialization} • Tier {agent.tier}
                          </p>
                        </div>
                        <Badge className={
                          agent.status === 'processing' ? 'bg-green-500' :
                          agent.status === 'idle' ? 'bg-gray-500' :
                          agent.status === 'waiting' ? 'bg-blue-500' :
                          agent.status === 'completed' ? 'bg-purple-500' : 'bg-red-500'
                        }>
                          {agent.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Efficiency:</span> {calculateAgentEfficiency(agent)}%
                        </div>
                        <div>
                          <span className="font-medium">Tasks:</span> {tasks.filter(t => t.assignedAgentIds?.includes(agent.id)).length}
                        </div>
                        <div>
                          <span className="font-medium">Last Active:</span> {agent.lastActive.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>Task Management</CardTitle>
                <CardDescription>Monitor and manage all system tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{task.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {task.description}
                          </p>
                        </div>
                        <Badge className={
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'inProgress' ? 'bg-blue-500' :
                          task.status === 'pending' ? 'bg-yellow-500' :
                          task.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                        }>
                          {task.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-2" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Priority:</span> {task.priority}
                          </div>
                          <div>
                            <span className="font-medium">Assigned:</span> {task.assignedAgentIds?.length || 0} agents
                          </div>
                          <div>
                            <span className="font-medium">Created:</span> {task.createdAt.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <SelfModificationManager modificationService={modificationService} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};