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
  Brain, 
  TreePine, 
  Link, 
  Target, 
  Clock, 
  Zap, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Play, 
  Pause, 
  RotateCcw,
  Settings,
  History,
  Plus,
  Trash2,
  Edit,
  Key,
  Lightbulb,
  Network,
  Layers,
  BarChart3,
  Activity,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  Code,
  Database,
  Palette,
  Globe
} from 'lucide-react';
import { 
  AdvancedReasoningPatternsService, 
  ReasoningPattern, 
  ReasoningSession, 
  ReasoningPath, 
  ReasoningStep,
  ReasoningStrategy,
  ProblemDecomposition
} from '@/features/reasoning/services/AdvancedReasoningPatterns';
import { useSystemStore } from '@/store/system-store';

interface AdvancedReasoningManagerProps {
  reasoningService?: AdvancedReasoningPatternsService;
}

export const AdvancedReasoningManager: React.FC<AdvancedReasoningManagerProps> = ({
  reasoningService = new AdvancedReasoningPatternsService()
}) => {
  const [activeSessions, setActiveSessions] = useState<ReasoningSession[]>([]);
  const [sessionHistory, setSessionHistory] = useState<ReasoningSession[]>([]);
  const [problemDecompositions, setProblemDecompositions] = useState<ProblemDecomposition[]>([]);
  const [reasoningStrategies, setReasoningStrategies] = useState<ReasoningStrategy[]>([]);
  const [patternPerformance, setPatternPerformance] = useState<Map<ReasoningPattern, any>>(new Map());
  const [selectedSession, setSelectedSession] = useState<ReasoningSession | null>(null);
  const [newProblem, setNewProblem] = useState('');
  const [problemComplexity, setProblemComplexity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newStrategy, setNewStrategy] = useState({
    name: '',
    description: '',
    patterns: [] as ReasoningPattern[],
    conditions: '',
    weight: 1.0,
    maxDepth: 5,
    timeout: 30000
  });

  const { systemStatus } = useSystemStore.getState();

  // Update data
  useEffect(() => {
    const updateData = () => {
      setActiveSessions(reasoningService.getActiveSessions());
      setSessionHistory(reasoningService.getSessionHistory(20));
      setProblemDecompositions(reasoningService.getAllProblemDecompositions());
      setReasoningStrategies(reasoningService.getReasoningStrategies());
      setPatternPerformance(reasoningService.getPatternPerformance());
    };

    updateData();
    const interval = setInterval(updateData, 2000);

    return () => clearInterval(interval);
  }, [reasoningService]);

  const handleStartReasoning = async () => {
    if (!newProblem.trim()) return;

    setIsAnalyzing(true);
    try {
      const sessionId = await reasoningService.startReasoningSession(newProblem);
      setNewProblem('');
      console.log(`[Advanced Reasoning] Started session: ${sessionId}`);
    } catch (error) {
      console.error('Failed to start reasoning session:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateDecomposition = async () => {
    if (!newProblem.trim()) return;

    try {
      const decompositionId = await reasoningService.createProblemDecomposition(newProblem, problemComplexity);
      setNewProblem('');
      console.log(`[Advanced Reasoning] Created decomposition: ${decompositionId}`);
    } catch (error) {
      console.error('Failed to create problem decomposition:', error);
    }
  };

  const handleAddStrategy = () => {
    if (!newStrategy.name.trim() || !newStrategy.patterns.length) return;

    const strategy: ReasoningStrategy = {
      id: `strategy_${Date.now()}`,
      name: newStrategy.name,
      description: newStrategy.description,
      patterns: newStrategy.patterns,
      conditions: newStrategy.conditions.split('\n').filter(c => c.trim()),
      weight: newStrategy.weight,
      enabled: true,
      maxDepth: newStrategy.maxDepth,
      timeout: newStrategy.timeout,
      resourceLimits: {
        maxTokens: 4000,
        maxMemory: 2048,
        maxCpu: 50
      }
    };

    reasoningService.addReasoningStrategy(strategy);
    
    // Reset form
    setNewStrategy({
      name: '',
      description: '',
      patterns: [],
      conditions: '',
      weight: 1.0,
      maxDepth: 5,
      timeout: 30000
    });
  };

  const handleToggleStrategy = (strategyId: string, enabled: boolean) => {
    reasoningService.toggleReasoningStrategy(strategyId, enabled);
  };

  const handleRemoveStrategy = (strategyId: string) => {
    reasoningService.removeReasoningStrategy(strategyId);
  };

  const getPatternIcon = (pattern: ReasoningPattern) => {
    switch (pattern) {
      case 'react':
        return <Target className="h-4 w-4 text-blue-500" />;
      case 'tree_of_thoughts':
        return <TreePine className="h-4 w-4 text-green-500" />;
      case 'chain_of_thought':
        return <Link className="h-4 w-4 text-purple-500" />;
      case 'step_back':
        return <ChevronRight className="h-4 w-4 text-orange-500" />;
      case 'self_consistency':
        return <CheckCircle className="h-4 w-4 text-teal-500" />;
      case 'hierarchical_decomposition':
        return <Layers className="h-4 w-4 text-indigo-500" />;
      case 'ensemble_reasoning':
        return <Network className="h-4 w-4 text-pink-500" />;
      default:
        return <Brain className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPatternColor = (pattern: ReasoningPattern): string => {
    switch (pattern) {
      case 'react': return 'bg-blue-500';
      case 'tree_of_thoughts': return 'bg-green-500';
      case 'chain_of_thought': return 'bg-purple-500';
      case 'step_back': return 'bg-orange-500';
      case 'self_consistency': return 'bg-teal-500';
      case 'hierarchical_decomposition': return 'bg-indigo-500';
      case 'ensemble_reasoning': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'timeout': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getComplexityColor = (complexity: string): string => {
    switch (complexity) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getPatternPerformanceStats = (pattern: ReasoningPattern) => {
    const stats = patternPerformance.get(pattern);
    if (!stats) return { successRate: 0, avgConfidence: 0, avgTime: 0 };
    
    return {
      successRate: (stats.successCount / stats.totalCount) * 100,
      avgConfidence: stats.averageConfidence * 100,
      avgTime: stats.averageExecutionTime
    };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="h-8 w-8 text-purple-500" />
          Advanced Reasoning Patterns
        </h1>
        <Badge variant={activeSessions.length > 0 ? 'default' : 'secondary'}>
          {activeSessions.length} Active Sessions
        </Badge>
      </div>

      {/* Problem Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Problem Analysis & Reasoning</CardTitle>
          <CardDescription>
            Submit problems for advanced reasoning and problem decomposition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Problem Description</label>
                <Textarea
                  placeholder="Describe the problem you want to solve..."
                  value={newProblem}
                  onChange={(e) => setNewProblem(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Complexity Level</label>
                <Select
                  value={problemComplexity}
                  onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
                    setProblemComplexity(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        Low Complexity
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                        Medium Complexity
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full" />
                        High Complexity
                      </div>
                    </SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                        Critical Complexity
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Reasoning Approach</label>
                <div className="space-y-2 mt-2">
                  <Button
                    onClick={handleStartReasoning}
                    disabled={!newProblem.trim() || isAnalyzing}
                    className="w-full"
                  >
                    {isAnalyzing ? (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Start Reasoning Session
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleCreateDecomposition}
                    disabled={!newProblem.trim()}
                    className="w-full"
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    Create Problem Decomposition
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Available Patterns</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(Object.values(ReasoningPattern) as ReasoningPattern[]).map((pattern) => (
                    <Badge key={pattern} variant="outline" className="text-xs">
                      {getPatternIcon(pattern)}
                      <span className="ml-1">{pattern.replace(/_/g, ' ')}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="history">Session History</TabsTrigger>
          <TabsTrigger value="decompositions">Problem Decompositions</TabsTrigger>
          <TabsTrigger value="strategies">Reasoning Strategies</TabsTrigger>
          <TabsTrigger value="performance">Pattern Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Reasoning Sessions</CardTitle>
              <CardDescription>
                Currently running reasoning sessions with real-time progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeSessions.length === 0 ? (
                <p className="text-center text-muted-foreground">No active reasoning sessions</p>
              ) : (
                <div className="space-y-4">
                  {activeSessions.map((session) => (
                    <Collapsible key={session.id}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(session.status)}`} />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{session.problem.substring(0, 60)}...</span>
                                <Badge variant="outline">{session.status}</Badge>
                                <Badge className={getComplexityColor(session.metadata.problemComplexity)}>
                                  {session.metadata.problemComplexity}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Started: {formatTimestamp(session.startTime)} • 
                                Strategies: {session.strategies.length}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm text-muted-foreground">
                              Confidence: {(session.confidence * 100).toFixed(1)}%
                            </div>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className="p-4 border-t bg-gray-50 space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Session ID:</span> {session.sessionId}
                            </div>
                            <div>
                              <span className="font-medium">Status:</span> {session.status}
                            </div>
                            <div>
                              <span className="font-medium">Confidence:</span> {(session.confidence * 100).toFixed(1)}%
                            </div>
                            <div>
                              <span className="font-medium">Duration:</span> {formatDuration(Date.now() - session.startTime.getTime())}
                            </div>
                          </div>
                          
                          {session.paths.length > 0 && (
                            <div>
                              <span className="font-medium">Reasoning Paths:</span>
                              <div className="mt-2 space-y-2">
                                {session.paths.map((path, index) => (
                                  <div key={path.id} className="flex items-center justify-between p-2 bg-white rounded">
                                    <div className="flex items-center space-x-2">
                                      <Badge variant="outline">Path {index + 1}</Badge>
                                      <span className="text-sm">Confidence: {(path.confidence * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {path.steps.length} steps • {formatDuration(path.executionTime)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {session.finalAnswer && (
                            <div>
                              <span className="font-medium">Final Answer:</span>
                              <div className="mt-1 p-3 bg-white rounded border">
                                <pre className="text-sm whitespace-pre-wrap">{session.finalAnswer}</pre>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedSession(session)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reasoning Session History</CardTitle>
              <CardDescription>
                Historical record of all reasoning sessions and their outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionHistory.length === 0 ? (
                <p className="text-center text-muted-foreground">No session history</p>
              ) : (
                <div className="space-y-4">
                  {sessionHistory.slice().reverse().map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(session.status)}`} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{session.problem.substring(0, 50)}...</span>
                            <Badge variant="outline">{session.status}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatTimestamp(session.startTime)} • 
                            {(session.confidence * 100).toFixed(1)}% confidence
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {session.paths.length} paths
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decompositions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Problem Decompositions</CardTitle>
              <CardDescription>
                Hierarchical breakdowns of complex problems into manageable subproblems
              </CardDescription>
            </CardHeader>
            <CardContent>
              {problemDecompositions.length === 0 ? (
                <p className="text-center text-muted-foreground">No problem decompositions</p>
              ) : (
                <div className="space-y-4">
                  {problemDecompositions.map((decomposition) => (
                    <Collapsible key={decomposition.id}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${getComplexityColor(decomposition.estimatedComplexity)}`} />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{decomposition.originalProblem.substring(0, 60)}...</span>
                                <Badge variant="outline">{decomposition.status}</Badge>
                                <Badge className={getComplexityColor(decomposition.estimatedComplexity)}>
                                  {decomposition.estimatedComplexity}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {decomposition.subproblems.length} subproblems • 
                                {formatDuration(decomposition.estimatedTime * 1000)} estimated
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Progress value={decomposition.progress} className="w-20" />
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className="p-4 border-t bg-gray-50 space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Priority:</span> {decomposition.priority}/10
                            </div>
                            <div>
                              <span className="font-medium">Progress:</span> {decomposition.progress}%
                            </div>
                            <div>
                              <span className="font-medium">Required Skills:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {decomposition.requiredSkills.map((skill, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Constraints:</span>
                              <div className="text-xs text-muted-foreground mt-1">
                                {decomposition.constraints.join(', ')}
                              </div>
                            </div>
                          </div>
                          
                          {decomposition.subproblems.length > 0 && (
                            <div>
                              <span className="font-medium">Subproblems:</span>
                              <div className="mt-2 space-y-2">
                                {decomposition.subproblems.map((subproblem, index) => (
                                  <div key={index} className="flex items-center space-x-2 p-2 bg-white rounded">
                                    <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                                      {index + 1}
                                    </div>
                                    <span className="text-sm">{subproblem}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end space-x-2">
                            <Button size="sm" variant="outline">
                              Edit
                            </Button>
                            <Button size="sm" variant="outline">
                              Export
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reasoning Strategies</CardTitle>
              <CardDescription>
                Configure and manage reasoning strategies for different problem types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Add Strategy Form */}
                <div className="p-4 border rounded-lg bg-gray-50">
                  <h3 className="font-medium mb-4">Add New Strategy</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Strategy Name</label>
                      <Input
                        placeholder="Enter strategy name..."
                        value={newStrategy.name}
                        onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Weight</label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={newStrategy.weight}
                        onChange={(e) => setNewStrategy({ ...newStrategy, weight: parseFloat(e.target.value) })}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Max Depth</label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={newStrategy.maxDepth}
                        onChange={(e) => setNewStrategy({ ...newStrategy, maxDepth: parseInt(e.target.value) })}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Timeout (ms)</label>
                      <Input
                        type="number"
                        min="1000"
                        max="300000"
                        step="1000"
                        value={newStrategy.timeout}
                        onChange={(e) => setNewStrategy({ ...newStrategy, timeout: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Describe the strategy..."
                      value={newStrategy.description}
                      onChange={(e) => setNewStrategy({ ...newStrategy, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  
                  <div className="mt-4">
                    <label className="text-sm font-medium">Patterns</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(Object.values(ReasoningPattern) as ReasoningPattern[]).map((pattern) => (
                        <Badge
                          key={pattern}
                          variant={newStrategy.patterns.includes(pattern) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            const patterns = newStrategy.patterns.includes(pattern)
                              ? newStrategy.patterns.filter((p: ReasoningPattern) => p !== pattern)
                              : [...newStrategy.patterns, pattern];
                            setNewStrategy({ ...newStrategy, patterns });
                          }}
                        >
                          {getPatternIcon(pattern)}
                          <span className="ml-1">{pattern.replace(/_/g, ' ')}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="text-sm font-medium">Conditions (one per line)</label>
                    <Textarea
                      placeholder="problem.includes('complex')&#10;problem.length > 100"
                      value={newStrategy.conditions}
                      onChange={(e) => setNewStrategy({ ...newStrategy, conditions: e.target.value })}
                      rows={3}
                    />
                  </div>
                  
                  <Button
                    onClick={handleAddStrategy}
                    disabled={!newStrategy.name.trim() || !newStrategy.patterns.length}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Strategy
                  </Button>
                </div>

                {/* Strategy List */}
                <div className="space-y-4">
                  {reasoningStrategies.map((strategy) => (
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
                      
                      <div className="flex items-center space-x-2">
                        <div className="text-sm text-muted-foreground">
                          Weight: {strategy.weight} • Depth: {strategy.maxDepth}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleStrategy(strategy.id, !strategy.enabled)}
                        >
                          {strategy.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveStrategy(strategy.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pattern Performance Analytics</CardTitle>
              <CardDescription>
                Track and analyze the performance of different reasoning patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patternPerformance.size === 0 ? (
                <p className="text-center text-muted-foreground">No performance data available</p>
              ) : (
                <div className="space-y-4">
                  {Array.from(patternPerformance.entries()).map(([pattern, stats]) => {
                    const perfStats = getPatternPerformanceStats(pattern);
                    return (
                      <div key={pattern} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getPatternIcon(pattern)}
                          <div>
                            <div className="font-medium">{pattern.replace(/_/g, ' ')}</div>
                            <div className="text-sm text-muted-foreground">
                              {stats.totalCount} executions • Last used: {formatTimestamp(stats.lastUsed)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <div className="text-sm font-medium">Success Rate</div>
                            <div className={`text-lg font-bold ${perfStats.successRate >= 80 ? 'text-green-500' : perfStats.successRate >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {perfStats.successRate.toFixed(1)}%
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-sm font-medium">Avg Confidence</div>
                            <div className={`text-lg font-bold ${perfStats.avgConfidence >= 80 ? 'text-green-500' : perfStats.avgConfidence >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {perfStats.avgConfidence.toFixed(1)}%
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-sm font-medium">Avg Time</div>
                            <div className="text-lg font-bold text-blue-500">
                              {formatDuration(perfStats.avgTime)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};