import { v4 as uuidv4 } from 'uuid';
import { useSystemStore } from '@/store/system-store';
import { 
  Agent, 
  AgentMessage, 
  MessagePriority, 
  MessageType 
} from '@/types/agent-types';

/**
 * WebSocket Client for Agent Communication
 * 
 * Implements client-side WebSocket communication with:
 * - Automatic reconnection
 * - Message queuing
 * - Authentication
 * - Room management
 * - Event handling
 * - Connection health monitoring
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: any[] = [];
  private pendingResponses: Map<string, { resolve: Function; reject: Function; timeout: number }> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();
  private rooms: Set<string> = new Set();
  private isConnected = false;
  private heartbeatInterval: number | null = null;
  private lastHeartbeat = Date.now();
  private authToken: string | null = null;

  constructor(private url: string = 'ws://localhost:3001') {
    this.connect();
  }

  /**
   * Connect to WebSocket server
   */
  private connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onclose = (event) => this.handleClose(event);
      this.ws.onerror = (error) => this.handleError(error);
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection open
   */
  private handleOpen(): void {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Send authentication token if available
    if (this.authToken) {
      this.send('authenticate', { token: this.authToken });
    }
    
    // Join default rooms
    this.joinRoom('system');
    
    // Process queued messages
    this.processMessageQueue();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Emit connection event
    this.emit('connected');
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
        case 'room_joined':
          this.handleRoomJoined(message);
          break;
        case 'room_left':
          this.handleRoomLeft(message);
          break;
        case 'subscribed':
          this.handleSubscribed(message);
          break;
        case 'unsubscribed':
          this.handleUnsubscribed(message);
          break;
        case 'error':
          this.handleError(message);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
      
      // Emit generic message event
      this.emit('message', message);
      
    } catch (error) {
      console.error('Error handling message:', error);
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
      id: uuidv4(),
      timestamp: new Date()
    };

    sendMessage(fullMessage);
    this.emit('agentMessage', fullMessage);
  }

  /**
   * Handle system notification
   */
  private handleSystemNotification(message: any): void {
    console.log('System notification:', message);
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
   * Handle room joined
   */
  private handleRoomJoined(message: any): void {
    this.rooms.add(message.room);
    this.emit('roomJoined', message);
  }

  /**
   * Handle room left
   */
  private handleRoomLeft(message: any): void {
    this.rooms.delete(message.room);
    this.emit('roomLeft', message);
  }

  /**
   * Handle subscribed
   */
  private handleSubscribed(message: any): void {
    this.emit('subscribed', message);
  }

  /**
   * Handle unsubscribed
   */
  private handleUnsubscribed(message: any): void {
    this.emit('unsubscribed', message);
  }

  /**
   * Handle connection close
   */
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnected = false;
    
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
    }
    
    this.emit('disconnected', event);
    this.scheduleReconnect();
  }

  /**
   * Handle connection error
   */
  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    this.emit('error', error);
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
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
      this.messageQueue.push({ type, data });
      return false;
    }

    try {
      const message = JSON.stringify({ type, ...data });
      this.ws.send(message);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
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
  joinRoom(room: string): boolean {
    if (!this.rooms.has(room)) {
      this.rooms.add(room);
      return this.send('join_room', { room });
    }
    return true;
  }

  /**
   * Leave room
   */
  leaveRoom(room: string): boolean {
    if (this.rooms.has(room)) {
      this.rooms.delete(room);
      return this.send('leave_room', { room });
    }
    return true;
  }

  /**
   * Subscribe to topic
   */
  subscribe(topic: string): boolean {
    return this.send('subscribe', { topic });
  }

  /**
   * Unsubscribe from topic
   */
  unsubscribe(topic: string): boolean {
    return this.send('unsubscribe', { topic });
  }

  /**
   * Process message queue
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message.type, message.data);
      }
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.isConnected) {
        this.send('heartbeat', { timestamp: Date.now() });
      }
    }, 30000); // Send heartbeat every 30 seconds
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
   * Get connected rooms
   */
  getRooms(): string[] {
    return Array.from(this.rooms);
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
      window.clearInterval(this.heartbeatInterval);
    }
    
    if (this.ws) {
      this.ws.close();
    }
    
    this.isConnected = false;
    this.rooms.clear();
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
        console.error(`Error in event handler for ${event}:`, error);
      }
    }
  }

  /**
   * Send message with response promise
   */
  sendWithResponse(type: string, data: any, timeout: number = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = uuidv4();
      
      const timeoutId = window.setTimeout(() => {
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
   * Handle response to message
   */
  private handleResponse(message: any): void {
    const { messageId, response, error } = message;
    
    if (this.pendingResponses.has(messageId)) {
      const handler = this.pendingResponses.get(messageId)!;
      window.clearTimeout(handler.timeout);
      
      if (error) {
        handler.reject(new Error(error));
      } else {
        handler.resolve(response);
      }
      
      this.pendingResponses.delete(messageId);
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    status: string;
    reconnectAttempts: number;
    queueLength: number;
    rooms: string[];
    lastHeartbeat: number;
  } {
    return {
      status: this.getConnectionStatus(),
      reconnectAttempts: this.reconnectAttempts,
      queueLength: this.messageQueue.length,
      rooms: this.getRooms(),
      lastHeartbeat: this.lastHeartbeat
    };
  }
}

/**
 * WebSocket Client Manager
 * 
 * Manages multiple WebSocket connections for different purposes
 */
export class WebSocketClientManager {
  private clients: Map<string, WebSocketClient> = new Map();
  private primaryClient: WebSocketClient | null = null;

  constructor() {
    // Initialize primary client
    this.primaryClient = new WebSocketClient();
    this.clients.set('primary', this.primaryClient);
  }

  /**
   * Get primary client
   */
  getPrimaryClient(): WebSocketClient | null {
    return this.primaryClient;
  }

  /**
   * Get client by ID
   */
  getClient(id: string): WebSocketClient | null {
    return this.clients.get(id) || null;
  }

  /**
   * Create new client
   */
  createClient(id: string, url?: string): WebSocketClient {
    const client = new WebSocketClient(url);
    this.clients.set(id, client);
    return client;
  }

  /**
   * Remove client
   */
  removeClient(id: string): void {
    const client = this.clients.get(id);
    if (client) {
      client.disconnect();
      this.clients.delete(id);
    }
  }

  /**
   * Get all clients
   */
  getAllClients(): Map<string, WebSocketClient> {
    return new Map(this.clients);
  }

  /**
   * Broadcast to all clients
   */
  broadcast(type: string, data: any): void {
    for (const client of this.clients.values()) {
      client.send(type, data);
    }
  }

  /**
   * Shutdown all clients
   */
  shutdownAll(): void {
    for (const client of this.clients.values()) {
      client.disconnect();
    }
    this.clients.clear();
  }
}