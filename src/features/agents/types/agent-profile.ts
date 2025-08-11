export interface AgentProfile {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  avatar?: string;
  status: 'active' | 'inactive' | 'offline';
  roles: string[];
  metadata: Record<string, unknown>;
}