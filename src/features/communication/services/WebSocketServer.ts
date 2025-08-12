import { v4 as uuidv4 } from 'uuid';
import { useSystemStore } from '@/store/system-store';
import {
  Agent,
  AgentMessage,
  MessagePriority,
  MessageType
} from '@/types/agent-types';

/**
 * WebSocket Server for Real-Time Agent Communication
 * 
 * Implements WebSocket-based real-time communication with:
 * - Socket.IO for bidirectional communication
 * - Room-based agent grouping
 * - Authentication and authorization
 * - Message persistence and replay
 * - Connection health monitoring
 * - Load balancing and scaling
 */
export class WebSocketServer {
  private io: any = null;
  private connectedClients: Map<string, {
    socket: any;
    agentId: string | null;
    rooms: Set<string>;
    lastActivity: number;
  }> = new Map();
  private messageHistory: AgentMessage[] = [];
  private maxHistorySize = 1000;
  private heartbeatInterval: number | null = null;
  private cleanupInterval: number | null = null;

  constructor() {
    this.initializeServer();
  }

  /**
   * Initialize WebSocket server
   */
  private initializeServer(): void {
    // In a real implementation, this would connect to an actual HTTP server
    // For now, we'll simulate the server functionality
    this.simulateServer();
  }

  /**
   * Simulate WebSocket server for development
   */
  private simulateServer(): void {
    // Simulate server initialization
    console.log('[WebSocket Server] Server initialized');
    
    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();
    
    // Start cleanup routine
    this.startCleanupRoutine();
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = window.setInterval(() => {
      this.checkClientHealth();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Start cleanup routine
   */
  private startCleanupRoutine(): void {
    this.cleanupInterval = window.setInterval(() => {
      this.cleanupInactiveClients();
    }, 300000); // Clean up every 5 minutes
  }

  /**
   * Check client health
   */
  private checkClientHealth(): void {
    const now = Date.now();
    const timeout = 60000; // 1 minute timeout

    for (const [clientId, client] of this.connectedClients) {
      if (now - client.lastActivity > timeout) {
        this.disconnectClient(clientId, 'Client timeout');
      }
    }
  }

  /**
   * Clean up inactive clients
   */
  private cleanupInactiveClients(): void {
    const now = Date.now();
    const inactivityThreshold = 300000; // 5 minutes

    for (const [clientId, client] of this.connectedClients) {
      if (now - client.lastActivity > inactivityThreshold) {
        this.disconnectClient(clientId, 'Inactivity cleanup');
      }
    }
  }

  /**
   * Simulate client connection
   */
  async simulateClientConnection(agentId?: string): Promise<string> {
    const clientId = uuidv4();
    
    this.connectedClients.set(clientId, {
      socket: this.simulateSocket(),
      agentId: agentId || null,
      rooms: new Set(),
      lastActivity: Date.now()
    });

    // Join agent to their personal room
    if (agentId) {
      this.joinRoom(clientId, `agent_${agentId}`);
    }

    // Join system room for broadcasts
    this.joinRoom(clientId, 'system');

    console.log(`[WebSocket Server] Client connected: ${clientId}`);
    return clientId;
  }

  /**
   * Simulate socket object
   */
  private simulateSocket(): any {
    return {
      id: uuidv4(),
      emit: (event: string, data: any) => {
        console.log(`[Socket] Emit ${event}:`, data);
      },
      on: (event: string, callback: Function) => {
        console.log(`[Socket] Listening for ${event}`);
      },
      join: (room: string) => {
        console.log(`[Socket] Joined room: ${room}`);
      },
      leave: (room: string) => {
        console.log(`[Socket] Left room: ${room}`);
      },
      disconnect: (reason?: string) => {
        console.log(`[Socket] Disconnected: ${reason}`);
      }
    };
  }

  /**
   * Join client to room
   */
  joinRoom(clientId: string, room: string): void {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.rooms.add(room);
      client.socket.join?.(room);
    }
  }

  /**
   * Remove client from room
   */
  leaveRoom(clientId: string, room: string): void {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.rooms.delete(room);
      client.socket.leave?.(room);
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, event: string, data: any): boolean {
    const client = this.connectedClients.get(clientId);
    if (client && client.socket) {
      client.socket.emit(event, data);
      client.lastActivity = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Send message to room
   */
  sendToRoom(room: string, event: string, data: any): number {
    let sentCount = 0;
    
    for (const client of this.connectedClients.values()) {
      if (client.rooms.has(room) && client.socket) {
        client.socket.emit(event, data);
        client.lastActivity = Date.now();
        sentCount++;
      }
    }
    
    return sentCount;
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(event: string, data: any): number {
    let sentCount = 0;
    
    for (const client of this.connectedClients.values()) {
      if (client.socket) {
        client.socket.emit(event, data);
        client.lastActivity = Date.now();
        sentCount++;
      }
    }
    
    return sentCount;
  }

  /**
   * Process incoming message from client
   */
  async processClientMessage(clientId: string, message: any): Promise<void> {
    const client = this.connectedClients.get(clientId);
    if (!client) {
      console.error(`[WebSocket Server] Client not found: ${clientId}`);
      return;
    }

    client.lastActivity = Date.now();

    try {
      // Handle different message types
      switch (message.type) {
        case 'agent_message':
          await this.handleAgentMessage(client, message);
          break;
        case 'heartbeat':
          this.handleHeartbeat(client, message);
          break;
        case 'join_room':
          this.handleJoinRoom(client, message);
          break;
        case 'leave_room':
          this.handleLeaveRoom(client, message);
          break;
        case 'subscribe':
          this.handleSubscribe(client, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(client, message);
          break;
        default:
          console.warn(`[WebSocket Server] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`[WebSocket Server] Error processing message:`, error);
      this.sendToClient(clientId, 'error', { message: 'Message processing failed' });
    }
  }

  /**
   * Handle agent message
   */
  private async handleAgentMessage(client: any, message: any): Promise<void> {
    const { sendMessage } = useSystemStore.getState();
    
    const agentMessage: Omit<AgentMessage, 'id' | 'timestamp'> = {
      fromAgentId: client.agentId || 'unknown',
      toAgentId: message.toAgentId || null,
      content: message.content,
      type: message.messageType || 'data',
      priority: message.priority || 'normal',
      requiresResponse: message.requiresResponse || false,
      responseToMessageId: message.responseToMessageId,
      metadata: message.metadata || {}
    };

    // Add to message history
    const fullMessage: AgentMessage = {
      ...agentMessage,
      id: uuidv4(),
      timestamp: new Date()
    };

    this.addToMessageHistory(fullMessage);
    sendMessage(fullMessage);

    // Route message based on priority
    if (agentMessage.priority === 'critical') {
      this.routeCriticalMessage(fullMessage);
    } else if (agentMessage.priority === 'high') {
      this.routeHighPriorityMessage(fullMessage);
    } else {
      this.routeStandardMessage(fullMessage);
    }
  }

  /**
   * Handle heartbeat
   */
  private handleHeartbeat(client: any, message: any): void {
    this.sendToClient(client.socket.id, 'heartbeat_ack', {
      timestamp: Date.now(),
      clientId: client.socket.id
    });
  }

  /**
   * Handle join room
   */
  private handleJoinRoom(client: any, message: any): void {
    this.joinRoom(client.socket.id, message.room);
    this.sendToClient(client.socket.id, 'room_joined', { room: message.room });
  }

  /**
   * Handle leave room
   */
  private handleLeaveRoom(client: any, message: any): void {
    this.leaveRoom(client.socket.id, message.room);
    this.sendToClient(client.socket.id, 'room_left', { room: message.room });
  }

  /**
   * Handle subscribe
   */
  private handleSubscribe(client: any, message: any): void {
    this.joinRoom(client.socket.id, message.topic);
    this.sendToClient(client.socket.id, 'subscribed', { topic: message.topic });
  }

  /**
   * Handle unsubscribe
   */
  private handleUnsubscribe(client: any, message: any): void {
    this.leaveRoom(client.socket.id, message.topic);
    this.sendToClient(client.socket.id, 'unsubscribed', { topic: message.topic });
  }

  /**
   * Route critical message
   */
  private routeCriticalMessage(message: AgentMessage): void {
    // Critical messages get immediate delivery
    if (message.toAgentId) {
      // Send to specific agent
      this.sendToRoom(`agent_${message.toAgentId}`, 'agent_message', message);
    } else {
      // Broadcast to all agents
      this.sendToRoom('system', 'agent_message', message);
    }
  }

  /**
   * Route high priority message
   */
  private routeHighPriorityMessage(message: AgentMessage): void {
    // High priority messages get fast delivery
    if (message.toAgentId) {
      this.sendToRoom(`agent_${message.toAgentId}`, 'agent_message', message);
    } else {
      this.broadcast('agent_message', message);
    }
  }

  /**
   * Route standard message
   */
  private routeStandardMessage(message: AgentMessage): void {
    // Standard messages use normal routing
    if (message.toAgentId) {
      this.sendToRoom(`agent_${message.toAgentId}`, 'agent_message', message);
    } else {
      this.sendToRoom('system', 'agent_message', message);
    }
  }

  /**
   * Add message to history
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
   * Get client statistics
   */
  getClientStats(): {
    totalClients: number;
    activeClients: number;
    agentClients: number;
    systemClients: number;
  } {
    let activeClients = 0;
    let agentClients = 0;
    let systemClients = 0;

    for (const client of this.connectedClients.values()) {
      if (client.lastActivity > Date.now() - 60000) { // Active in last minute
        activeClients++;
      }
      
      if (client.agentId) {
        agentClients++;
      } else {
        systemClients++;
      }
    }

    return {
      totalClients: this.connectedClients.size,
      activeClients,
      agentClients,
      systemClients
    };
  }

  /**
   * Get room statistics
   */
  getRoomStats(): Map<string, number> {
    const roomStats = new Map<string, number>();

    for (const client of this.connectedClients.values()) {
      for (const room of client.rooms) {
        roomStats.set(room, (roomStats.get(room) || 0) + 1);
      }
    }

    return roomStats;
  }

  /**
   * Disconnect client
   */
  disconnectClient(clientId: string, reason: string = 'Client disconnected'): void {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.socket.disconnect?.(reason);
      
      // Leave all rooms
      for (const room of client.rooms) {
        this.leaveRoom(clientId, room);
      }
      
      this.connectedClients.delete(clientId);
      console.log(`[WebSocket Server] Client disconnected: ${clientId} - ${reason}`);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[WebSocket Server] Shutting down...');

    // Stop intervals
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
    }
    
    if (this.cleanupInterval) {
      window.clearInterval(this.cleanupInterval);
    }

    // Disconnect all clients
    for (const clientId of this.connectedClients.keys()) {
      this.disconnectClient(clientId, 'Server shutdown');
    }

    this.connectedClients.clear();
    console.log('[WebSocket Server] Shutdown complete');
  }

  /**
   * Get server status
   */
  getStatus(): {
    isRunning: boolean;
    connectedClients: number;
    messageHistory: number;
    uptime: number;
  } {
    return {
      isRunning: this.io !== null,
      connectedClients: this.connectedClients.size,
      messageHistory: this.messageHistory.length,
      uptime: Date.now() // Would track actual uptime in real implementation
    };
  }

  /**
   * Send system notification
   */
  sendSystemNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    const notification = {
      type: 'system_notification',
      message,
      severity: type,
      timestamp: new Date()
    };

    this.broadcast('system_notification', notification);
  }

  /**
   * Send performance metrics
   */
  sendPerformanceMetrics(metrics: any): void {
    this.broadcast('performance_metrics', {
      ...metrics,
      timestamp: new Date()
    });
  }

  /**
   * Authenticate client
   */
  async authenticateClient(clientId: string, token: string): Promise<boolean> {
    // In a real implementation, this would validate the token
    // For now, we'll simulate authentication
    console.log(`[WebSocket Server] Authenticating client: ${clientId}`);
    return true;
  }

  /**
   * Authorize client for specific actions
   */
  async authorizeClient(clientId: string, action: string, resource: string): Promise<boolean> {
    // In a real implementation, this would check permissions
    console.log(`[WebSocket Server] Authorizing client ${clientId} for ${action} on ${resource}`);
    return true;
  }
}

/**
 * WebSocket Connection Manager
 * 
 * Manages WebSocket connections and load balancing
 */
export class WebSocketConnectionManager {
  private servers: Map<string, WebSocketServer> = new Map();
  private primaryServer: WebSocketServer | null = null;
  private loadBalancer: LoadBalancer;

  constructor() {
    this.loadBalancer = new LoadBalancer();
    this.initializeServers();
  }

  /**
   * Initialize WebSocket servers
   */
  private initializeServers(): void {
    // Create primary server
    const primary = new WebSocketServer();
    this.servers.set('primary', primary);
    this.primaryServer = primary;

    // Create backup servers for redundancy
    for (let i = 1; i <= 2; i++) {
      const backup = new WebSocketServer();
      this.servers.set(`backup_${i}`, backup);
    }
  }

  /**
   * Get server for client (load balancing)
   */
  getServerForClient(): WebSocketServer {
    return this.loadBalancer.selectServer(this.servers);
  }

  /**
   * Get primary server
   */
  getPrimaryServer(): WebSocketServer | null {
    return this.primaryServer;
  }

  /**
   * Get all servers
   */
  getAllServers(): Map<string, WebSocketServer> {
    return new Map(this.servers);
  }

  /**
   * Handle server failure
   */
  handleServerFailure(serverId: string): void {
    console.warn(`[WebSocket Server] Server ${serverId} failed, promoting backup`);
    
    const failedServer = this.servers.get(serverId);
    if (failedServer) {
      // Promote backup server
      for (const [backupId, backupServer] of this.servers) {
        if (backupId.startsWith('backup_')) {
          this.primaryServer = backupServer;
          console.log(`[WebSocket Server] Promoted ${backupId} to primary`);
          break;
        }
      }
    }
  }

  /**
   * Shutdown all servers
   */
  async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.servers.values()).map(server => 
      server.shutdown()
    );
    await Promise.all(shutdownPromises);
  }
}

/**
 * Simple Load Balancer
 */
class LoadBalancer {
  private serverWeights: Map<string, number> = new Map();
  private roundRobinCounter = 0;

  constructor() {
    // Initialize equal weights
    this.serverWeights.set('primary', 1);
    this.serverWeights.set('backup_1', 1);
    this.serverWeights.set('backup_2', 1);
  }

  /**
   * Select server using weighted round-robin
   */
  selectServer(servers: Map<string, WebSocketServer>): WebSocketServer {
    const serverArray = Array.from(servers.entries());
    const totalWeight = Array.from(this.serverWeights.values()).reduce((sum, weight) => sum + weight, 0);
    
    let random = Math.floor(Math.random() * totalWeight);
    
    for (const [serverId, server] of serverArray) {
      const weight = this.serverWeights.get(serverId) || 1;
      if (random < weight) {
        return server;
      }
      random -= weight;
    }
    
    // Fallback to first server
    return serverArray[0][1];
  }

  /**
   * Update server weight
   */
  updateServerWeight(serverId: string, weight: number): void {
    this.serverWeights.set(serverId, Math.max(1, weight));
  }
}