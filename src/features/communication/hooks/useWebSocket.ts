import { useEffect, useRef, useState } from 'react';
import { EnhancedWebSocketService } from '../services/EnhancedWebSocketService';
import { useSystemStore } from '@/store/system-store';
import { AgentMessage, MessagePriority, MessageType } from '@/types/agent-types';

/**
 * WebSocket Hook for Real-Time Agent Communication
 * 
 * Provides a convenient React hook for using the enhanced WebSocket service
 * with automatic connection management and event handling.
 */
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');
  const [onlineAgents, setOnlineAgents] = useState<string[]>([]);
  const [messageHistory, setMessageHistory] = useState<AgentMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const wsServiceRef = useRef<EnhancedWebSocketService | null>(null);
  const isInitializedRef = useRef(false);
  const { sendMessage } = useSystemStore();

  // Initialize WebSocket service
  useEffect(() => {
    if (isInitializedRef.current) return;

    try {
      wsServiceRef.current = new EnhancedWebSocketService();
      isInitializedRef.current = true;

      // Set up event handlers
      const wsService = wsServiceRef.current;

      wsService.on('connected', () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
      });

      wsService.on('disconnected', () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
      });

      wsService.on('reconnecting', () => {
        setConnectionStatus('reconnecting');
      });

      wsService.on('error', (err: any) => {
        console.error('WebSocket error:', err);
        setError(err.message || 'WebSocket connection error');
      });

      wsService.on('agentMessage', (message: AgentMessage) => {
        // Add to message history
        setMessageHistory(prev => [...prev.slice(-99), message]); // Keep last 100 messages
        
        // Send to system store
        sendMessage(message);
      });

      wsService.on('agentPresenceUpdate', (presence: any) => {
        // Update online agents list
        setOnlineAgents(prev => {
          const newAgents = [...prev];
          const agentIndex = newAgents.indexOf(presence.agentId);
          
          if (presence.status === 'online' && agentIndex === -1) {
            newAgents.push(presence.agentId);
          } else if (presence.status !== 'online' && agentIndex > -1) {
            newAgents.splice(agentIndex, 1);
          }
          
          return newAgents;
        });
      });

      wsService.on('systemNotification', (notification: any) => {
        console.log('System notification:', notification);
        // Handle system notifications as needed
      });

      wsService.on('performanceMetrics', (metrics: any) => {
        console.log('Performance metrics:', metrics);
        // Handle performance metrics as needed
      });

    } catch (err) {
      console.error('Failed to initialize WebSocket service:', err);
      setError('Failed to initialize WebSocket service');
    }

    return () => {
      // Cleanup on unmount
      if (wsServiceRef.current) {
        wsServiceRef.current.disconnect();
      }
    };
  }, []);

  // Reconnect when connection is lost
  useEffect(() => {
    if (connectionStatus === 'disconnected' && isInitializedRef.current) {
      const timer = setTimeout(() => {
        if (wsServiceRef.current) {
          wsServiceRef.current.reconnect();
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [connectionStatus]);

  // WebSocket service methods
  const sendAgentMessage = (
    fromAgentId: string,
    toAgentId: string | null,
    content: any,
    messageType: MessageType = 'data',
    priority: MessagePriority = 'normal',
    requiresResponse: boolean = false,
    responseToMessageId?: string,
    metadata?: Record<string, any>
  ): boolean => {
    if (!wsServiceRef.current) return false;
    
    return wsServiceRef.current.sendAgentMessage(
      fromAgentId,
      toAgentId,
      content,
      messageType,
      priority,
      requiresResponse,
      responseToMessageId,
      metadata
    );
  };

  const broadcastToAgents = (
    fromAgentId: string,
    content: any,
    messageType: MessageType = 'notification',
    priority: MessagePriority = 'normal',
    metadata?: Record<string, any>
  ): boolean => {
    if (!wsServiceRef.current) return false;
    
    return wsServiceRef.current.broadcastToAgents(
      fromAgentId,
      content,
      messageType,
      priority,
      metadata
    );
  };

  const sendToAgent = (
    fromAgentId: string,
    toAgentId: string,
    content: any,
    messageType: MessageType = 'data',
    priority: MessagePriority = 'normal',
    requiresResponse: boolean = false,
    responseToMessageId?: string,
    metadata?: Record<string, any>
  ): boolean => {
    if (!wsServiceRef.current) return false;
    
    return wsServiceRef.current.sendToAgent(
      fromAgentId,
      toAgentId,
      content,
      messageType,
      priority,
      requiresResponse,
      responseToMessageId,
      metadata
    );
  };

  const createPrivateChannel = (agentId1: string, agentId2: string): string => {
    if (!wsServiceRef.current) return '';
    
    return wsServiceRef.current.createPrivateChannel(agentId1, agentId2);
  };

  const sendEncryptedMessage = (
    fromAgentId: string,
    toAgentId: string,
    content: any,
    encryptionKey?: string
  ): boolean => {
    if (!wsServiceRef.current) return false;
    
    return wsServiceRef.current.sendEncryptedMessage(fromAgentId, toAgentId, content, encryptionKey);
  };

  const joinRoom = (room: string, agentId?: string): boolean => {
    if (!wsServiceRef.current) return false;
    
    return wsServiceRef.current.joinRoom(room, agentId);
  };

  const leaveRoom = (room: string, agentId?: string): boolean => {
    if (!wsServiceRef.current) return false;
    
    return wsServiceRef.current.leaveRoom(room, agentId);
  };

  const updateAgentPresence = (agentId: string, status: 'online' | 'offline' | 'busy'): void => {
    if (!wsServiceRef.current) return;
    
    wsServiceRef.current.updateAgentPresence(agentId, status);
  };

  const getAgentPresence = (agentId: string) => {
    if (!wsServiceRef.current) return null;
    
    return wsServiceRef.current.getAgentPresence(agentId);
  };

  const getMessageHistory = (limit?: number) => {
    if (!wsServiceRef.current) return [];
    
    return wsServiceRef.current.getMessageHistory(limit);
  };

  const getStats = () => {
    if (!wsServiceRef.current) return null;
    
    return wsServiceRef.current.getStats();
  };

  const forceReconnect = () => {
    if (wsServiceRef.current) {
      wsServiceRef.current.reconnect();
    }
  };

  const disconnect = () => {
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
    }
  };

  return {
    // Connection state
    isConnected,
    connectionStatus,
    error,
    
    // Agent presence
    onlineAgents,
    
    // Message history
    messageHistory,
    
    // Actions
    sendAgentMessage,
    broadcastToAgents,
    sendToAgent,
    createPrivateChannel,
    sendEncryptedMessage,
    joinRoom,
    leaveRoom,
    updateAgentPresence,
    getAgentPresence,
    getMessageHistory,
    getStats,
    forceReconnect,
    disconnect,
    
    // Convenience methods
    sendCriticalMessage: (fromAgentId: string, toAgentId: string | null, content: any, metadata?: Record<string, any>) =>
      sendAgentMessage(fromAgentId, toAgentId, content, 'data', 'critical', false, undefined, metadata),
    
    sendHighPriorityMessage: (fromAgentId: string, toAgentId: string | null, content: any, metadata?: Record<string, any>) =>
      sendAgentMessage(fromAgentId, toAgentId, content, 'data', 'high', false, undefined, metadata),
    
    sendStandardMessage: (fromAgentId: string, toAgentId: string | null, content: any, metadata?: Record<string, any>) =>
      sendAgentMessage(fromAgentId, toAgentId, content, 'data', 'normal', false, undefined, metadata),
    
    sendNotification: (fromAgentId: string, toAgentId: string | null, content: any, metadata?: Record<string, any>) =>
      sendAgentMessage(fromAgentId, toAgentId, content, 'notification', 'normal', false, undefined, metadata),
    
    sendCommand: (fromAgentId: string, toAgentId: string | null, content: any, metadata?: Record<string, any>) =>
      sendAgentMessage(fromAgentId, toAgentId, content, 'command', 'high', false, undefined, metadata),
    
    sendQuery: (fromAgentId: string, toAgentId: string | null, content: any, requiresResponse: boolean = true, metadata?: Record<string, any>) =>
      sendAgentMessage(fromAgentId, toAgentId, content, 'query', 'normal', requiresResponse, undefined, metadata),
    
    sendResponse: (fromAgentId: string, toAgentId: string, content: any, responseToMessageId: string, metadata?: Record<string, any>) =>
      sendAgentMessage(fromAgentId, toAgentId, content, 'response', 'normal', false, responseToMessageId, metadata),
    
    sendError: (fromAgentId: string, toAgentId: string | null, content: any, metadata?: Record<string, any>) =>
      sendAgentMessage(fromAgentId, toAgentId, content, 'error', 'high', false, undefined, metadata),
  };
}

/**
 * Custom hook for WebSocket events
 */
export function useWebSocketEvent(event: string, callback: (data: any) => void) {
  const wsServiceRef = useRef<EnhancedWebSocketService | null>(null);

  useEffect(() => {
    if (!wsServiceRef.current) {
      wsServiceRef.current = new EnhancedWebSocketService();
    }

    const wsService = wsServiceRef.current;
    wsService.on(event, callback);

    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.off(event, callback);
      }
    };
  }, [event, callback]);
}

/**
 * Custom hook for agent presence tracking
 */
export function useAgentPresence() {
  const [agentPresence, setAgentPresence] = useState<Map<string, { status: 'online' | 'offline' | 'busy'; lastSeen: number }>>(new Map());
  const wsServiceRef = useRef<EnhancedWebSocketService | null>(null);

  useEffect(() => {
    if (!wsServiceRef.current) {
      wsServiceRef.current = new EnhancedWebSocketService();
    }

    const wsService = wsServiceRef.current;

    const handlePresenceUpdate = (presence: any) => {
      setAgentPresence(prev => {
        const newMap = new Map(prev);
        newMap.set(presence.agentId, {
          status: presence.status,
          lastSeen: Date.now()
        });
        return newMap;
      });
    };

    wsService.on('agentPresenceUpdate', handlePresenceUpdate);

    // Get initial presence data
    const initialPresence = new Map<string, { status: 'online' | 'offline' | 'busy'; lastSeen: number }>();
    const onlineAgents = wsService.getOnlineAgents();
    for (const agentId of onlineAgents) {
      const presence = wsService.getAgentPresence(agentId);
      if (presence) {
        initialPresence.set(agentId, presence);
      }
    }
    setAgentPresence(initialPresence);

    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.off('agentPresenceUpdate', handlePresenceUpdate);
      }
    };
  }, []);

  const getAgentStatus = (agentId: string) => {
    return agentPresence.get(agentId)?.status || 'offline';
  };

  const getOnlineAgents = () => {
    return Array.from(agentPresence.entries())
      .filter(([_, presence]) => presence.status === 'online')
      .map(([agentId]) => agentId);
  };

  const getBusyAgents = () => {
    return Array.from(agentPresence.entries())
      .filter(([_, presence]) => presence.status === 'busy')
      .map(([agentId]) => agentId);
  };

  const isAgentOnline = (agentId: string) => {
    return agentPresence.get(agentId)?.status === 'online';
  };

  return {
    agentPresence,
    getAgentStatus,
    getOnlineAgents,
    getBusyAgents,
    isAgentOnline,
  };
}

