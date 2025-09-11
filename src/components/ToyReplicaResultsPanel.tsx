import React, { useState, useCallback } from 'react';
import { Download, Trash2, X, ExternalLink, CheckCircle, AlertCircle, Clock, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useToyReplicaAssets, type ToyReplicaAsset } from '@/hooks/useToyReplicaAssets';
import { supabase } from '@/integrations/supabase/client';

interface ToyReplicaResultsPanelProps {
  loading: boolean;
  currentResult?: string | null;
  onResultSelect?: (result: string) => void;
  onRefresh?: () => void;
}

export const ToyReplicaResultsPanel: React.FC<ToyReplicaResultsPanelProps> = ({
  loading,
  currentResult,
  onResultSelect,
  onRefresh
}) => {
  const { assets, loading: assetsLoading, deleteAssets } = useToyReplicaAssets();
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const { toast } = useToast();

  const downloadImage = useCallback(async (url: string, filename?: string) => {
    try {
      const { data } = await supabase.storage
        .from('toy-replica-result')
        .createSignedUrl(url, 60);
      
      if (data?.signedUrl) {
        const response = await fetch(data.signedUrl);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename || `toy-replica-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        
        toast({
          title: 'Download Started',
          description: 'Your toy replica image is downloading.',
        });
      } else {
        throw new Error('Failed to create download URL');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download the image. Please try again.',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const openFullSizeImage = useCallback(async (resultUrl: string) => {
    try {
      const { data } = await supabase.storage
        .from('toy-replica-result')
        .createSignedUrl(resultUrl, 60);
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening image:', error);
    }
  }, []);

  const handleAssetClick = useCallback((asset: ToyReplicaAsset) => {
    if (isSelectionMode) {
      setSelectedAssets(prev => 
        prev.includes(asset.id) 
          ? prev.filter(id => id !== asset.id)
          : [...prev, asset.id]
      );
    } else if (asset.result_url && onResultSelect) {
      onResultSelect(asset.result_url);
    }
  }, [isSelectionMode, onResultSelect]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedAssets.length === 0) return;
    
    const success = await deleteAssets(selectedAssets);
    if (success) {
      setSelectedAssets([]);
      setIsSelectionMode(false);
      onRefresh?.();
    }
  }, [selectedAssets, deleteAssets, onRefresh]);

  const handleCancelSelection = useCallback(() => {
    setSelectedAssets([]);
    setIsSelectionMode(false);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const completedAssets = assets.filter(asset => asset.status === 'succeeded' && asset.result_url);

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Results</CardTitle>
          {completedAssets.length > 0 && !isSelectionMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSelectionMode(true)}
            >
              Select
            </Button>
          )}
          {isSelectionMode && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelSelection}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              {selectedAssets.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedAssets.length})
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Result */}
        {currentResult && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Current Result</h4>
            <div className="relative group">
              <img
                src={currentResult}
                alt="Current toy replica result"
                className="w-full h-48 object-cover rounded-lg border"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => currentResult && downloadImage(currentResult)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => currentResult && openFullSizeImage(currentResult)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Gallery */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Previous Results ({completedAssets.length})
          </h4>
          
          {(loading || assetsLoading) && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          )}

          {!loading && !assetsLoading && completedAssets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No previous results yet.</p>
              <p className="text-sm">Your generated toy replicas will appear here.</p>
            </div>
          )}

          {!loading && !assetsLoading && completedAssets.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {completedAssets.map((asset) => (
                <div
                  key={asset.id}
                  className={`
                    relative group cursor-pointer rounded-lg overflow-hidden border
                    ${selectedAssets.includes(asset.id) ? 'ring-2 ring-primary' : ''}
                    ${isSelectionMode ? 'hover:ring-2 hover:ring-primary/50' : ''}
                  `}
                  onClick={() => handleAssetClick(asset)}
                >
                  {isSelectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedAssets.includes(asset.id)}
                        onChange={() => {}} // Handled by parent click
                        className="bg-background/80 backdrop-blur-sm"
                      />
                    </div>
                  )}
                  
                  <img
                    src={asset.result_url!}
                    alt="Toy replica result"
                    className="w-full aspect-square object-cover"
                  />
                  
                  {!isSelectionMode && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(asset.result_url!);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openFullSizeImage(asset.result_url!);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="absolute bottom-2 right-2">
                    <Badge variant="secondary" className={`text-xs ${getStatusColor(asset.status)}`}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(asset.status)}
                        {asset.status}
                      </span>
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Assets with Status */}
        {!loading && !assetsLoading && assets.length > completedAssets.length && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">All Generations</h4>
            <div className="space-y-2">
              {assets.slice(0, 5).map((asset) => (
                <div key={asset.id} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(asset.status)}
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(asset.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {asset.status === 'failed' && asset.error ? asset.error : asset.status}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusColor(asset.status)}>
                    {asset.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};