import { v4 as uuidv4 } from 'uuid';
import { 
  AuditEvent, 
  AuditTrailConfig, 
  AuditCategory, 
  AuditEventType, 
  AuditSeverity 
} from '@/types/agent-types';

/**
 * Audit Trail Service
 * 
 * Provides comprehensive logging and tracking of all system activities,
 * changes, and events for security, debugging, and compliance purposes.
 */
export class AuditTrailService {
  private events: AuditEvent[] = [];
  private config: AuditTrailConfig;
  private sequenceNumber = 0;
  private eventHandlers: Map<string, (event: AuditEvent) => void> = new Map();
  private isInitialized = false;

  constructor(config: Partial<AuditTrailConfig> = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableFileLogging: false,
      enableRealTimeReporting: true,
      maxEvents: 10000,
      sensitiveDataMasking: true,
      logLevel: 'info',
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      ...config
    };
  }

  /**
   * Initialize the audit trail service
   */
  async initialize(): Promise<void> {
    try {
      // Load existing events from storage if available
      await this.loadEvents();
      
      // Start cleanup routine
      this.startCleanupRoutine();
      
      // Log initialization event
      await this.logEvent({
        category: 'system',
        eventType: 'startup',
        severity: 'info',
        message: 'Audit trail service initialized',
        metadata: {
          config: this.config,
          timestamp: new Date().toISOString()
        }
      });
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audit trail service:', error);
      throw error;
    }
  }

  /**
   * Log an audit event
   */
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp' | 'sequenceNumber'>): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Validate event
    this.validateEvent(event);

    // Create audit event
    const auditEvent: AuditEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      sequenceNumber: ++this.sequenceNumber,
      ...event
    };

    // Mask sensitive data if enabled
    if (this.config.sensitiveDataMasking) {
      auditEvent.metadata = this.maskSensitiveData(auditEvent.metadata);
    }

    // Add to events array
    this.events.push(auditEvent);

    // Enforce max events limit
    if (this.events.length > this.config.maxEvents) {
      this.events.shift();
    }

    // Log to console if enabled
    if (this.config.enableConsoleLogging) {
      this.logToConsole(auditEvent);
    }

    // Emit event to handlers
    this.emitEvent(auditEvent);

    // Persist event if file logging is enabled
    if (this.config.enableFileLogging) {
      await this.persistEvent(auditEvent);
    }

    return auditEvent.id;
  }

  /**
   * Log multiple events in batch
   */
  async logEvents(events: Omit<AuditEvent, 'id' | 'timestamp' | 'sequenceNumber'>[]): Promise<string[]> {
    const eventIds: string[] = [];
    
    for (const event of events) {
      const eventId = await this.logEvent(event);
      eventIds.push(eventId);
    }
    
    return eventIds;
  }

  /**
   * Get events by category
   */
  getEventsByCategory(category: AuditCategory, limit?: number): AuditEvent[] {
    let filtered = this.events.filter(event => event.category === category);
    
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(severity: AuditSeverity, limit?: number): AuditEvent[] {
    let filtered = this.events.filter(event => event.severity === severity);
    
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get events by time range
   */
  getEventsByTimeRange(startTime: Date, endTime: Date): AuditEvent[] {
    return this.events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: AuditEventType, limit?: number): AuditEvent[] {
    let filtered = this.events.filter(event => event.eventType === eventType);
    
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Search events by message or metadata
   */
  searchEvents(query: string, limit?: number): AuditEvent[] {
    const lowerQuery = query.toLowerCase();
    let filtered = this.events.filter(event => 
      event.message.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(event.metadata || {}).toLowerCase().includes(lowerQuery)
    );
    
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get all events
   */
  getAllEvents(limit?: number): AuditEvent[] {
    let events = [...this.events];
    
    if (limit) {
      events = events.slice(-limit);
    }
    
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get event statistics
   */
  getEventStatistics(): {
    totalEvents: number;
    eventsByCategory: Map<AuditCategory, number>;
    eventsBySeverity: Map<AuditSeverity, number>;
    eventsByType: Map<AuditEventType, number>;
    recentEvents: AuditEvent[];
  } {
    const eventsByCategory = new Map<AuditCategory, number>();
    const eventsBySeverity = new Map<AuditSeverity, number>();
    const eventsByType = new Map<AuditEventType, number>();

    this.events.forEach(event => {
      // Count by category
      eventsByCategory.set(
        event.category, 
        (eventsByCategory.get(event.category) || 0) + 1
      );
      
      // Count by severity
      eventsBySeverity.set(
        event.severity, 
        (eventsBySeverity.get(event.severity) || 0) + 1
      );
      
      // Count by type
      eventsByType.set(
        event.eventType, 
        (eventsByType.get(event.eventType) || 0) + 1
      );
    });

    return {
      totalEvents: this.events.length,
      eventsByCategory,
      eventsBySeverity,
      eventsByType,
      recentEvents: this.events.slice(-10)
    };
  }

  /**
   * Clear old events based on retention policy
   */
  async cleanupOldEvents(): Promise<void> {
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);
    const initialLength = this.events.length;
    
    this.events = this.events.filter(event => event.timestamp > cutoffTime);
    
    const removedCount = initialLength - this.events.length;
    
    if (removedCount > 0) {
      await this.logEvent({
        category: 'system',
        eventType: 'modified',
        severity: 'info',
        message: `Cleaned up ${removedCount} old audit events`,
        metadata: {
          cutoffTime,
          removedCount,
          remainingEvents: this.events.length
        }
      });
    }
  }

  /**
   * Export events to JSON
   */
  exportEvents(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.events, null, 2);
    } else {
      // CSV format
      const headers = [
        'id', 'timestamp', 'sequenceNumber', 'category', 'eventType', 
        'severity', 'message'
      ];
      
      const rows = this.events.map(event => [
        event.id,
        event.timestamp.toISOString(),
        event.sequenceNumber,
        event.category,
        event.eventType,
        event.severity,
        `"${event.message.replace(/"/g, '""')}"`
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }

  /**
   * Add event handler
   */
  addEventHandler(eventType: string, handler: (event: AuditEvent) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, [] as any[]);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Remove event handler
   */
  removeEventHandler(eventType: string, handler: (event: AuditEvent) => void): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = (handlers as any[]).indexOf(handler);
      if (index > -1) {
        (handlers as any[]).splice(index, 1);
      }
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    isInitialized: boolean;
    totalEvents: number;
    config: AuditTrailConfig;
    lastCleanup?: Date;
  } {
    return {
      isInitialized: this.isInitialized,
      totalEvents: this.events.length,
      config: this.config
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AuditTrailConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    this.logEvent({
      category: 'configuration',
      eventType: 'modified',
      severity: 'info',
      message: 'Audit trail configuration updated',
      metadata: { newConfig }
    });
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    await this.logEvent({
      category: 'system',
      eventType: 'stopped',
      severity: 'info',
      message: 'Audit trail service shutdown'
    });
    
    this.eventHandlers.clear();
    this.isInitialized = false;
  }

  // Private methods

  private validateEvent(event: Omit<AuditEvent, 'id' | 'timestamp' | 'sequenceNumber'>): void {
    if (!event.category || !event.eventType || !event.severity || !event.message) {
      throw new Error('Invalid audit event: missing required fields');
    }
  }

  private maskSensitiveData(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key/i,
      /credential/i,
      /auth/i
    ];

    const masked = { ...metadata };

    Object.keys(masked).forEach(key => {
      if (sensitivePatterns.some(pattern => pattern.test(key))) {
        if (typeof masked[key] === 'string') {
          masked[key] = '***MASKED***';
        } else if (typeof masked[key] === 'object') {
          masked[key] = { ...masked[key], value: '***MASKED***' };
        }
      }
    });

    return masked;
  }

  private logToConsole(event: AuditEvent): void {
    if (this.shouldLogEvent(event)) {
      const logMethod = this.getLogMethod(event.severity);
      logMethod(`[${event.category.toUpperCase()}] ${event.message}`, {
        eventId: event.id,
        timestamp: event.timestamp.toISOString(),
        severity: event.severity,
        metadata: event.metadata
      });
    }
  }

  private shouldLogEvent(event: AuditEvent): boolean {
    const severityLevels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = severityLevels.indexOf(this.config.logLevel);
    const eventLevelIndex = severityLevels.indexOf(event.severity);
    
    return eventLevelIndex >= currentLevelIndex;
  }

  private getLogMethod(severity: AuditSeverity): Console['log'] | Console['warn'] | Console['error'] {
    switch (severity) {
      case 'debug':
      case 'info':
        return console.log;
      case 'warning':
        return console.warn;
      case 'error':
      case 'critical':
        return console.error;
      default:
        return console.log;
    }
  }

  private emitEvent(event: AuditEvent): void {
    // Emit to all handlers
    for (const handlers of this.eventHandlers.values()) {
      for (const handler of handlers as any[]) {
        try {
          (handler as (event: AuditEvent) => void)(event);
        } catch (error) {
          console.error('Error in audit event handler:', error);
        }
      }
    }
  }

  private async persistEvent(event: AuditEvent): Promise<void> {
    // In a real implementation, this would save to a file or database
    // For now, we'll just log it
    console.log('[Audit File Log]', JSON.stringify(event));
  }

  private async loadEvents(): Promise<void> {
    // In a real implementation, this would load from storage
    // For now, we'll start with an empty array
    this.events = [];
  }

  private startCleanupRoutine(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupOldEvents().catch(error => {
        console.error('Error during audit trail cleanup:', error);
      });
    }, 60 * 60 * 1000);
  }
}