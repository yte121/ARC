import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, XCircle, RefreshCw, Settings, Activity } from 'lucide-react';
import { ErrorRecoveryService, ErrorEvent, ErrorSeverity, RecoveryStats } from '@/features/system/services/ErrorRecoveryService';
import { useSystemStore } from '@/store/system-store';

interface ErrorRecoveryManagerProps {
  errorRecoveryService?: ErrorRecoveryService;
}

export const ErrorRecoveryManager: React.FC<ErrorRecoveryManagerProps> = ({
  errorRecoveryService = new ErrorRecoveryService()
}) => {
  const [recoveryStats, setRecoveryStats] = useState<RecoveryStats | null>(null);
  const [recentErrors, setRecentErrors] = useState<ErrorEvent[]>([]);
  const [activeRecoveries, setActiveRecoveries] = useState<any[]>([]);
  const [circuitBreakers, setCircuitBreakers] = useState<Map<string, any>>(new Map());
  const [selectedError, setSelectedError] = useState<ErrorEvent | null>(null);
  const [autoRecoveryEnabled, setAutoRecoveryEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { systemStatus } = useSystemStore.getState();

  // Update data
  useEffect(() => {
    const updateData = () => {
      setRecoveryStats(errorRecoveryService.getRecoveryStats());
      setRecentErrors(errorRecoveryService.getRecentErrors(20));
      setActiveRecoveries(errorRecoveryService.getActiveRecoveries());
      setCircuitBreakers(errorRecoveryService.getCircuitBreakerStatus());
    };

    updateData();
    const interval = setInterval(updateData, 5000);

    return () => clearInterval(interval);
  }, [errorRecoveryService]);

  const handleManualRecovery = async (errorId: string) => {
    setIsLoading(true);
    try {
      await errorRecoveryService.manualRecovery(errorId);
      // Refresh data
      setRecentErrors(errorRecoveryService.getRecentErrors(20));
    } catch (error) {
      console.error('Manual recovery failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetCircuitBreaker = (breakerKey: string) => {
    errorRecoveryService.resetCircuitBreaker(breakerKey);
    setCircuitBreakers(errorRecoveryService.getCircuitBreakerStatus());
  };

  const getSeverityColor = (severity: ErrorSeverity): string => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      case 'info': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'info':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 90) return 'text-green-500';
    if (rate >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Error Recovery Manager</h1>
        <div className="flex items-center space-x-2">
          <Badge variant={autoRecoveryEnabled ? 'default' : 'secondary'}>
            Auto-Recovery: {autoRecoveryEnabled ? 'ON' : 'OFF'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRecentErrors(errorRecoveryService.getRecentErrors(20));
              setActiveRecoveries(errorRecoveryService.getActiveRecoveries());
              setCircuitBreakers(errorRecoveryService.getCircuitBreakerStatus());
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Recovery Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recoveryStats?.totalErrors || 0}</div>
            <p className="text-xs text-muted-foreground">
              {recoveryStats?.criticalErrors || 0} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovery Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSuccessRateColor(recoveryStats?.recoverySuccessRate || 0)}`}>
              {(recoveryStats?.recoverySuccessRate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Auto-recovery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Recoveries</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRecoveries.length}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.9%</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Recovery Dashboard */}
      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Recent Errors</TabsTrigger>
          <TabsTrigger value="recoveries">Active Recoveries</TabsTrigger>
          <TabsTrigger value="circuit-breakers">Circuit Breakers</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Error Events</CardTitle>
              <CardDescription>
                Latest system errors and their recovery status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentErrors.length === 0 ? (
                  <p className="text-center text-muted-foreground">No recent errors</p>
                ) : (
                  recentErrors.map((error) => (
                    <Collapsible key={error.id}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-center space-x-3">
                            {getSeverityIcon(error.severity)}
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{error.message}</span>
                                <Badge className={getSeverityColor(error.severity)}>
                                  {error.severity.toUpperCase()}
                                </Badge>
                                <Badge variant="outline">{error.category}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatTimestamp(error.timestamp)} • {error.source}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {error.recoverySuccess ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : error.recoveryAttempted ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className="p-4 border-t bg-gray-50 space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Source:</span> {error.source}
                            </div>
                            <div>
                              <span className="font-medium">Category:</span> {error.category}
                            </div>
                            <div>
                              <span className="font-medium">Context:</span>
                              <div className="text-xs text-muted-foreground">
                                Agent: {error.context.agentId || 'N/A'}<br />
                                Task: {error.context.taskId || 'N/A'}<br />
                                Component: {error.context.component || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Impact:</span>
                              <div className="text-xs text-muted-foreground">
                                Status: {error.impact.systemStatus}<br />
                                Agents: {error.impact.affectedAgents.length}<br />
                                Tasks: {error.impact.affectedTasks.length}
                              </div>
                            </div>
                          </div>
                          
                          {error.details && Object.keys(error.details).length > 0 && (
                            <div>
                              <span className="font-medium">Details:</span>
                              <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(error.details, null, 2)}
                              </pre>
                            </div>
                          )}

                          {error.recoveryActions.length > 0 && (
                            <div>
                              <span className="font-medium">Recovery Actions:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {error.recoveryActions.map((actionId, index) => (
                                  <Badge key={index} variant="secondary">
                                    {actionId}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end space-x-2">
                            {!error.recoverySuccess && !isLoading && (
                              <Button
                                size="sm"
                                onClick={() => handleManualRecovery(error.id)}
                              >
                                Attempt Manual Recovery
                              </Button>
                            )}
                            {isLoading && (
                              <Button size="sm" disabled>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </Button>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recoveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Recovery Operations</CardTitle>
              <CardDescription>
                Currently running recovery actions and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeRecoveries.length === 0 ? (
                <p className="text-center text-muted-foreground">No active recoveries</p>
              ) : (
                <div className="space-y-4">
                  {activeRecoveries.map((recovery, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{recovery.type}</Badge>
                          <span className="font-medium">{recovery.description}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Priority: {recovery.priority}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Timeout: {recovery.timeout}ms • Max Attempts: {recovery.maxAttempts}
                      </div>
                      <Progress value={75} className="mt-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="circuit-breakers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Circuit Breaker Status</CardTitle>
              <CardDescription>
                Current status of all circuit breakers in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {circuitBreakers.size === 0 ? (
                <p className="text-center text-muted-foreground">No circuit breakers active</p>
              ) : (
                <div className="space-y-4">
                  {Array.from(circuitBreakers.entries()).map(([key, breaker]) => (
                    <div key={key} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={breaker.state === 'closed' ? 'default' : 'destructive'}>
                            {breaker.state.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{key}</span>
                        </div>
                        {breaker.state !== 'closed' && (
                          <Button
                            size="sm"
                            onClick={() => handleResetCircuitBreaker(key)}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Failures:</span> {breaker.failureCount}
                        </div>
                        <div>
                          <span className="font-medium">Last Failure:</span>
                          <div className="text-xs text-muted-foreground">
                            {new Date(breaker.lastFailure).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Threshold:</span> {breaker.threshold}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recovery Strategy Effectiveness</CardTitle>
                <CardDescription>
                  Success rate by recovery strategy type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from(recoveryStats?.recoveryStrategyEffectiveness.entries() || []).map(([strategy, count]) => (
                    <div key={strategy} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{strategy}</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={Math.min(count * 10, 100)} className="w-20" />
                        <span className="text-sm">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Common Error Patterns</CardTitle>
                <CardDescription>
                  Most frequently occurring error patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from(recoveryStats?.commonErrorPatterns.entries() || [])
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([pattern, count]) => (
                      <div key={pattern} className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{pattern}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Health Overview</CardTitle>
              <CardDescription>
                Comprehensive system health and error recovery metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {recoveryStats?.recoverySuccessRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Recovery Success</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">
                    {recoveryStats?.totalErrors || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">
                    {((Date.now() - (recoveryStats?.systemUptime || Date.now())) / 1000 / 60 / 60).toFixed(1)}h
                  </div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};