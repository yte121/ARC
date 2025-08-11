import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Cpu, 
  HardDrive, 
  Activity, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { useSystemStore } from '@/store/system-store';
import { APIService } from '@/services/APIService';
import { ModelProvider, SystemConstraints } from '@/types/agent-types';

export function SystemMonitor() {
  const { 
    resourceUsage, 
    constraints, 
    activeModelConfig, 
    updateModelConfig, 
    agents, 
    tasks 
  } = useSystemStore();
  
  const [constraintsForm, setConstraintsForm] = useState<SystemConstraints>(constraints);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<number[]>([]);
  const [tokenHistory, setTokenHistory] = useState<number[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const apiService = new APIService();

  // Update constraints form when constraints change
  useEffect(() => {
    setConstraintsForm(constraints);
  }, [constraints]);

  // Real system monitoring
  useEffect(() => {
    const fetchSystemMetrics = async () => {
      try {
        const metrics = await apiService.getSystemMetrics();
        setSystemMetrics(metrics);
        
        if (metrics) {
          // Update current values with real data
          useSystemStore.setState({
            resourceUsage: {
              ...resourceUsage,
              cpuUtilization: metrics.cpu || 0,
              memoryUtilization: metrics.memory || 0,
              tokensUsedLastMinute: metrics.tokens || 0
            }
          });

          // Update historical data
          setCpuHistory(prev => [...prev.slice(-19), metrics.cpu || 0]);
          setMemoryHistory(prev => [...prev.slice(-19), metrics.memory || 0]);
          setTokenHistory(prev => [...prev.slice(-19), (metrics.tokens || 0) / 100]); // Scale down for visualization
        }
      } catch (error) {
        console.error('Failed to fetch system metrics:', error);
      }
    };

    // Initial fetch
    fetchSystemMetrics();

    // Set up interval for real-time updates
    const interval = setInterval(fetchSystemMetrics, 3000);

    return () => clearInterval(interval);
  }, [resourceUsage]);

  const handleModelProviderChange = (provider: ModelProvider) => {
    updateModelConfig({ provider });
  };

  const handleModelNameChange = (modelName: string) => {
    updateModelConfig({ modelName });
  };
  
  const handleConstraintChange = (key: keyof SystemConstraints, value: number) => {
    setConstraintsForm(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const saveConstraints = async () => {
    setIsLoading(true);
    try {
      await apiService.updateSystemConstraints(constraintsForm);
      useSystemStore.setState({
        constraints: constraintsForm
      });
    } catch (error) {
      console.error('Failed to update constraints:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate various system metrics
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const failedTasks = tasks.filter(task => task.status === 'failed').length;
  const totalTasks = tasks.length;
  const taskSuccessRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const activeAgents = agents.filter(agent => 
    agent.status !== 'idle' && 
    agent.status !== 'failed' && 
    agent.status !== 'completed'
  ).length;

  // Calculate average response time across agents
  const avgResponseTime = agents.length > 0
    ? agents.reduce((sum, agent) => sum + agent.performance.responseTime, 0) / agents.length
    : 0;

  const getSystemStatus = () => {
    const cpuOverLimit = resourceUsage.cpuUtilization > constraints.maxCpuUsage;
    const memoryOverLimit = resourceUsage.memoryUtilization > constraints.maxMemoryUsage;
    const tokensOverLimit = resourceUsage.tokensUsedLastMinute > constraints.maxTokensPerMinute;
    
    if (cpuOverLimit || memoryOverLimit || tokensOverLimit) {
      return { status: 'warning', icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />, text: 'System under stress' };
    }
    
    return { status: 'healthy', icon: <CheckCircle className="h-4 w-4 text-green-500" />, text: 'System healthy' };
  };

  const systemStatus = getSystemStatus();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Usage Card */}
        <ResourceCard
          icon={<Cpu className="h-5 w-5 text-primary" />}
          title="CPU Usage"
          value={`${resourceUsage.cpuUtilization.toFixed(1)}%`}
          progressValue={resourceUsage.cpuUtilization}
          maxValue={constraints.maxCpuUsage}
          chartData={cpuHistory}
        />
        
        {/* Memory Usage Card */}
        <ResourceCard
          icon={<HardDrive className="h-5 w-5 text-primary" />}
          title="Memory Usage"
          value={`${resourceUsage.memoryUtilization.toFixed(1)}%`}
          progressValue={resourceUsage.memoryUtilization}
          maxValue={100}
          chartData={memoryHistory}
        />
        
        {/* Token Usage Card */}
        <ResourceCard
          icon={<Activity className="h-5 w-5 text-primary" />}
          title="Token Usage"
          value={`${resourceUsage.tokensUsedLastMinute} / min`}
          progressValue={(resourceUsage.tokensUsedLastMinute / constraints.maxTokensPerMinute) * 100}
          maxValue={100}
          chartData={tokenHistory}
        />
        
        {/* System Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            {systemStatus.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus.text}</div>
            <p className="text-xs text-muted-foreground">
              {activeAgents} active agents, {totalTasks} total tasks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskSuccessRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {completedTasks} completed, {failedTasks} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              Across {agents.length} agents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAgents}</div>
            <p className="text-xs text-muted-foreground">
              Out of {agents.length} total agents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Model Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Model Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">AI Provider</Label>
              <Select
                value={activeModelConfig.provider}
                onValueChange={handleModelProviderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select
                value={activeModelConfig.modelName}
                onValueChange={handleModelNameChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                  <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Constraints */}
      <Card>
        <CardHeader>
          <CardTitle>System Constraints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxCpu">Max CPU Usage (%)</Label>
              <Input
                id="maxCpu"
                type="number"
                value={constraintsForm.maxCpuUsage}
                onChange={(e) => handleConstraintChange('maxCpuUsage', Number(e.target.value))}
                min="1"
                max="100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxMemory">Max Memory Usage (%)</Label>
              <Input
                id="maxMemory"
                type="number"
                value={constraintsForm.maxMemoryUsage}
                onChange={(e) => handleConstraintChange('maxMemoryUsage', Number(e.target.value))}
                min="1"
                max="100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens per Minute</Label>
              <Input
                id="maxTokens"
                type="number"
                value={constraintsForm.maxTokensPerMinute}
                onChange={(e) => handleConstraintChange('maxTokensPerMinute', Number(e.target.value))}
                min="1"
              />
            </div>
          </div>
          
          <Button onClick={saveConstraints} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Constraints'}
          </Button>
        </CardContent>
      </Card>

      {/* Real-time System Metrics */}
      {systemMetrics && (
        <Card>
          <CardHeader>
            <CardTitle>Real-time System Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Uptime:</span> {systemMetrics.uptime || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Load Average:</span> {systemMetrics.loadAverage || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Network I/O:</span> {systemMetrics.networkIO || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Disk I/O:</span> {systemMetrics.diskIO || 'N/A'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface ResourceCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  progressValue: number;
  maxValue: number;
  chartData?: number[];
}

function ResourceCard({ icon, title, value, progressValue, maxValue, chartData = [] }: ResourceCardProps) {
  const getProgressColor = () => {
    const percentage = (progressValue / maxValue) * 100;
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <Progress 
          value={(progressValue / maxValue) * 100} 
          className="mt-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {progressValue.toFixed(1)} / {maxValue}
        </p>
      </CardContent>
    </Card>
  );
}