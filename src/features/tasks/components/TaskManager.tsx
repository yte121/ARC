import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Play, 
  Pause, 
  X,
  ChevronDown,
  ChevronRight,
  Users,
  Calendar,
  Target
} from 'lucide-react';
import { useSystemStore } from '@/store/system-store';
import { APIService } from '@/services/APIService';
import { Task, TaskStatus, TaskPriority, Agent } from '@/types/agent-types';

export function TaskManager() {
  const { tasks, agents, updateTaskStatus, updateTaskProgress } = useSystemStore();
  const [activeTab, setActiveTab] = useState('all');
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('normal');
  const [newTaskParent, setNewTaskParent] = useState('none');
  const [isLoading, setIsLoading] = useState(false);
  
  const apiService = new APIService();

  // Real task management
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const fetchedTasks = await apiService.getTasks();
        // Update store with fetched tasks
        useSystemStore.setState({ tasks: fetchedTasks });
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      }
    };

    fetchTasks();
  }, []);

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    setIsLoading(true);
    try {
      const taskData = {
        title: newTaskTitle,
        description: newTaskDescription,
        priority: newTaskPriority,
        parentTaskId: newTaskParent === 'none' ? null : newTaskParent
      };

      const newTask = await apiService.createTask(taskData);
      
      // Update store
      useSystemStore.setState(prev => ({
        tasks: [...prev.tasks, newTask]
      }));

      // Reset form
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskPriority('normal');
      setNewTaskParent('none');
      setIsCreateTaskDialogOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessComplexProblem = async () => {
    const complexTask = {
      title: 'Complex Problem Analysis',
      description: 'Analyze and decompose complex problem using hierarchical reasoning',
      priority: 'high' as TaskPriority,
      parentTaskId: null
    };

    try {
      const newTask = await apiService.createTask(complexTask);
      useSystemStore.setState(prev => ({
        tasks: [...prev.tasks, newTask]
      }));
    } catch (error) {
      console.error('Failed to create complex task:', error);
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await apiService.updateTaskStatus(taskId, status);
      updateTaskStatus(taskId, status);
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleProgressUpdate = async (taskId: string, progress: number) => {
    try {
      await apiService.updateTaskProgress(taskId, progress);
      updateTaskProgress(taskId, progress);
    } catch (error) {
      console.error('Failed to update task progress:', error);
    }
  };

  // Filter tasks based on active tab
  const filteredTasks = tasks.filter(task => {
    switch (activeTab) {
      case 'pending':
        return task.status === 'pending' || task.status === 'inProgress';
      case 'completed':
        return task.status === 'completed';
      default:
        return true;
    }
  });

  // Build task hierarchy
  const buildTaskHierarchy = (tasks: Task[]): Record<string, Task[]> => {
    const hierarchy: Record<string, Task[]> = {};
    
    tasks.forEach(task => {
      if (task.parentTaskId) {
        if (!hierarchy[task.parentTaskId]) {
          hierarchy[task.parentTaskId] = [];
        }
        hierarchy[task.parentTaskId].push(task);
      }
    });
    
    return hierarchy;
  };

  const taskHierarchy = buildTaskHierarchy(tasks);
  const rootTasks = tasks.filter(task => !task.parentTaskId);

  const getStatusIcon = () => {
    switch (activeTab) {
      case 'all':
        return <Target className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
        {/* Tab navigation */}
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 w-full sm:w-[400px]">
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Create Task Button */}
        <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Create a task for the multi-agent system to process.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right text-sm font-medium">
                  Title
                </Label>
                <Input
                  id="title"
                  placeholder="Task title"
                  className="col-span-3"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right text-sm font-medium">
                  Description
                </Label>
                <div className="col-span-3 space-y-1">
                  <Textarea
                    id="description"
                    placeholder="Problem description or task details"
                    className="min-h-[80px]"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    For complex problems, provide detailed descriptions to enable better problem decomposition.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right text-sm font-medium">
                  Priority
                </Label>
                <Select
                  value={newTaskPriority}
                  onValueChange={(value) => setNewTaskPriority(value as TaskPriority)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="parent" className="text-right text-sm font-medium">
                  Parent Task
                </Label>
                <Select
                  value={newTaskParent}
                  onValueChange={setNewTaskParent}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select parent task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Parent</SelectItem>
                    {tasks.map(task => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask} disabled={isLoading || !newTaskTitle.trim()}>
                {isLoading ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Task List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              {activeTab === 'all' ? 'All Tasks' : activeTab === 'pending' ? 'Pending Tasks' : 'Completed Tasks'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {filteredTasks.length} tasks
              </Badge>
              {activeTab === 'all' && (
                <Button variant="outline" size="sm" onClick={handleProcessComplexProblem}>
                  <Target className="mr-2 h-4 w-4" />
                  Complex Problem
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {rootTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">No tasks yet</h3>
                  <p className="text-sm">Create your first task to get started</p>
                </div>
              ) : (
                rootTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    hierarchy={taskHierarchy}
                    expandedTasks={expandedTasks}
                    toggleExpanded={toggleTaskExpanded}
                    depth={0}
                    agents={agents}
                    onStatusChange={handleStatusChange}
                    onProgressUpdate={handleProgressUpdate}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  hierarchy: Record<string, Task[]>;
  expandedTasks: Record<string, boolean>;
  toggleExpanded: (taskId: string) => void;
  depth: number;
  agents: Agent[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onProgressUpdate: (taskId: string, progress: number) => void;
}

function TaskItem({ 
  task, 
  hierarchy, 
  expandedTasks, 
  toggleExpanded, 
  depth, 
  agents, 
  onStatusChange,
  onProgressUpdate 
}: TaskItemProps) {
  const hasChildren = hierarchy[task.id] && hierarchy[task.id].length > 0;
  const isExpanded = expandedTasks[task.id];

  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inProgress':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-2">
      <div 
        className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
          depth > 0 ? 'ml-6' : ''
        }`}
      >
        {/* Expand/Collapse */}
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => toggleExpanded(task.id)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
        
        {/* Status Icon */}
        {getStatusIcon()}
        
        {/* Task Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{task.title}</h4>
            <Badge className={`text-xs ${getPriorityColor()}`}>
              {task.priority}
            </Badge>
          </div>
          
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {task.description}
            </p>
          )}
          
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Progress</span>
              <span>{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-2" />
          </div>
          
          {/* Task Meta */}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(task.createdAt).toLocaleDateString()}</span>
            </div>
            {task.assignedAgentIds && task.assignedAgentIds.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{task.assignedAgentIds.length} agents</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          {task.status === 'pending' && (
            <Button
              size="sm"
              onClick={() => onStatusChange(task.id, 'inProgress')}
            >
              <Play className="h-3 w-3" />
            </Button>
          )}
          
          {task.status === 'inProgress' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(task.id, 'completed')}
            >
              <CheckCircle className="h-3 w-3" />
            </Button>
          )}
          
          <Select
            value={task.status}
            onValueChange={(value) => onStatusChange(task.id, value as TaskStatus)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inProgress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-6">
          {hierarchy[task.id].map(childTask => (
            <TaskItem
              key={childTask.id}
              task={childTask}
              hierarchy={hierarchy}
              expandedTasks={expandedTasks}
              toggleExpanded={toggleExpanded}
              depth={depth + 1}
              agents={agents}
              onStatusChange={onStatusChange}
              onProgressUpdate={onProgressUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}