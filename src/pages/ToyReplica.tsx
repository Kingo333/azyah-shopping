
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Loader2, Download, Copy, RotateCcw } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';
import { ToyReplicaUploader } from '@/components/ToyReplicaUploader';

const ToyReplica = () => {
  const [toyReplicaId, setToyReplicaId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileUploaded = (id: string, file: string, preview: string) => {
    console.log('File uploaded successfully:', { id, file, preview });
    setToyReplicaId(id);
    setFileName(file);
    setPreviewUrl(preview);
    setUploading(false);
  };

  const handleUploadStart = () => {
    setUploading(true);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    setUploading(false);
    toast({
      title: "Upload Failed",
      description: error,
      variant: "destructive"
    });
  };

  const handleGenerate = async () => {
    if (!toyReplicaId || !user) {
      toast({
        title: "Error",
        description: "Please upload an image first and make sure you're logged in",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    setResult(null);
    
    try {
      console.log('Starting toy replica generation for:', toyReplicaId);
      
      const response = await supabase.functions.invoke('generate-toy-replica', {
        body: { toyReplicaId }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Generation failed');
      }

      const { resultUrl } = response.data;
      if (!resultUrl) {
        throw new Error('No result URL returned');
      }
      
      setResult(resultUrl);
      toast({
        title: "Success!",
        description: "Your LEGO mini-figure has been created!",
      });
    } catch (error) {
      console.error('Error generating toy replica:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Generation Failed",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
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
      a.download = `lego-minifigure-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Downloaded",
        description: "LEGO mini-figure saved to your downloads folder",
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

  const handleRegenerate = () => {
    if (toyReplicaId) {
      handleGenerate();
    }
  };

  const handleClear = () => {
    setToyReplicaId(null);
    setFileName(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <BackButton className="mb-4" />
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Toy Replica
          </h1>
          <p className="text-muted-foreground mt-2">
            Upload one photo. We'll generate a LEGO-style mini-figure with a transparent background.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Photo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToyReplicaUploader
                onFileUploaded={handleFileUploaded}
                onUploadStart={handleUploadStart}
                onUploadError={handleUploadError}
                disabled={generating || uploading}
              />

              {toyReplicaId && !generating && !uploading && (
                <Button 
                  onClick={handleGenerate}
                  className="w-full"
                  disabled={!toyReplicaId}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              )}

              {toyReplicaId && (
                <Button 
                  onClick={handleClear}
                  variant="outline"
                  className="w-full"
                  disabled={generating}
                >
                  Clear
                </Button>
              )}

              <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded">
                <strong>Note:</strong> Keep it family-friendly and your own photo.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your LEGO Mini-Figure</CardTitle>
            </CardHeader>
            <CardContent>
              {uploading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Uploading photo...</p>
                  </div>
                </div>
              )}

              {generating && !uploading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Building your mini-figure...</p>
                    <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
                  </div>
                </div>
              )}
              
              {result && !generating && !uploading && (
                <div className="space-y-4">
                  <div 
                    className="relative bg-checkerboard rounded-lg p-4"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='10' height='10' fill='%23f1f5f9'/%3e%3crect x='10' y='10' width='10' height='10' fill='%23f1f5f9'/%3e%3c/svg%3e")`,
                      backgroundSize: '20px 20px'
                    }}
                  >
                    <img 
                      src={result} 
                      alt="Generated LEGO mini-figure" 
                      className="w-full rounded-lg"
                      onError={(e) => {
                        console.error('Image failed to load:', result);
                        toast({
                          title: "Image Load Error",
                          description: "Failed to load the generated image",
                          variant: "destructive"
                        });
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleDownload}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PNG
                    </Button>
                    <Button 
                      onClick={handleCopyUrl}
                      variant="outline"
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                  </div>
                  <Button 
                    onClick={handleRegenerate}
                    variant="outline"
                    className="w-full"
                    disabled={generating}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              )}
              
              {!result && !generating && !uploading && (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p>Your LEGO mini-figure will appear here</p>
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
