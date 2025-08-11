export interface AgentDirectoryEntry {
  id: string;
  profileId: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'offline';
  lastSeen: Date;
  capabilities: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}