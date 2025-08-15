
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Sparkles, Loader2 } from 'lucide-react';

const ToyReplica = () => {
  const [sourceUrl, setSourceUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!sourceUrl.trim()) {
      toast({
        title: "Missing Source",
        description: "Please provide a source URL or description",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-toy-replica', {
        body: {
          sourceUrl: sourceUrl.trim(),
          prompt: prompt.trim() || 'Generate a toy replica of this item'
        }
      });

      if (error) {
        console.error('Toy Replica generation failed:', error);
        toast({
          title: "Generation Failed",
          description: error.message || "Failed to generate toy replica",
          variant: "destructive"
        });
        return;
      }

      if (data?.result_url) {
        setResult(data.result_url);
        toast({
          title: "Success!",
          description: "Your toy replica has been generated",
        });
      }
    } catch (error) {
      console.error('Error generating toy replica:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Toy Replica Generator
          </h1>
          <p className="text-muted-foreground mt-2">
            Transform any product into a toy replica using AI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Input
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sourceUrl">Source URL or Description</Label>
                <Input
                  id="sourceUrl"
                  placeholder="Enter product URL or describe the item..."
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="prompt">Custom Instructions (Optional)</Label>
                <Input
                  id="prompt"
                  placeholder="e.g., Make it colorful, add cute features..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Toy Replica
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Generating your toy replica...</p>
                  </div>
                </div>
              )}
              
              {result && !loading && (
                <div className="space-y-4">
                  <img 
                    src={result} 
                    alt="Generated toy replica" 
                    className="w-full rounded-lg shadow-lg"
                  />
                  <Button 
                    onClick={() => window.open(result, '_blank')}
                    variant="outline"
                    className="w-full"
                  >
                    View Full Size
                  </Button>
                </div>
              )}
              
              {!result && !loading && (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p>Your generated toy replica will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ToyReplica;
