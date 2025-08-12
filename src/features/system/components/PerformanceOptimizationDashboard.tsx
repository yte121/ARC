import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  BarChart3, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Thermometer, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Plus,
  Trash2,
  Edit,
  Target,
  Shield,
  Database,
  Network,
  Server,
  MemoryStick,
  Gauge,
  LineChart,
  PieChart,
  AreaChart,
  Minus,
  Plus as PlusIcon,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Lightbulb,
  Rocket,
  Leaf,
  Bolt
} from 'lucide-react';
import { 
  PerformanceOptimizationService, 
  PerformanceMetrics, 
  ResourcePrediction, 
  OptimizationStrategy, 
  PerformanceProfile,
  ResourceAllocation
} from '@/features/system/services/PerformanceOptimizationService';
import { useSystemStore } from '@/store/system-store';

interface PerformanceOptimizationDashboardProps {
  optimizationService?: PerformanceOptimizationService;
}

export const PerformanceOptimizationDashboard: React.FC<PerformanceOptimizationDashboardProps> = ({
  optimizationService = new PerformanceOptimizationService()
}) => {
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [predictions, setPredictions] = useState<ResourcePrediction[]>([]);
  const [strategies, setStrategies] = useState<OptimizationStrategy[]>([]);
  const [profiles, setProfiles] = useState<PerformanceProfile[]>([]);
  const [allocations, setAllocations] = useState<Map<string, ResourceAllocation>>(new Map());
  const [summary, setSummary] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [newProfile, setNewProfile] = useState({
    name: '',
    description: '',
    cpuThreshold: 75,
    memoryThreshold: 70,
    responseTimeThreshold: 3000,
    errorRateThreshold: 2,
    optimizationStrategies: [] as string[]
  });

  const { systemStatus } = useSystemStore.getState();

  // Update data
  useEffect(() => {
    const updateData = () => {
      setCurrentMetrics(optimizationService.getCurrentMetricsData());
      setPredictions(optimizationService.getResourcePredictions());
      setStrategies(optimizationService.getOptimizationStrategies());
      setProfiles(optimizationService.getPerformanceProfiles());
      setAllocations(optimizationService.getResourceAllocations());
      setSummary(optimizationService.getPerformanceSummary());
    };

    updateData();
    const interval = setInterval(updateData, 2000);

    return () => clearInterval(interval);
  }, [optimizationService]);

  const handleOptimization = async () => {
    setIsOptimizing(true);
    try {
      // Simulate optimization process
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('[Performance Optimization] Optimization completed');
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCreateProfile = () => {
    if (!newProfile.name.trim()) return;

    optimizationService.createPerformanceProfile({
      name: newProfile.name,
      description: newProfile.description,
      cpuThreshold: newProfile.cpuThreshold,
      memoryThreshold: newProfile.memoryThreshold,
      responseTimeThreshold: newProfile.responseTimeThreshold,
      errorRateThreshold: newProfile.errorRateThreshold,
      optimizationStrategies: newProfile.optimizationStrategies,
      isActive: false
    });

    // Reset form
    setNewProfile({
      name: '',
      description: '',
      cpuThreshold: 75,
      memoryThreshold: 70,
      responseTimeThreshold: 3000,
      errorRateThreshold: 2,
      optimizationStrategies: []
    });
  };

  const handleSetProfile = (profileId: string) => {
    optimizationService.setActivePerformanceProfile(profileId);
    setSelectedProfile(profileId);
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (value: number, threshold: number) => {
    const percentage = (value / threshold) * 100;
    if (percentage > 90) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (percentage > 75) return <TrendingUp className="h-4 w-4 text-yellow-500" />;
    if (percentage > 50) return <Minus className="h-4 w-4 text-blue-500" />;
    return <TrendingDown className="h-4 w-4 text-green-500" />;
  };

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Optimization</h1>
          <p className="text-muted-foreground">
            Monitor and optimize system performance with predictive resource management
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={summary.systemHealth === 'excellent' ? 'default' : 'secondary'}>
            {getHealthIcon(summary.systemHealth)}
            <span className="ml-2 capitalize">{summary.systemHealth}</span>
          </Badge>
          <Button
            onClick={handleOptimization}
            disabled={isOptimizing}
            className="flex items-center space-x-2"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Optimizing...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Run Optimization</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics?.cpu.toFixed(1) || '0'}%
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {getTrendIcon(currentMetrics?.cpu || 0, 80)}
              <span>of 80% threshold</span>
            </div>
            <Progress value={currentMetrics?.cpu || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics?.memory.toFixed(1) || '0'}%
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {getTrendIcon(currentMetrics?.memory || 0, 80)}
              <span>of 80% threshold</span>
            </div>
            <Progress value={currentMetrics?.memory || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics?.responseTime.toFixed(0) || '0'}ms
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {getTrendIcon(currentMetrics?.responseTime || 0, 3000)}
              <span>target: 3000ms</span>
            </div>
            <Progress value={Math.min(100, (currentMetrics?.responseTime || 0) / 30)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics?.errorRate.toFixed(2) || '0'}%
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {getTrendIcon(currentMetrics?.errorRate || 0, 5)}
              <span>target: <5%</span>
            </div>
            <Progress value={Math.min(100, (currentMetrics?.errorRate || 0) * 20)} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5" />
              <span>Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.recommendations.map((rec: string, index: number) => (
                <Alert key={index}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{rec}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monitoring">Real-time Monitoring</TabsTrigger>
          <TabsTrigger value="predictions">Resource Predictions</TabsTrigger>
          <TabsTrigger value="strategies">Optimization Strategies</TabsTrigger>
          <TabsTrigger value="profiles">Performance Profiles</TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* System Overview */}
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
                <CardDescription>Current system performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Agents</span>
                    <span className="text-sm text-muted-foreground">{summary.currentMetrics?.agentCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Tasks</span>
                    <span className="text-sm text-muted-foreground">{summary.currentMetrics?.activeTasks || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Queue Length</span>
                    <span className="text-sm text-muted-foreground">{summary.currentMetrics?.queueLength || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Throughput</span>
                    <span className="text-sm text-muted-foreground">{summary.currentMetrics?.throughput.toFixed(0) || '0'}/s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Temperature</span>
                    <span className="text-sm text-muted-foreground">{summary.currentMetrics?.temperature.toFixed(1) || '0'}°C</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Power Usage</span>
                    <span className="text-sm text-muted-foreground">{summary.currentMetrics?.power.toFixed(1) || '0'}W</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resource Allocations */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Allocations</CardTitle>
                <CardDescription>Current resource allocation by agent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from(allocations.entries()).slice(0, 5).map(([agentId, allocation]) => (
                    <div key={agentId} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">Agent {agentId.slice(-4)}</div>
                        <div className="text-sm text-muted-foreground">
                          CPU: {allocation.cpu}% • Memory: {allocation.memory}%
                        </div>
                      </div>
                      <Badge variant={allocation.priority > 5 ? 'default' : 'secondary'}>
                        Priority {allocation.priority}
                      </Badge>
                    </div>
                  ))}
                  {allocations.size > 5 && (
                    <div className="text-center text-sm text-muted-foreground">
                      +{allocations.size - 5} more agents
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance History */}
          <Card>
            <CardHeader>
              <CardTitle>Performance History</CardTitle>
              <CardDescription>Recent performance metrics over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded">
                <div className="text-center">
                  <LineChart className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Performance chart would be displayed here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Predictions</CardTitle>
              <CardDescription>
                AI-powered predictions for future resource usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {predictions.length === 0 ? (
                <p className="text-center text-muted-foreground">No predictions available yet</p>
              ) : (
                <div className="space-y-4">
                  {predictions.map((prediction, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-sm font-medium">CPU</div>
                          <div className={`text-lg font-bold ${prediction.predictedCpu > 80 ? 'text-red-500' : 'text-green-500'}`}>
                            {prediction.predictedCpu.toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">Memory</div>
                          <div className={`text-lg font-bold ${prediction.predictedMemory > 80 ? 'text-red-500' : 'text-green-500'}`}>
                            {prediction.predictedMemory.toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">Network</div>
                          <div className="text-lg font-bold text-blue-500">
                            {prediction.predictedNetwork.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant={prediction.confidence > 0.7 ? 'default' : 'secondary'}>
                          {(prediction.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                        <div className="text-sm text-muted-foreground mt-1">
                          {prediction.timeHorizon} min ahead
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Strategies</CardTitle>
              <CardDescription>
                Automated optimization strategies and their execution status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {strategies.map((strategy) => (
                  <div key={strategy.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Badge variant={strategy.enabled ? 'default' : 'secondary'}>
                          {strategy.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <span className="font-medium">{strategy.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {strategy.description}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-muted-foreground">
                        Success: {strategy.successCount} • Failures: {strategy.failureCount}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Priority: {strategy.priority}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => optimizationService.toggleOptimizationStrategy(strategy.id, !strategy.enabled)}
                      >
                        {strategy.enabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profiles" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Performance Profiles */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Profiles</CardTitle>
                <CardDescription>
                  Pre-configured performance optimization profiles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profiles.map((profile) => (
                    <div 
                      key={profile.id} 
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        profile.isActive ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleSetProfile(profile.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded ${profile.isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          {profile.isActive ? <CheckCircle className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-medium">{profile.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {profile.description}
                          </div>
                        </div>
                      </div>
                      
                      {profile.isActive && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Create Profile */}
            <Card>
              <CardHeader>
                <CardTitle>Create Custom Profile</CardTitle>
                <CardDescription>
                  Define a custom performance optimization profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Profile Name</label>
                    <Input
                      placeholder="Enter profile name..."
                      value={newProfile.name}
                      onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Describe the profile..."
                      value={newProfile.description}
                      onChange={(e) => setNewProfile({ ...newProfile, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">CPU Threshold (%)</label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={newProfile.cpuThreshold}
                        onChange={(e) => setNewProfile({ ...newProfile, cpuThreshold: parseInt(e.target.value) })}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Memory Threshold (%)</label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={newProfile.memoryThreshold}
                        onChange={(e) => setNewProfile({ ...newProfile, memoryThreshold: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleCreateProfile}
                    disabled={!newProfile.name.trim()}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};