
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Sparkles, Loader2, Download, Copy } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';

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
    setResult(null);
    
    try {
      console.log('Calling toy replica function with:', { sourceUrl: sourceUrl.trim(), prompt: prompt.trim() });
      
      const { data, error } = await supabase.functions.invoke('generate-toy-replica', {
        body: {
          toyReplicaId: `toy-${Date.now()}`, // Generate a unique ID
          sourceUrl: sourceUrl.trim(),
          prompt: prompt.trim() || 'Generate a toy replica of this item'
        }
      });

      console.log('Toy replica response:', { data, error });

      if (error) {
        console.error('Toy Replica generation failed:', error);
        toast({
          title: "Generation Failed",
          description: error.message || "Failed to generate toy replica. Please check if the OpenAI API key is configured properly.",
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
      } else if (data?.message) {
        toast({
          title: "Info",
          description: data.message,
        });
      } else {
        toast({
          title: "No Result",
          description: "No image was generated. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating toy replica:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    
    try {
      const response = await fetch(result);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `toy-replica-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Downloaded",
        description: "Image saved to your downloads folder",
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: "Could not download the image",
        variant: "destructive"
      });
    }
  };

  const handleCopyUrl = () => {
    if (!result) return;
    
    navigator.clipboard.writeText(result).then(() => {
      toast({
        title: "Copied",
        description: "Image URL copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Could not copy URL to clipboard",
        variant: "destructive"
      });
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <BackButton className="mb-4" />
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
                disabled={loading || !sourceUrl.trim()}
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
                    onError={(e) => {
                      console.error('Image failed to load:', result);
                      toast({
                        title: "Image Load Error",
                        description: "Failed to load the generated image",
                        variant: "destructive"
                      });
                    }}
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleDownload}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button 
                      onClick={handleCopyUrl}
                      variant="outline"
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy URL
                    </Button>
                  </div>
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
