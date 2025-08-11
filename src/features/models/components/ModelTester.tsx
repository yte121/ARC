import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ModelManager } from '../services/ModelManager';
import { useSystemStore } from '@/store/system-store';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

/**
 * ModelTester Component
 * 
 * Allows testing model responses with the current configuration
 */
export function ModelTester() {
  const { activeModelConfig } = useSystemStore();
  const { toast } = useToast();
  
  const [modelManager] = useState<ModelManager>(() => new ModelManager());
  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [response, setResponse] = useState<ModelTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('request');
  
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };
  
  const handleTest = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Empty prompt',
        description: 'Please enter a prompt to test',
        variant: 'destructive'
      });
      return;
    }
    
    setIsGenerating(true);
    setResponse(null);
    setError(null);
    setActiveTab('response');
    
    const startTime = performance.now();
    
    try {
      const modelResponse = await modelManager.generateResponse(prompt);
      
      const endTime = performance.now();
      
      setResponse({
        text: modelResponse.text,
        model: modelResponse.modelName,
        promptTokens: modelResponse.promptTokens,
        completionTokens: modelResponse.completionTokens,
        totalTokens: modelResponse.totalTokens,
        timeMs: endTime - startTime
      });
    } catch (err) {
      console.error('Model test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      toast({
        title: 'Error generating response',
        description: err instanceof Error ? err.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Model Testing</CardTitle>
        <CardDescription>
          Test the configured model with custom prompts
        </CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="request" className="m-0">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Test Prompt</span>
                  <Badge variant="outline">
                    {activeModelConfig.provider}/{activeModelConfig.modelName}
                  </Badge>
                </div>
                <Textarea
                  placeholder="Enter a prompt to test the AI model..."
                  value={prompt}
                  onChange={handlePromptChange}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </CardContent>
        </TabsContent>
        
        <TabsContent value="response" className="m-0">
          <CardContent className="pt-6">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Generating response...</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md text-sm">
                <p className="font-semibold text-red-800 dark:text-red-400 mb-1">Error</p>
                <p className="font-mono text-red-700 dark:text-red-300">{error}</p>
              </div>
            ) : response ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-md">
                  <p className="font-mono text-sm whitespace-pre-wrap">{response.text}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="text-muted-foreground">Model</p>
                    <p className="font-semibold">{response.model}</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="text-muted-foreground">Time</p>
                    <p className="font-semibold">{response.timeMs.toFixed(0)} ms</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="text-muted-foreground">Prompt Tokens</p>
                    <p className="font-semibold">{response.promptTokens}</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="text-muted-foreground">Completion Tokens</p>
                    <p className="font-semibold">{response.completionTokens}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">
                  No response generated yet. Enter a prompt and click "Test Model" to see results.
                </p>
              </div>
            )}
          </CardContent>
        </TabsContent>
      </Tabs>
      
      <CardFooter className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setActiveTab('request')}>
          Edit Request
        </Button>
        <Button onClick={handleTest} disabled={isGenerating || !prompt.trim()}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : 'Test Model'}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface ModelTestResponse {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timeMs: number;
}