/**
 * Custom hook for message history
 */
export function useMessageHistory(limit?: number) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const wsServiceRef = useRef<EnhancedWebSocketService | null>(null);

  useEffect(() => {
    if (!wsServiceRef.current) {
      wsServiceRef.current = new EnhancedWebSocketService();
    }

    const wsService = wsServiceRef.current;

    const handleMessage = (message: AgentMessage) => {
      setMessages(prev => {
        const newMessages = [...prev, message];
        if (limit) {
          return newMessages.slice(-limit);
        }
        return newMessages;
      });
    };

    wsService.on('agentMessage', handleMessage);

    // Get initial message history
    const initialHistory = wsService.getMessageHistory(limit);
    setMessages(initialHistory);

    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.off('agentMessage', handleMessage);
      }
    };
  }, [limit]);

  const clearMessages = () => {
    setMessages([]);
  };

  const filterMessages = (predicate: (message: AgentMessage) => boolean) => {
    return messages.filter(predicate);
  };

  const getMessagesByAgent = (agentId: string) => {
    return messages.filter(message => message.fromAgentId === agentId || message.toAgentId === agentId);
  };

  const getMessagesByPriority = (priority: MessagePriority) => {
    return messages.filter(message => message.priority === priority);
  };

  const getMessagesByType = (type: MessageType) => {
    return messages.filter(message => message.type === type);
  };

  const getRecentMessages = (count: number) => {
    return messages.slice(-count);
  };

  return {
    messages,
    clearMessages,
    filterMessages,
    getMessagesByAgent,
    getMessagesByPriority,
    getMessagesByType,
    getRecentMessages,
  };
}