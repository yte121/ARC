import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSystemStore } from '@/store/system-store';
import { APIService } from '@/services/APIService';
import { TrendingUp, TrendingDown, Activity, Clock, DollarSign, AlertTriangle } from 'lucide-react';

export function ModelPerformanceMetrics() {
  const { resourceUsage, activeModelConfig } = useSystemStore();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    tokensUsed: resourceUsage.tokensUsedLastMinute,
    averageLatency: 0,
    requestCount: 0,
    errorRate: 0,
    costEstimate: 0
  });
  
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [tokenHistory, setTokenHistory] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const apiService = new APIService();

  // Real performance metrics update
  useEffect(() => {
    const fetchPerformanceMetrics = async () => {
      try {
        setIsLoading(true);
        const performanceData = await apiService.getPerformanceMetrics();
        
        if (performanceData) {
          const newMetrics = {
            tokensUsed: performanceData.tokensUsed || resourceUsage.tokensUsedLastMinute,
            averageLatency: performanceData.averageLatency || 0,
            requestCount: performanceData.requestCount || 0,
            errorRate: performanceData.errorRate || 0,
            costEstimate: performanceData.costEstimate || 0
          };
          
          setMetrics(newMetrics);
          
          // Update latency history
          const newLatencyHistory = [...latencyHistory, newMetrics.averageLatency];
          if (newLatencyHistory.length > 20) {
            newLatencyHistory.shift();
          }
          setLatencyHistory(newLatencyHistory);
          
          // Update token history
          const newTokenHistory = [...tokenHistory, newMetrics.tokensUsed];
          if (newTokenHistory.length > 20) {
            newTokenHistory.shift();
          }
          setTokenHistory(newTokenHistory);
        }
      } catch (error) {
        console.error('Failed to fetch performance metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchPerformanceMetrics();

    // Set up interval for real-time updates
    const interval = setInterval(fetchPerformanceMetrics, 3000);
    
    return () => clearInterval(interval);
  }, [resourceUsage, activeModelConfig, latencyHistory, tokenHistory]);

  const getLatencyStatus = () => {
    if (metrics.averageLatency > 800) return { status: 'high', color: 'text-red-500', icon: <TrendingUp className="h-4 w-4" /> };
    if (metrics.averageLatency > 400) return { status: 'medium', color: 'text-yellow-500', icon: <Activity className="h-4 w-4" /> };
    return { status: 'low', color: 'text-green-500', icon: <TrendingDown className="h-4 w-4" /> };
  };

  const getErrorStatus = () => {
    if (metrics.errorRate > 5) return { status: 'high', color: 'text-red-500', icon: <AlertTriangle className="h-4 w-4" /> };
    if (metrics.errorRate > 1) return { status: 'medium', color: 'text-yellow-500', icon: <Activity className="h-4 w-4" /> };
    return { status: 'low', color: 'text-green-500', icon: <TrendingDown className="h-4 w-4" /> };
  };

  const latencyStatus = getLatencyStatus();
  const errorStatus = getErrorStatus();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Model Performance</CardTitle>
        <CardDescription>
          Real-time metrics for {activeModelConfig.provider} / {activeModelConfig.modelName}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="latency">Latency</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <MetricCard 
                title="Token Usage" 
                value={metrics.tokensUsed.toLocaleString()} 
                unit="tokens"
                trend="up"
                isLoading={isLoading}
              />
              <MetricCard 
                title="Avg. Latency" 
                value={metrics.averageLatency.toFixed(0)} 
                unit="ms"
                trend={latencyStatus.status === 'high' ? "up" : "down"}
                icon={latencyStatus.icon}
                color={latencyStatus.color}
                isLoading={isLoading}
              />
              <MetricCard 
                title="Requests" 
                value={metrics.requestCount.toString()} 
                unit="total"
                isLoading={isLoading}
              />
              <MetricCard 
                title="Error Rate" 
                value={metrics.errorRate.toFixed(1)} 
                unit="%"
                trend={errorStatus.status === 'high' ? "up" : "down"}
                icon={errorStatus.icon}
                color={errorStatus.color}
                isLoading={isLoading}
              />
            </div>
            
            <div className="pt-2">
              <h4 className="text-sm font-medium mb-1">Cost Estimate</h4>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-lg font-semibold">${metrics.costEstimate.toFixed(4)}</span>
                <span className="text-sm text-muted-foreground">estimated cost</span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="latency" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Latency Trend</h4>
                <MetricGraph 
                  data={latencyHistory} 
                  label="Average Latency (ms)" 
                  maxValue={1000}
                  colorClass="stroke-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {latencyHistory.length > 0 ? latencyHistory[latencyHistory.length - 1].toFixed(0) : '0'}ms
                  </div>
                  <div className="text-xs text-muted-foreground">Current</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {latencyHistory.length > 0 
                      ? (latencyHistory.reduce((sum, val) => sum + val, 0) / latencyHistory.length).toFixed(0) 
                      : '0'}ms
                  </div>
                  <div className="text-xs text-muted-foreground">Average</div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="tokens" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Token Usage Trend</h4>
                <MetricGraph 
                  data={tokenHistory} 
                  label="Tokens Used" 
                  maxValue={Math.max(...tokenHistory, 1000)}
                  colorClass="stroke-green-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {tokenHistory.length > 0 ? tokenHistory[tokenHistory.length - 1].toLocaleString() : '0'}
                  </div>
                  <div className="text-xs text-muted-foreground">Current</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {tokenHistory.length > 0 
                      ? (tokenHistory.reduce((sum, val) => sum + val, 0) / tokenHistory.length).toFixed(0)
                      : '0'}
                  </div>
                  <div className="text-xs text-muted-foreground">Average</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  trend?: 'up' | 'down';
  icon?: React.ReactNode;
  color?: string;
  isLoading?: boolean;
}

function MetricCard({ title, value, unit, trend, icon, color, isLoading }: MetricCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && <div className={color}>{icon}</div>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">
          {isLoading ? '...' : value}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          {trend === 'up' ? (
            <TrendingUp className="h-3 w-3 text-red-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-green-500" />
          )}
          <span className="text-xs text-muted-foreground">
            {trend === 'up' ? 'Increasing' : 'Decreasing'}
          </span>
        </div>
      )}
    </div>
  );
}

interface MetricGraphProps {
  data: number[];
  label: string;
  maxValue: number;
  colorClass: string;
}

function MetricGraph({ data, label, maxValue, colorClass }: MetricGraphProps) {
  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center border rounded-lg">
        <span className="text-muted-foreground">No data available</span>
      </div>
    );
  }

  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * 100,
    y: 100 - (value / maxValue) * 100
  }));

  const pathData = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  return (
    <div className="h-32 border rounded-lg p-4">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d={pathData}
          stroke="currentColor"
          className={colorClass}
          strokeWidth="2"
          fill="none"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" className={colorClass} />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" className={colorClass} />
          </linearGradient>
        </defs>
        <path
          d={`${pathData} L 100 100 L 0 100 Z`}
          fill="url(#gradient)"
        />
      </svg>
    </div>
  );
}

interface PerformanceMetrics {
  tokensUsed: number;
  averageLatency: number;
  requestCount: number;
  errorRate: number;
  costEstimate: number;
}