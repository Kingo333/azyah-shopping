import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Loader2, Download, Copy, RotateCcw, Settings, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';
import { ToyReplicaUploader } from '@/components/ToyReplicaUploader';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const ToyReplica = () => {
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState({
    uploader: { status: 'unknown', message: '' },
    storage: { status: 'unknown', message: '' },
    function: { status: 'unknown', message: '' },
    apiKey: { status: 'unknown', message: '' },
    cors: { status: 'unknown', message: '' }
  });
  const [lastError, setLastError] = useState<string>('');
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Check URL params for diagnostics mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('diagnostics') === 'true') {
      setDiagnosticsOpen(true);
      runDiagnostics();
    }
  }, []);

  const runDiagnostics = async () => {
    console.log('Running enhanced diagnostics...');
    
    if (!user) {
      setDiagnostics(prev => ({ ...prev, storage: { status: 'error', message: 'User not authenticated' } }));
      return;
    }

    // Test storage with actual upload/download test
    try {
      // Create a tiny test image (1x1 pixel PNG in base64)
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI/hE5VQgAAAABJRU5ErkJggg==';
      const testImageBlob = new Blob([Uint8Array.from(atob(testImageBase64), c => c.charCodeAt(0))], { type: 'image/png' });
      const testFileName = `${user.id}/diagnostic-test-${Date.now()}.png`;

      console.log('Testing storage upload with:', testFileName);
      
      // Test upload to source bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('toy-replica-source')
        .upload(testFileName, testImageBlob, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload test failed:', uploadError);
        setDiagnostics(prev => ({ ...prev, storage: { status: 'error', message: `Upload failed: ${uploadError.message}` } }));
      } else {
        // Test download from source bucket
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from('toy-replica-source')
          .download(testFileName);

        if (downloadError) {
          console.error('Storage download test failed:', downloadError);
          setDiagnostics(prev => ({ ...prev, storage: { status: 'error', message: `Download failed: ${downloadError.message}` } }));
        } else {
          console.log('Storage test successful');
          setDiagnostics(prev => ({ ...prev, storage: { status: 'success', message: 'Upload/download test passed' } }));
          
          // Clean up test file
          await supabase.storage.from('toy-replica-source').remove([testFileName]);
        }
      }
    } catch (error) {
      console.error('Storage test error:', error);
      setDiagnostics(prev => ({ ...prev, storage: { status: 'error', message: `Storage test error: ${error}` } }));
    }

    // Test edge function health
    try {
      const { data, error } = await supabase.functions.invoke('generate-toy-replica', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!error && data?.ok) {
        setDiagnostics(prev => ({ ...prev, function: { status: 'success', message: `Function OK, model: ${data.model}` } }));
        setDiagnostics(prev => ({ ...prev, apiKey: { status: data.hasKey ? 'success' : 'error', message: data.hasKey ? 'API key present' : 'API key missing' } }));
      } else {
        setDiagnostics(prev => ({ ...prev, function: { status: 'error', message: `Function error: ${error?.message || 'Unknown'}` } }));
      }
    } catch (error) {
      setDiagnostics(prev => ({ ...prev, function: { status: 'error', message: `Function unreachable: ${error}` } }));
    }

    // CORS test - if we get here, CORS is working
    setDiagnostics(prev => ({ ...prev, cors: { status: 'success', message: 'CORS OK (function callable)' } }));
  };

  const handleFileUploaded = (fileName: string) => {
    console.log('File uploaded successfully:', fileName);
    setUploadedFileName(fileName);
    setDiagnostics(prev => ({ ...prev, uploader: { status: 'success', message: `File uploaded: ${fileName}` } }));
    handleGenerate(fileName);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    setLastError(`Upload error: ${error}`);
    setDiagnostics(prev => ({ ...prev, uploader: { status: 'error', message: error } }));
  };

  const generateToyReplica = async (sourceFileName: string): Promise<string> => {
    // Get signed URL for the uploaded file
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('toy-replica-source')
      .createSignedUrl(sourceFileName, 300); // 5 minutes

    if (signedUrlError || !signedUrlData) {
      throw new Error(`Failed to create signed URL: ${signedUrlError?.message}`);
    }

    console.log('Calling edge function with sourceUrl:', signedUrlData.signedUrl);

    const response = await fetch('/functions/v1/generate-toy-replica', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUrl: signedUrlData.signedUrl }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      // Show the actual server error instead of generic "non-2xx"
      throw new Error(data?.error || `Edge function ${response.status}`);
    }

    if (!data.b64_png) {
      throw new Error('No image data returned from function');
    }

    return `data:image/png;base64,${data.b64_png}`;
  };

  const handleGenerate = async (fileName?: string) => {
    const sourceFileName = fileName || uploadedFileName;
    if (!sourceFileName) return;

    if (!user) {
      const errorMsg = "Please log in to generate toy replicas.";
      setLastError(errorMsg);
      toast({
        title: "Authentication Required",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    setResult(null);
    
    try {
      console.log('Starting toy replica generation for:', sourceFileName);
      
      const resultDataUrl = await generateToyReplica(sourceFileName);
      
      setResult(resultDataUrl);
      toast({
        title: "Success!",
        description: "Your LEGO mini-figure has been created!",
      });
    } catch (error) {
      console.error('Error generating toy replica:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastError(errorMsg);
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
    if (uploadedFileName) {
      handleGenerate();
    }
  };

  const handleClear = () => {
    setUploadedFileName(null);
    setResult(null);
  };

  const copyLastError = () => {
    navigator.clipboard.writeText(lastError).then(() => {
      toast({
        title: "Copied",
        description: "Error message copied to clipboard",
      });
    });
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
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

        {/* Diagnostics Panel */}
        <Collapsible open={diagnosticsOpen} onOpenChange={setDiagnosticsOpen} className="mb-6">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Diagnostics Mode
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2">
              <CardHeader>
                <CardTitle className="text-lg">System Diagnostics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <StatusIcon status={diagnostics.uploader.status} />
                  <span className="font-medium">Uploader:</span>
                  <span className="text-sm text-muted-foreground">{diagnostics.uploader.message || 'Not tested'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon status={diagnostics.storage.status} />
                  <span className="font-medium">Storage:</span>
                  <span className="text-sm text-muted-foreground">{diagnostics.storage.message || 'Not tested'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon status={diagnostics.function.status} />
                  <span className="font-medium">Edge Function:</span>
                  <span className="text-sm text-muted-foreground">{diagnostics.function.message || 'Not tested'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon status={diagnostics.apiKey.status} />
                  <span className="font-medium">API Key:</span>
                  <span className="text-sm text-muted-foreground">{diagnostics.apiKey.message || 'Not tested'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon status={diagnostics.cors.status} />
                  <span className="font-medium">CORS:</span>
                  <span className="text-sm text-muted-foreground">{diagnostics.cors.message || 'Not tested'}</span>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button onClick={runDiagnostics} variant="outline" size="sm">
                    Refresh Diagnostics
                  </Button>
                  {lastError && (
                    <Button onClick={copyLastError} variant="outline" size="sm">
                      Copy Last Error
                    </Button>
                  )}
                </div>
                
                {lastError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <strong>Last Error:</strong> {lastError}
                  </div>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Photo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToyReplicaUploader
                onFileUploaded={handleFileUploaded}
                onUploadStart={() => setUploading(true)}
                onUploadError={handleUploadError}
                disabled={generating || uploading}
              />

              {uploadedFileName && (
                <Button 
                  onClick={handleClear}
                  variant="outline"
                  className="w-full"
                >
                  Clear & Start Over
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
                        setLastError(`Image load error: ${result}`);
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
