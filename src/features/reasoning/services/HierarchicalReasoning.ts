import { v4 as uuidv4 } from 'uuid';
import { useSystemStore } from '@/store/system-store';
import { CommunicationService } from '@/features/communication/services/CommunicationService';
import { 
  Agent, 
  AgentSpecialization, 
  ReasoningTier, 
  Task, 
  TaskPriority 
} from '@/types/agent-types';

/**
 * Hierarchical Reasoning Service
 * 
 * Implements the hierarchical reasoning framework that coordinates
 * strategic, tactical, and execution tier agents to solve complex problems.
 */
export class HierarchicalReasoningService {
  private communicationService: CommunicationService;
  
  constructor() {
    this.communicationService = new CommunicationService();
  }
  
  /**
   * Process a complex problem using hierarchical reasoning
   * This method coordinates the entire reasoning process across all tiers
   */
  async processComplexProblem(
    problem: string,
    priority: TaskPriority = 'normal'
  ): Promise<string> {
    const { addTask, sendMessage } = useSystemStore.getState();
    
    // Create main task
    const mainTaskId = addTask({
      title: `Process: ${problem.substring(0, 50)}...`,
      description: problem,
      priority,
      assignedAgentIds: [],
      parentTaskId: undefined
    });

    // Phase 1: Strategic Analysis
    const strategicTaskId = await this.initiateStrategicAnalysis(problem, mainTaskId);
    
    // Wait for strategic analysis to complete
    await this.waitForTaskCompletion(strategicTaskId);
    
    // Phase 2: Problem Decomposition
    const subtaskIds = await this.decomposeProblem(problem, mainTaskId, 'functional');
    
    // Phase 3: Tactical Planning
    await this.assignTacticalAgents(subtaskIds);
    
    // Phase 4: Execution Assignment
    await this.assignExecutionAgents(mainTaskId, ['codeGenerator', 'analyst']);
    
    // Phase 5: Monitor and Coordinate
    this.monitorTaskProgress(mainTaskId, subtaskIds);
    
    return mainTaskId;
  }

