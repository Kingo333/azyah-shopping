import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Loader2, Download, Sparkles } from 'lucide-react';
import { AiAsset } from '@/hooks/useAiAssets';

interface AiStudioResultsPanelProps {
  loading: boolean;
  currentResult: any;
  assets: AiAsset[];
  remainingGenerations: number;
  isPremium: boolean;
  onDownload: () => void;
  onResultSelect: (result: any) => void;
}

export const AiStudioResultsPanel: React.FC<AiStudioResultsPanelProps> = ({
  loading,
  currentResult,
  assets,
  remainingGenerations,
  isPremium,
  onDownload,
  onResultSelect
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-lg font-semibold">Generated Result</h3>
        {currentResult?.path && (
          <Button onClick={onDownload} size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
      </div>

      {/* Main Result Display */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        {/* Current Result */}
        <div className="flex-1 min-h-[250px] max-h-[400px]">
        <GlassPanel variant="custom" className="h-full flex items-center justify-center">
          {loading ? (
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <div>
                <p className="text-lg font-medium">Generating your try-on...</p>
                <p className="text-sm text-muted-foreground">This may take a few moments</p>
              </div>
            </div>
          ) : currentResult?.path ? (
            <div className="w-full h-full flex flex-col p-4">
              <img 
                src={currentResult.path} 
                alt="Virtual try-on result"
                className="w-full flex-1 object-contain rounded-lg"
              />
              <div className="mt-3 flex items-center justify-center gap-3 flex-shrink-0">
                <Badge variant={currentResult.status === 'completed' ? 'default' : 'secondary'}>
                  {currentResult.status}
                </Badge>
                {currentResult.credits_used && (
                  <span className="text-xs text-muted-foreground">
                    Credits used: {currentResult.credits_used}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <Sparkles className="h-16 w-16 mx-auto text-muted-foreground/50" />
              <div>
                <h4 className="text-xl font-medium mb-2">Ready to generate</h4>
                <p className="text-base text-muted-foreground">Upload both images to start</p>
                <div className="mt-3 text-sm text-muted-foreground">
                  {remainingGenerations > 0 ? (
                    <span>{remainingGenerations} generations remaining {isPremium ? 'today' : 'lifetime'}</span>
                  ) : (
                    <span className="text-destructive">{isPremium ? 'Daily' : 'Lifetime'} limit reached</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </GlassPanel>
        </div>

        {/* Results Gallery */}
        <div className="flex-shrink-0 max-h-40 overflow-hidden">
          <h4 className="text-sm font-medium mb-2">Your Results</h4>
          {assets.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5 overflow-y-auto max-h-28">
              {assets.slice(0, 16).map((asset) => (
                <GlassPanel 
                  key={asset.id} 
                  variant="custom" 
                  className="aspect-square p-1 cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => onResultSelect({ path: asset.asset_url, status: 'completed' })}
                >
                  {asset.asset_url ? (
                    <img 
                      src={asset.asset_url} 
                      alt="Previous result" 
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </GlassPanel>
              ))}
            </div>
          ) : (
            <GlassPanel variant="custom" className="p-4 text-center">
              <p className="text-sm text-muted-foreground">No results generated yet</p>
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
  );
};