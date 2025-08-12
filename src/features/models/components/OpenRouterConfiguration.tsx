import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Settings, 
  Key, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { OpenRouterServiceWithKeyRotation } from '@/features/models/services/OpenRouterKeyManager';
import { useSystemStore } from '@/store/system-store';
import { ModelProvider } from '@/types/agent-types';

interface OpenRouterConfigurationProps {
  service: OpenRouterServiceWithKeyRotation;
}

export function OpenRouterConfiguration({ service }: OpenRouterConfigurationProps) {
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [newApiKey, setNewApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{key: string, success: boolean, message: string}[]>([]);
  const [showKeys, setShowKeys] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { updateModelConfig } = useSystemStore();

  // Load saved API keys from localStorage
  useEffect(() => {
    const savedKeys = localStorage.getItem('openrouter-api-keys');
    if (savedKeys) {
      try {
        const keys = JSON.parse(savedKeys);
        setApiKeys(keys);
        service.updateApiKeys(keys);
      } catch (error) {
        console.error('Failed to load API keys:', error);
      }
    }
  }, []);

  // Save API keys to localStorage when they change
  useEffect(() => {
    if (apiKeys.length > 0) {
      localStorage.setItem('openrouter-api-keys', JSON.stringify(apiKeys));
      service.updateApiKeys(apiKeys);
    } else {
      localStorage.removeItem('openrouter-api-keys');
    }
  }, [apiKeys]);

  const handleAddApiKey = () => {
    if (!newApiKey.trim()) return;
    
    if (apiKeys.includes(newApiKey.trim())) {
      setError('This API key is already added');
      return;
    }
    
    setApiKeys(prev => [...prev, newApiKey.trim()]);
    setNewApiKey('');
    setError(null);
    setSuccess(`API key added successfully`);
  };

  const handleRemoveApiKey = (keyToRemove: string) => {
    setApiKeys(prev => prev.filter(key => key !== keyToRemove));
    setSuccess(`API key removed successfully`);
  };

  const handleTestAllKeys = async () => {
    setIsTesting(true);
    setTestResults([]);
    
    const results = [];
    
    for (const key of apiKeys) {
      try {
        // Temporarily set this key as the current one for testing
        const originalKeys = [...apiKeys];
        service.updateApiKeys([key]);
        
        const success = await service.testConnection();
        results.push({
          key: key.substring(0, 8) + '...',
          success,
          message: success ? 'Connection successful' : 'Connection failed'
        });
        
        // Restore original keys
        service.updateApiKeys(originalKeys);
        
      } catch (error) {
        results.push({
          key: key.substring(0, 8) + '...',
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setTestResults(results);
    setIsTesting(false);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setSuccess('API key copied to clipboard');
  };

  const handleClearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const keyStats = service.getKeyManager().getKeyStats();

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="keys" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                OpenRouter API Keys
              </CardTitle>
              <CardDescription>
                Add your OpenRouter API keys for automatic rotation when rate limits are encountered.
                The system will automatically switch to the next available key when receiving a 429 error.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new API key */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="new-api-key">New API Key</Label>
                  <Input
                    id="new-api-key"
                    type={showKeys ? "text" : "password"}
                    placeholder="sk-or-..."
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowKeys(!showKeys)}
                  >
                    {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    onClick={handleAddApiKey}
                    disabled={!newApiKey.trim()}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Current API keys */}
              {apiKeys.length > 0 && (
                <div className="space-y-2">
                  <Label>Current API Keys</Label>
                  <div className="space-y-2">
                    {apiKeys.map((key, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            Key {index + 1}
                          </Badge>
                          <span className="font-mono text-sm truncate">
                            {showKeys ? key : key.substring(0, 8) + '•'.repeat(key.length - 8)}
                          </span>
                          {index === 0 && (
                            <Badge variant="outline" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyKey(key)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveApiKey(key)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {apiKeys.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No API keys configured</p>
                  <p className="text-sm">Add your OpenRouter API keys to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Key Statistics
              </CardTitle>
              <CardDescription>
                Monitor the usage and availability of your API keys.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {keyStats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={stat.isCurrent ? "default" : "secondary"}>
                        {stat.key}
                      </Badge>
                      {stat.isCurrent && (
                        <Badge variant="outline" className="text-xs">
                          Current
                        </Badge>
                      )}
                      {!stat.isAvailable && (
                        <Badge variant="destructive" className="text-xs">
                          Rate Limited
                        </Badge>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <div>Requests: {stat.requests}</div>
                      <div className="text-muted-foreground">
                        Tokens: {stat.totalTokens.toLocaleString()}
                      </div>
                      <div className="text-muted-foreground">
                        Last used: {stat.lastUsed.toLocaleTimeString()}
                      </div>
                      {stat.rateLimitedUntil && (
                        <div className="text-orange-600 text-xs">
                          Available: {stat.rateLimitedUntil.toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {keyStats.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No API keys configured</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Connection Testing
              </CardTitle>
              <CardDescription>
                Test connections to your OpenRouter API keys to ensure they're working properly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={handleTestAllKeys}
                  disabled={isTesting || apiKeys.length === 0}
                  className="flex-1"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Test All Keys
                    </>
                  )}
                </Button>
              </div>

              {/* Test results */}
              {testResults.length > 0 && (
                <div className="space-y-2">
                  <Label>Test Results</Label>
                  <div className="space-y-2">
                    {testResults.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-mono text-sm">{result.key}</span>
                        </div>
                        <span className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                          {result.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {apiKeys.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No API keys to test</p>
                  <p className="text-sm">Add your API keys first</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Clear messages button */}
      {(error || success) && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={handleClearMessages}>
            Clear Messages
          </Button>
        </div>
      )}
    </div>
  );
}