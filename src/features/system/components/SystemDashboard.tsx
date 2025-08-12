import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSystemStore } from '@/store/system-store';
import { SystemMonitor } from '@/features/system/services/SystemMonitor';
import { SystemConstraintManager } from '@/features/system/services/SystemConstraintManager';
import { ResourceOptimizer } from '@/features/system/services/ResourceOptimizer';
import { ResourceOptimizerManager } from './ResourceOptimizerManager';
import { ErrorRecoveryService } from '@/features/system/services/ErrorRecoveryService';
import { ErrorRecoveryManager } from './ErrorRecoveryManager';
import { UserCommandSupremacyService } from '@/features/system/services/UserCommandSupremacyService';
import { UserCommandSupremacyManager } from './UserCommandSupremacyManager';
import {
  SystemStatus,
  SystemResourceUsage,
  SystemConstraints
} from '@/types/agent-types';

interface SystemDashboardProps {
  monitor?: SystemMonitor;
  constraintManager?: SystemConstraintManager;
  resourceOptimizer?: ResourceOptimizer;
  errorRecoveryService?: ErrorRecoveryService;
  commandSupremacyService?: UserCommandSupremacyService;
}

export const SystemDashboard: React.FC<SystemDashboardProps> = ({
  monitor = new SystemMonitor(),
  constraintManager = new SystemConstraintManager({
    maxAgents: 10,
    maxMemoryUsage: 8192,
    maxCpuUsage: 80,
    maxTokensPerMinute: 5000,
    timeout: 60000
  }),
  resourceOptimizer = new ResourceOptimizer({
    maxAgents: 10,
    maxMemoryUsage: 8192,
    maxCpuUsage: 80,
    maxTokensPerMinute: 5000,
    timeout: 60000
  }),
  errorRecoveryService = new ErrorRecoveryService(),
  commandSupremacyService = new UserCommandSupremacyService()
}) => {
  const [healthReport, setHealthReport] = useState<any>(null);
  const [constraintAnalysis, setConstraintAnalysis] = useState<any>(null);
  const [resourceHistory, setResourceHistory] = useState<SystemResourceUsage[]>([]);
  const [isAutoTuningEnabled, setIsAutoTuningEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('resources');

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
      setHealthReport(monitor.getHealthReport());
      setConstraintAnalysis(constraintManager.getConstraintAnalysis());
      setResourceHistory(monitor.getResourceHistory(20));
    };

    updateDashboard();
    const interval = setInterval(updateDashboard, 5000);

    return () => clearInterval(interval);
  }, [monitor, constraintManager]);

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

  const getUtilizationColor = (utilization: number): string => {
    if (utilization > 90) return 'text-red-500';
    if (utilization > 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(systemStatus)}>
            {systemStatus.toUpperCase()}
          </Badge>
          <Badge variant={isAutoTuningEnabled ? 'default' : 'secondary'}>
            Auto-Tuning: {isAutoTuningEnabled ? 'ON' : 'OFF'}
          </Badge>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthReport?.score || 100}</div>
            <p className="text-xs text-muted-foreground">Health Score</p>
          </CardContent>
        </Card>

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
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <div className="text-2xl">⚡</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.3s</div>
            <p className="text-xs text-muted-foreground">Average</p>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="resources">Resource Usage</TabsTrigger>
          <TabsTrigger value="constraints">Constraints</TabsTrigger>
          <TabsTrigger value="optimizer">Resource Optimizer</TabsTrigger>
          <TabsTrigger value="command-supremacy">Command Supremacy</TabsTrigger>
          <TabsTrigger value="error-recovery">Error Recovery</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Recommendations</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>CPU Usage</CardTitle>
                <CardDescription>Current CPU utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{resourceUsage.cpuUtilization}%</span>
                    <span className={getUtilizationColor(resourceUsage.cpuUtilization)}>
                      {resourceUsage.cpuUtilization > 90 ? 'Critical' : 
                       resourceUsage.cpuUtilization > 70 ? 'Warning' : 'Normal'}
                    </span>
                  </div>
                  <Progress value={resourceUsage.cpuUtilization} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Limit: {constraints.maxCpuUsage}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Memory Usage</CardTitle>
                <CardDescription>Current memory utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{formatBytes(resourceUsage.memoryUtilization)}</span>
                    <span className={getUtilizationColor(resourceUsage.memoryUtilization / constraints.maxMemoryUsage * 100)}>
                      {resourceUsage.memoryUtilization > constraints.maxMemoryUsage * 0.9 ? 'Critical' : 
                       resourceUsage.memoryUtilization > constraints.maxMemoryUsage * 0.7 ? 'Warning' : 'Normal'}
                    </span>
                  </div>
                  <Progress 
                    value={(resourceUsage.memoryUtilization / constraints.maxMemoryUsage) * 100} 
                    className="h-2" 
                  />
                  <p className="text-xs text-muted-foreground">
                    Limit: {formatBytes(constraints.maxMemoryUsage)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agent Utilization</CardTitle>
                <CardDescription>Active agents vs capacity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{resourceUsage.activeAgentCount}/{constraints.maxAgents}</span>
                    <span className={getUtilizationColor(resourceUsage.activeAgentCount / constraints.maxAgents * 100)}>
                      {resourceUsage.activeAgentCount > constraints.maxAgents * 0.9 ? 'Critical' : 
                       resourceUsage.activeAgentCount > constraints.maxAgents * 0.7 ? 'Warning' : 'Normal'}
                    </span>
                  </div>
                  <Progress 
                    value={(resourceUsage.activeAgentCount / constraints.maxAgents) * 100} 
                    className="h-2" 
                  />
                  <p className="text-xs text-muted-foreground">
                    {constraints.maxAgents - resourceUsage.activeAgentCount} available slots
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Token Rate</CardTitle>
                <CardDescription>API token usage rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{resourceUsage.tokensUsedLastMinute}/min</span>
                    <span className={getUtilizationColor(resourceUsage.tokensUsedLastMinute / constraints.maxTokensPerMinute * 100)}>
                      {resourceUsage.tokensUsedLastMinute > constraints.maxTokensPerMinute * 0.9 ? 'Critical' : 
                       resourceUsage.tokensUsedLastMinute > constraints.maxTokensPerMinute * 0.7 ? 'Warning' : 'Normal'}
                    </span>
                  </div>
                  <Progress 
                    value={(resourceUsage.tokensUsedLastMinute / constraints.maxTokensPerMinute) * 100} 
                    className="h-2" 
                  />
                  <p className="text-xs text-muted-foreground">
                    Limit: {constraints.maxTokensPerMinute}/min
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="command-supremacy" className="space-y-4">
          <UserCommandSupremacyManager commandSupremacyService={commandSupremacyService} />
        </TabsContent>

        <TabsContent value="error-recovery" className="space-y-4">
          <ErrorRecoveryManager errorRecoveryService={errorRecoveryService} />
        </TabsContent>

        <TabsContent value="optimizer" className="space-y-4">
          <ResourceOptimizerManager resourceOptimizer={resourceOptimizer} />
        </TabsContent>

        <TabsContent value="constraints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Constraints</CardTitle>
              <CardDescription>System resource limits and policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Agents</label>
                  <div className="text-2xl font-bold">{constraints.maxAgents}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Memory</label>
                  <div className="text-2xl font-bold">{formatBytes(constraints.maxMemoryUsage)}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max CPU</label>
                  <div className="text-2xl font-bold">{constraints.maxCpuUsage}%</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Tokens/Min</label>
                  <div className="text-2xl font-bold">{constraints.maxTokensPerMinute}</div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Auto-Tuning</label>
                  <button
                    onClick={() => {
                      setIsAutoTuningEnabled(!isAutoTuningEnabled);
                      constraintManager.setAutoTuning(!isAutoTuningEnabled);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      isAutoTuningEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        isAutoTuningEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Constraint Health</CardTitle>
              <CardDescription>Overall constraint system health and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Constraint Health Score</span>
                  <span className="text-2xl font-bold">{constraintManager.getConstraintHealthScore()}/100</span>
                </div>
                <Progress value={constraintManager.getConstraintHealthScore()} className="h-2" />
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Trend:</span> {constraintAnalysis?.trend}
                  </div>
                  <div>
                    <span className="font-medium">Violations:</span> {constraintAnalysis?.violations.length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {healthReport?.alerts.length > 0 ? (
            <div className="space-y-2">
              {healthReport.alerts.map((alert: string, index: number) => (
                <Alert key={index} className={alert.includes('CRITICAL') ? 'border-red-500' : 'border-yellow-500'}>
                  <AlertDescription>{alert}</AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No active alerts</p>
              </CardContent>
            </Card>
          )}

          {constraintAnalysis?.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>Suggested improvements for system performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {constraintAnalysis.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-sm flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Usage History</CardTitle>
              <CardDescription>Recent resource utilization trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resourceHistory.slice(-10).map((usage, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{new Date().toLocaleTimeString()}</span>
                    <span>CPU: {usage.cpuUtilization}%</span>
                    <span>Memory: {formatBytes(usage.memoryUtilization)}</span>
                    <span>Agents: {usage.activeAgentCount}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};