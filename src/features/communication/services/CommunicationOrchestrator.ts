import { RealTimeCommunicationService } from './RealTimeCommunicationService';
import { WebSocketServer } from './WebSocketServer';
import { WebSocketClient } from './WebSocketClient';
import { EnhancedWebSocketService, EnhancedWebSocketManager } from './EnhancedWebSocketService';
import { CommunicationChannelManager } from './RealTimeCommunicationService';
import { useSystemStore } from '@/store/system-store';
import {
  Agent,
  AgentMessage,
  MessagePriority,
  MessageType,
  SystemStatus
} from '@/types/agent-types';

/**
 * Communication Orchestrator
 * 
 * Central hub for managing all communication in the multi-agent system:
 * - Coordinates between different communication services
 * - Handles message routing and load balancing
 * - Manages communication channels and rooms
 * - Provides unified API for agent communication
 * - Implements communication policies and security
 * - Monitors communication health and performance
 */
export class CommunicationOrchestrator {
  private realTimeService: RealTimeCommunicationService;
  private webSocketServer: WebSocketServer;
  private webSocketClient: WebSocketClient;
  private enhancedWebSocketService: EnhancedWebSocketService;
  private enhancedWebSocketManager: EnhancedWebSocketManager;
  private channelManager: CommunicationChannelManager;
  private isInitialized = false;
  private communicationStats: {
    totalMessages: number;
    criticalMessages: number;
    highPriorityMessages: number;
    failedMessages: number;
    averageResponseTime: number;
    lastUpdated: Date;
  } = {
    totalMessages: 0,
    criticalMessages: 0,
    highPriorityMessages: 0,
    failedMessages: 0,
    averageResponseTime: 0,
    lastUpdated: new Date()
  };

  constructor() {
    this.realTimeService = new RealTimeCommunicationService();
    this.webSocketServer = new WebSocketServer();
    this.webSocketClient = new WebSocketClient();
    this.enhancedWebSocketService = new EnhancedWebSocketService();
    this.enhancedWebSocketManager = new EnhancedWebSocketManager();
    this.channelManager = new CommunicationChannelManager();
    
    this.initializeEventHandlers();
  }

  /**
   * Initialize the communication orchestrator
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('[Communication Orchestrator] Initializing...');
      
      // Initialize WebSocket client connection
      await this.initializeWebSocketConnection();
      
      // Set up communication channels
      this.setupCommunicationChannels();
      
      // Configure message routing
      this.configureMessageRouting();
      
      // Start monitoring
      this.startMonitoring();
      
      this.isInitialized = true;
      console.log('[Communication Orchestrator] Initialization complete');
      
    } catch (error) {
      console.error('[Communication Orchestrator] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize WebSocket connection
   */
  private async initializeWebSocketConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const handleConnected = () => {
        this.webSocketClient.off('connected', handleConnected);
        resolve();
      };

      const handleError = (error: any) => {
        this.webSocketClient.off('error', handleError);
        reject(error);
      };

      this.webSocketClient.on('connected', handleConnected);
      this.webSocketClient.on('error', handleError);

