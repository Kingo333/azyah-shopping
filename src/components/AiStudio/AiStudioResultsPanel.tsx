import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Loader2, Download, Sparkles, Trash2, Check } from 'lucide-react';
import { AiAsset } from '@/hooks/useAiAssets';

interface AiStudioResultsPanelProps {
  loading: boolean;
  currentResult: any;
  assets: AiAsset[];
  remainingGenerations: number;
  isPremium: boolean;
  onDownload: () => void;
  onResultSelect: (result: any) => void;
  onDeleteAssets?: (assetIds: string[]) => void;
  hideReadyToGenerate?: boolean;
}

export const AiStudioResultsPanel: React.FC<AiStudioResultsPanelProps> = ({
  loading,
  currentResult,
  assets,
  remainingGenerations,
  isPremium,
  onDownload,
  onResultSelect,
  onDeleteAssets,
  hideReadyToGenerate = false
}) => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const handleAssetClick = (asset: AiAsset) => {
    if (isSelectionMode) {
      setSelectedAssets(prev => 
        prev.includes(asset.id) 
          ? prev.filter(id => id !== asset.id)
          : [...prev, asset.id]
      );
    } else {
      onResultSelect({ path: asset.asset_url, status: 'completed' });
    }
  };

  const handleDeleteSelected = () => {
    if (onDeleteAssets && selectedAssets.length > 0) {
      onDeleteAssets(selectedAssets);
      setSelectedAssets([]);
      setIsSelectionMode(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectedAssets([]);
    setIsSelectionMode(false);
  };
  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Download Button */}
      {currentResult?.path && (
        <div className="flex justify-end mb-3 flex-shrink-0">
          <Button onClick={onDownload} size="sm" variant="outline" className="h-8 text-xs">
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      )}

      {/* Main Result Display */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        {/* Current Result */}
        <div className={`${!hideReadyToGenerate || currentResult?.path || loading ? 'flex-1 min-h-[200px]' : 'h-0'}`}>
          <GlassPanel variant="custom" className="h-full flex items-center justify-center">
            {loading ? (
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <div>
                  <p className="text-base font-medium">Generating your try-on...</p>
                  <p className="text-xs text-muted-foreground">This may take a few moments</p>
                </div>
              </div>
            ) : currentResult?.path ? (
              <div className="w-full h-full flex flex-col p-3">
                <img 
                  src={currentResult.path} 
                  alt="Virtual try-on result"
                  className="w-full flex-1 object-contain rounded-lg"
                />
                <div className="mt-2 flex items-center justify-center gap-2 flex-shrink-0">
                  <Badge variant={currentResult.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                    {currentResult.status}
                  </Badge>
                  {currentResult.credits_used && (
                    <span className="text-xs text-muted-foreground">
                      Credits: {currentResult.credits_used}
                    </span>
                  )}
                </div>
              </div>
            ) : !hideReadyToGenerate ? (
              <div className="text-center space-y-3 p-4">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div>
                  <h4 className="text-lg font-medium mb-1">Ready to generate</h4>
                  <p className="text-sm text-muted-foreground">Upload both images to start</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {remainingGenerations > 0 ? (
                      <span>{remainingGenerations} remaining {isPremium ? 'today' : 'lifetime'}</span>
                    ) : (
                      <span className="text-destructive">{isPremium ? 'Daily' : 'Lifetime'} limit reached</span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </GlassPanel>
        </div>

        {/* Results Gallery */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Your Results</h4>
            {assets.length > 0 && (
              <div className="flex items-center gap-2">
                {isSelectionMode ? (
                  <>
                    <span className="text-xs text-muted-foreground">
                      {selectedAssets.length} selected
                    </span>
                    <Button 
                      onClick={handleDeleteSelected} 
                      size="sm" 
                      variant="destructive" 
                      className="h-6 text-xs"
                      disabled={selectedAssets.length === 0}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                    <Button 
                      onClick={handleCancelSelection} 
                      size="sm" 
                      variant="outline" 
                      className="h-6 text-xs"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={() => setIsSelectionMode(true)} 
                    size="sm" 
                    variant="outline" 
                    className="h-6 text-xs"
                  >
                    Select
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="min-h-24">
            {assets.length > 0 ? (
              <>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1">
                  {assets.slice(0, 20).map((asset) => (
                    <div key={asset.id} className="relative">
                      <GlassPanel 
                        variant="custom" 
                        className={`aspect-square p-0.5 cursor-pointer hover:scale-105 transition-transform ${
                          isSelectionMode && selectedAssets.includes(asset.id) 
                            ? 'ring-2 ring-primary ring-offset-1' 
                            : ''
                        }`}
                        onClick={() => handleAssetClick(asset)}
                      >
                        {asset.asset_url ? (
                          <img 
                            src={asset.asset_url} 
                            alt="Previous result" 
                            className="w-full h-full object-cover rounded-sm"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted rounded-sm flex items-center justify-center">
                            <Sparkles className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </GlassPanel>
                      {isSelectionMode && selectedAssets.includes(asset.id) && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="h-2 w-2" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Tap and hold image to view full image
                </p>
              </>
            ) : (
              <GlassPanel variant="custom" className="p-3 text-center h-20 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">No results generated yet</p>
              </GlassPanel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};