
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, Copy, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ToyReplica {
  id: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  result_url?: string;
  error?: string;
}

export default function ToyReplica() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ToyReplica | null>(null);
  const [progressText, setProgressText] = useState('');
  
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleFileSelect = useCallback((selectedFile: File) => {
    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image.",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedFile.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }
    
    setFile(selectedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }, [toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  const generateToyReplica = async () => {
    if (!file || !user) return;

    setIsGenerating(true);
    setProgress(10);
    setProgressText("Uploading photo...");

    try {
      // Create database record
      const { data: replicaData, error: insertError } = await supabase
        .from('toy_replicas')
        .insert({
          user_id: user.id,
          status: 'queued'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setProgress(30);
      
      // Upload source image
      const fileName = `${user.id}/${replicaData.id}-source.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('toy-replica-source')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setProgress(50);
      setProgressText("Building your mini-figure...");

      // Call generation function
      const { data: generationResult, error: generationError } = await supabase.functions
        .invoke('generate-toy-replica', {
          body: {
            toyReplicaId: replicaData.id,
            sourceUrl: fileName
          }
        });

      if (generationError) throw generationError;

      setProgress(90);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds
      
      while (attempts < maxAttempts) {
        const { data: statusData, error: statusError } = await supabase
          .from('toy_replicas')
          .select('*')
          .eq('id', replicaData.id)
          .single();

        if (statusError) throw statusError;

        if (statusData.status === 'succeeded') {
          setResult(statusData);
          setProgress(100);
          setProgressText("Complete!");
          break;
        } else if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Generation failed');
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (attempts >= maxAttempts) {
        throw new Error('Generation timed out');
      }

    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadResult = () => {
    if (result?.result_url) {
      const a = document.createElement('a');
      a.href = result.result_url;
      a.download = `lego-replica-${result.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const copyLink = () => {
    if (result?.result_url) {
      navigator.clipboard.writeText(result.result_url);
      toast({
        title: "Link copied",
        description: "The image link has been copied to your clipboard."
      });
    }
  };

  const regenerate = () => {
    setResult(null);
    generateToyReplica();
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Sign in Required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to use the Toy Replica feature.
            </p>
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Toy Replica</h1>
        <p className="text-muted-foreground">
          Upload one photo. We'll generate a LEGO-style mini-figure with a transparent background.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Keep it family-friendly and your own photo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!preview ? (
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">Drop your photo here</p>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG, WebP • Max 10MB
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    Change
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFile}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}

            <input
              id="file-input"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex gap-2">
              <Button
                onClick={generateToyReplica}
                disabled={!file || isGenerating}
                className="flex-1"
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
              {file && (
                <Button
                  variant="outline"
                  onClick={clearFile}
                  disabled={isGenerating}
                >
                  Clear
                </Button>
              )}
            </div>

            {isGenerating && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-center text-muted-foreground">
                  {progressText}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Result Section */}
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Your LEGO mini-figure will appear here</p>
                </div>
              </div>
            ) : result.status === 'succeeded' && result.result_url ? (
              <div className="space-y-4">
                <div
                  className="relative bg-checkerboard rounded-lg p-4"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                      linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                      linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
                    `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                  }}
                >
                  <img
                    src={result.result_url}
                    alt="LEGO Replica"
                    className="w-full h-auto mx-auto max-h-64 object-contain"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button onClick={downloadResult} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download PNG
                  </Button>
                  <Button onClick={copyLink} variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button onClick={regenerate} variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              </div>
            ) : result.status === 'failed' ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center text-destructive">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                  <p className="font-medium">Generation failed</p>
                  <p className="text-sm">{result.error}</p>
                  <Button onClick={regenerate} variant="outline" size="sm" className="mt-2">
                    Try Again
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p>Processing your mini-figure...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