      // Connection will be established automatically by WebSocketClient constructor
    });
  }

  /**
   * Initialize enhanced WebSocket connection
   */
  private async initializeEnhancedWebSocketConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const handleConnected = () => {
        this.enhancedWebSocketService.off('connected', handleConnected);
        resolve();
      };

      const handleError = (error: any) => {
        this.enhancedWebSocketService.off('error', handleError);
        reject(error);
      };

      this.enhancedWebSocketService.on('connected', handleConnected);
      this.enhancedWebSocketService.on('error', handleError);

      // Connection will be established automatically by EnhancedWebSocketService constructor
    });
  }

  /**
   * Set up communication channels
   */
  private setupCommunicationChannels(): void {
    // Set up system-wide broadcast channel
    this.channelManager.getChannel('system_broadcast');
    this.channelManager.activateChannel('system_broadcast');

    // Set up agent-specific channels
    const { agents } = useSystemStore.getState();
    for (const agent of agents) {
      this.channelManager.getChannel(`agent_${agent.id}`);
      this.channelManager.activateChannel(`agent_${agent.id}`);
    }
  }

  /**
   * Configure message routing
   */
  private configureMessageRouting(): void {
    // Handle agent messages from enhanced WebSocket service
    this.enhancedWebSocketService.on('agentMessage', (message: AgentMessage) => {
      this.routeAgentMessage(message);
    });

    // Handle system notifications from enhanced WebSocket service
    this.enhancedWebSocketService.on('systemNotification', (notification: any) => {
      this.handleSystemNotification(notification);
    });

    // Handle performance metrics from enhanced WebSocket service
    this.enhancedWebSocketService.on('performanceMetrics', (metrics: any) => {
      this.updatePerformanceMetrics(metrics);
    });

    // Handle agent presence updates
    this.enhancedWebSocketService.on('agentPresenceUpdate', (presence: any) => {
      this.handleAgentPresenceUpdate(presence);
    });

    // Handle WebSocket connection events
    this.enhancedWebSocketService.on('connected', () => {
      console.log('[Communication Orchestrator] Enhanced WebSocket connected');
    });

    this.enhancedWebSocketService.on('disconnected', () => {
      console.log('[Communication Orchestrator] Enhanced WebSocket disconnected');
    });

    // Handle WebSocket errors
    this.enhancedWebSocketService.on('error', (error: any) => {
      console.error('[Communication Orchestrator] Enhanced WebSocket error:', error);
    });
  }

  /**
   * Initialize event handlers
   */
  private initializeEventHandlers(): void {
    // Handle system state changes
    const { subscribe } = useSystemStore.getState();
    
    // Note: In a real implementation, we would use Zustand's subscribe method
    // For now, we'll handle state changes through the store methods
  }

  /**
   * Route agent messages
   */
  private routeAgentMessage(message: AgentMessage): void {
    try {
      // Update statistics
      this.updateCommunicationStats(message);

      // Route based on priority
      switch (message.priority) {
        case 'critical':
          this.routeCriticalMessage(message);
          break;
        case 'high':
          this.routeHighPriorityMessage(message);
          break;
        default:
          this.routeStandardMessage(message);
      }

    } catch (error) {
      console.error('[Communication Orchestrator] Error routing message:', error);
      this.communicationStats.failedMessages++;
    }
  }

  /**
   * Route critical message
   */
  private routeCriticalMessage(message: AgentMessage): void {
    this.communicationStats.criticalMessages++;
    
    // Use enhanced WebSocket service for immediate delivery
    this.enhancedWebSocketService.sendToAgent(
      message.fromAgentId,
      message.toAgentId || 'system',
      message.content,
      message.type,
      message.priority,
      message.requiresResponse,
      message.responseToMessageId,
      message.metadata
    );

    // Also use real-time service as fallback
    this.realTimeService.sendRealTimeMessage(
      message.fromAgentId,
      message.toAgentId,
      message.content,
      message.type,
      message.priority,
      message.requiresResponse,
      message.responseToMessageId,
      message.metadata
    ).catch(error => {
      console.error('[Communication Orchestrator] Critical message delivery failed:', error);
    });

    // Broadcast to system channel
    this.webSocketServer.sendToRoom('system', 'critical_message', message);
  }

  /**
   * Route high priority message
   */
  private routeHighPriorityMessage(message: AgentMessage): void {
    this.communicationStats.highPriorityMessages++;
    
    // Use enhanced WebSocket service for priority handling
    this.enhancedWebSocketService.sendToAgent(
      message.fromAgentId,
      message.toAgentId || 'system',
      message.content,
      message.type,
      message.priority,
      message.requiresResponse,
      message.responseToMessageId,
      message.metadata
    );

    // Also use real-time service as fallback
    this.realTimeService.sendRealTimeMessage(
      message.fromAgentId,
      message.toAgentId,
      message.content,
      message.type,
      message.priority,
      message.requiresResponse,
      message.responseToMessageId,
      message.metadata
    ).catch(error => {
      console.error('[Communication Orchestrator] High priority message delivery failed:', error);
    });

    // Send to specific agent room
    if (message.toAgentId) {
      this.webSocketServer.sendToRoom(`agent_${message.toAgentId}`, 'high_priority_message', message);
    }
  }

  /**
   * Route standard message
   */
  private routeStandardMessage(message: AgentMessage): void {
    // Use enhanced WebSocket service for standard delivery
    this.enhancedWebSocketService.sendToAgent(
      message.fromAgentId,
      message.toAgentId || 'system',
      message.content,
      message.type,
      message.priority,
      message.requiresResponse,
      message.responseToMessageId,
      message.metadata
    );

    // Also use real-time service as fallback
    this.realTimeService.sendRealTimeMessage(
      message.fromAgentId,
      message.toAgentId,
      message.content,
      message.type,
      message.priority,
      message.requiresResponse,
      message.responseToMessageId,
      message.metadata
    ).catch(error => {
      console.error('[Communication Orchestrator] Standard message delivery failed:', error);
    });

    // Send to appropriate room
    if (message.toAgentId) {
      this.webSocketServer.sendToRoom(`agent_${message.toAgentId}`, 'agent_message', message);
    } else {
      this.webSocketServer.sendToRoom('system', 'agent_message', message);
    }
  }

  /**
   * Handle system notifications
   */
  private handleSystemNotification(notification: any): void {
    console.log('[Communication Orchestrator] System notification:', notification);
    
    // Update system store
    const { updateSystemStatus } = useSystemStore.getState();
    
    switch (notification.severity) {
      case 'error':
        updateSystemStatus('degraded');
        break;
      case 'warning':
        // Log warning but maintain current status
        break;
      case 'info':
        // Log info message
        break;
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(metrics: any): void {
    // Update system resource usage
    const { updateResourceUsage } = useSystemStore.getState();
    updateResourceUsage({
      cpuUtilization: metrics.cpu || 0,
      memoryUtilization: metrics.memory || 0,
      tokensUsedLastMinute: metrics.tokens || 0
    });
  }

  /**
   * Handle agent changes
   */
  private handleAgentChanges(agents: Agent[]): void {
    // Update communication channels for new agents
    for (const agent of agents) {
      if (!this.channelManager.getActiveChannels().includes(`agent_${agent.id}`)) {
        this.channelManager.getChannel(`agent_${agent.id}`);
        this.channelManager.activateChannel(`agent_${agent.id}`);
      }

      // Update agent presence in enhanced WebSocket service
      this.enhancedWebSocketService.updateAgentPresence(agent.id, 'online');
    }

    // Remove channels for deleted agents
    const activeChannels = this.channelManager.getActiveChannels();
    for (const channelId of activeChannels) {
      if (channelId.startsWith('agent_')) {
        const agentId = channelId.replace('agent_', '');
        if (!agents.some(agent => agent.id === agentId)) {
          this.channelManager.deactivateChannel(channelId);
          // Remove agent presence
          this.enhancedWebSocketService.updateAgentPresence(agentId, 'offline');
        }
      }
    }
  }

  /**
   * Handle agent presence update
   */
  private handleAgentPresenceUpdate(presence: any): void {
    console.log('[Communication Orchestrator] Agent presence update:', presence);
    
    // Update system store with agent presence
    const { updateAgentStatus } = useSystemStore.getState();
    if (updateAgentStatus) {
      updateAgentStatus(presence.agentId, presence.status === 'online' ? 'processing' : 'idle');
    }
  }

  /**
   * Handle system status change
   */
  private handleSystemStatusChange(status: SystemStatus): void {
    switch (status) {
      case 'starting':
        this.handleSystemStarting();
        break;
      case 'operational':
        this.handleSystemOperational();
        break;
      case 'degraded':
        this.handleSystemDegraded();
        break;
      case 'maintenance':
        this.handleSystemMaintenance();
        break;
      case 'shutdown':
        this.handleSystemShutdown();
        break;
    }
  }

  /**
   * Handle system starting
   */
  private handleSystemStarting(): void {
    console.log('[Communication Orchestrator] System starting...');
    // Initialize communication services
    this.initialize();
  }

  /**
   * Handle system operational
   */
  private handleSystemOperational(): void {
    console.log('[Communication Orchestrator] System operational');
    // Ensure all communication services are running
    this.ensureServicesRunning();
  }

  /**
   * Handle system degraded
   */
  private handleSystemDegraded(): void {
    console.warn('[Communication Orchestrator] System degraded');
    // Reduce communication load
    this.reduceCommunicationLoad();
  }

  /**
   * Handle system maintenance
   */
  private handleSystemMaintenance(): void {
    console.log('[Communication Orchestrator] System maintenance');
    // Pause non-critical communication
    this.pauseNonCriticalCommunication();
  }

  /**
   * Handle system shutdown
   */
  private handleSystemShutdown(): void {
    console.log('[Communication Orchestrator] System shutdown');
    // Gracefully shutdown communication services
    this.shutdown();
  }

  /**
   * Ensure services are running
   */
  private ensureServicesRunning(): void {
    // Check WebSocket client health
    if (!this.webSocketClient.isHealthy()) {
      this.webSocketClient.reconnect();
    }

    // Check real-time service health
    if (!this.realTimeService.isConnectionHealthy()) {
      this.realTimeService.forceReconnect();
    }

    // Check enhanced WebSocket service health
    if (!this.enhancedWebSocketService.isHealthy()) {
      this.enhancedWebSocketService.reconnect();
    }

    // Check enhanced WebSocket manager health
    const activeService = this.enhancedWebSocketManager.getActiveService();
    if (!activeService.isHealthy()) {
      console.warn('[Communication Orchestrator] Active WebSocket service unhealthy, checking for backup');
      this.enhancedWebSocketManager.switchToPrimary();
    }
  }

  /**
   * Reduce communication load
   */
  private reduceCommunicationLoad(): void {
    // Prioritize critical messages
    // Queue non-critical messages
    // Reduce heartbeat frequency
  }

  /**
   * Pause non-critical communication
   */
  private pauseNonCriticalCommunication(): void {
    // Pause standard and low priority message processing
    // Continue critical message handling
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    // Start periodic health checks
    setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Check every minute

    // Start statistics collection
    setInterval(() => {
      this.collectStatistics();
    }, 300000); // Collect every 5 minutes
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    const healthStatus = {
      timestamp: new Date(),
      services: {
        webSocketClient: this.webSocketClient.isHealthy(),
        realTimeService: this.realTimeService.isConnectionHealthy(),
        enhancedWebSocketService: this.enhancedWebSocketService.isHealthy(),
        webSocketServer: this.webSocketServer.getStatus().isRunning
      },
      system: {
        totalMessages: this.communicationStats.totalMessages,
        failedMessages: this.communicationStats.failedMessages,
        averageResponseTime: this.communicationStats.averageResponseTime
      },
      enhancedWebSocket: {
        activeService: this.enhancedWebSocketManager.getActiveService() === this.enhancedWebSocketService ? 'primary' : 'backup',
        serviceStats: this.enhancedWebSocketManager.getServiceStats()
      }
    };

    // Log health status
    console.log('[Communication Orchestrator] Health check:', healthStatus);

    // Send health metrics to WebSocket server
    this.webSocketServer.sendPerformanceMetrics(healthStatus);
  }

  /**
   * Collect statistics
   */
  private collectStatistics(): void {
    this.communicationStats.lastUpdated = new Date();
    
    // Send statistics to system store
    const { updateResourceUsage } = useSystemStore.getState();
    updateResourceUsage({
      activeAgentCount: this.webSocketServer.getClientStats().agentClients,
      pendingTaskCount: this.communicationStats.totalMessages - this.communicationStats.failedMessages
    });
  }

  /**
   * Update communication statistics
   */
  private updateCommunicationStats(message: AgentMessage): void {
    this.communicationStats.totalMessages++;
    
    // Calculate average response time (simplified)
    const responseTime = Date.now() - message.timestamp.getTime();
    this.communicationStats.averageResponseTime = 
      (this.communicationStats.averageResponseTime + responseTime) / 2;
  }

  /**
   * Send message through orchestrator
   */
  async sendMessage(
    from: string | Agent,
    to: string | Agent | null,
    content: string | object,
    type: MessageType = 'data',
    priority: MessagePriority = 'normal',
    requiresResponse: boolean = false,
    responseToMessageId?: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Use enhanced WebSocket service for primary message delivery
    const fromId = typeof from === 'string' ? from : from.id;
    const toId = to === null ? null : (typeof to === 'string' ? to : to.id);
    
    if (priority === 'critical' || priority === 'high') {
      // For critical and high priority messages, use enhanced WebSocket service
      this.enhancedWebSocketService.sendToAgent(
        fromId,
        toId || 'system',
        content,
        type,
        priority,
        requiresResponse,
        responseToMessageId,
        metadata
      );
    }

    // Use real-time service as fallback
    return await this.realTimeService.sendRealTimeMessage(
      from,
      to,
      content,
      type,
      priority,
      requiresResponse,
      responseToMessageId,
      metadata
    );
  }

  /**
   * Broadcast message to all agents
   */
  async broadcastMessage(
    from: string | Agent,
    content: string | object,
    type: MessageType = 'notification',
    priority: MessagePriority = 'normal',
    metadata?: Record<string, any>
  ): Promise<string> {
    // Use enhanced WebSocket service for broadcasting
    const fromId = typeof from === 'string' ? from : from.id;
    this.enhancedWebSocketService.broadcastToAgents(fromId, content, type, priority, metadata);
    
    // Use real-time service as fallback
    return await this.sendMessage(from, null, content, type, priority, false, undefined, metadata);
  }

  /**
   * Create communication channel
   */
  createCommunicationChannel(
    agentId1: string,
    agentId2: string,
    channelType: 'direct' | 'group' | 'broadcast' = 'direct'
  ): string {
    return this.realTimeService.createCommunicationChannel(agentId1, agentId2, channelType);
  }

  /**
   * Get communication statistics
   */
  getCommunicationStats(): typeof this.communicationStats {
    return { ...this.communicationStats };
  }

  /**
   * Get system health
   */
  getSystemHealth(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      webSocketClient: boolean;
      realTimeService: boolean;
      enhancedWebSocketService: boolean;
      webSocketServer: boolean;
    };
    communication: {
      totalMessages: number;
      failedMessages: number;
      successRate: number;
    };
    enhancedWebSocket: {
      activeService: string;
      serviceStats: Map<string, any>;
    };
  } {
    const services = {
      webSocketClient: this.webSocketClient.isHealthy(),
      realTimeService: this.realTimeService.isConnectionHealthy(),
      enhancedWebSocketService: this.enhancedWebSocketService.isHealthy(),
      webSocketServer: this.webSocketServer.getStatus().isRunning
    };

    const totalMessages = this.communicationStats.totalMessages;
    const failedMessages = this.communicationStats.failedMessages;
    const successRate = totalMessages > 0 ? ((totalMessages - failedMessages) / totalMessages) * 100 : 100;

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (successRate < 90 || Object.values(services).filter(Boolean).length < 3) {
      overall = 'degraded';
    }
    
    if (successRate < 70 || Object.values(services).filter(Boolean).length < 2) {
      overall = 'unhealthy';
    }

    return {
      overall,
      services,
      communication: {
        totalMessages,
        failedMessages,
        successRate
      },
      enhancedWebSocket: {
        activeService: this.enhancedWebSocketManager.getActiveService() === this.enhancedWebSocketService ? 'primary' : 'backup',
        serviceStats: this.enhancedWebSocketManager.getServiceStats()
      }
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[Communication Orchestrator] Shutting down...');
    
    try {
      // Shutdown WebSocket client
      this.webSocketClient.disconnect();
      
      // Shutdown real-time service
      await this.realTimeService.closeConnection();
      
      // Shutdown enhanced WebSocket service
      this.enhancedWebSocketService.disconnect();
      
      // Shutdown WebSocket server
      await this.webSocketServer.shutdown();
      
      // Shutdown channel manager
      await this.channelManager.closeAllChannels();
      
      this.isInitialized = false;
      console.log('[Communication Orchestrator] Shutdown complete');
      
    } catch (error) {
      console.error('[Communication Orchestrator] Error during shutdown:', error);
    }
  }

  /**
   * Reset communication orchestrator
   */
  async reset(): Promise<void> {
    await this.shutdown();
    
    // Reset statistics
    this.communicationStats = {
      totalMessages: 0,
      criticalMessages: 0,
      highPriorityMessages: 0,
      failedMessages: 0,
      averageResponseTime: 0,
      lastUpdated: new Date()
    };
    
    // Reset enhanced WebSocket service
    this.enhancedWebSocketService = new EnhancedWebSocketService();
    this.enhancedWebSocketManager = new EnhancedWebSocketManager();
    
    // Reinitialize
    await this.initialize();
  }

  /**
   * Get enhanced WebSocket service statistics
   */
  getEnhancedWebSocketStats(): any {
    return {
      service: this.enhancedWebSocketService.getStats(),
      manager: {
        activeService: this.enhancedWebSocketManager.getActiveService() === this.enhancedWebSocketService ? 'primary' : 'backup',
        allServices: this.enhancedWebSocketManager.getAllServices().map(service => service.getStats()),
        serviceStats: this.enhancedWebSocketManager.getServiceStats()
      }
    };
  }

  /**
   * Get agent presence information
   */
  getAgentPresence(): Map<string, { status: 'online' | 'offline' | 'busy'; lastSeen: number }> {
    const presence = new Map<string, { status: 'online' | 'offline' | 'busy'; lastSeen: number }>();
    
    // Get presence from enhanced WebSocket service
    const onlineAgents = this.enhancedWebSocketService.getOnlineAgents();
    for (const agentId of onlineAgents) {
      const agentPresence = this.enhancedWebSocketService.getAgentPresence(agentId);
      if (agentPresence) {
        presence.set(agentId, agentPresence);
      }
    }
    
    return presence;
  }

  /**
   * Create private communication channel between agents
   */
  createPrivateChannel(agentId1: string, agentId2: string): string {
    return this.enhancedWebSocketService.createPrivateChannel(agentId1, agentId2);
  }

  /**
   * Send encrypted message between agents
   */
  sendEncryptedMessage(
    fromAgentId: string,
    toAgentId: string,
    content: any,
    encryptionKey?: string
  ): boolean {
    return this.enhancedWebSocketService.sendEncryptedMessage(fromAgentId, toAgentId, content, encryptionKey);
  }
}

/**
 * Global communication orchestrator instance
 */
export const communicationOrchestrator = new CommunicationOrchestrator();