import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  Agent,
  AgentMessage,
  ModelConfig,
  SystemConstraints,
  SystemResourceUsage,
  SystemState,
  Task
} from '@/types/agent-types';

// Default system constraints
const DEFAULT_CONSTRAINTS: SystemConstraints = {
  maxAgents: 10,
  maxMemoryUsage: 2048, // MB
  maxCpuUsage: 80, // percentage
  maxTokensPerMinute: 10000,
  timeout: 30000, // ms
};

// Default resource usage
const DEFAULT_RESOURCE_USAGE: SystemResourceUsage = {
  cpuUtilization: 0,
  memoryUtilization: 0,
  tokensUsedLastMinute: 0,
  activeAgentCount: 0,
  pendingTaskCount: 0,
};

// Default model configuration
const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: 'local',
  modelName: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 1000,
  costPerToken: 0.0000002,
};

// Initial system state
const initialState: SystemState = {
  agents: [],
  tasks: [],
  messages: [],
  activeModelConfig: DEFAULT_MODEL_CONFIG,
  constraints: DEFAULT_CONSTRAINTS,
  systemStatus: 'starting',
  resourceUsage: DEFAULT_RESOURCE_USAGE,
};

interface SystemStore extends SystemState {
  // Agent operations
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'lastActive'>) => void;
  updateAgentStatus: (agentId: string, status: Agent['status']) => void;
  removeAgent: (agentId: string) => void;
  
  // Task operations
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'status' | 'progress' | 'subtaskIds'>) => string;
  updateTaskStatus: (taskId: string, status: Task['status']) => void;
  updateTaskProgress: (taskId: string, progress: number) => void;
  completeTask: (taskId: string, result?: any) => void;
  assignTask: (taskId: string, agentIds: string[]) => void;
  
  // Message operations
  sendMessage: (message: Omit<AgentMessage, 'id' | 'timestamp'>) => void;
  
  // System operations
  updateSystemStatus: (status: SystemState['systemStatus']) => void;
  updateResourceUsage: (usage: Partial<SystemResourceUsage>) => void;
  updateModelConfig: (config: Partial<ModelConfig>) => void;
  resetSystem: () => void;
}

// Create the system store with persistence
export const useSystemStore = create<SystemStore>()(persist(
  (set, get) => ({
    ...initialState,

    // Agent operations
    addAgent: (agent) => set((state) => {
      const newAgent: Agent = {
        ...agent,
        id: uuidv4(),
        createdAt: new Date(),
        lastActive: new Date(),
      };
      
      return {
        agents: [...state.agents, newAgent],
        resourceUsage: {
          ...state.resourceUsage,
          activeAgentCount: state.resourceUsage.activeAgentCount + 1
        }
      };
    }),
    
    updateAgentStatus: (agentId, status) => set((state) => ({
      agents: state.agents.map(agent => 
        agent.id === agentId 
          ? { ...agent, status, lastActive: new Date() } 
          : agent
      )
    })),
    
    removeAgent: (agentId) => set((state) => {
      const agentExists = state.agents.some(a => a.id === agentId);
      
      return {
        agents: state.agents.filter(agent => agent.id !== agentId),
        resourceUsage: {
          ...state.resourceUsage,
          activeAgentCount: agentExists 
            ? state.resourceUsage.activeAgentCount - 1 
            : state.resourceUsage.activeAgentCount
        }
      };
    }),

    // Task operations
    addTask: (task) => {
      const taskId = uuidv4();
      
      set((state) => ({
        tasks: [
          ...state.tasks, 
          { 
            ...task, 
            id: taskId, 
            status: 'pending', 
            progress: 0,
            createdAt: new Date(),
            subtaskIds: []
          }
        ],
        resourceUsage: {
          ...state.resourceUsage,
          pendingTaskCount: state.resourceUsage.pendingTaskCount + 1
        }
      }));
      
      return taskId;
    },
    
    updateTaskStatus: (taskId, status) => set((state) => {
      const task = state.tasks.find(t => t.id === taskId);
      const isPending = task?.status === 'pending';
      const isCompleting = (status === 'completed' || status === 'failed') && 
                           task?.status !== 'completed' && task?.status !== 'failed';
      
      return {
        tasks: state.tasks.map(task => 
          task.id === taskId
            ? { 
                ...task, 
                status,
                startedAt: status === 'inProgress' && !task.startedAt 
                  ? new Date() 
                  : task.startedAt,
                completedAt: (status === 'completed' || status === 'failed') && !task.completedAt
                  ? new Date()
                  : task.completedAt
              }
            : task
        ),
        resourceUsage: {
          ...state.resourceUsage,
          pendingTaskCount: isPending && status !== 'pending'
            ? state.resourceUsage.pendingTaskCount - 1
            : isCompleting
              ? state.resourceUsage.pendingTaskCount + 1
              : state.resourceUsage.pendingTaskCount
        }
      };
    }),
    
    updateTaskProgress: (taskId, progress) => set((state) => ({
      tasks: state.tasks.map(task => 
        task.id === taskId 
          ? { ...task, progress: Math.min(100, Math.max(0, progress)) } 
          : task
      )
    })),
    
    completeTask: (taskId, result) => {
      const { updateTaskStatus } = get();
      
      set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === taskId 
            ? { 
                ...task, 
                status: 'completed', 
                progress: 100, 
                result,
                completedAt: new Date() 
              } 
            : task
        )
      }));
      
      updateTaskStatus(taskId, 'completed');
    },
    
    assignTask: (taskId, agentIds) => set((state) => ({
      tasks: state.tasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              assignedAgentIds: agentIds,
              status: agentIds.length > 0 ? 'assigned' : task.status
            } 
          : task
      )
    })),

    // Message operations
    sendMessage: (message) => set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: uuidv4(),
          timestamp: new Date()
        }
      ]
    })),

    // System operations
    updateSystemStatus: (systemStatus) => set({ systemStatus }),
    
    updateResourceUsage: (usage) => set((state) => ({
      resourceUsage: { ...state.resourceUsage, ...usage }
    })),
    
    updateModelConfig: (config) => set((state) => ({
      activeModelConfig: { ...state.activeModelConfig, ...config }
    })),
    
    resetSystem: () => set({
      ...initialState,
      systemStatus: 'starting'
    }),
  }),
  {
    name: 'multi-agent-system-store',
  }
));