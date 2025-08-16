import React, { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Loader2, Download, Copy, RotateCcw, Info, Crown, AlertTriangle } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';
import { ToyReplicaUploader } from '@/components/ToyReplicaUploader';

const ToyReplica = () => {
  const [toyReplicaId, setToyReplicaId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [generationsUsed, setGenerationsUsed] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { isPremium, createPaymentIntent } = useSubscription();

  const GENERATION_LIMIT = 4;
  const remainingGenerations = isPremium ? Infinity : Math.max(0, GENERATION_LIMIT - generationsUsed);

  // Fetch user's generation count
  useEffect(() => {
    const fetchGenerationCount = async () => {
      if (!user) {
        setLoadingCount(false);
        return;
      }

      try {
        const { count, error } = await supabase
          .from('toy_replicas')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'succeeded');

        if (error) {
          console.error('Failed to fetch generation count:', error);
        } else {
          setGenerationsUsed(count || 0);
        }
      } catch (error) {
        console.error('Error fetching generation count:', error);
      } finally {
        setLoadingCount(false);
      }
    };

    fetchGenerationCount();
  }, [user]);

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

    if (!isPremium && remainingGenerations <= 0) {
      setShowUpgradeModal(true);
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
      // Update the counter after successful generation
      setGenerationsUsed(prev => prev + 1);
      
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <BackButton 
            onBack={() => window.location.href = '/dashboard'} 
            className="mb-4 text-gray-700 hover:text-gray-900 hover:bg-gray-200 border-gray-300" 
            variant="outline" 
          />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Toy Replica
          </h1>
          <p className="text-gray-600 mt-3 text-lg font-light">
            Upload one photo. We'll generate a LEGO-style mini-figure with a transparent background.
          </p>
          
          {/* Generation Counter */}
          <div className="mt-6 p-4 bg-white/15 backdrop-blur-[20px] rounded-[20px] border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(255,255,255,0.1)] relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/80 before:to-transparent after:content-[''] after:absolute after:top-0 after:left-0 after:w-px after:h-full after:bg-gradient-to-b after:from-white/80 after:via-transparent after:to-white/30">
            <div className="flex items-center gap-2">
              {isPremium ? (
                <>
                  <Crown className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-800">
                    Premium: <span className="font-bold text-purple-600">Unlimited</span> generations
                  </span>
                </>
              ) : (
                <>
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-gray-800">
                    {loadingCount ? (
                      "Loading..."
                    ) : (
                      <>
                        Generations remaining: <span className={`font-bold ${remainingGenerations <= 1 ? 'text-red-600' : 'text-purple-600'}`}>
                          {remainingGenerations}
                        </span> / {GENERATION_LIMIT}
                      </>
                    )}
                  </span>
                </>
              )}
            </div>
            {!isPremium && !loadingCount && remainingGenerations <= 1 && remainingGenerations > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                This is your last generation! <Button variant="link" className="text-xs p-0 h-auto text-purple-600 hover:text-purple-700" onClick={() => setShowUpgradeModal(true)}>Upgrade to Premium</Button>
              </p>
            )}
            {!isPremium && !loadingCount && remainingGenerations <= 0 && (
              <p className="text-xs text-red-600 mt-2">
                You have reached your generation limit. <Button variant="link" className="text-xs p-0 h-auto text-red-600 hover:text-red-700" onClick={() => setShowUpgradeModal(true)}>Upgrade now</Button>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-6 bg-white/15 backdrop-blur-[20px] rounded-[20px] border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(255,255,255,0.1)] relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/80 before:to-transparent after:content-[''] after:absolute after:top-0 after:left-0 after:w-px after:h-full after:bg-gradient-to-b after:from-white/80 after:via-transparent after:to-white/30">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Upload Photo</h2>
            </div>
            <div className="space-y-4">
              <ToyReplicaUploader
                onFileUploaded={handleFileUploaded}
                onUploadStart={handleUploadStart}
                onUploadError={handleUploadError}
                disabled={generating || uploading || remainingGenerations <= 0}
              />

              {toyReplicaId && !generating && !uploading && remainingGenerations > 0 && (
                <Button 
                  onClick={handleGenerate}
                  className="w-full"
                  disabled={!toyReplicaId}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              )}

              {remainingGenerations <= 0 && !loadingCount && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">
                    Generation limit reached
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    You have used all {GENERATION_LIMIT} of your Toy Replica generations.
                  </p>
                </div>
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

              <div className="text-xs text-gray-600 p-3 bg-gray-100 rounded-lg border border-gray-200">
                <strong className="text-gray-800">Note:</strong> Keep it family-friendly and your own photo.
              </div>
            </div>
          </div>

          <div className="p-6 bg-white/15 backdrop-blur-[20px] rounded-[20px] border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(255,255,255,0.1)] relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/80 before:to-transparent after:content-[''] after:absolute after:top-0 after:left-0 after:w-px after:h-full after:bg-gradient-to-b after:from-white/80 after:via-transparent after:to-white/30">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Your LEGO Mini-Figure</h2>
            </div>
            <div>
              {uploading && (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-purple-600" />
                    <p className="text-gray-700 font-medium">Uploading photo...</p>
                  </div>
                </div>
              )}

              {generating && !uploading && (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-purple-600" />
                    <p className="text-gray-700 font-medium">Building your mini-figure...</p>
                    <p className="text-sm text-gray-600 mt-2">This may take a moment</p>
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
                    disabled={generating || remainingGenerations <= 0}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              )}
              
              {!result && !generating && !uploading && (
                <div className="flex items-center justify-center py-16 text-gray-500">
                  <p className="font-medium">Your LEGO mini-figure will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upgrade Modal */}
        <AlertDialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-500" />
                Upgrade to Premium
              </AlertDialogTitle>
              <AlertDialogDescription>
                You've reached your generation limit of {GENERATION_LIMIT} Toy Replicas. 
                Upgrade to Premium for unlimited generations and full access to all features.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <div className="space-y-2 text-sm">
                <h4 className="font-medium">Premium Benefits:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Unlimited Toy Replica generations</li>
                  <li>• Priority customer support</li>
                  <li>• Full access to premium features</li>
                </ul>
                <p className="text-lg font-semibold mt-4">Only 40 AED / month</p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Maybe Later</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  setShowUpgradeModal(false);
                  createPaymentIntent();
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default ToyReplica;
