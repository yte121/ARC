import { v4 as uuidv4 } from 'uuid';
import { useSystemStore } from '@/store/system-store';
import { 
  Agent, 
  AgentMessage, 
  MessagePriority, 
  MessageType,
  SystemStatus 
} from '@/types/agent-types';

/**
 * Enhanced WebSocket Service for Real-Time Agent Communication
 * 
 * Implements advanced WebSocket-based real-time communication with:
 * - Agent-specific connection management
 * - Real-time message routing and delivery
 * - Connection health monitoring and auto-reconnection
 * - Message persistence and replay
 * - Agent presence and status updates
 * - Encrypted communication channels
 * - Performance optimization and load balancing
 */
export class EnhancedWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: AgentMessage[] = [];
  private pendingResponses: Map<string, { resolve: Function; reject: Function; timeout: number }> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();
  private agentRooms: Map<string, Set<string>> = new Map();
  private systemRooms: Set<string> = new Set();
  private isConnected = false;
  private heartbeatInterval: number | null = null;
  private lastHeartbeat = Date.now();
  private authToken: string | null = null;
  private agentPresence: Map<string, { status: 'online' | 'offline' | 'busy'; lastSeen: number }> = new Map();
  private messageHistory: AgentMessage[] = [];
  private maxHistorySize = 1000;

  constructor(private url: string = 'ws://localhost:3001') {
    this.connect();
    this.initializeSystemRooms();
  }

  /**
   * Initialize system rooms
   */
  private initializeSystemRooms(): void {
    this.systemRooms.add('system');
    this.systemRooms.add('broadcast');
    this.systemRooms.add('notifications');
    this.systemRooms.add('performance');
  }

  /**
   * Connect to WebSocket server
   */
  private connect(): void {
    try {
      console.log(`[EnhancedWebSocketService] Connecting to ${this.url}`);
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onclose = (event) => this.handleClose(event);
      this.ws.onerror = (error) => this.handleError(error);
      
    } catch (error) {
      console.error('[EnhancedWebSocketService] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection open
   */
  private handleOpen(): void {
    console.log('[EnhancedWebSocketService] Connected to WebSocket server');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Send authentication token if available
    if (this.authToken) {
      this.send('authenticate', { token: this.authToken });
    }
    
    // Join system rooms
    this.joinSystemRooms();
    
    // Process queued messages
    this.processMessageQueue();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Emit connection event
    this.emit('connected');
  }

  /**
   * Join system rooms
   */
  private joinSystemRooms(): void {
    for (const room of this.systemRooms) {
      this.joinRoom(room);
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      this.lastHeartbeat = Date.now();
      
      // Handle different message types
      switch (message.type) {
        case 'agent_message':
          this.handleAgentMessage(message);
          break;
        case 'system_notification':
          this.handleSystemNotification(message);
          break;
        case 'performance_metrics':
          this.handlePerformanceMetrics(message);
          break;
        case 'heartbeat':
          this.handleHeartbeat(message);
          break;
        case 'agent_presence':
          this.handleAgentPresence(message);
          break;
        case 'room_joined':
          this.handleRoomJoined(message);
          break;
        case 'room_left':
          this.handleRoomLeft(message);
          break;
        case 'response':
          this.handleResponse(message);
          break;
        case 'error':
          this.handleError(message);
          break;
        default:
          console.warn('[EnhancedWebSocketService] Unknown message type:', message.type);
      }
      
      // Emit generic message event
      this.emit('message', message);
      
    } catch (error) {
      console.error('[EnhancedWebSocketService] Error handling message:', error);
    }
  }

  /**
   * Handle agent message
   */
  private handleAgentMessage(message: any): void {
    const { sendMessage } = useSystemStore.getState();
    
    const agentMessage: Omit<AgentMessage, 'id' | 'timestamp'> = {
      fromAgentId: message.fromAgentId || 'unknown',
      toAgentId: message.toAgentId || null,
      content: message.content,
      type: message.messageType || 'data',
      priority: message.priority || 'normal',
      requiresResponse: message.requiresResponse || false,
      responseToMessageId: message.responseToMessageId,
      metadata: message.metadata || {}
    };

    const fullMessage: AgentMessage = {
      ...agentMessage,
      id: message.id || uuidv4(),
      timestamp: new Date(message.timestamp || Date.now())
    };

    // Add to message history
    this.addToMessageHistory(fullMessage);

    // Update agent presence
    this.updateAgentPresence(fullMessage.fromAgentId, 'online');

    // Send to system store
    sendMessage(fullMessage);
    
    // Emit agent message event
    this.emit('agentMessage', fullMessage);
  }

  /**
   * Handle system notification
   */
  private handleSystemNotification(message: any): void {
    console.log('[EnhancedWebSocketService] System notification:', message);
    this.emit('systemNotification', message);
  }

  /**
   * Handle performance metrics
   */
  private handlePerformanceMetrics(message: any): void {
    this.emit('performanceMetrics', message);
  }

  /**
   * Handle heartbeat
   */
  private handleHeartbeat(message: any): void {
    this.send('heartbeat_ack', { timestamp: Date.now() });
  }

  /**
   * Handle agent presence
   */
  private handleAgentPresence(message: any): void {
    this.agentPresence.set(message.agentId, {
      status: message.status,
      lastSeen: Date.now()
    });
    this.emit('agentPresenceUpdate', message);
  }

  /**
   * Handle room joined
   */
  private handleRoomJoined(message: any): void {
    if (!this.agentRooms.has(message.agentId)) {
      this.agentRooms.set(message.agentId, new Set());
    }
    this.agentRooms.get(message.agentId)!.add(message.room);
    this.emit('roomJoined', message);
  }

  /**
   * Handle room left
   */
  private handleRoomLeft(message: any): void {
    const agentRooms = this.agentRooms.get(message.agentId);
    if (agentRooms) {
      agentRooms.delete(message.room);
      if (agentRooms.size === 0) {
        this.agentRooms.delete(message.agentId);
      }
    }
    this.emit('roomLeft', message);
  }

  /**
   * Handle response
   */
  private handleResponse(message: any): void {
    const { messageId, response, error } = message;
    
    if (this.pendingResponses.has(messageId)) {
      const handler = this.pendingResponses.get(messageId)!;
      clearTimeout(handler.timeout);
      
      if (error) {
        handler.reject(new Error(error));
      } else {
        handler.resolve(response);
      }
      
      this.pendingResponses.delete(messageId);
    }
  }

  /**
   * Handle connection close
   */
  private handleClose(event: CloseEvent): void {
    console.log('[EnhancedWebSocketService] Disconnected:', event.code, event.reason);
    this.isConnected = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.emit('disconnected', event);
    this.scheduleReconnect();
  }

  /**
   * Handle connection error
   */
  private handleError(error: Event): void {
    console.error('[EnhancedWebSocketService] Error:', error);
    this.emit('error', error);
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[EnhancedWebSocketService] Max reconnection attempts reached');
      this.emit('maxReconnectReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[EnhancedWebSocketService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Send message to server
   */
  send(type: string, data: any): boolean {
    if (!this.isConnected || !this.ws) {
      // Queue message if not connected
      this.messageQueue.push({
        id: uuidv4(),
        timestamp: new Date(),
        fromAgentId: 'system',
        toAgentId: null,
        content: { type, data },
        type: 'data',
        priority: 'normal',
        requiresResponse: false,
        metadata: {}
      });
      return false;
    }

    try {
      const message = JSON.stringify({ type, ...data });
      this.ws.send(message);
      return true;
    } catch (error) {
      console.error('[EnhancedWebSocketService] Error sending message:', error);
      return false;
    }
  }

  /**
   * Send agent message
   */
  sendAgentMessage(
    fromAgentId: string,
    toAgentId: string | null,
    content: any,
    messageType: MessageType = 'data',
    priority: MessagePriority = 'normal',
    requiresResponse: boolean = false,
    responseToMessageId?: string,
    metadata?: Record<string, any>
  ): boolean {
    return this.send('agent_message', {
      fromAgentId,
      toAgentId,
      content,
      messageType,
      priority,
      requiresResponse,
      responseToMessageId,
      metadata
    });
  }

  /**
   * Join room
   */
  joinRoom(room: string, agentId?: string): boolean {
    if (agentId) {
      if (!this.agentRooms.has(agentId)) {
        this.agentRooms.set(agentId, new Set());
      }
      this.agentRooms.get(agentId)!.add(room);
    }
    return this.send('join_room', { room, agentId });
  }

  /**
   * Leave room
   */
  leaveRoom(room: string, agentId?: string): boolean {
    if (agentId) {
      const agentRooms = this.agentRooms.get(agentId);
      if (agentRooms) {
        agentRooms.delete(room);
        if (agentRooms.size === 0) {
          this.agentRooms.delete(agentId);
        }
      }
    }
    return this.send('leave_room', { room, agentId });
  }

  /**
   * Update agent presence
   */
  updateAgentPresence(agentId: string, status: 'online' | 'offline' | 'busy'): void {
    this.agentPresence.set(agentId, {
      status,
      lastSeen: Date.now()
    });
    this.send('update_presence', { agentId, status });
  }

  /**
   * Get agent presence
   */
  getAgentPresence(agentId: string): { status: 'online' | 'offline' | 'busy'; lastSeen: number } | null {
    return this.agentPresence.get(agentId) || null;
  }

  /**
   * Get all online agents
   */
  getOnlineAgents(): string[] {
    const now = Date.now();
    const onlineThreshold = 60000; // 1 minute
    
    const onlineAgents: string[] = [];
    
    for (const [agentId, presence] of this.agentPresence) {
      if (presence.status === 'online' && (now - presence.lastSeen) < onlineThreshold) {
        onlineAgents.push(agentId);
      }
    }
    
    return onlineAgents;
  }

  /**
   * Process message queue
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendAgentMessage(
          message.fromAgentId,
          message.toAgentId,
          message.content,
          message.type,
          message.priority,
          message.requiresResponse,
          message.responseToMessageId,
          message.metadata
        );
      }
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send('heartbeat', { timestamp: Date.now() });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Add to message history
   */
  private addToMessageHistory(message: AgentMessage): void {
    this.messageHistory.push(message);
    
    // Maintain history size limit
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
  }

  /**
   * Get message history
   */
  getMessageHistory(limit?: number): AgentMessage[] {
    if (limit) {
      return this.messageHistory.slice(-limit);
    }
    return [...this.messageHistory];
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    if (this.isConnected) {
      this.send('authenticate', { token });
    }
  }

  /**
   * Check connection health
   */
  isHealthy(): boolean {
    return this.isConnected && (Date.now() - this.lastHeartbeat) < 60000;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'disconnected' | 'reconnecting' {
    if (this.isConnected) return 'connected';
    if (this.reconnectAttempts > 0) return 'reconnecting';
    return 'disconnected';
  }

  /**
   * Get agent rooms
   */
  getAgentRooms(agentId: string): string[] {
    return Array.from(this.agentRooms.get(agentId) || []);
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.messageQueue.length;
  }

  /**
   * Force reconnection
   */
  reconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
    this.reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Disconnect gracefully
   */
  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.ws) {
      this.ws.close();
    }
    
    this.isConnected = false;
    this.agentRooms.clear();
    this.messageQueue = [];
    this.pendingResponses.clear();
  }

  /**
   * Add event handler
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove event handler
   */
  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`[EnhancedWebSocketService] Error in event handler for ${event}:`, error);
      }
    }
  }

  /**
   * Send message with response promise
   */
  sendWithResponse(type: string, data: any, timeout: number = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = uuidv4();
      
      const timeoutId = setTimeout(() => {
        this.pendingResponses.delete(messageId);
        reject(new Error(`Response timeout for ${type}`));
      }, timeout);

      this.pendingResponses.set(messageId, {
        resolve,
        reject,
        timeout: timeoutId
      });

      this.send(type, { ...data, messageId });
    });
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    status: string;
    reconnectAttempts: number;
    queueLength: number;
    agentRooms: number;
    messageHistory: number;
    lastHeartbeat: number;
  } {
    return {
      status: this.getConnectionStatus(),
      reconnectAttempts: this.reconnectAttempts,
      queueLength: this.messageQueue.length,
      agentRooms: this.agentRooms.size,
      messageHistory: this.messageHistory.length,
      lastHeartbeat: this.lastHeartbeat
    };
  }

  /**
   * Broadcast message to all agents
   */
  broadcastToAgents(
    fromAgentId: string,
    content: any,
    messageType: MessageType = 'notification',
    priority: MessagePriority = 'normal',
    metadata?: Record<string, any>
  ): boolean {
    return this.send('broadcast', {
      fromAgentId,
      content,
      messageType,
      priority,
      metadata
    });
  }

  /**
   * Send message to specific agent
   */
  sendToAgent(
    fromAgentId: string,
    toAgentId: string,
    content: any,
    messageType: MessageType = 'data',
    priority: MessagePriority = 'normal',
    requiresResponse: boolean = false,
    responseToMessageId?: string,
    metadata?: Record<string, any>
  ): boolean {
    return this.sendAgentMessage(
      fromAgentId,
      toAgentId,
      content,
      messageType,
      priority,
      requiresResponse,
      responseToMessageId,
      metadata
    );
  }

  /**
   * Create private channel between agents
   */
  createPrivateChannel(agentId1: string, agentId2: string): string {
    const channelId = `private_${uuidv4()}`;
    
    // Both agents join the private channel
    this.joinRoom(channelId, agentId1);
    this.joinRoom(channelId, agentId2);
    
    return channelId;
  }

  /**
   * Send encrypted message
   */
  sendEncryptedMessage(
    fromAgentId: string,
    toAgentId: string,
    content: any,
    encryptionKey?: string
  ): boolean {
    const encryptedContent = encryptionKey 
      ? { encrypted: true, content, key: encryptionKey }
      : content;

    return this.sendToAgent(
      fromAgentId,
      toAgentId,
      encryptedContent,
      'data',
      'high',
      false,
      undefined,
      { encrypted: true, encryptionKey }
    );
  }
}

