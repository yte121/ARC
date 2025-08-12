import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Server,
  MemoryStick,
  Cpu,
  Users,
  DollarSign,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Target,
  Clock
} from 'lucide-react';
import { ResourceOptimizer } from '../services/ResourceOptimizer';
import { SystemConstraints, SystemResourceUsage } from '@/types/agent-types';
import { useToast } from '@/hooks/use-toast';

interface ResourceOptimizerManagerProps {
  resourceOptimizer: ResourceOptimizer;
}

interface OptimizationRecommendation {
  type: 'cpu' | 'memory' | 'agents' | 'tokens';
  current: number;
  suggested: number;
  impact: 'positive' | 'negative';
  reason: string;
}

export function ResourceOptimizerManager({ resourceOptimizer }: ResourceOptimizerManagerProps) {
  const [constraints, setConstraints] = useState<SystemConstraints | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationEnabled, setOptimizationEnabled] = useState(true);
  const [selectedHours, setSelectedHours] = useState(24);
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
      const currentConstraints = resourceOptimizer.getConstraints();
      const currentAnalysis = resourceOptimizer.getOptimizationAnalysis();
      const currentForecast = resourceOptimizer.getResourceForecast(selectedHours);
      
      setConstraints(currentConstraints);
      setAnalysis(currentAnalysis);
      setForecast(currentForecast);
      
      // Generate recommendations from analysis
      const recs = generateRecommendations(currentAnalysis);
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to load optimizer data:', error);
    }
  };

  const generateRecommendations = (analysis: any): OptimizationRecommendation[] => {
    const recs: OptimizationRecommendation[] = [];
    
    // CPU recommendations
    if (analysis.currentEfficiency < 70) {
      recs.push({
        type: 'cpu',
        current: constraints?.maxCpuUsage || 80,
        suggested: Math.min(100, Math.ceil((constraints?.maxCpuUsage || 80) * 1.2)),
        impact: 'positive',
        reason: 'Low CPU efficiency detected, consider increasing limit'
      });
    }
    
    // Memory recommendations
    if (analysis.costEfficiency < 60) {
      recs.push({
        type: 'memory',
        current: constraints?.maxMemoryUsage || 8192,
        suggested: Math.max(1024, Math.floor((constraints?.maxMemoryUsage || 8192) * 0.8)),
        impact: 'negative',
        reason: 'High memory usage detected, consider reducing limit'
      });
    }
    
    // Agent recommendations
    if (analysis.optimizationPotential > 50) {
      recs.push({
        type: 'agents',
        current: constraints?.maxAgents || 10,
        suggested: Math.min(20, Math.ceil((constraints?.maxAgents || 10) * 1.1)),
        impact: 'positive',
        reason: 'High optimization potential detected, consider increasing agents'
      });
    }
    
    // Token recommendations
    if (analysis.predictedLoad > 0.8) {
      recs.push({
        type: 'tokens',
        current: constraints?.maxTokensPerMinute || 5000,
        suggested: Math.min(20000, Math.ceil((constraints?.maxTokensPerMinute || 5000) * 1.3)),
        impact: 'positive',
        reason: 'High predicted token load, consider increasing limit'
      });
    }
    
    return recs;
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const optimization = resourceOptimizer.optimizeResourceAllocation();
      
      if (Object.keys(optimization.optimizedConstraints).length > 0) {
        // Apply optimization
        resourceOptimizer.updateConstraints(optimization.optimizedConstraints);
        
        toast({
          title: 'Optimization applied',
          description: `Applied ${optimization.recommendations.length} recommendations with ${optimization.performanceImprovement}% performance improvement`,
        });
      } else {
        toast({
          title: 'No optimization needed',
          description: 'Current resource allocation is already optimal',
        });
      }
      
      await loadData();
    } catch (error) {
      toast({
        title: 'Optimization failed',
        description: 'Failed to apply optimization recommendations',
        variant: 'destructive'
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyRecommendation = (recommendation: OptimizationRecommendation) => {
    const update: any = {};
    
    switch (recommendation.type) {
      case 'cpu':
        update.maxCpuUsage = recommendation.suggested;
        break;
      case 'memory':
        update.maxMemoryUsage = recommendation.suggested;
        break;
      case 'agents':
        update.maxAgents = recommendation.suggested;
        break;
      case 'tokens':
        update.maxTokensPerMinute = recommendation.suggested;
        break;
    }
    
    resourceOptimizer.updateConstraints(update);
    loadData();
    
    toast({
      title: 'Recommendation applied',
      description: `Updated ${recommendation.type} limit to ${recommendation.suggested}`,
    });
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'cpu': return <Cpu className="h-4 w-4" />;
      case 'memory': return <MemoryStick className="h-4 w-4" />;
      case 'agents': return <Users className="h-4 w-4" />;
      case 'tokens': return <Zap className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    return impact === 'positive' ? 'text-green-600' : 'text-orange-600';
  };

  const getImpactIcon = (impact: string) => {
    return impact === 'positive' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const getHealthColor = (value: number) => {
    if (value >= 80) return 'text-green-600';
    if (value >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Resource Optimizer
          </CardTitle>
          <CardDescription>
            Advanced resource optimization and constraint validation with predictive analytics
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="optimization"
                checked={optimizationEnabled}
                onCheckedChange={(checked) => {
                  setOptimizationEnabled(checked);
                  resourceOptimizer.setOptimizationEnabled(checked);
                }}
              />
              <Label htmlFor="optimization">Enable automatic optimization</Label>
            </div>
            
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing || !optimizationEnabled}
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4" />
                  Optimize Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Efficiency</p>
                <p className={`text-2xl font-bold ${getHealthColor(analysis?.currentEfficiency || 0)}`}>
                  {analysis?.currentEfficiency || 0}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Optimization Potential</p>
                <p className={`text-2xl font-bold ${getHealthColor(analysis?.optimizationPotential || 0)}`}>
                  {analysis?.optimizationPotential || 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cost Efficiency</p>
                <p className={`text-2xl font-bold ${getHealthColor(analysis?.costEfficiency || 0)}`}>
                  {analysis?.costEfficiency || 0}%
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Predicted Load</p>
                <p className={`text-2xl font-bold ${getHealthColor((analysis?.predictedLoad || 0) * 100)}`}>
                  {Math.round((analysis?.predictedLoad || 0) * 100)}%
                </p>
              </div>
              <Server className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recommendations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="constraints">Constraints</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
              <CardDescription>
                AI-generated recommendations to improve resource allocation and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getIconForType(rec.type)}
                        <div>
                          <div className="font-medium capitalize">{rec.type} Optimization</div>
                          <div className="text-sm text-muted-foreground">{rec.reason}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Current:</span> {rec.current}
                          </div>
                          <div className={`text-sm font-medium ${getImpactColor(rec.impact)}`}>
                            <span className="text-muted-foreground">Suggested:</span> {rec.suggested}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApplyRecommendation(rec)}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No optimization recommendations available</p>
                  <p className="text-sm">Current resource allocation is optimal</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Forecast</CardTitle>
              <CardDescription>
                Predicted resource usage over the next {selectedHours} hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="forecast-hours">Forecast Duration: {selectedHours} hours</Label>
                <Slider
                  id="forecast-hours"
                  min={6}
                  max={72}
                  step={6}
                  value={[selectedHours]}
                  onValueChange={(values) => setSelectedHours(values[0])}
                  className="mt-2"
                />
              </div>
              
              {forecast.length > 0 ? (
                <div className="space-y-4">
                  {forecast.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="text-sm font-medium">
                        {entry.timestamp.toLocaleString()}
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Cpu className="h-3 w-3" />
                          {entry.cpuUtilization.toFixed(1)}%
                        </div>
                        <div className="flex items-center gap-1">
                          <MemoryStick className="h-3 w-3" />
                          {entry.memoryUtilization.toFixed(0)}MB
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {entry.activeAgentCount}
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {entry.tokensPerMinute.toFixed(0)}/min
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-12 w-12 mx-auto mb-2 animate-spin" />
                  <p>Loading forecast data...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="constraints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Constraints</CardTitle>
              <CardDescription>
                System resource limits and constraints
              </CardDescription>
            </CardHeader>
            <CardContent>
              {constraints ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Max Agents</span>
                    </div>
                    <span className="font-medium">{constraints.maxAgents}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MemoryStick className="h-4 w-4" />
                      <span>Max Memory Usage</span>
                    </div>
                    <span className="font-medium">{constraints.maxMemoryUsage}MB</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      <span>Max CPU Usage</span>
                    </div>
                    <span className="font-medium">{constraints.maxCpuUsage}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      <span>Max Tokens Per Minute</span>
                    </div>
                    <span className="font-medium">{constraints.maxTokensPerMinute}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Timeout</span>
                    </div>
                    <span className="font-medium">{constraints.timeout}ms</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-2" />
                  <p>Loading constraints...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization History</CardTitle>
              <CardDescription>
                Track optimization changes and their impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-2" />
                <p>Optimization history tracking</p>
                <p className="text-sm">Feature coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}