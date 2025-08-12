import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  Trash2,
  RefreshCw,
  Shield,
  Database,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Info,
  AlertCircle,
  Filter as FilterIcon,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  User,
  Server,
  MessageSquare,
  Zap
} from 'lucide-react';
import { AuditTrailService } from '@/features/system/services/AuditTrailService';
import {
  AuditEvent,
  AuditCategory,
  AuditSeverity,
  AuditEventType
} from '@/types/agent-types';
import { useSystemStore } from '@/store/system-store';

interface AuditTrailDashboardProps {
  auditService?: AuditTrailService;
}

export const AuditTrailDashboard: React.FC<AuditTrailDashboardProps> = ({
  auditService = new AuditTrailService()
}) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AuditEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AuditCategory | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<AuditSeverity | 'all'>('all');
  const [selectedEventType, setSelectedEventType] = useState<AuditEventType | 'all'>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const { systemStatus } = useSystemStore.getState();

  // Initialize audit service
  useEffect(() => {
    const initializeAuditService = async () => {
      try {
        await auditService.initialize();
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize audit service:', error);
        setIsLoading(false);
      }
    };

    initializeAuditService();
  }, [auditService]);

  // Load events and stats
  useEffect(() => {
    const loadData = () => {
      const allEvents = auditService.getAuditEvents();
      setEvents(allEvents);
      setStats(auditService.getAuditStatistics());
    };

    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [auditService]);

  // Apply filters
  useEffect(() => {
    let filtered = [...events];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(event => event.category === selectedCategory);
    }

    // Severity filter
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(event => event.severity === selectedSeverity);
    }

    // Event type filter
    if (selectedEventType !== 'all') {
      filtered = filtered.filter(event => event.eventType === selectedEventType);
    }

    // Date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      filtered = filtered.filter(event => event.timestamp >= startDate);
    }

    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(event => event.timestamp <= endDate);
    }

    setFilteredEvents(filtered);
  }, [events, searchTerm, selectedCategory, selectedSeverity, selectedEventType, dateRange]);

  const handleExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      const filters = {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
        eventType: selectedEventType !== 'all' ? selectedEventType : undefined,
        startDate: dateRange.start ? new Date(dateRange.start) : undefined,
        endDate: dateRange.end ? new Date(dateRange.end) : undefined
      };

      const data = auditService.exportAuditTrail(format, filters);
      
      // Create download
      const blob = new Blob([data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedSeverity('all');
    setSelectedEventType('all');
    setDateRange({ start: '', end: '' });
  };

  const getSeverityColor = (severity: AuditSeverity) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'default';
      case 'debug': return 'outline';
      default: return 'outline';
    }
  };

  const getCategoryIcon = (category: AuditCategory) => {
    switch (category) {
      case 'agent': return <User className="h-4 w-4" />;
      case 'task': return <FileText className="h-4 w-4" />;
      case 'system': return <Server className="h-4 w-4" />;
      case 'configuration': return <FileText className="h-4 w-4" />;
      case 'model': return <Zap className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      case 'performance': return <BarChart3 className="h-4 w-4" />;
      case 'communication': return <MessageSquare className="h-4 w-4" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityIcon = (severity: AuditSeverity) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      case 'debug': return <Info className="h-4 w-4 text-gray-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading audit trail...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Trail</h1>
          <p className="text-muted-foreground">
            Monitor and analyze system activities with comprehensive audit logging
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={stats?.systemHealth === 'excellent' ? 'default' : 'secondary'}>
            {stats?.totalEvents || 0} events
          </Badge>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FilterIcon className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Filter Audit Events</DialogTitle>
                <DialogDescription>
                  Apply filters to narrow down audit events
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Search</label>
                  <Input
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as AuditCategory | 'all')}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="configuration">Configuration</SelectItem>
                        <SelectItem value="model">Model</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="communication">Communication</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Severity</label>
                    <Select value={selectedSeverity} onValueChange={(value) => setSelectedSeverity(value as AuditSeverity | 'all')}>
                      <SelectTrigger>
                        <SelectValue placeholder="All severities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="debug">Debug</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                  <Button onClick={() => handleExport('json')} disabled={isExporting}>
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button onClick={() => handleExport('csv')} disabled={isExporting}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                Since {stats.oldestEvent?.toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {stats.eventsBySeverity.get('critical') || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Categories</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.eventsByCategory.size}</div>
              <p className="text-xs text-muted-foreground">
                Different event types
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.recentEvents.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 5 minutes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Event List */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Events</CardTitle>
          <CardDescription>
            Showing {filteredEvents.length} of {events.length} events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredEvents.map((event) => (
              <Collapsible key={event.id}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-center space-x-3">
                      {getCategoryIcon(event.category)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{event.message}</span>
                          <Badge variant={getSeverityColor(event.severity)}>
                            {event.severity}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.category} • {event.eventType} • {event.timestamp.toLocaleString()}
                        </div>
                      </div>
                      {getSeverityIcon(event.severity)}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Event ID:</span> {event.id}
                        </div>
                        <div>
                          <span className="font-medium">Sequence:</span> {event.sequenceNumber}
                        </div>
                        <div>
                          <span className="font-medium">Category:</span> {event.category}
                        </div>
                        <div>
                          <span className="font-medium">Type:</span> {event.eventType}
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">Timestamp:</span> {event.timestamp.toISOString()}
                        </div>
                      </div>
                      
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Metadata:</h4>
                          <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
            
            {filteredEvents.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No audit events found matching your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};