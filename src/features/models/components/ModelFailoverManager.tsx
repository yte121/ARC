import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Settings,
  TrendingUp,
  Zap,
  Shield,
  Server
} from 'lucide-react';
import { ModelManager } from '../services/ModelManager';
import { ModelProvider, ModelHealthStatus } from '@/types/agent-types';
import { useToast } from '@/hooks/use-toast';

interface ModelFailoverManagerProps {
  modelManager: ModelManager;
}

export function ModelFailoverManager({ modelManager }: ModelFailoverManagerProps) {
  const [healthStatus, setHealthStatus] = useState<ModelHealthStatus[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [failoverConfig, setFailoverConfig] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider>('local');
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    loadData();
    
    // Set up periodic refresh
    const interval = setInterval(() => {
      loadData();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [health, metrics, config] = await Promise.all([
        modelManager.getModelHealthStatus(),
        modelManager.getModelPerformanceMetrics(),
        modelManager.getFailoverConfig()
      ]);
      
      setHealthStatus(health);
      setPerformanceMetrics(metrics);
      setFailoverConfig(config);
    } catch (error) {
      console.error('Failed to load failover data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
      toast({
        title: 'Data refreshed',
        description: 'Model health and performance data updated',
      });
    } catch (error) {
      toast({
        title: 'Refresh failed',
        description: 'Failed to update model data',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleForceHealthCheck = async (provider: ModelProvider) => {
    try {
      await modelManager.forceHealthCheck(provider);
      toast({
        title: 'Health check initiated',
        description: `Health check started for ${provider}`,
      });
      await loadData();
    } catch (error) {
      toast({
        title: 'Health check failed',
        description: `Failed to start health check for ${provider}`,
        variant: 'destructive'
      });
    }
  };

  const handleConfigUpdate = async (updates: any) => {
    try {
      await modelManager.updateFailoverConfig(updates);
      setFailoverConfig(prev => ({ ...prev, ...updates }));
      toast({
        title: 'Configuration updated',
        description: 'Failover configuration saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Update failed',
        description: 'Failed to update failover configuration',
        variant: 'destructive'
      });
    }
  };

  const getHealthIcon = (status: ModelHealthStatus) => {
    if (status.isHealthy) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (status.consecutiveFailures > 3) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getHealthBadgeVariant = (status: ModelHealthStatus) => {
    if (status.isHealthy) return 'default';
    if (status.consecutiveFailures > 3) return 'destructive';
    return 'secondary';
  };

  const getProviderName = (provider: ModelProvider) => {
    switch (provider) {
      case 'local': return 'Local Models';
      case 'openrouter': return 'OpenRouter';
      case 'openai': return 'OpenAI';
      case 'anthropic': return 'Anthropic';
      default: return provider;
    }
  };

  const recommendedProvider = modelManager.getRecommendedProvider();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Model Failover Manager</h2>
          <p className="text-muted-foreground">
            Monitor and manage intelligent model failover mechanisms
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Recommended Provider Alert */}
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertDescription>
          <strong>Recommended Provider:</strong> {getProviderName(recommendedProvider as ModelProvider)}
          {performanceMetrics && (
            <span className="ml-2 text-sm">
              (Success Rate: {(performanceMetrics.successRate * 100).toFixed(1)}%)
            </span>
          )}
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="health" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">Health Status</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Model Health Status
              </CardTitle>
              <CardDescription>
                Real-time health monitoring of all available model providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthStatus.map((status, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getHealthIcon(status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getProviderName(status.provider)}</span>
                          <Badge variant={getHealthBadgeVariant(status)}>
                            {status.isHealthy ? 'Healthy' : status.consecutiveFailures > 3 ? 'Critical' : 'Degraded'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Last checked: {status.lastChecked.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div>Latency: {status.latency.toFixed(0)}ms</div>
                      <div>Success Rate: {(status.successRate * 100).toFixed(1)}%</div>
                      <div>Failures: {status.consecutiveFailures}</div>
                      {status.lastFailureReason && (
                        <div className="text-red-600 text-xs mt-1">
                          {status.lastFailureReason}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleForceHealthCheck(status.provider)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {healthStatus.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No health data available</p>
                    <p className="text-sm">Start some model requests to see health status</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {performanceMetrics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performanceMetrics.totalRequests}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(performanceMetrics.successRate * 100).toFixed(1)}%</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performanceMetrics.averageLatency.toFixed(0)}ms</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${performanceMetrics.totalCost.toFixed(4)}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Provider Performance</CardTitle>
                  <CardDescription>Detailed performance metrics per provider</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(performanceMetrics.providerStats).map(([provider, stats]: [string, any]) => (
                      <div key={provider} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Server className="h-5 w-5" />
                          <span className="font-medium">{getProviderName(provider as ModelProvider)}</span>
                        </div>
                        <div className="text-right text-sm">
                          <div>Requests: {stats.totalRequests}</div>
                          <div>Success: {(stats.successRate * 100).toFixed(1)}%</div>
                          <div>Latency: {stats.averageLatency.toFixed(0)}ms</div>
                          <div>Cost: ${stats.totalCost.toFixed(4)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Failover Configuration
              </CardTitle>
              <CardDescription>
                Configure failover behavior and performance thresholds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {failoverConfig && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Failover</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically switch to alternative models when primary fails
                      </p>
                    </div>
                    <Switch
                      checked={failoverConfig.enabled}
                      onCheckedChange={(checked) => handleConfigUpdate({ enabled: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Max Retries: {failoverConfig.maxRetries}</Label>
                    </div>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[failoverConfig.maxRetries]}
                      onValueChange={(values) => handleConfigUpdate({ maxRetries: values[0] })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of retry attempts per provider
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Retry Delay: {failoverConfig.retryDelay}ms</Label>
                    </div>
                    <Slider
                      min={100}
                      max={5000}
                      step={100}
                      value={[failoverConfig.retryDelay]}
                      onValueChange={(values) => handleConfigUpdate({ retryDelay: values[0] })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Delay between retry attempts
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Performance Threshold: {failoverConfig.performanceThreshold}ms</Label>
                    </div>
                    <Slider
                      min={500}
                      max={5000}
                      step={100}
                      value={[failoverConfig.performanceThreshold]}
                      onValueChange={(values) => handleConfigUpdate({ performanceThreshold: values[0] })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum acceptable response time
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Predictive Failover</Label>
                      <p className="text-sm text-muted-foreground">
                        Use AI to predict and prevent failures
                      </p>
                    </div>
                    <Switch
                      checked={failoverConfig.enablePredictiveFailover}
                      onCheckedChange={(checked) => handleConfigUpdate({ enablePredictiveFailover: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Load Balancing</Label>
                      <p className="text-sm text-muted-foreground">
                        Distribute load across healthy providers
                      </p>
                    </div>
                    <Switch
                      checked={failoverConfig.enableLoadBalancing}
                      onCheckedChange={(checked) => handleConfigUpdate({ enableLoadBalancing: checked })}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Provider Management</CardTitle>
              <CardDescription>
                Manage individual model providers and their settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthStatus.map((status, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5" />
                      <div>
                        <div className="font-medium">{getProviderName(status.provider)}</div>
                        <div className="text-sm text-muted-foreground">
                          Model: {status.model}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getHealthBadgeVariant(status)}>
                        {status.isHealthy ? 'Healthy' : 'Needs Attention'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleForceHealthCheck(status.provider)}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}