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
  Crown, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  History,
  Clock,
  Shield,
  User,
  Target,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  Key,
  Lock,
  Unlock,
  ShieldAlert
} from 'lucide-react';
import { 
  UserCommandSupremacyService, 
  UserCommand, 
  CommandPriority, 
  OverrideType, 
  CommandStatus,
  OverrideRule,
  CommandStats
} from '@/features/system/services/UserCommandSupremacyService';
import { useSystemStore } from '@/store/system-store';

interface UserCommandSupremacyManagerProps {
  commandSupremacyService?: UserCommandSupremacyService;
}

export const UserCommandSupremacyManager: React.FC<UserCommandSupremacyManagerProps> = ({
  commandSupremacyService = new UserCommandSupremacyService()
}) => {
  const [activeCommands, setActiveCommands] = useState<UserCommand[]>([]);
  const [commandQueue, setCommandQueue] = useState<UserCommand[]>([]);
  const [commandHistory, setCommandHistory] = useState<any[]>([]);
  const [commandStats, setCommandStats] = useState<CommandStats | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [overrideRules, setOverrideRules] = useState<OverrideRule[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<UserCommand | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [newCommand, setNewCommand] = useState({
    command: '',
    priority: 'normal' as CommandPriority,
    overrideType: 'confirm' as OverrideType,
    target: '',
    parameters: '',
    justification: '',
    expectedOutcome: ''
  });
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [systemLock, setSystemLock] = useState(false);

  const { systemStatus: systemStatusStore } = useSystemStore.getState();

  // Update data
  useEffect(() => {
    const updateData = () => {
      setActiveCommands(commandSupremacyService.getActiveCommands());
      setCommandQueue(commandSupremacyService.getCommandQueue());
      setCommandHistory(commandSupremacyService.getCommandHistory(50));
      setCommandStats(commandSupremacyService.getCommandStats());
      setSystemStatus(commandSupremacyService.getSystemStatus());
      setOverrideRules(commandSupremacyService['overrideRules'] || []);
      setEmergencyMode(commandSupremacyService['emergencyMode']);
      setSystemLock(commandSupremacyService['systemLock']);
    };

    updateData();
    const interval = setInterval(updateData, 2000);

    return () => clearInterval(interval);
  }, [commandSupremacyService]);

  const handleExecuteCommand = async () => {
    if (!newCommand.command.trim()) return;

    setIsExecuting(true);
    try {
      const target = newCommand.target ? 
        (newCommand.target.startsWith('agent_') ? { agentId: newCommand.target } :
         newCommand.target.startsWith('task_') ? { taskId: newCommand.target } :
         { system: true }) : {};

      const parameters = newCommand.parameters ? JSON.parse(newCommand.parameters) : {};

      await commandSupremacyService.executeUserCommand(
        'user',
        newCommand.command,
        newCommand.priority,
        newCommand.overrideType,
        target,
        parameters,
        newCommand.justification,
        newCommand.expectedOutcome
      );

      // Reset form
      setNewCommand({
        command: '',
        priority: 'normal',
        overrideType: 'confirm',
        target: '',
        parameters: '',
        justification: '',
        expectedOutcome: ''
      });
    } catch (error) {
      console.error('Command execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancelCommand = async (commandId: string) => {
    try {
      await commandSupremacyService.cancelCommand(commandId, 'User cancelled');
    } catch (error) {
      console.error('Failed to cancel command:', error);
    }
  };

  const handleOverrideCommand = async (commandId: string) => {
    try {
      await commandSupremacyService.overrideCommand(
        commandId,
        'stop',
        'supreme',
        'User override'
      );
    } catch (error) {
      console.error('Failed to override command:', error);
    }
  };

  const handleApproveCommand = async (commandId: string) => {
    try {
      await commandSupremacyService.approveCommand(commandId, 'user');
    } catch (error) {
      console.error('Failed to approve command:', error);
    }
  };

  const handleToggleEmergencyMode = () => {
    if (emergencyMode) {
      commandSupremacyService.deactivateEmergencyMode();
    } else {
      commandSupremacyService.activateEmergencyMode();
    }
  };

  const handleToggleSystemLock = () => {
    if (systemLock) {
      commandSupremacyService.unlockSystem();
    } else {
      commandSupremacyService.lockSystem();
    }
  };

  const getPriorityColor = (priority: CommandPriority): string => {
    switch (priority) {
      case 'supreme': return 'bg-purple-500';
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      case 'routine': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: CommandStatus): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'executing': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      case 'overridden': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityIcon = (priority: CommandPriority) => {
    switch (priority) {
      case 'supreme':
        return <Crown className="h-4 w-4 text-purple-500" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <Zap className="h-4 w-4 text-orange-500" />;
      case 'normal':
        return <Target className="h-4 w-4 text-blue-500" />;
      case 'low':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'routine':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Target className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: CommandStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'executing':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'overridden':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 90) return 'text-green-500';
    if (rate >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-blue-500" />
          User Command Supremacy
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant={emergencyMode ? 'destructive' : 'secondary'}>
            {emergencyMode ? 'EMERGENCY MODE' : 'Normal'}
          </Badge>
          <Badge variant={systemLock ? 'destructive' : 'secondary'}>
            {systemLock ? 'SYSTEM LOCKED' : 'Unlocked'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleEmergencyMode}
          >
            {emergencyMode ? <Unlock className="h-4 w-4 mr-2" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
            Emergency
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleSystemLock}
          >
            {systemLock ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
            Lock System
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Commands</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCommands.length}</div>
            <p className="text-xs text-muted-foreground">
              {commandQueue.length} queued
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Override Success Rate</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSuccessRateColor(commandStats?.overrideSuccessRate || 0)}`}>
              {(commandStats?.overrideSuccessRate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">User supremacy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commands</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{commandStats?.totalCommands || 0}</div>
            <p className="text-xs text-muted-foreground">
              {commandStats?.supremeCommands || 0} supreme
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {systemLock ? 'Locked' : emergencyMode ? 'Emergency' : 'Operational'}
            </div>
            <p className="text-xs text-muted-foreground">
              {overrideRules.length} override rules
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Command Execution Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Execute Command</CardTitle>
          <CardDescription>
            Execute user commands with different priority levels and override capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Command</label>
                <Input
                  placeholder="Enter command..."
                  value={newCommand.command}
                  onChange={(e) => setNewCommand({ ...newCommand, command: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Target</label>
                <Input
                  placeholder="agent_123, task_456, or leave empty for system"
                  value={newCommand.target}
                  onChange={(e) => setNewCommand({ ...newCommand, target: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Parameters (JSON)</label>
                <Textarea
                  placeholder='{"key": "value"}'
                  value={newCommand.parameters}
                  onChange={(e) => setNewCommand({ ...newCommand, parameters: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={newCommand.priority}
                  onValueChange={(value: CommandPriority) => 
                    setNewCommand({ ...newCommand, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supreme">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-purple-500" />
                        Supreme
                      </div>
                    </SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Critical
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-orange-500" />
                        High
                      </div>
                    </SelectItem>
                    <SelectItem value="normal">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        Normal
                      </div>
                    </SelectItem>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        Low
                      </div>
                    </SelectItem>
                    <SelectItem value="routine">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Routine
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Override Type</label>
                <Select
                  value={newCommand.overrideType}
                  onValueChange={(value: OverrideType) => 
                    setNewCommand({ ...newCommand, overrideType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="confirm">Confirm</SelectItem>
                    <SelectItem value="conditional">Conditional</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Justification</label>
                <Textarea
                  placeholder="Why are you executing this command?"
                  value={newCommand.justification}
                  onChange={(e) => setNewCommand({ ...newCommand, justification: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Button 
              onClick={handleExecuteCommand} 
              disabled={!newCommand.command.trim() || isExecuting}
              className="w-full"
            >
              {isExecuting ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Execute Command
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Command Management Dashboard */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Commands</TabsTrigger>
          <TabsTrigger value="queue">Command Queue</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="rules">Override Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Currently Executing Commands</CardTitle>
              <CardDescription>
                Commands currently being executed with real-time status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeCommands.length === 0 ? (
                <p className="text-center text-muted-foreground">No active commands</p>
              ) : (
                <div className="space-y-4">
                  {activeCommands.map((command) => (
                    <Collapsible key={command.id}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-center space-x-3">
                            {getPriorityIcon(command.priority)}
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{command.command}</span>
                                <Badge className={getPriorityColor(command.priority)}>
                                  {command.priority.toUpperCase()}
                                </Badge>
                                <Badge variant="outline">{command.status}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatTimestamp(command.timestamp)} • 
                                Target: {command.target.agentId || command.target.taskId || 'System'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(command.status)}
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className="p-4 border-t bg-gray-50 space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">User:</span> {command.userId}
                            </div>
                            <div>
                              <span className="font-medium">Override Type:</span> {command.overrideType}
                            </div>
                            <div>
                              <span className="font-medium">Justification:</span>
                              <div className="text-xs text-muted-foreground mt-1">
                                {command.justification}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Expected Outcome:</span>
                              <div className="text-xs text-muted-foreground mt-1">
                                {command.expectedOutcome}
                              </div>
                            </div>
                          </div>
                          
                          {command.execution.startTime && (
                            <div>
                              <span className="font-medium">Execution Started:</span>{' '}
                              {formatTimestamp(command.execution.startTime)}
                            </div>
                          )}
                          
                          {command.execution.result && (
                            <div>
                              <span className="font-medium">Result:</span>
                              <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(command.execution.result, null, 2)}
                              </pre>
                            </div>
                          )}

                          <div className="flex justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOverrideCommand(command.id)}
                            >
                              Override
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancelCommand(command.id)}
                            >
                              Cancel
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

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Command Queue</CardTitle>
              <CardDescription>
                Pending commands waiting for execution, ordered by priority
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commandQueue.length === 0 ? (
                <p className="text-center text-muted-foreground">No queued commands</p>
              ) : (
                <div className="space-y-4">
                  {commandQueue.map((command, index) => (
                    <div key={command.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm text-muted-foreground">#{index + 1}</div>
                        {getPriorityIcon(command.priority)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{command.command}</span>
                            <Badge className={getPriorityColor(command.priority)}>
                              {command.priority.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatTimestamp(command.timestamp)} • {command.userId}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(command.status)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveCommand(command.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancelCommand(command.id)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Command History</CardTitle>
              <CardDescription>
                Historical record of all executed commands and their outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commandHistory.length === 0 ? (
                <p className="text-center text-muted-foreground">No command history</p>
              ) : (
                <div className="space-y-4">
                  {commandHistory.slice().reverse().map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(entry.action as CommandStatus)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{entry.action}</span>
                            <Badge variant="outline">{entry.commandId}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatTimestamp(entry.timestamp)} • {entry.userId}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {Object.keys(entry.details).length > 0 && (
                          <div className="max-w-xs truncate">
                            {JSON.stringify(entry.details)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Override Rules</CardTitle>
              <CardDescription>
                Configure rules that govern command override behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overrideRules.length === 0 ? (
                <p className="text-center text-muted-foreground">No override rules configured</p>
              ) : (
                <div className="space-y-4">
                  {overrideRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <span className="font-medium">{rule.name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {rule.description}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          Priority: {rule.priority}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => commandSupremacyService.toggleOverrideRule(rule.id, !rule.enabled)}
                        >
                          {rule.enabled ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};