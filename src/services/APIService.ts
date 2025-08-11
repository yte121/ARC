import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Agent, Task, AgentMessage, ModelConfig, SystemConstraints } from '@/types/agent-types';

export class APIService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      const response = await this.api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // ===== CONVERSATION MANAGEMENT =====

  async getConversations(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/conversations');
      return response.data || [];
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return [];
    }
  }

  async createConversation(conversationData: { title: string; messages: any[] }): Promise<any> {
    try {
      const response = await this.api.post('/api/conversations', conversationData);
      return response.data;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  }

  async addMessageToConversation(conversationId: string, messageData: { content: string; role: string }): Promise<any> {
    try {
      const response = await this.api.post(`/api/conversations/${conversationId}/messages`, messageData);
      return response.data;
    } catch (error) {
      console.error('Failed to add message to conversation:', error);
      throw error;
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await this.api.delete(`/api/conversations/${conversationId}`);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  }

  // ===== MODEL MANAGEMENT =====

  async generateModelResponse(requestData: {
    prompt: string;
    modelName: string;
    provider: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<any> {
    try {
      const response = await this.api.post('/api/models/generate', requestData);
      return response.data;
    } catch (error) {
      console.error('Failed to generate model response:', error);
      throw error;
    }
  }

  async getModels(provider?: string): Promise<any[]> {
    try {
      const params = provider ? { provider } : {};
      const response = await this.api.get('/api/models', { params });
      return response.data || [];
    } catch (error) {
      console.error('Failed to get models:', error);
      return [];
    }
  }

  async testModelConnection(provider: string, modelName: string): Promise<boolean> {
    try {
      const response = await this.api.post('/api/models/test', { provider, modelName });
      return response.data.success;
    } catch (error) {
      console.error('Failed to test model connection:', error);
      return false;
    }
  }

  async getModelCapabilities(provider: string, modelName: string): Promise<any> {
    try {
      const response = await this.api.get(`/api/models/${provider}/${modelName}/capabilities`);
      return response.data;
    } catch (error) {
      console.error('Failed to get model capabilities:', error);
      return null;
    }
  }

  async updateModelConfig(config: any): Promise<void> {
    try {
      await this.api.put('/api/models/config', config);
    } catch (error) {
      console.error('Failed to update model config:', error);
      throw error;
    }
  }

  async getApiKeyStatus(provider: string): Promise<any> {
    try {
      const response = await this.api.get(`/api/models/${provider}/api-key-status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get API key status:', error);
      return null;
    }
  }

  // ===== TASK MANAGEMENT =====

  async getTasks(): Promise<Task[]> {
    try {
      const response = await this.api.get('/api/tasks');
      return response.data || [];
    } catch (error) {
      console.error('Failed to get tasks:', error);
      return [];
    }
  }

  async getTask(taskId: string): Promise<Task | null> {
    try {
      const response = await this.api.get(`/api/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get task:', error);
      return null;
    }
  }

  async createTask(taskData: Partial<Task>): Promise<Task> {
    try {
      const response = await this.api.post('/api/tasks', taskData);
      return response.data;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    try {
      const response = await this.api.put(`/api/tasks/${taskId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  }

  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    try {
      await this.api.patch(`/api/tasks/${taskId}/status`, { status });
    } catch (error) {
      console.error('Failed to update task status:', error);
      throw error;
    }
  }

  async updateTaskProgress(taskId: string, progress: number): Promise<void> {
    try {
      await this.api.patch(`/api/tasks/${taskId}/progress`, { progress });
    } catch (error) {
      console.error('Failed to update task progress:', error);
      throw error;
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.api.delete(`/api/tasks/${taskId}`);
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  }

  // ===== AGENT MANAGEMENT =====

  async getAgents(): Promise<Agent[]> {
    try {
      const response = await this.api.get('/api/agents');
      return response.data || [];
    } catch (error) {
      console.error('Failed to get agents:', error);
      return [];
    }
  }

  async getAgent(agentId: string): Promise<Agent | null> {
    try {
      const response = await this.api.get(`/api/agents/${agentId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get agent:', error);
      return null;
    }
  }

  async createAgent(agentData: Partial<Agent>): Promise<Agent> {
    try {
      const response = await this.api.post('/api/agents', agentData);
      return response.data;
    } catch (error) {
      console.error('Failed to create agent:', error);
      throw error;
    }
  }

  async updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent> {
    try {
      const response = await this.api.put(`/api/agents/${agentId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update agent:', error);
      throw error;
    }
  }

  async updateAgentStatus(agentId: string, status: string, performance?: any): Promise<void> {
    try {
      await this.api.patch(`/api/agents/${agentId}/status`, { status, performance });
    } catch (error) {
      console.error('Failed to update agent status:', error);
      throw error;
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    try {
      await this.api.delete(`/api/agents/${agentId}`);
    } catch (error) {
      console.error('Failed to delete agent:', error);
      throw error;
    }
  }

  // ===== MESSAGE MANAGEMENT =====

  async getMessages(limit: number = 100): Promise<AgentMessage[]> {
    try {
      const response = await this.api.get('/api/messages', { params: { limit } });
      return response.data || [];
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  }

  async sendMessage(messageData: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<AgentMessage> {
    try {
      const response = await this.api.post('/api/messages', messageData);
      return response.data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  // ===== SYSTEM MANAGEMENT =====

  async getSystemStatus(): Promise<any> {
    try {
      const response = await this.api.get('/api/system/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get system status:', error);
      return { status: 'unknown' };
    }
  }

  async getSystemMetrics(): Promise<any> {
    try {
      const response = await this.api.get('/api/system/metrics');
      return response.data;
    } catch (error) {
      console.error('Failed to get system metrics:', error);
      return {};
    }
  }

  async updateSystemConstraints(constraints: SystemConstraints): Promise<void> {
    try {
      await this.api.put('/api/system/constraints', constraints);
    } catch (error) {
      console.error('Failed to update system constraints:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(): Promise<any> {
    try {
      const response = await this.api.get('/api/system/performance');
      return response.data;
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {};
    }
  }

  // ===== CONFIGURATION MANAGEMENT =====

  async getConfiguration(): Promise<any> {
    try {
      const response = await this.api.get('/api/config');
      return response.data;
    } catch (error) {
      console.error('Failed to get configuration:', error);
      return {};
    }
  }

  async updateConfiguration(config: any): Promise<void> {
    try {
      await this.api.put('/api/config', config);
    } catch (error) {
      console.error('Failed to update configuration:', error);
      throw error;
    }
  }

  // ===== ANALYTICS =====

  async getAnalytics(timeRange: string = '24h'): Promise<any> {
    try {
      const response = await this.api.get('/api/analytics', { params: { timeRange } });
      return response.data;
    } catch (error) {
      console.error('Failed to get analytics:', error);
      return {};
    }
  }

  // ===== FILE MANAGEMENT =====

  async getFiles(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/files');
      return response.data || [];
    } catch (error) {
      console.error('Failed to get files:', error);
      return [];
    }
  }

  async uploadFile(file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await this.api.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.api.delete(`/api/files/${fileId}`);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  // ===== BACKUP MANAGEMENT =====

  async createBackup(): Promise<any> {
    try {
      const response = await this.api.post('/api/backup');
      return response.data;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

  async restoreBackup(backupId: string): Promise<void> {
    try {
      await this.api.post(`/api/backup/${backupId}/restore`);
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw error;
    }
  }

  // ===== AUTHENTICATION =====

  async login(credentials: { username: string; password: string }): Promise<any> {
    try {
      const response = await this.api.post('/api/auth/login', credentials);
      const { token, user } = response.data;
      
      // Store token
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { token, user };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async register(userData: { username: string; email: string; password: string }): Promise<any> {
    try {
      const response = await this.api.post('/api/auth/register', userData);
      const { token, user } = response.data;
      
      // Store token
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { token, user };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  }

  // ===== UTILITY METHODS =====

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  getUser(): any {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  setBaseURL(url: string): void {
    this.baseURL = url;
    this.api.defaults.baseURL = url;
  }
}

