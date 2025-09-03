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
}

export const AiStudioResultsPanel: React.FC<AiStudioResultsPanelProps> = ({
  loading,
  currentResult,
  assets,
  remainingGenerations,
  isPremium,
  onDownload,
  onResultSelect,
  onDeleteAssets
}) => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const downloadImage = async (url: string, filename: string = 'ai-studio-result.png') => {
    try {
      // First try direct download with fetch
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      
    } catch (error) {
      console.log('Direct download failed, trying fallback:', error);
      
      // Fallback: try anchor tag with direct URL
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (fallbackError) {
        console.log('Fallback download failed, opening in new tab:', fallbackError);
        // Final fallback: open in new tab
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const openFullSizeImage = (imageUrl: string) => {
    try {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>AI Studio Result</title></head>
            <body style="margin: 0; padding: 20px; background: black; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
              <img src="${imageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Failed to open full size image:', error);
    }
  };

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
    <div className="flex flex-col min-h-0">
      {/* Mobile Header - only show when we have results */}
      <div className="lg:hidden flex-shrink-0">
        {(loading || currentResult?.path) && (
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">Generated Result</h3>
            {currentResult?.path && (
              <Button 
                onClick={() => downloadImage(currentResult.path)} 
                size="sm" 
                variant="outline" 
                className="h-8 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Desktop Download Button */}
      {currentResult?.path && (
        <div className="hidden lg:flex justify-end mb-3 flex-shrink-0">
          <Button 
            onClick={() => downloadImage(currentResult.path)} 
            size="sm" 
            variant="outline" 
            className="h-8 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      )}

      {/* Main Result Display */}
      <div className="flex flex-col min-h-0">
        {/* Current Result */}
        <div className="flex-shrink-0">
          <GlassPanel variant="custom" className="h-[318px] lg:h-[448px] flex items-center justify-center">
            {loading ? (
              <div className="text-center space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                <div>
                  <p className="text-sm font-medium">Generating your try-on...</p>
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
            ) : (
              <div className="text-center space-y-1 p-2">
                <Sparkles className="h-6 w-6 lg:h-8 lg:w-8 mx-auto text-muted-foreground/50" />
                <div>
                  <h4 className="text-sm lg:text-base font-medium mb-0.5">Ready to generate</h4>
                  <p className="text-xs text-muted-foreground">Upload both images to start</p>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span>3/4 remaining</span>
                  </div>
                </div>
              </div>
            )}
          </GlassPanel>
        </div>

        {/* Results Gallery */}
        <div className="lg:flex-1 mt-1 min-h-0">
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
          <div className="min-h-16">
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
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (asset.asset_url) {
                            openFullSizeImage(asset.asset_url);
                          }
                        }}
                        onTouchStart={(e) => {
                          if (!asset.asset_url) return;
                          
                          let longPressTimer: NodeJS.Timeout;
                          let hasMoved = false;
                          
                          const startTouch = e.touches[0];
                          const startX = startTouch.clientX;
                          const startY = startTouch.clientY;
                          
                          const handleTouchMove = (moveEvent: TouchEvent) => {
                            if (moveEvent.touches.length > 0) {
                              const moveTouch = moveEvent.touches[0];
                              const deltaX = Math.abs(moveTouch.clientX - startX);
                              const deltaY = Math.abs(moveTouch.clientY - startY);
                              
                              if (deltaX > 15 || deltaY > 15) {
                                hasMoved = true;
                                clearTimeout(longPressTimer);
                              }
                            }
                          };
                          
                          const handleTouchEnd = (endEvent: TouchEvent) => {
                            clearTimeout(longPressTimer);
                            cleanup();
                            
                            // If no movement and quick tap, handle normal click
                            if (!hasMoved && endEvent.timeStamp - e.timeStamp < 300) {
                              handleAssetClick(asset);
                            }
                          };
                          
                          const cleanup = () => {
                            clearTimeout(longPressTimer);
                            document.removeEventListener('touchend', handleTouchEnd);
                            document.removeEventListener('touchcancel', cleanup);
                            document.removeEventListener('touchmove', handleTouchMove);
                          };
                          
                          // Set up long press timer
                          longPressTimer = setTimeout(() => {
                            if (!hasMoved && asset.asset_url) {
                              openFullSizeImage(asset.asset_url);
                              cleanup();
                            }
                          }, 600);
                          
                          document.addEventListener('touchmove', handleTouchMove, { passive: false });
                          document.addEventListener('touchend', handleTouchEnd);
                          document.addEventListener('touchcancel', cleanup);
                        }}
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
                  Tap and hold image to view full size version
                </p>
              </>
            ) : (
              <GlassPanel variant="custom" className="p-3 text-center h-16 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">No results generated yet</p>
              </GlassPanel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};