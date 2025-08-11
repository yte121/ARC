import { useState, useEffect, useRef, useMemo } from 'react';
import { useSystemStore } from '@/store/system-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Agent, AgentMessage, MessageType, MessagePriority } from '@/types/agent-types';
import { Network, MessageSquare, ArrowRight, Radio, Zap } from 'lucide-react';
import * as d3 from 'd3';

/**
 * CommunicationVisualizer Component
 * 
 * Visualizes communication between agents in the system using D3.js.
 * Shows message flow, patterns, and connection strength.
 */
export function CommunicationVisualizer() {
  const [filter, setFilter] = useState<'all' | MessageType>('all');
  const [activeTab, setActiveTab] = useState<string>('network');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showRealtime, setShowRealtime] = useState<boolean>(true);
  const networkRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const { agents, messages } = useSystemStore();
  
  // Filter messages based on selected filter
  const filteredMessages = useMemo(() => {
    let filtered = [...messages];
    
    if (filter !== 'all') {
      filtered = filtered.filter(m => m.type === filter);
    }
    
    if (selectedAgent) {
      filtered = filtered.filter(m => 
        m.fromAgentId === selectedAgent || 
        m.toAgentId === selectedAgent
      );
    }
    
    return filtered;
  }, [messages, filter, selectedAgent]);
  
  // Calculate message counts between agents for visualization
  const agentConnections = useMemo(() => {
    const connections: Record<string, Record<string, number>> = {};
    
    messages.forEach(message => {
      const from = message.fromAgentId;
      const to = message.toAgentId || 'broadcast';
      
      if (!connections[from]) {
        connections[from] = {};
      }
      
      if (!connections[from][to]) {
        connections[from][to] = 0;
      }
      
      connections[from][to]++;
    });
    
    return connections;
  }, [messages]);

  // D3.js Network Visualization
  useEffect(() => {
    if (!networkRef.current || !svgRef.current || activeTab !== 'network') return;
    
    const container = networkRef.current;
    const svg = d3.select(svgRef.current);
    
    // Clear previous visualization
    svg.selectAll('*').remove();
    
    // Set up dimensions
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    
    // Create SVG
    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Prepare data for visualization
    const nodes: any[] = [];
    const links: any[] = [];
    
    // Add agent nodes
    const agentsToShow = selectedAgent ? 
      [
        ...agents.filter(a => a.id === selectedAgent),
        ...agents.filter(a => {
          const connections = agentConnections[selectedAgent] || {};
          const incomingConnections = Object.entries(agentConnections)
            .some(([id, conns]) => id !== selectedAgent && conns[selectedAgent]);
          return connections[a.id] || incomingConnections;
        })
      ] : 
      agents;
    
    agentsToShow.forEach(agent => {
      nodes.push({
        id: agent.id,
        name: agent.name,
        specialization: agent.specialization,
        status: agent.status,
        tier: agent.tier,
        type: 'agent'
      });
    });
    
    // Add broadcast node if there are broadcast messages
    const hasBroadcastMessages = Object.values(agentConnections).some(conns => conns['broadcast']);
    if (hasBroadcastMessages) {
      nodes.push({
        id: 'broadcast',
        name: 'Broadcast',
        specialization: 'broadcast',
        status: 'active',
        tier: 'system',
        type: 'broadcast'
      });
    }
    
    // Add links between agents
    Object.entries(agentConnections).forEach(([fromId, connections]) => {
      if (!agentsToShow.some(a => a.id === fromId)) return;
      
      Object.entries(connections).forEach(([toId, count]) => {
        if (toId === 'broadcast' && !hasBroadcastMessages) return;
        if (!agentsToShow.some(a => a.id === toId) && toId !== 'broadcast') return;
        
        // Skip if not related to selected agent when filtering
        if (selectedAgent && fromId !== selectedAgent && toId !== selectedAgent) return;
        
        links.push({
          source: fromId,
          target: toId,
          value: count,
          type: toId === 'broadcast' ? 'broadcast' : 'direct'
        });
      });
    });
    
    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));
    
    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', (d: any) => d.type === 'broadcast' ? '#f59e0b' : '#6b7280')
      .attr('stroke-width', (d: any) => Math.min(d.value * 2, 8))
      .attr('stroke-opacity', 0.6);
    
    // Create nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', (d: any) => d.type === 'broadcast' ? 15 : 20)
      .attr('fill', (d: any) => {
        if (d.type === 'broadcast') return '#f59e0b';
        if (d.id === selectedAgent) return '#3b82f6';
        switch (d.status) {
          case 'processing': return '#10b981';
          case 'idle': return '#6b7280';
          case 'failed': return '#ef4444';
          default: return '#8b5cf6';
        }
      })
      .attr('stroke', (d: any) => d.id === selectedAgent ? '#1d4ed8' : '#374151')
      .attr('stroke-width', (d: any) => d.id === selectedAgent ? 3 : 2)
      .style('cursor', 'pointer')
      .on('click', (event, d: any) => {
        setSelectedAgent(d.id === selectedAgent ? null : d.id);
      })
      .on('mouseover', function(event, d: any) {
        d3.select(this).attr('r', (d: any) => (d.type === 'broadcast' ? 18 : 25));
        
        // Show tooltip
        const tooltip = d3.select('body').append('div')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', '1000');
        
        tooltip.html(`
          <strong>${d.name}</strong><br/>
          Specialization: ${d.specialization}<br/>
          Status: ${d.status}<br/>
          Tier: ${d.tier}
        `);
      })
      .on('mousemove', function(event) {
        d3.select('.tooltip')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', (d: any) => (d.type === 'broadcast' ? 15 : 20));
        d3.select('.tooltip').remove();
      });
    
    // Add labels
    const label = g.append('g')
      .selectAll('text')
      .data(nodes)
      .enter().append('text')
      .text((d: any) => d.name.length > 10 ? d.name.substring(0, 10) + '...' : d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', 35)
      .style('font-size', '12px')
      .style('font-weight', '500')
      .style('fill', '#374151')
      .style('pointer-events', 'none');
    
    // Add link labels for high-value connections
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(links.filter((d: any) => d.value > 5))
      .enter().append('text')
      .text((d: any) => d.value)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#6b7280')
      .style('pointer-events', 'none');
    
    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      
      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);
      
      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
      
      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);
    });
    
    // Cleanup function
    return () => {
      simulation.stop();
      d3.select('.tooltip').remove();
    };
  }, [agents, agentConnections, selectedAgent, activeTab]);
  
  const getMessageIcon = (type: MessageType) => {
    switch (type) {
      case 'command': return <Zap className="h-4 w-4" />;
      case 'response': return <ArrowRight className="h-4 w-4" />;
      case 'notification': return <Radio className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };
  
  const getPriorityColor = (priority: MessagePriority) => {
    switch (priority) {
      case 'critical': return 'text-red-500 border-red-300';
      case 'high': return 'text-orange-500 border-orange-300';
      case 'normal': return 'text-blue-500 border-blue-300';
      case 'low': return 'text-green-500 border-green-300';
      default: return 'text-gray-500 border-gray-300';
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <CardTitle>Communication Visualizer</CardTitle>
              <CardDescription>
                Visualize agent communication patterns and message flow
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="realtime"
                  checked={showRealtime}
                  onCheckedChange={setShowRealtime}
                />
                <Label htmlFor="realtime">Realtime Updates</Label>
              </div>
              
              <Select
                value={filter}
                onValueChange={(value) => setFilter(value as 'all' | MessageType)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Messages</SelectItem>
                  <SelectItem value="command">Commands</SelectItem>
                  <SelectItem value="query">Queries</SelectItem>
                  <SelectItem value="response">Responses</SelectItem>
                  <SelectItem value="notification">Notifications</SelectItem>
                  <SelectItem value="data">Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="network" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList>
              <TabsTrigger value="network">Network View</TabsTrigger>
              <TabsTrigger value="messages">Message Log</TabsTrigger>
              <TabsTrigger value="stats">Communication Stats</TabsTrigger>
            </TabsList>
            
            <TabsContent value="network">
              <div 
                ref={networkRef}
                className="relative h-[400px] border rounded-md bg-card overflow-hidden"
              >
                {agents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Network className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No agents available</p>
                  </div>
                ) : (
                  <svg ref={svgRef} className="w-full h-full"></svg>
                )}
              </div>
              
              {selectedAgent && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Selected Agent Details</h4>
                  {agents.find(a => a.id === selectedAgent) && (
                    <div className="p-3 border rounded-md">
                      <h4 className="font-medium">{agents.find(a => a.id === selectedAgent)?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {agents.find(a => a.id === selectedAgent)?.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{agents.find(a => a.id === selectedAgent)?.specialization}</Badge>
                        <Badge variant="outline">{agents.find(a => a.id === selectedAgent)?.tier}</Badge>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-4 text-xs text-muted-foreground">
                <p>Click on agent nodes to view details and filter connections. The line thickness represents communication frequency.</p>
              </div>
            </TabsContent>
            
            <TabsContent value="messages">
              <ScrollArea className="h-[400px] border rounded-md p-2">
                <div className="space-y-2">
                  {filteredMessages.length > 0 ? (
                    filteredMessages
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 50)
                      .map(message => (
                        <div 
                          key={message.id}
                          className="p-3 border rounded-md"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getMessageIcon(message.type)}
                              <Badge variant="outline" className="capitalize">
                                {message.type}
                              </Badge>
                              <Badge variant="outline" className={getPriorityColor(message.priority)}>
                                {message.priority}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2 text-sm">
                            <span className="font-medium">
                              {agents.find(a => a.id === message.fromAgentId)?.name || message.fromAgentId}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {message.toAgentId 
                                ? agents.find(a => a.id === message.toAgentId)?.name || message.toAgentId
                                : "Broadcast"
                              }
                            </span>
                          </div>
                          
                          <div className="mt-2 text-sm">
                            <pre className="text-xs whitespace-pre-wrap bg-secondary p-2 rounded-md">
                              {typeof message.content === 'string' 
                                ? message.content 
                                : JSON.stringify(message.content, null, 2)
                              }
                            </pre>
                          </div>
                          
                          {message.responseToMessageId && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Response to message: {message.responseToMessageId.substring(0, 8)}...
                            </div>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[300px]">
                      <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No messages found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="stats">
              <div className="border rounded-md p-4">
                <h4 className="text-sm font-medium mb-4">Communication Statistics</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Messages</p>
                    <p className="text-2xl font-bold">{messages.length}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Commands</p>
                    <p className="text-2xl font-bold">
                      {messages.filter(m => m.type === 'command').length}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Responses</p>
                    <p className="text-2xl font-bold">
                      {messages.filter(m => m.type === 'response').length}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Broadcasts</p>
                    <p className="text-2xl font-bold">
                      {messages.filter(m => m.toAgentId === null).length}
                    </p>
                  </div>
                </div>
                
                <h4 className="text-sm font-medium mt-6 mb-3">Agent Communication Volume</h4>
                <div className="space-y-4">
                  {agents.map(agent => {
                    const sentMessages = messages.filter(m => m.fromAgentId === agent.id).length;
                    const receivedMessages = messages.filter(m => m.toAgentId === agent.id).length;
                    const totalMessages = sentMessages + receivedMessages;
                    const maxMessages = Math.max(...agents.map(a => 
                      messages.filter(m => m.fromAgentId === a.id || m.toAgentId === a.id).length
                    ));
                    const percentage = maxMessages > 0 ? (totalMessages / maxMessages) * 100 : 0;
                    
                    return (
                      <div key={agent.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{agent.name}</span>
                          <span className="text-muted-foreground">{totalMessages} messages</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full flex"
                            style={{ width: `${percentage}%` }}
                          >
                            <div 
                              className="h-full bg-green-500" 
                              style={{ width: `${sentMessages / totalMessages * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Sent: {sentMessages}</span>
                          <span>Received: {receivedMessages}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}