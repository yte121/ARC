import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  Settings,
  Code,
  Terminal,
  Shield,
  Zap,
  Clock,
  HardDrive,
  Cpu,
  Network,
  FileText,
  Download,
  Upload,
  Trash2,
  Copy,
  Save,
  AlertCircle,
  Info,
  BarChart3,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { 
  SandboxedCodeExecutionService, 
  CodeExecutionRequest, 
  CodeExecutionResult, 
  SandboxEnvironment,
  SecurityViolation,
  ViolationSeverity
} from '@/features/system/services/SandboxedCodeExecutionService';
import { useSystemStore } from '@/store/system-store';

interface SandboxedCodeExecutionDashboardProps {
  executionService?: SandboxedCodeExecutionService;
}

export const SandboxedCodeExecutionDashboard: React.FC<SandboxedCodeExecutionDashboardProps> = ({
  executionService = new SandboxedCodeExecutionService()
}) => {
  const [executionResults, setExecutionResults] = useState<CodeExecutionResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<CodeExecutionResult | null>(null);
  const [code, setCode] = useState('// Write your code here\nconsole.log("Hello, World!");');
  const [language, setLanguage] = useState('javascript');
  const [environmentId, setEnvironmentId] = useState('node-basic');
  const [input, setInput] = useState('');
  const [timeout, setTimeoutValue] = useState(30000);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [environments, setEnvironments] = useState<SandboxEnvironment[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed'>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');

  const { systemStatus } = useSystemStore.getState();

  // Initialize execution service
  useEffect(() => {
    const initializeExecutionService = async () => {
      try {
        await executionService.initialize();
        const envs = executionService.getSandboxEnvironments();
        setEnvironments(envs);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize execution service:', error);
        setIsLoading(false);
      }
    };

    initializeExecutionService();
  }, [executionService]);

  // Load execution results and stats
  useEffect(() => {
    const loadData = () => {
      const results = executionService.getExecutionResults();
      setExecutionResults(results);
      setStats(executionService.getExecutionStatistics());
    };

    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [executionService]);

  // Apply filters
  const filteredResults = useMemo(() => {
    let filtered = [...executionResults];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((result as any).metadata?.language || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(result => result.success === (filterStatus === 'success'));
    }

    // Language filter
    if (filterLanguage !== 'all') {
      filtered = filtered.filter(result => 
        ((result as any).metadata?.language || '') === filterLanguage
      );
    }

    return filtered;
  }, [executionResults, searchTerm, filterStatus, filterLanguage]);

  const handleExecute = async () => {
    if (!code.trim()) {
      alert('Please enter some code to execute');
      return;
    }

    setIsExecuting(true);
    try {
      const result = await executionService.executeCode(
        code,
        language,
        environmentId,
        input ? JSON.parse(input) : undefined,
        timeout
      );
      
      // Refresh results
      const results = executionService.getExecutionResults();
      setExecutionResults(results);
      setStats(executionService.getExecutionStatistics());
      
      // Show result
      setSelectedResult(result);
      
    } catch (error: any) {
      alert(`Execution failed: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
  };

  const handleClearCode = () => {
    setCode('');
  };

  const handleSaveCode = () => {
    // In a real implementation, this would save to local storage or a backend
    localStorage.setItem('savedCode', code);
    alert('Code saved successfully!');
  };

  const handleLoadCode = () => {
    const savedCode = localStorage.getItem('savedCode');
    if (savedCode) {
      setCode(savedCode);
    }
  };

  const getSeverityColor = (severity: ViolationSeverity) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getEnvironmentIcon = (type: string) => {
    switch (type) {
      case 'node': return <Zap className="h-4 w-4" />;
      case 'python': return <Code className="h-4 w-4" />;
      case 'browser': return <Terminal className="h-4 w-4" />;
      case 'docker': return <Settings className="h-4 w-4" />;
      case 'isolated': return <Shield className="h-4 w-4" />;
      default: return <Code className="h-4 w-4" />;
    }
  };

  const formatExecutionTime = (time: number) => {
    return `${time.toFixed(2)}ms`;
  };

  const formatMemoryUsage = (memory: number) => {
    return `${memory.toFixed(2)}MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing sandboxed execution service...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sandboxed Code Execution</h1>
          <p className="text-muted-foreground">
            Execute code safely in isolated environments with resource monitoring and security validation
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={stats?.systemHealth === 'excellent' ? 'default' : 'secondary'}>
            {stats?.totalExecutions || 0} executions
          </Badge>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalExecutions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.successfulExecutions} successful, {stats.failedExecutions} failed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Execution Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatExecutionTime(stats.averageExecutionTime)}</div>
              <p className="text-xs text-muted-foreground">
                Across all executions
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Violations</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.securityViolations}</div>
              <p className="text-xs text-muted-foreground">
                Total violations detected
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Executions</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeExecutions}</div>
              <p className="text-xs text-muted-foreground">
                Currently running
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="execute" className="space-y-4">
        <TabsList>
          <TabsTrigger value="execute">Execute Code</TabsTrigger>
          <TabsTrigger value="results">Execution Results</TabsTrigger>
          <TabsTrigger value="environments">Environments</TabsTrigger>
        </TabsList>

        {/* Execute Code Tab */}
        <TabsContent value="execute" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Code Editor */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Code Editor</span>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={handleCopyCode}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleSaveCode}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleLoadCode}>
                        <Upload className="h-4 w-4 mr-2" />
                        Load
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleClearCode}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Write your code here. It will be executed in a secure sandboxed environment.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="// Write your code here..."
                    className="font-mono min-h-[400px]"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Configuration Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Execution Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Language</label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="css">CSS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Environment</label>
                    <Select value={environmentId} onValueChange={setEnvironmentId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {environments.map((env) => (
                          <SelectItem key={env.id} value={env.id}>
                            <div className="flex items-center space-x-2">
                              {getEnvironmentIcon(env.type)}
                              <span>{env.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Timeout (ms)</label>
                    <Input
                      type="number"
                      value={timeout}
                      onChange={(e) => setTimeoutValue(Number(e.target.value))}
                      min={1000}
                      max={300000}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Input (JSON)</label>
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder='{"key": "value"}'
                      className="font-mono"
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={handleExecute} 
                    disabled={isExecuting}
                    className="w-full"
                  >
                    {isExecuting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Execute Code
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Environment Info */}
              {environments.find(env => env.id === environmentId) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Environment Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Memory Limit:</span>
                        <span>{environments.find(env => env.id === environmentId)?.resources.memory}MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CPU Limit:</span>
                        <span>{environments.find(env => env.id === environmentId)?.resources.cpu} cores</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Timeout:</span>
                        <span>{environments.find(env => env.id === environmentId)?.resources.timeout}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Security Level:</span>
                        <Badge variant="outline">
                          {environments.find(env => env.id === environmentId)?.securityLevel}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Network Access:</span>
                        <Badge variant="outline">
                          {environments.find(env => env.id === environmentId)?.networkAccess}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Execution Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Search</label>
                  <Input
                    placeholder="Search results..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as 'all' | 'success' | 'failed')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Language</label>
                  <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Languages</SelectItem>
                      {Array.from(new Set(executionResults.map(r => (r as any).metadata?.language).filter(Boolean))).map(lang => (
                        <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results List */}
          <Card>
            <CardHeader>
              <CardTitle>Execution Results</CardTitle>
              <CardDescription>
                Showing {filteredResults.length} of {executionResults.length} results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredResults.map((result) => (
                  <Collapsible key={result.id}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-center space-x-3">
                          {result.success ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">Execution {result.id.slice(0, 8)}</span>
                              <Badge variant={result.success ? 'default' : 'destructive'}>
                                {result.success ? 'Success' : 'Failed'}
                              </Badge>
                              <Badge variant="outline">
                                {(result as any).metadata?.language || 'unknown'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {result.timestamp.toLocaleString()} • 
                              {formatExecutionTime(result.executionTime)} • 
                              {formatMemoryUsage(result.memoryUsage)}
                            </div>
                          </div>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4">
                        <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Execution ID:</span> {result.id}
                            </div>
                            <div>
                              <span className="font-medium">Sandbox:</span> {result.sandboxId}
                            </div>
                            <div>
                              <span className="font-medium">Memory Usage:</span> {formatMemoryUsage(result.memoryUsage)}
                            </div>
                            <div>
                              <span className="font-medium">CPU Usage:</span> {result.cpuUsage.toFixed(2)}%
                            </div>
                          </div>
                          
                          {result.error && (
                            <div>
                              <h4 className="font-medium text-red-500 mb-2">Error:</h4>
                              <pre className="text-sm bg-red-50 p-2 rounded overflow-x-auto">
                                {result.error}
                              </pre>
                            </div>
                          )}
                          
                          {result.output && (
                            <div>
                              <h4 className="font-medium mb-2">Output:</h4>
                              <pre className="text-sm bg-background p-2 rounded overflow-x-auto">
                                {JSON.stringify(result.output, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {result.logs.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Logs:</h4>
                              <pre className="text-sm bg-background p-2 rounded overflow-x-auto">
                                {result.logs.join('\n')}
                              </pre>
                            </div>
                          )}
                          
                          {result.securityViolations.length > 0 && (
                            <div>
                              <h4 className="font-medium text-red-500 mb-2">Security Violations:</h4>
                              <div className="space-y-2">
                                {result.securityViolations.map((violation, index) => (
                                  <div key={index} className="flex items-center space-x-2 text-sm">
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                    <span className="text-red-500">{violation.type}:</span>
                                    <span>{violation.description}</span>
                                    <Badge variant={getSeverityColor(violation.severity)}>
                                      {violation.severity}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
                
                {filteredResults.length === 0 && (
                  <div className="text-center py-8">
                    <Terminal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No execution results found matching your filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Environments Tab */}
        <TabsContent value="environments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sandbox Environments</CardTitle>
              <CardDescription>
                Available execution environments with different security levels and resource limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {environments.map((env) => (
                  <Card key={env.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        {getEnvironmentIcon(env.type)}
                        <span>{env.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span>Type:</span>
                          <Badge variant="outline">{env.type}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Version:</span>
                          <span>{env.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Memory:</span>
                          <span>{env.resources.memory}MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CPU:</span>
                          <span>{env.resources.cpu} cores</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Timeout:</span>
                          <span>{env.resources.timeout}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Security Level:</span>
                          <Badge variant={env.securityLevel === 'critical' ? 'destructive' : 'outline'}>
                            {env.securityLevel}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Network:</span>
                          <Badge variant="outline">{env.networkAccess}</Badge>
                        </div>
                        <div>
                          <span className="font-medium">Allowed Modules:</span>
                          <div className="text-xs text-muted-foreground mt-1">
                            {env.allowedModules.join(', ') || 'None'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};