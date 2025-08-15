
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2, Download, Copy, RotateCcw, CheckCircle } from 'lucide-react';
import { ToyReplicaUploader } from '@/components/ToyReplicaUploader';
import { useAuth } from '@/contexts/AuthContext';

const ToyReplica = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResult(null); // Clear previous result
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setResult(null);
  };

  const generateToyReplica = async () => {
    if (!selectedFile || !user) {
      toast({
        title: "Error",
        description: "Please select a file and ensure you're logged in",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setUploadingFile(true);
    setResult(null);
    
    try {
      console.log('Starting toy replica generation...');

      // Create database record first
      const toyReplicaId = crypto.randomUUID();
      
      const { error: dbError } = await supabase
        .from('toy_replicas')
        .insert({
          id: toyReplicaId,
          user_id: user.id,
          status: 'queued'
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Failed to create generation job');
      }

      setCurrentJobId(toyReplicaId);

      // Upload file to private bucket
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `source-${toyReplicaId}-${Date.now()}.${fileExtension}`;
      
      console.log('Uploading file to storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('toy-replica-source')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload your photo');
      }

      // Update database with source URL
      await supabase
        .from('toy_replicas')
        .update({ source_url: fileName })
        .eq('id', toyReplicaId);

      setUploadingFile(false);
      console.log('File uploaded, calling generation function...');

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('generate-toy-replica', {
        body: {
          toyReplicaId,
          sourceUrl: fileName
        }
      });

      console.log('Generation response:', { data, error });

      if (error) {
        console.error('Generation failed:', error);
        throw new Error(error.message || 'Failed to generate toy replica');
      }

      if (data?.result_url) {
        setResult(data.result_url);
        toast({
          title: "Success!",
          description: "Your LEGO mini-figure has been generated!",
        });
      } else {
        throw new Error('No result received from generation');
      }

    } catch (error) {
      console.error('Error generating toy replica:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate toy replica. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  };

  const downloadImage = async () => {
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
        title: "Downloaded!",
        description: "Your LEGO mini-figure has been saved",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the image",
        variant: "destructive"
      });
    }
  };

  const copyLink = async () => {
    if (!result) return;
    
    try {
      await navigator.clipboard.writeText(result);
      toast({
        title: "Link Copied!",
        description: "Image link has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  const regenerate = () => {
    generateToyReplica();
  };

  const clearAll = () => {
    setSelectedFile(null);
    setResult(null);
    setCurrentJobId(null);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Toy Replica
          </h1>
          <p className="text-muted-foreground mt-2">
            Upload one photo. We'll generate a LEGO-style mini-figure with a transparent background.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Upload Your Photo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToyReplicaUploader
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                selectedFile={selectedFile}
                disabled={loading}
              />

              <div className="flex gap-2">
                <Button 
                  onClick={generateToyReplica} 
                  disabled={loading || !selectedFile}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {uploadingFile ? 'Uploading photo...' : 'Building your mini-figure...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={clearAll} 
                  variant="outline"
                  disabled={loading}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Result Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Your LEGO Mini-Figure</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      {uploadingFile ? 'Uploading photo...' : 'Building your mini-figure...'}
                    </p>
                  </div>
                </div>
              )}
              
              {result && !loading && (
                <div className="space-y-4">
                  {/* Display image with checkerboard background for transparency */}
                  <div 
                    className="relative rounded-lg overflow-hidden"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cpattern id='checkerboard' width='20' height='20' patternUnits='userSpaceOnUse'%3e%3crect width='10' height='10' fill='%23f1f5f9'/%3e%3crect x='10' y='10' width='10' height='10' fill='%23f1f5f9'/%3e%3c/pattern%3e%3c/defs%3e%3crect width='100%25' height='100%25' fill='url(%23checkerboard)'/%3e%3c/svg%3e")`,
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
                      onClick={downloadImage}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PNG
                    </Button>
                    
                    <Button 
                      onClick={copyLink}
                      variant="outline"
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    
                    <Button 
                      onClick={regenerate}
                      variant="outline"
                      disabled={loading}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {!result && !loading && (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Your LEGO mini-figure will appear here</p>
                  </div>
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
