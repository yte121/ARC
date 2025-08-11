import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  SendHorizontal, 
  RotateCw, 
  MessageSquare, 
  Trash2, 
  Plus,
  Bot,
  User
} from 'lucide-react';
import { WebSocketService } from '@/services/WebSocketService';
import { APIService } from '@/services/APIService';
import { useSystemStore } from '@/store/system-store';
import { Agent, Task } from '@/types/agent-types';

interface CommandCenterProps {
  onCreateAgent: (config: any) => void;
}

export function CommandCenter({ onCreateAgent }: CommandCenterProps) {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isNewConversationDialogOpen, setIsNewConversationDialogOpen] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsService = useRef(new WebSocketService());
  const apiService = useRef(new APIService());
  const { agents, tasks } = useSystemStore();
  const commandInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    wsService.current.connect();
    
    // Load existing conversations from API
    loadConversations();
    
    // Add keyboard shortcut listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        commandInputRef.current?.focus();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      wsService.current.disconnect();
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    setError(null);
    
    try {
      const response = await apiService.current.getConversations();
      setConversations(response || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setError('Failed to load conversations. Please try again.');
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleSubmitCommand = async () => {
    if (!command.trim() || isProcessing) return;

    setIsProcessing(true);
    const currentCommand = command;
    setCommand('');

    try {
      // Create new conversation if none selected
      let conversationId = selectedConversationId;
      if (!conversationId) {
        const newConversation = await apiService.current.createConversation({
          title: generateConversationTitle(currentCommand),
          messages: []
        });
        conversationId = newConversation.id;
        setConversations(prev => [...prev, newConversation]);
        setSelectedConversationId(conversationId);
      }

      // Add user message to conversation
      const userMessage = await apiService.current.addMessageToConversation(conversationId, {
        content: currentCommand,
        role: 'user'
      });

      // Update conversations with user message
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, messages: [...conv.messages, userMessage] }
          : conv
      ));

      // Process command through agent system
      const response = await processCommandWithAgents(currentCommand);

      // Add system response to conversation
      const systemMessage = await apiService.current.addMessageToConversation(conversationId, {
        content: response,
        role: 'system'
      });

      // Update conversations with system message
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, messages: [...conv.messages, systemMessage] }
          : conv
      ));

    } catch (error) {
      console.error('Error processing command:', error);
      
      // Add error message to conversation
      if (selectedConversationId) {
        const errorMessage = await apiService.current.addMessageToConversation(selectedConversationId, {
          content: `Error processing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
          role: 'system'
        });

        setConversations(prev => prev.map(conv => 
          conv.id === selectedConversationId 
            ? { ...conv, messages: [...conv.messages, errorMessage] }
            : conv
        ));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const processCommandWithAgents = async (command: string): Promise<string> => {
    const lowercaseCommand = command.toLowerCase();
    
    // Create task for command processing
    const task = await apiService.current.createTask({
      title: `Process Command: ${command.substring(0, 50)}...`,
      description: command,
      priority: 'high',
      parentTaskId: null,
      assignedAgentIds: []
    });

    // Send command to orchestrator agent
    const orchestratorAgent = agents.find(agent => agent.specialization === 'orchestrator');
    if (orchestratorAgent) {
      wsService.current.sendAgentMessage({
        fromAgentId: 'user',
        toAgentId: orchestratorAgent.id,
        content: command,
        messageType: 'command',
        taskId: task.id
      });
    }

    // Wait for response from agents
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve("Command processing initiated. The orchestrator agent is coordinating with other agents to execute your request.");
      }, 5000);

      // Listen for agent responses
      const handleAgentResponse = (data: any) => {
        if (data.taskId === task.id && data.messageType === 'response') {
          clearTimeout(timeout);
          wsService.current.off('agentMessage', handleAgentResponse);
          resolve(data.content);
        }
      };

      wsService.current.on('agentMessage', handleAgentResponse);
    });
  };

  const handleCreateNewConversation = async () => {
    if (!newConversationTitle.trim()) return;
    
    try {
      const newConversation = await apiService.current.createConversation({
        title: newConversationTitle,
        messages: []
      });
      
      setConversations(prev => [...prev, newConversation]);
      setSelectedConversationId(newConversation.id);
      setNewConversationTitle('');
      setIsNewConversationDialogOpen(false);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await apiService.current.deleteConversation(conversationId);
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const selectedConversation = conversations.find(conv => conv.id === selectedConversationId);

  // Get filtered suggestions based on current command
  const getFilteredSuggestions = () => {
    if (!command.trim()) return sampleCommands;
    return sampleCommands.filter(cmd => 
      cmd.toLowerCase().includes(command.toLowerCase())
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* New Conversation Dialog */}
      <Dialog open={isNewConversationDialogOpen} onOpenChange={setIsNewConversationDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Conversation</DialogTitle>
            <DialogDescription>
              Start a new conversation to organize your commands and responses.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                placeholder="Enter conversation title..."
                className="col-span-3"
                value={newConversationTitle}
                onChange={(e) => setNewConversationTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateNewConversation();
                  }
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsNewConversationDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewConversation}
              disabled={!newConversationTitle.trim()}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Command Center
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {agents.filter(a => a.status === 'processing').length} Active
              </Badge>
              <Badge variant="outline">
                {tasks.filter(t => t.status === 'pending').length} Pending
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewConversationDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col min-h-0">
          {/* Conversation List */}
          <div className="flex gap-4 h-full">
            <div className="w-64 border-r pr-4">
              <h3 className="font-medium mb-3">Conversations</h3>
              
              {error && (
                <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                  {error}
                </div>
              )}
              
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {isLoadingConversations ? (
                    <div className="flex items-center justify-center py-8">
                      <RotateCw className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading conversations...</span>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No conversations yet</p>
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`group p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedConversationId === conversation.id
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => handleSelectConversation(conversation.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">
                              {conversation.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {conversation.messages.length} messages
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteConversation(conversation.id, e)}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
            
            {/* Messages */}
            <div className="flex-1 flex flex-col min-h-0">
              {selectedConversation ? (
                <ScrollArea className="flex-1">
                  <div className="space-y-4">
                    {selectedConversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {message.role === 'user' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                            <span className="text-xs font-medium">
                              {message.role === 'user' ? 'You' : 'System'}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className="text-xs opacity-70 mt-2">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {isProcessing && (
                      <div className="flex justify-start">
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <RotateCw className="h-4 w-4 animate-spin" />
                            <p className="text-sm">Processing your command...</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center max-w-md">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium mb-2">No conversation selected</h3>
                    <p className="text-sm mb-6">Select a conversation or create a new one to start</p>
                    
                    <div className="text-left space-y-2">
                      <h4 className="text-sm font-medium mb-3">Sample commands you can try:</h4>
                      {sampleCommands.map((cmd, index) => (
                        <div key={index} className="text-xs p-2 bg-muted rounded border-l-2 border-primary/20">
                          {cmd}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        
        {/* Command Input */}
        <CardFooter className="border-t p-4">
          <form 
            className="flex items-end w-full gap-2" 
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitCommand();
            }}
          >
            <div className="flex-1 relative">
              <Textarea 
                ref={commandInputRef}
                placeholder="Enter a command for the AI system... (⌘+K to focus)"
                value={command}
                onChange={(e) => {
                  setCommand(e.target.value);
                  setShowSuggestions(e.target.value.length > 0);
                }}
                className="resize-none min-h-[60px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitCommand();
                  }
                }}
                onFocus={() => setShowSuggestions(command.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              
              {/* Command Suggestions */}
              {showSuggestions && getFilteredSuggestions().length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                  {getFilteredSuggestions().map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                      onClick={() => {
                        setCommand(suggestion);
                        setShowSuggestions(false);
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button 
              type="submit" 
              disabled={isProcessing || !command.trim()} 
              className="h-10"
            >
              <SendHorizontal className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}

// Helper for generating a conversation title
function generateConversationTitle(command: string): string {
  if (command.length <= 30) return command;
  return command.substring(0, 27) + '...';
}

// Sample commands for the empty state
const sampleCommands = [
  "Create a code generation agent",
  "Monitor system resources",
  "Optimize performance based on current hardware",
  "Implement hierarchical reasoning for complex problems",
  "Analyze current system performance",
  "Create a task management workflow",
  "Set up automated testing pipeline",
  "Configure model parameters for better accuracy",
  "Generate a system health report",
  "Create a backup of current configuration"
];

// Types for the component
interface Conversation {
  id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: Date;
}

interface ConversationMessage {
  id: string;
  content: string;
  timestamp: Date;
  role: 'user' | 'system';
}