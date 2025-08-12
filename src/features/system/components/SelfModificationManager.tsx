import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSystemStore } from '@/store/system-store';
import { SelfModificationService } from '@/features/system/services/SelfModificationService';
import { 
  SystemConstraints, 
  SystemResourceUsage, 
  Agent,
  Task 
} from '@/types/agent-types';

interface SelfModificationManagerProps {
  modificationService?: SelfModificationService;
}

export const SelfModificationManager: React.FC<SelfModificationManagerProps> = ({
  modificationService = new SelfModificationService()
}) => {
  const [modificationHistory, setModificationHistory] = useState<any[]>([]);
  const [pendingModifications, setPendingModifications] = useState<any[]>([]);
  const [selectedModification, setSelectedModification] = useState<any>(null);
  const [newModification, setNewModification] = useState({
    type: 'config' as const,
    description: '',
    changes: '',
    requiresApproval: true
  });
  const [safetyConstraints, setSafetyConstraints] = useState(modificationService.getSafetyConstraints());
  const [stats, setStats] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const { 
    systemStatus, 
    resourceUsage, 
    constraints, 
    agents, 
    tasks 
  } = useSystemStore.getState();

  // Update data
  useEffect(() => {
    const updateData = () => {
      setModificationHistory(modificationService.getModificationHistory(20));
      setPendingModifications(modificationService.getPendingModifications());
      setStats(modificationService.getModificationStats());
    };

    updateData();
    const interval = setInterval(updateData, 3000);

    return () => clearInterval(interval);
  }, [modificationService]);

  const handleRequestModification = async () => {
    if (!newModification.description.trim() || !newModification.changes.trim()) {
      alert('Please provide both description and changes');
      return;
    }

    setIsExecuting(true);
    try {
      const modificationId = await modificationService.requestModification(
        newModification.type,
        newModification.description,
        newModification.changes,
        newModification.requiresApproval
      );

      // Reset form
      setNewModification({
        type: 'config',
        description: '',
        changes: '',
        requiresApproval: true
      });

      alert(`Modification requested successfully. ID: ${modificationId}`);
    } catch (error) {
      alert(`Failed to request modification: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleApproveModification = async (modificationId: string) => {
    setIsExecuting(true);
    try {
      await modificationService.approveModification(modificationId, 'user');
      alert('Modification approved successfully');
    } catch (error) {
      alert(`Failed to approve modification: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRejectModification = async (modificationId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setIsExecuting(true);
    try {
      await modificationService.rejectModification(modificationId, reason);
      alert('Modification rejected successfully');
    } catch (error) {
      alert(`Failed to reject modification: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRollbackModification = async (modificationId: string) => {
    if (!confirm('Are you sure you want to rollback this modification?')) return;

    setIsExecuting(true);
    try {
      await modificationService.rollbackModification(modificationId);
      alert('Modification rolled back successfully');
    } catch (error) {
      alert(`Failed to rollback modification: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleUpdateSafetyConstraints = () => {
    modificationService.updateSafetyConstraints(safetyConstraints);
    alert('Safety constraints updated successfully');
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      case 'approved': return 'bg-blue-500';
      case 'rejected': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
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
        <h1 className="text-3xl font-bold">Self-Modification Manager</h1>
        <Badge variant={safetyConstraints.allowCodeExecution ? 'default' : 'secondary'}>
          Code Execution: {safetyConstraints.allowCodeExecution ? 'ALLOWED' : 'BLOCKED'}
        </Badge>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Modifications</CardTitle>
              <div className="text-2xl">📝</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalModifications}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <div className="text-2xl">✅</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedModifications}/{stats.totalModifications} successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <div className="text-2xl">⏳</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingModifications}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <div className="text-2xl">❌</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failedModifications}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="request" className="space-y-4">
        <TabsList>
          <TabsTrigger value="request">Request Modification</TabsTrigger>
          <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
          <TabsTrigger value="history">Modification History</TabsTrigger>
          <TabsTrigger value="safety">Safety Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="request" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Self-Modification</CardTitle>
              <CardDescription>
                Submit a request to modify the system. All modifications are subject to safety checks and approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modification-type">Modification Type</Label>
                  <select
                    id="modification-type"
                    className="w-full p-2 border rounded-md"
                    value={newModification.type}
                    onChange={(e) => setNewModification({...newModification, type: e.target.value as any})}
                  >
                    <option value="config">Configuration</option>
                    <option value="system">System</option>
                    <option value="agent">Agent</option>
                    <option value="code">Code</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requires-approval">Require Approval</Label>
                  <Switch
                    id="requires-approval"
                    checked={newModification.requiresApproval}
                    onCheckedChange={(checked) => setNewModification({...newModification, requiresApproval: checked})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="modification-description">Description</Label>
                <Textarea
                  id="modification-description"
                  placeholder="Brief description of the modification..."
                  value={newModification.description}
                  onChange={(e) => setNewModification({...newModification, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modification-changes">Changes</Label>
                <Textarea
                  id="modification-changes"
                  placeholder="Enter the changes to apply..."
                  value={newModification.changes}
                  onChange={(e) => setNewModification({...newModification, changes: e.target.value})}
                  rows={6}
                />
              </div>

              <Button 
                onClick={handleRequestModification} 
                disabled={isExecuting || !newModification.description.trim() || !newModification.changes.trim()}
                className="w-full"
              >
                {isExecuting ? 'Requesting...' : 'Request Modification'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Modifications</CardTitle>
              <CardDescription>
                Review and approve pending modification requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingModifications.length === 0 ? (
                <p className="text-center text-muted-foreground">No pending modifications</p>
              ) : (
                <div className="space-y-4">
                  {pendingModifications.map((modification) => (
                    <div key={modification.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{modification.description}</h3>
                          <p className="text-sm text-muted-foreground">
                            Type: {modification.type} | ID: {modification.id}
                          </p>
                        </div>
                        <Badge className={getStatusColor(modification.status)}>
                          {modification.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-4">
                        <h4 className="text-sm font-medium">Safety Checks:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div className="flex items-center">
                            <span className={`w-2 h-2 rounded-full mr-2 ${
                              modification.safetyChecks.validation ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            Validation
                          </div>
                          <div className="flex items-center">
                            <span className={`w-2 h-2 rounded-full mr-2 ${
                              modification.safetyChecks.resourceCheck ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            Resources
                          </div>
                          <div className="flex items-center">
                            <span className={`w-2 h-2 rounded-full mr-2 ${
                              modification.safetyChecks.backupCreated ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            Backup
                          </div>
                          <div className="flex items-center">
                            <span className={`w-2 h-2 rounded-full mr-2 ${
                              modification.safetyChecks.testPassed ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            Tests
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveModification(modification.id)}
                          disabled={isExecuting}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectModification(modification.id)}
                          disabled={isExecuting}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedModification(modification)}
                        >
                          View Details
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
              <CardTitle>Modification History</CardTitle>
              <CardDescription>
                View past modifications and their outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {modificationHistory.length === 0 ? (
                <p className="text-center text-muted-foreground">No modification history</p>
              ) : (
                <div className="space-y-4">
                  {modificationHistory.map((modification) => (
                    <div key={modification.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{modification.description}</h3>
                          <p className="text-sm text-muted-foreground">
                            Type: {modification.type} | ID: {modification.id}
                          </p>
                        </div>
                        <Badge className={getStatusColor(modification.status)}>
                          {modification.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground mb-2">
                        {new Date(modification.timestamp).toLocaleString()}
                      </div>

                      {modification.rollbackData && (
                        <div className="text-sm text-blue-600 mb-2">
                          Backup available for rollback
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedModification(modification)}
                        >
                          View Details
                        </Button>
                        {modification.rollbackData && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRollbackModification(modification.id)}
                            disabled={isExecuting}
                          >
                            Rollback
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="safety" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Safety Constraints</CardTitle>
              <CardDescription>
                Configure safety constraints for self-modification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="allow-code-execution">Allow Code Execution</Label>
                  <Switch
                    id="allow-code-execution"
                    checked={safetyConstraints.allowCodeExecution}
                    onCheckedChange={(checked) => setSafetyConstraints({...safetyConstraints, allowCodeExecution: checked})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="require-approval">Require Approval</Label>
                  <Switch
                    id="require-approval"
                    checked={safetyConstraints.requireApproval}
                    onCheckedChange={(checked) => setSafetyConstraints({...safetyConstraints, requireApproval: checked})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="require-backup">Require Backup</Label>
                  <Switch
                    id="require-backup"
                    checked={safetyConstraints.requireBackup}
                    onCheckedChange={(checked) => setSafetyConstraints({...safetyConstraints, requireBackup: checked})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-modification-size">Max Modification Size (bytes)</Label>
                  <input
                    id="max-modification-size"
                    type="number"
                    className="w-full p-2 border rounded-md"
                    value={safetyConstraints.maxModificationSize}
                    onChange={(e) => setSafetyConstraints({...safetyConstraints, maxModificationSize: parseInt(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-timeout">Test Timeout (ms)</Label>
                  <input
                    id="test-timeout"
                    type="number"
                    className="w-full p-2 border rounded-md"
                    value={safetyConstraints.testTimeout}
                    onChange={(e) => setSafetyConstraints({...safetyConstraints, testTimeout: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <Button onClick={handleUpdateSafetyConstraints}>
                Update Safety Constraints
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current System Status</CardTitle>
              <CardDescription>
                System information for safety assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">System Status:</span> {systemStatus}
                </div>
                <div>
                  <span className="font-medium">Active Agents:</span> {agents.length}
                </div>
                <div>
                  <span className="font-medium">Pending Tasks:</span> {tasks.filter(t => t.status === 'pending').length}
                </div>
                <div>
                  <span className="font-medium">Memory Usage:</span> {formatBytes(resourceUsage.memoryUtilization)}
                </div>
                <div>
                  <span className="font-medium">CPU Usage:</span> {resourceUsage.cpuUtilization}%
                </div>
                <div>
                  <span className="font-medium">Token Rate:</span> {resourceUsage.tokensUsedLastMinute}/min
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modification Details Modal */}
      {selectedModification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Modification Details</h2>
              <Button variant="outline" onClick={() => setSelectedModification(null)}>
                Close
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Description</h3>
                <p>{selectedModification.description}</p>
              </div>

              <div>
                <h3 className="font-semibold">Type</h3>
                <p>{selectedModification.type}</p>
              </div>

              <div>
                <h3 className="font-semibold">Status</h3>
                <Badge className={getStatusColor(selectedModification.status)}>
                  {selectedModification.status.toUpperCase()}
                </Badge>
              </div>

              <div>
                <h3 className="font-semibold">Timestamp</h3>
                <p>{new Date(selectedModification.timestamp).toLocaleString()}</p>
              </div>

              <div>
                <h3 className="font-semibold">Changes</h3>
                <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                  {selectedModification.changes}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold">Safety Checks</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      selectedModification.safetyChecks.validation ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    Validation: {selectedModification.safetyChecks.validation ? 'Passed' : 'Failed'}
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      selectedModification.safetyChecks.resourceCheck ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    Resources: {selectedModification.safetyChecks.resourceCheck ? 'OK' : 'Insufficient'}
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      selectedModification.safetyChecks.backupCreated ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    Backup: {selectedModification.safetyChecks.backupCreated ? 'Created' : 'Not Created'}
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      selectedModification.safetyChecks.testPassed ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    Tests: {selectedModification.safetyChecks.testPassed ? 'Passed' : 'Failed'}
                  </div>
                </div>
              </div>

              {selectedModification.rollbackData && (
                <div>
                  <h3 className="font-semibold">Rollback Data Available</h3>
                  <p className="text-sm text-green-600">This modification can be rolled back</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};