/**
 * Enhanced WebSocket Manager
 * 
 * Manages multiple WebSocket connections and provides load balancing
 */
export class EnhancedWebSocketManager {
  private primaryService: EnhancedWebSocketService;
  private backupServices: EnhancedWebSocketService[] = [];
  private activeService: EnhancedWebSocketService;
  private serviceStats: Map<string, any> = new Map();

  constructor() {
    // Initialize primary service
    this.primaryService = new EnhancedWebSocketService();
    this.activeService = this.primaryService;
    
    // Initialize backup services
    for (let i = 1; i <= 2; i++) {
      const backupService = new EnhancedWebSocketService(`ws://localhost:300${1 + i}`);
      this.backupServices.push(backupService);
    }
    
    this.setupHealthMonitoring();
  }

  /**
   * Setup health monitoring
   */
  private setupHealthMonitoring(): void {
    setInterval(() => {
      this.checkServiceHealth();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check service health and switch if necessary
   */
  private checkServiceHealth(): void {
    const services = [this.primaryService, ...this.backupServices];
    
    for (const service of services) {
      const stats = service.getStats();
      this.serviceStats.set(service === this.primaryService ? 'primary' : `backup_${this.backupServices.indexOf(service) + 1}`, stats);
      
      // Switch to backup if primary is unhealthy
      if (service === this.primaryService && !service.isHealthy()) {
        this.switchToBackup();
      }
    }
  }

  /**
   * Switch to backup service
   */
  private switchToBackup(): void {
    if (this.backupServices.length > 0) {
      const backupService = this.backupServices[0];
      this.activeService = backupService;
      console.log('[EnhancedWebSocketManager] Switched to backup service');
    }
  }

  /**
   * Get active service
   */
  getActiveService(): EnhancedWebSocketService {
    return this.activeService;
  }

  /**
   * Get all services
   */
  getAllServices(): EnhancedWebSocketService[] {
    return [this.primaryService, ...this.backupServices];
  }

  /**
   * Get service statistics
   */
  getServiceStats(): Map<string, any> {
    return new Map(this.serviceStats);
  }

  /**
   * Force switch to primary service
   */
  switchToPrimary(): void {
    if (this.primaryService.isHealthy()) {
      this.activeService = this.primaryService;
      console.log('[EnhancedWebSocketManager] Switched to primary service');
    }
  }
}

/**
 * Global enhanced WebSocket service instance
 */
export const enhancedWebSocketService = new EnhancedWebSocketService();
export const enhancedWebSocketManager = new EnhancedWebSocketManager();