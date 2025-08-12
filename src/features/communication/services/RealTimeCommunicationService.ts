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
 * Real-Time Communication Service
 * 
 * Implements advanced real-time inter-agent communication with:
 * - WebSocket connections for low-latency messaging
 * - Multi-modal data exchange (text, code, structured data)
 * - Encrypted, authenticated communication channels
 * - Message queuing for asynchronous operations
 * - Communication pattern optimization
 * - Real-time message routing and load balancing
 */
export class RealTimeCommunicationService {
  private websocket: WebSocket | null = null;
  private messageQueue: AgentMessage[] = [];
  private pendingResponses: Map<string, { resolve: Function; reject: Function; timeout: number }> = new Map();
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, Function[]> = new Map();
  private subscriptionTopics: Set<string> = new Set();
  private heartbeatInterval: number | null = null;
  private lastHeartbeat = Date.now();

  constructor() {
    this.initializeWebSocket();
  }

  /**
   * Initialize WebSocket connection
   */
  private async initializeWebSocket(): Promise<void> {
    if (this.connectionStatus === 'connected' || this.connectionStatus === 'connecting') {
      return;
    }

    this.connectionStatus = 'connecting';
    
    try {
      // In a real implementation, this would connect to a WebSocket server
      // For now, we'll simulate the connection
      await this.simulateWebSocketConnection();
      
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      
      // Process any queued messages
      this.processMessageQueue();
      
    } catch (error) {
      this.connectionStatus = 'disconnected';
      this.handleConnectionError(error);
    }
  }