  /**
   * Wait for a task to complete with timeout
   */
  private async waitForTaskCompletion(taskId: string, timeout: number = 300000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(async () => {
        try {
          const { tasks } = useSystemStore.getState();
          const task = tasks.find(t => t.id === taskId);
          
          if (!task) {
            clearInterval(checkInterval);
            reject(new Error(`Task ${taskId} not found`));
            return;
          }
          
          if (task.status === 'completed') {
            clearInterval(checkInterval);
            resolve();
            return;
          }
          
          if (task.status === 'failed') {
            clearInterval(checkInterval);
            reject(new Error(`Task ${taskId} failed: Unknown error`));
            return;
          }
          
          if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval);
            reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
            return;
          }
        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, 1000); // Check every second
    });
  }

  /**
   * Monitor task progress and coordinate completion
   */
  private monitorTaskProgress(mainTaskId: string, subtaskIds: string[]): void {
    const checkInterval = setInterval(async () => {
      try {
        const { tasks, updateTaskProgress } = useSystemStore.getState();
        const mainTask = tasks.find(t => t.id === mainTaskId);
        const subtasks = tasks.filter(t => subtaskIds.includes(t.id));
        
        if (!mainTask) {
          clearInterval(checkInterval);
          return;
        }
        
        // Calculate overall progress
        const completedSubtasks = subtasks.filter(t => t.status === 'completed').length;
        const totalSubtasks = subtasks.length;
        const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
        
        // Update main task progress
        updateTaskProgress(mainTaskId, progress);
        
        // Check if all subtasks are complete
        if (completedSubtasks === totalSubtasks && totalSubtasks > 0) {
          // Synthesize results
          await this.synthesizeResults(mainTaskId, subtaskIds);
          clearInterval(checkInterval);
        }
        
        // Check for failed subtasks
        const failedSubtasks = subtasks.filter(t => t.status === 'failed');
        if (failedSubtasks.length > 0) {
          await this.handleSubtaskFailures(mainTaskId, failedSubtasks);
        }
      } catch (error) {
        console.error('Error monitoring task progress:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Synthesize results from completed subtasks
   */
  private async synthesizeResults(mainTaskId: string, subtaskIds: string[]): Promise<void> {
    try {
      const { tasks, updateTaskStatus, sendMessage, addTask } = useSystemStore.getState();
      const subtasks = tasks.filter(t => subtaskIds.includes(t.id));
      
      // Collect results from completed subtasks
      const results = subtasks
        .filter(t => t.status === 'completed' && t.result)
        .map(t => ({ taskId: t.id, result: t.result }));
      
      // Create synthesis task
      const synthesisTaskId = addTask({
        title: 'Synthesize Results',
        description: 'Combine and analyze results from all subtasks',
        priority: 'high',
        assignedAgentIds: [],
        parentTaskId: mainTaskId
      });
      
      // Assign to analyst agent
      const analystAgents = this.getAgentsByTier('tactical').filter(a => a.specialization === 'analyst');
      if (analystAgents.length > 0) {
        const analyst = analystAgents[0];
        sendMessage({
          fromAgentId: 'system',
          toAgentId: analyst.id,
          content: {
            action: 'synthesize_results',
            taskId: synthesisTaskId,
            results,
            mainTaskId
          },
          type: 'command',
          priority: 'high',
          requiresResponse: true
        });
      }
      
      // Wait for synthesis to complete
      await this.waitForTaskCompletion(synthesisTaskId);
      
      // Mark main task as completed
      updateTaskStatus(mainTaskId, 'completed');
      
    } catch (error) {
      console.error('Error synthesizing results:', error);
      throw error;
    }
  }

  /**
   * Handle failed subtasks
   */
  private async handleSubtaskFailures(mainTaskId: string, failedSubtasks: any[]): Promise<void> {
    try {
      const { sendMessage, updateTaskStatus, addTask } = useSystemStore.getState();
      
      // Create recovery task
      const recoveryTaskId = addTask({
        title: 'Recover from Subtask Failures',
        description: `Handle ${failedSubtasks.length} failed subtasks`,
        priority: 'critical',
        assignedAgentIds: [],
        parentTaskId: mainTaskId
      });
      
      // Assign to orchestrator agent
      const orchestratorAgents = this.getAgentsByTier('strategic').filter(a => a.specialization === 'orchestrator');
      if (orchestratorAgents.length > 0) {
        const orchestrator = orchestratorAgents[0];
        sendMessage({
          fromAgentId: 'system',
          toAgentId: orchestrator.id,
          content: {
            action: 'handle_failures',
            taskId: recoveryTaskId,
            failedTasks: failedSubtasks,
            mainTaskId
          },
          type: 'command',
          priority: 'critical',
          requiresResponse: true
        });
      }
      
      // Wait for recovery to complete
      await this.waitForTaskCompletion(recoveryTaskId);
      
    } catch (error) {
      console.error('Error handling subtask failures:', error);
      // Mark main task as failed if recovery fails
      const { updateTaskStatus } = useSystemStore.getState();
      updateTaskStatus(mainTaskId, 'failed');
    }
  }
  
  /**
   * Decompose a problem into smaller subtasks
   * Used by strategic agents to break down complex problems
   */
  decomposeProblem(
    problem: string, 
    parentTaskId: string,
    decompositionStrategy: 'functional' | 'sequential' | 'parallel' = 'functional'
  ): string[] {
    const subtaskIds: string[] = [];
    const { addTask } = useSystemStore.getState();
    
    // Different decomposition strategies
    if (decompositionStrategy === 'functional') {
      // Decompose by function (e.g., data processing, visualization, interaction)
      const subtasks = [
        {
          title: 'Data Processing Component',
          description: `Handle data processing for: ${problem}`,
        },
        {
          title: 'Analysis Component',
          description: `Perform analysis for: ${problem}`,
        },
        {
          title: 'Solution Synthesis Component',
          description: `Synthesize solution for: ${problem}`,
        }
      ];
      
      for (const subtask of subtasks) {
        const taskId = addTask({
          ...subtask,
          priority: 'normal',
          assignedAgentIds: [],
          parentTaskId
        });
        subtaskIds.push(taskId);
      }
    } else if (decompositionStrategy === 'sequential') {
      // Sequential steps to solve the problem
      const subtasks = [
        {
          title: 'Phase 1: Initial Analysis',
          description: `Initial analysis for: ${problem}`,
        },
        {
          title: 'Phase 2: Solution Development',
          description: `Develop solution for: ${problem}`,
        },
        {
          title: 'Phase 3: Implementation',
          description: `Implement solution for: ${problem}`,
        },
        {
          title: 'Phase 4: Verification',
          description: `Verify solution for: ${problem}`,
        }
      ];
      
      for (const subtask of subtasks) {
        const taskId = addTask({
          ...subtask,
          priority: 'normal',
          assignedAgentIds: [],
          parentTaskId
        });
        subtaskIds.push(taskId);
      }
    } else if (decompositionStrategy === 'parallel') {
      // Parallel approach with different aspects of the same problem
      const keywords = this.extractKeywords(problem);
      
      for (let i = 0; i < Math.min(keywords.length, 5); i++) {
        const taskId = addTask({
          title: `Subtask: ${keywords[i]}`,
          description: `Process '${keywords[i]}' aspect of: ${problem}`,
          priority: 'normal',
          assignedAgentIds: [],
          parentTaskId
        });
        subtaskIds.push(taskId);
      }
    }
    
    return subtaskIds;
  }
  
  /**
   * Assign tactical agents to coordinate the execution of subtasks
   */
  assignTacticalAgents(subtaskIds: string[]): void {
    const { agents, updateTaskStatus, assignTask } = useSystemStore.getState();
    const tacticalAgents = this.getAgentsByTier('tactical');
    
    if (tacticalAgents.length === 0) {
      console.warn('No tactical agents available for task coordination');
      return;
    }
    
    // Simple round-robin assignment
    subtaskIds.forEach((taskId, index) => {
      const agentIndex = index % tacticalAgents.length;
      const agent = tacticalAgents[agentIndex];
      
      assignTask(taskId, [agent.id]);
      updateTaskStatus(taskId, 'assigned');
      
      this.communicationService.sendCommand(
        'system',
        agent.id,
        {
          action: 'coordinate_task',
          taskId
        },
        'normal'
      );
    });
  }
  
  /**
   * Assign execution agents to implement specific subtasks
   */
  assignExecutionAgents(taskId: string, requiredSpecializations: AgentSpecialization[] = []): void {
    const { agents, assignTask, updateTaskStatus } = useSystemStore.getState();
    
    // Filter agents by tier and specializations if provided
    let executionAgents = this.getAgentsByTier('execution');
    
    if (requiredSpecializations.length > 0) {
      executionAgents = executionAgents.filter(
        agent => requiredSpecializations.includes(agent.specialization)
      );
    }
    
    if (executionAgents.length === 0) {
      console.warn('No suitable execution agents available for task implementation');
      return;
    }
    
    // Assign the best-suited agent(s)
    const selectedAgents = executionAgents.slice(0, 1); // Just pick the first one for now
    
    assignTask(taskId, selectedAgents.map(agent => agent.id));
    updateTaskStatus(taskId, 'assigned');
    
    // Notify the agent about the task
    for (const agent of selectedAgents) {
      this.communicationService.sendCommand(
        'system',
        agent.id,
        {
          action: 'execute_task',
          taskId
        },
        'normal'
      );
    }
  }

  /**
   * Initiate strategic analysis by assigning an orchestrator agent
   */
  private async initiateStrategicAnalysis(problem: string, mainTaskId: string): Promise<string> {
    const { addTask, sendMessage } = useSystemStore.getState();
    const orchestratorAgents = this.getAgentsByTier('strategic').filter(a => a.specialization === 'orchestrator');

    if (orchestratorAgents.length === 0) {
      console.warn('No orchestrator agents available for strategic analysis');
      const taskId = addTask({
        title: 'Strategic Analysis (Manual)',
        description: `Manual strategic analysis for: ${problem}`,
        priority: 'high',
        assignedAgentIds: [],
        parentTaskId: mainTaskId
      });
      sendMessage({
        fromAgentId: 'system',
        toAgentId: 'manual', // Assuming a 'manual' agent for manual tasks
        content: {
          action: 'analyze_problem',
          problem,
          taskId
        },
        type: 'command',
        priority: 'high',
        requiresResponse: true
      });
      return taskId;
    }

    const orchestrator = orchestratorAgents[0];
    const taskId = addTask({
      title: 'Strategic Analysis',
      description: `Analyze problem: ${problem}`,
      priority: 'high',
      assignedAgentIds: [orchestrator.id],
      parentTaskId: mainTaskId
    });

    sendMessage({
      fromAgentId: 'system',
      toAgentId: orchestrator.id,
      content: {
        action: 'analyze_problem',
        problem,
        taskId
      },
      type: 'command',
      priority: 'high',
      requiresResponse: true
    });

    return taskId;
  }
  
  /**
   * Get agents by reasoning tier
   */
  private getAgentsByTier(tier: ReasoningTier): Agent[] {
    const { agents } = useSystemStore.getState();
    return agents.filter(agent => 
      agent.tier === tier && 
      agent.status !== 'failed' &&
      agent.status !== 'completed'
    );
  }
  
  /**
   * Extract keywords from a problem statement (simplified)
   */
  private extractKeywords(text: string): string[] {
    // In a real implementation, this would use NLP techniques
    // For now, we'll use a simple approach
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/);
    
    // Filter out common words and keep unique ones
    const commonWords = new Set(['the', 'and', 'a', 'an', 'in', 'on', 'for', 'to', 'of', 'with']);
    const uniqueWords = [...new Set(words)].filter(word => 
      word.length > 3 && !commonWords.has(word)
    );
    
    return uniqueWords.slice(0, 10); // Return top 10 keywords
  }
}