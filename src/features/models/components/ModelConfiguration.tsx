import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

import { ModelManager } from '../services/ModelManager';
import { OpenRouterServiceWithKeyRotation } from '../services/OpenRouterKeyManager';
import { OpenRouterConfiguration } from './OpenRouterConfiguration';
import { ModelFailoverManager } from './ModelFailoverManager';
import { ModelProvider } from '@/types/agent-types';
import { useSystemStore } from '@/store/system-store';

/**
 * ModelConfiguration Component
 * 
 * Allows users to configure AI model settings and manage providers.
 */
export function ModelConfiguration() {
  const { activeModelConfig, updateModelConfig } = useSystemStore();
  const { toast } = useToast();
  
  const [modelManager] = useState<ModelManager>(() => new ModelManager());
  const [openRouterService] = useState<OpenRouterServiceWithKeyRotation>(() => new OpenRouterServiceWithKeyRotation());
  const [availableModels, setAvailableModels] = useState<Array<{id: string, name: string, provider: ModelProvider}>>([]);
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider>(
    activeModelConfig.provider
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    activeModelConfig.modelName
  );
  const [temperature, setTemperature] = useState<number>(
    activeModelConfig.temperature
  );
  const [maxTokens, setMaxTokens] = useState<number>(
    activeModelConfig.maxTokens
  );
  const [apiKey, setApiKey] = useState<string>(
    activeModelConfig.apiKey || ''
  );
  const [isTestingModel, setIsTestingModel] = useState(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [enableFailover, setEnableFailover] = useState(true);

  // Load available models on component mount
  useEffect(() => {
    async function loadModels() {
      try {
        const models = await modelManager.getAvailableModels(selectedProvider);
        const modelOptions = models.map(modelName => ({
          id: modelName,
          name: modelName,
          provider: selectedProvider
        }));
        setAvailableModels(modelOptions);
      } catch (error) {
        console.error('Error loading models:', error);
        toast({
          title: 'Error loading models',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive'
        });
      }
    }
    
    loadModels();
  }, [modelManager, toast]);

  // Filter models by selected provider
  const filteredModels = availableModels.filter(
    model => model.provider === selectedProvider
  );

  // Handle provider change
  const handleProviderChange = (value: string) => {
    const provider = value as ModelProvider;
    setSelectedProvider(provider);
    
    // Select the first available model for this provider
    const modelsForProvider = availableModels.filter(m => m.provider === provider);
    if (modelsForProvider.length > 0) {
      setSelectedModel(modelsForProvider[0].id);
    }
  };

  // Handle model change
  const handleModelChange = (value: string) => {
    setSelectedModel(value);
  };

  // Save configuration
  const handleSaveConfig = () => {
    updateModelConfig({
      provider: selectedProvider,
      modelName: selectedModel,
      temperature,
      maxTokens,
      apiKey: apiKey || undefined
    });
    
    toast({
      title: 'Configuration saved',
      description: `Using ${selectedProvider} model: ${selectedModel}`,
    });
  };

  // Test the current model configuration
  const handleTestModel = async () => {
    setIsTestingModel(true);
    setTestResponse(null);
    
    try {
      const response = await modelManager.generateResponse(
        'Test prompt: Please provide a brief response to test the model configuration.',
        selectedModel,
        temperature,
        maxTokens
      );
      
      setTestResponse(response.text);
      toast({
        title: 'Model test successful',
        description: `Generated ${response.completionTokens} tokens in ${response.latency.toFixed(0)}ms`,
      });
    } catch (error) {
      console.error('Model test failed:', error);
      setTestResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: 'Model test failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsTestingModel(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Model Configuration</CardTitle>
          <CardDescription>
            Configure model providers, settings, and failover options
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Model Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">Model Provider</Label>
            <Select
              value={selectedProvider}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local Models</SelectItem>
                <SelectItem value="openrouter">OpenRouter (400+ Models)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select
              value={selectedModel}
              onValueChange={handleModelChange}
            >
              <SelectTrigger id="model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {filteredModels.length > 0 ? (
                  filteredModels.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No models available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="temperature">Temperature: {temperature.toFixed(2)}</Label>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={1}
              step={0.01}
              value={[temperature]}
              onValueChange={(values) => setTemperature(values[0])}
            />
            <p className="text-xs text-muted-foreground">
              Lower values produce more predictable outputs, higher values more creative
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <Label htmlFor="maxTokens">Max Tokens: {maxTokens}</Label>
            <Slider
              id="maxTokens"
              min={100}
              max={4000}
              step={100}
              value={[maxTokens]}
              onValueChange={(values) => setMaxTokens(values[0])}
            />
          </div>

          {/* Failover Settings */}
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="failover"
              checked={enableFailover}
              onCheckedChange={setEnableFailover}
            />
            <Label htmlFor="failover">Enable automatic model failover</Label>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="failover">Failover Manager</TabsTrigger>
          {selectedProvider === 'openrouter' && (
            <TabsTrigger value="openrouter">OpenRouter Keys</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardFooter className="flex flex-col space-y-4">
              {/* Test response display */}
              {testResponse && (
                <div className="w-full p-4 bg-muted rounded-md text-sm font-mono">
                  {testResponse}
                </div>
              )}
              
              <div className="flex w-full justify-between">
                <Button
                  variant="outline"
                  onClick={handleTestModel}
                  disabled={isTestingModel}
                >
                  {isTestingModel ? 'Testing...' : 'Test Model'}
                </Button>
                <Button onClick={handleSaveConfig}>
                  Save Configuration
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="failover" className="space-y-4">
          <ModelFailoverManager modelManager={modelManager} />
        </TabsContent>

        {selectedProvider === 'openrouter' && (
          <TabsContent value="openrouter">
            <OpenRouterConfiguration service={openRouterService} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}