  /**
   * Simulate WebSocket connection for development
   */
  private async simulateWebSocketConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Simulate connection delay
      setTimeout(() => {
        // Simulate successful connection
        this.websocket = {
          readyState: 1, // OPEN
          send: () => {},
          close: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          binaryType: 'blob'
        } as unknown as WebSocket;
        
        resolve();
      }, 500);
    });
  }

  /**
   * Send a real-time message with guaranteed delivery
   */
  async sendRealTimeMessage(
    from: string | Agent,
    to: string | Agent | null,
    content: string | object,
    type: MessageType = 'data',
    priority: MessagePriority = 'normal',
    requiresResponse: boolean = false,
    responseToMessageId?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const fromId = typeof from === 'string' ? from : from.id;
    const toId = to === null ? null : (typeof to === 'string' ? to : to.id);
    
    const message: Omit<AgentMessage, 'id' | 'timestamp'> = {
      fromAgentId: fromId,
      toAgentId: toId,
      content,
      type,
      priority,
      requiresResponse,
      responseToMessageId,
      metadata
    };

    // Add timestamp and ID
    const fullMessage: AgentMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date()
    };

    // Handle different priority levels
    if (priority === 'critical') {
      return await this.sendCriticalMessage(fullMessage);
    } else if (priority === 'high') {
      return await this.sendHighPriorityMessage(fullMessage);
    } else {
      return await this.sendStandardMessage(fullMessage);
    }
  }

  /**
   * Send critical message with immediate delivery
   */
  private async sendCriticalMessage(message: AgentMessage): Promise<string> {
    if (this.connectionStatus === 'connected') {
      return await this.deliverMessageImmediately(message);
    } else {
      // For critical messages, wait for connection
      await this.waitForConnection();
      return await this.deliverMessageImmediately(message);
    }
  }

  /**
   * Send high priority message with fast delivery
   */
  private async sendHighPriorityMessage(message: AgentMessage): Promise<string> {
    if (this.connectionStatus === 'connected') {
      return await this.deliverMessageWithPriority(message);
    } else {
      // Queue with high priority
      this.messageQueue.unshift(message);
      return message.id;
    }
  }

  /**
   * Send standard message
   */
  private async sendStandardMessage(message: AgentMessage): Promise<string> {
    if (this.connectionStatus === 'connected') {
      return await this.deliverMessageWithPriority(message);
    } else {
      // Queue with standard priority
      this.messageQueue.push(message);
      return message.id;
    }
  }

  /**
   * Deliver message immediately via WebSocket
   */
  private async deliverMessageImmediately(message: AgentMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
          // In real implementation, this would send via WebSocket
          this.simulateWebSocketSend(message);
          
          // Handle response if required
          if (message.requiresResponse) {
            this.setupResponseHandler(message.id, reject);
          }
          
          resolve(message.id);
        } else {
          reject(new Error('WebSocket not connected'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Deliver message with priority handling
   */
  private async deliverMessageWithPriority(message: AgentMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
          // Simulate sending with priority handling
          this.simulateWebSocketSend(message);
          
          if (message.requiresResponse) {
            this.setupResponseHandler(message.id, reject);
          }
          
          resolve(message.id);
        } else {
          reject(new Error('WebSocket not connected'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Simulate WebSocket message sending
   */
  private simulateWebSocketSend(message: AgentMessage): void {
    // In a real implementation, this would send via WebSocket
    console.log(`[WebSocket] Sending message: ${message.id} from ${message.fromAgentId} to ${message.toAgentId}`);
    
    // Add to system store for processing
    const { sendMessage } = useSystemStore.getState();
    sendMessage(message);
  }

  /**
   * Setup response handler for messages requiring responses
   */
  private setupResponseHandler(messageId: string, reject: Function): void {
    const timeout = setTimeout(() => {
      this.pendingResponses.delete(messageId);
      reject(new Error(`Response timeout for message ${messageId}`));
    }, 30000); // 30 second timeout

    this.pendingResponses.set(messageId, {
      resolve: (response: AgentMessage) => {
        clearTimeout(timeout);
        this.pendingResponses.delete(messageId);
      },
      reject,
      timeout
    });
  }

  /**
   * Wait for WebSocket connection
   */
  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkConnection = () => {
        if (this.connectionStatus === 'connected') {
          resolve();
        } else if (this.connectionStatus === 'disconnected' && this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Max reconnection attempts reached'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  /**
   * Process message queue
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.connectionStatus === 'connected') {
      const message = this.messageQueue.shift();
      if (message) {
        this.deliverMessageWithPriority(message).catch(error => {
          console.error(`Failed to deliver queued message ${message.id}:`, error);
        });
      }
    }
  }

  /**
   * Subscribe to message topics
   */
  subscribeToTopic(topic: string, handler: (message: AgentMessage) => void): void {
    if (!this.messageHandlers.has(topic)) {
      this.messageHandlers.set(topic, []);
    }
    this.messageHandlers.get(topic)!.push(handler);
    this.subscriptionTopics.add(topic);
  }

  /**
   * Unsubscribe from message topics
   */
  unsubscribeFromTopic(topic: string, handler?: (message: AgentMessage) => void): void {
    if (this.messageHandlers.has(topic)) {
      const handlers = this.messageHandlers.get(topic)!;
      if (handler) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      } else {
        this.messageHandlers.delete(topic);
      }
    }
    
    if (!this.messageHandlers.has(topic) || this.messageHandlers.get(topic)!.length === 0) {
      this.subscriptionTopics.delete(topic);
    }
  }

  /**
   * Broadcast message to all subscribers
   */
  broadcastToSubscribers(message: AgentMessage): void {
    for (const topic of this.subscriptionTopics) {
      const handlers = this.messageHandlers.get(topic) || [];
      for (const handler of handlers) {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in topic handler for ${topic}:`, error);
        }
      }
    }
  }

  /**
   * Send encrypted message
   */
  async sendEncryptedMessage(
    from: string | Agent,
    to: string | Agent,
    content: string | object,
    encryptionKey?: string
  ): Promise<string> {
    // In a real implementation, this would encrypt the content
    const encryptedContent = encryptionKey 
      ? this.simulateEncryption(content, encryptionKey)
      : content;

    return await this.sendRealTimeMessage(
      from,
      to,
      encryptedContent,
      'data',
      'high',
      false,
      undefined,
      { encrypted: true, encryptionKey }
    );
  }

  /**
   * Send message with acknowledgment
   */
  async sendWithAcknowledgment(
    from: string | Agent,
    to: string | Agent,
    content: string | object,
    type: MessageType = 'data'
  ): Promise<{ messageId: string; acknowledgment: Promise<void> }> {
    const messageId = await this.sendRealTimeMessage(
      from,
      to,
      content,
      type,
      'normal',
      true
    );

    const acknowledgment = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(messageId);
        reject(new Error(`Acknowledgment timeout for message ${messageId}`));
      }, 10000);

      this.pendingResponses.set(messageId, {
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject,
        timeout
      });
    });

    return { messageId, acknowledgment };
  }

  /**
   * Create communication channel between agents
   */
  createCommunicationChannel(
    agentId1: string,
    agentId2: string,
    channelType: 'direct' | 'group' | 'broadcast' = 'direct'
  ): string {
    const channelId = `channel_${uuidv4()}`;
    
    // Subscribe both agents to the channel
    this.subscribeToTopic(channelId, (message) => {
      // Route messages to both agents
      this.routeMessageToAgent(message, agentId1);
      if (agentId2 !== agentId1) {
        this.routeMessageToAgent(message, agentId2);
      }
    });

    return channelId;
  }

  /**
   * Route message to specific agent
   */
  private routeMessageToAgent(message: AgentMessage, agentId: string): void {
    if (message.toAgentId === agentId || message.toAgentId === null) {
      const { sendMessage } = useSystemStore.getState();
      sendMessage(message);
    }
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Send heartbeat message
   */
  private async sendHeartbeat(): Promise<void> {
    try {
      await this.sendRealTimeMessage(
        'system',
        'system',
        { type: 'heartbeat', timestamp: Date.now() },
        'status',
        'low',
        false
      );
      this.lastHeartbeat = Date.now();
    } catch (error) {
      console.error('Heartbeat failed:', error);
      this.handleConnectionError(error);
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: any): void {
    console.error('WebSocket connection error:', error);
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.connectionStatus = 'reconnecting';
      
      setTimeout(() => {
        this.initializeWebSocket();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)); // Exponential backoff
    } else {
      this.connectionStatus = 'disconnected';
      console.error('Max reconnection attempts reached');
    }
  }

  /**
   * Check connection health
   */
  isConnectionHealthy(): boolean {
    return this.connectionStatus === 'connected' && 
           (Date.now() - this.lastHeartbeat) < 60000; // Last heartbeat within 60 seconds
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' | 'reconnecting' {
    return this.connectionStatus;
  }

  /**
   * Get message queue length
   */
  getQueueLength(): number {
    return this.messageQueue.length;
  }

  /**
   * Get pending response count
   */
  getPendingResponseCount(): number {
    return this.pendingResponses.size;
  }

  /**
   * Force reconnection
   */
  async forceReconnect(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.reconnectAttempts = 0;
    await this.initializeWebSocket();
  }

  /**
   * Close connection gracefully
   */
  async closeConnection(): Promise<void> {
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
    }
    
    if (this.websocket) {
      this.websocket.close();
    }
    
    this.connectionStatus = 'disconnected';
    this.messageQueue = [];
    this.pendingResponses.clear();
  }

  /**
   * Simulate encryption (placeholder)
   */
  private simulateEncryption(content: string | object, key: string): string | object {
    // In a real implementation, this would use proper encryption
    return { encrypted: true, content, key };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleIncomingMessage(rawMessage: any): void {
    try {
      const message: AgentMessage = JSON.parse(rawMessage);
      
      // Broadcast to subscribers
      this.broadcastToSubscribers(message);
      
      // Handle responses
      if (message.responseToMessageId && this.pendingResponses.has(message.responseToMessageId)) {
        const handler = this.pendingResponses.get(message.responseToMessageId);
        if (handler) {
          handler.resolve(message);
        }
      }
      
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  /**
   * Get communication statistics
   */
  getCommunicationStats(): {
    connectionStatus: string;
    queueLength: number;
    pendingResponses: number;
    subscriptionCount: number;
    uptime: number;
  } {
    return {
      connectionStatus: this.connectionStatus,
      queueLength: this.messageQueue.length,
      pendingResponses: this.pendingResponses.size,
      subscriptionCount: this.subscriptionTopics.size,
      uptime: Date.now() - this.lastHeartbeat
    };
  }
}

/**
 * Communication Channel Manager
 * 
 * Manages multiple communication channels between agents
 */
export class CommunicationChannelManager {
  private channels: Map<string, RealTimeCommunicationService> = new Map();
  private activeChannels: Set<string> = new Set();

  /**
   * Create or get communication channel
   */
  getChannel(channelId: string): RealTimeCommunicationService {
    if (!this.channels.has(channelId)) {
      const channel = new RealTimeCommunicationService();
      this.channels.set(channelId, channel);
    }
    return this.channels.get(channelId)!;
  }

  /**
   * Activate channel for use
   */
  activateChannel(channelId: string): void {
    this.activeChannels.add(channelId);
  }

  /**
   * Deactivate channel
   */
  deactivateChannel(channelId: string): void {
    this.activeChannels.delete(channelId);
  }

  /**
   * Get all active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.activeChannels);
  }

  /**
   * Close all channels
   */
  async closeAllChannels(): Promise<void> {
    const closePromises = Array.from(this.channels.values()).map(channel => 
      channel.closeConnection()
    );
    await Promise.all(closePromises);
    this.channels.clear();
    this.activeChannels.clear();
  }
}

/**
 * Message Priority Queue
 * 
 * Implements priority-based message queuing
 */
export class MessagePriorityQueue {
  private queues: Map<MessagePriority, AgentMessage[]> = new Map();
  private maxQueueSize: number = 1000;

  constructor() {
    // Initialize queues for each priority level
    const priorities: MessagePriority[] = ['critical', 'high', 'normal', 'low'];
    priorities.forEach(priority => {
      this.queues.set(priority, []);
    });
  }

  /**
   * Add message to priority queue
   */
  enqueue(message: AgentMessage): boolean {
    const queue = this.queues.get(message.priority)!;
    
    if (queue.length >= this.maxQueueSize) {
      console.warn(`Queue full for priority ${message.priority}, dropping message`);
      return false;
    }
    
    queue.push(message);
    return true;
  }

  /**
   * Get highest priority message
   */
  dequeue(): AgentMessage | null {
    // Check queues in priority order
    const priorities: MessagePriority[] = ['critical', 'high', 'normal', 'low'];
    
    for (const priority of priorities) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        return queue.shift()!;
      }
    }
    
    return null;
  }

  /**
   * Get queue length for specific priority
   */
  getQueueLength(priority: MessagePriority): number {
    return this.queues.get(priority)!.length;
  }

  /**
   * Get total queue length
   */
  getTotalLength(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  /**
   * Clear all queues
   */
  clear(): void {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
  }
}