import { v4 as uuidv4 } from 'uuid';
import { useSystemStore } from '@/store/system-store';
import { Agent, AgentMessage, MessagePriority, MessageType } from '@/types/agent-types';

/**
 * Communication Service
 * 
 * Manages communication between agents in the system.
 * Implements the Agent Communication Protocol (ACP).
 */
export class CommunicationService {
  /**
   * Send a message from one agent to another
   * 
   * @param from Source agent or 'user' for user-initiated messages
   * @param to Target agent (null for broadcast)
   * @param content Message content (string or structured data)
   * @param type Message type
   * @param priority Message priority
   * @param requiresResponse Whether the message requires a response
   * @param responseToMessageId Optional ID of message this is responding to
   * @param metadata Optional additional metadata
   * @returns Message ID of the sent message
   */
  sendMessage(
    from: string | Agent, 
    to: string | Agent | null,
    content: string | object,
    type: MessageType = 'data',
    priority: MessagePriority = 'normal',
    requiresResponse: boolean = false,
    responseToMessageId?: string,
    metadata?: Record<string, any>
  ): string {
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
    
    const { sendMessage } = useSystemStore.getState();
    sendMessage(message);
    
    return uuidv4(); // Return the new message ID
  }
  
  /**
   * Broadcast a message to all agents
   */
  broadcastMessage(
    from: string | Agent,
    content: string | object,
    type: MessageType = 'notification',
    priority: MessagePriority = 'normal',
    metadata?: Record<string, any>
  ): string {
    return this.sendMessage(
      from,
      null, // null toAgentId means broadcast
      content,
      type,
      priority,
      false,
      undefined,
      metadata
    );
  }
  
  /**
   * Send a command to an agent and expect a response
   */
  sendCommand(
    from: string | Agent,
    to: string | Agent,
    command: string | object,
    priority: MessagePriority = 'high',
    metadata?: Record<string, any>
  ): string {
    return this.sendMessage(
      from,
      to,
      command,
      'command',
      priority,
      true,
      undefined,
      metadata
    );
  }
  
  /**
   * Send a response to a previous message
   */
  sendResponse(
    from: string | Agent,
    to: string | Agent,
    responseToMessageId: string,
    content: string | object,
    type: MessageType = 'response',
    priority: MessagePriority = 'normal',
    metadata?: Record<string, any>
  ): string {
    return this.sendMessage(
      from,
      to,
      content,
      type,
      priority,
      false,
      responseToMessageId,
      metadata
    );
  }
  
  /**
   * Get all messages for a specific agent
   */
  getMessagesForAgent(agentId: string): AgentMessage[] {
    const { messages } = useSystemStore.getState();
    return messages.filter(
      msg => msg.toAgentId === agentId || msg.toAgentId === null // Direct messages and broadcasts
    );
  }
  
  /**
   * Get messages exchanged between two agents
   */
  getConversationBetweenAgents(agentId1: string, agentId2: string): AgentMessage[] {
    const { messages } = useSystemStore.getState();
    return messages.filter(
      msg => 
        (msg.fromAgentId === agentId1 && msg.toAgentId === agentId2) ||
        (msg.fromAgentId === agentId2 && msg.toAgentId === agentId1)
    );
  }
  
  /**
   * Get pending messages that require a response
   */
  getPendingMessages(agentId: string): AgentMessage[] {
    const { messages } = useSystemStore.getState();
    const pendingMessages = messages.filter(
      msg => 
        msg.toAgentId === agentId && 
        msg.requiresResponse === true &&
        // Check if there's already a response to this message
        !messages.some(response => response.responseToMessageId === msg.id)
    );
    
    return pendingMessages;
  }
}