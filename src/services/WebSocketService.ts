import { io, Socket } from 'socket.io-client';
import { Agent, AgentMessage, Task } from '../types/agent-types';

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Function[]> = new Map();

  constructor(private serverUrl: string = 'http://localhost:3001') {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay
        });

        this.socket.on('connect', () => {
          console.log('Connected to WebSocket server');
          this.reconnectAttempts = 0;
          this.emit('client_ready', { timestamp: new Date().toISOString() });
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected from WebSocket server:', reason);
          this.emit('client_disconnected', { reason, timestamp: new Date().toISOString() });
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.reconnectAttempts++;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Max reconnection attempts reached'));
          }
        });

        this.socket.on('agent_message', (data: { message: AgentMessage }) => {
          this.triggerListeners('agent_message', data.message);
        });

        this.socket.on('agent_status_update', (data: { agentId: string; status: string; performance: any }) => {
          this.triggerListeners('agent_status_update', data);
        });

        this.socket.on('task_update', (data: { task: Task }) => {
          this.triggerListeners('task_update', data.task);
        });

        this.socket.on('system_status_update', (data: { status: string; resourceUsage: any }) => {
          this.triggerListeners('system_status_update', data);
        });

        this.socket.on('error', (error: any) => {
          console.error('WebSocket error:', error);
          this.triggerListeners('error', error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  private triggerListeners(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Agent-specific methods
  registerAgent(agent: Agent): void {
    this.emit('agent_register', {
      agentId: agent.id,
      agentData: agent
    });
  }

  sendAgentMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): void {
    this.emit('agent_message', message);
  }

  updateAgentStatus(agentId: string, status: string, performance?: any): void {
    this.emit('agent_status', {
      agentId,
      status,
      performance
    });
  }

  // Task-specific methods
  createTask(task: Omit<Task, 'id' | 'createdAt' | 'status' | 'progress' | 'subtaskIds'>): void {
    this.emit('create_task', task);
  }

  updateTaskStatus(taskId: string, status: string, progress?: number): void {
    this.emit('update_task_status', {
      taskId,
      status,
      progress
    });
  }

  // System methods
  requestSystemStatus(): void {
    this.emit('get_system_status', {});
  }

  ping(): void {
    this.emit('ping', { timestamp: Date.now() });
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionState(): string {
    if (!this.socket) return 'disconnected';
    return this.socket.connected ? 'connected' : 'connecting';
  }
}
