
import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, Sparkles, Crown, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useZiinaPayments } from '@/hooks/useZiinaPayments';
import { AiStudioUploadPanel } from './AiStudio/AiStudioUploadPanel';
import { AiStudioControlsPanel } from './AiStudio/AiStudioControlsPanel';
import { AiStudioResultsPanel } from './AiStudio/AiStudioResultsPanel';
import { AiStudioHelpPanel } from './AiStudio/AiStudioHelpPanel';

interface AiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImageUploadResult {
  url: string;
  file: File;
}

const AiStudioModal: React.FC<AiStudioModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const { isPremium, createPayment } = useZiinaPayments();
  
  // State for upload panel
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [outfitFile, setOutfitFile] = useState<File | null>(null);
  const [personImageId, setPersonImageId] = useState<string | null>(null);
  const [outfitImageId, setOutfitImageId] = useState<string | null>(null);
  
  // State for controls panel
  const [loading, setLoading] = useState(false);
  const [uploadingPerson, setUploadingPerson] = useState(false);
  const [uploadingOutfit, setUploadingOutfit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<'standard' | 'high'>('standard');
  const [remainingGenerations, setRemainingGenerations] = useState(3);
  const maxGenerations = isPremium ? Infinity : 4;
  
  // State for results panel
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  
  // State for help panel
  const [error, setError] = useState<string | null>(null);

  const handlePersonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingPerson(true);
      setPersonFile(file);
      // Simulate upload
      setTimeout(() => {
        setPersonImageId(`person_${Date.now()}`);
        setUploadingPerson(false);
      }, 1000);
    }
  };

  const handleOutfitUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingOutfit(true);
      setOutfitFile(file);
      // Simulate upload
      setTimeout(() => {
        setOutfitImageId(`outfit_${Date.now()}`);
        setUploadingOutfit(false);
      }, 1000);
    }
  };

  const handleGenerate = async () => {
    if (!personImageId || !outfitImageId) {
      setError('Please upload both images first');
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate generation
    setTimeout(() => {
      const newResult = {
        path: `https://picsum.photos/512?random=${Math.random()}`,
        status: 'completed',
        credits_used: resolution === 'high' ? 2 : 1
      };
      setCurrentResult(newResult);
      setAssets([...assets, { id: Date.now().toString(), asset_url: newResult.path }]);
      setRemainingGenerations(prev => prev - 1);
      setLoading(false);
    }, 3000);
  };

  const handleDownload = () => {
    if (currentResult?.path) {
      window.open(currentResult.path, '_blank');
    }
  };

  const handleResultSelect = (result: any) => {
    setCurrentResult(result);
  };

  const handleUpgradeClick = () => {
    createPayment(40, false, 'Premium subscription upgrade');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="mr-2 h-6 w-6 text-yellow-500" />
            AI Studio
            {isPremium ? (
              <Badge variant="secondary" className="ml-2 flex items-center gap-1">
                <Crown className="h-3 w-3" />
                Premium
              </Badge>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <Card className="mb-4">
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isPremium ? (
                <>
                  <Sparkles className="h-5 w-5 text-green-500" />
                  <p className="text-sm">
                    You have unlimited access to AI image generation!
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <p className="text-sm">
                    Upgrade to Premium for unlimited access!
                  </p>
                </>
              )}
            </div>
            {!isPremium && (
              <Button size="sm" onClick={handleUpgradeClick}>
                <Crown className="mr-2 h-4 w-4" />
                Upgrade
              </Button>
            )}
          </CardContent>
        </Card>

        <Separator className="mb-4" />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Panel */}
          <div className="space-y-4">
            <AiStudioUploadPanel
              personFile={personFile}
              outfitFile={outfitFile}
              personImageId={personImageId}
              outfitImageId={outfitImageId}
              onPersonUpload={handlePersonUpload}
              onOutfitUpload={handleOutfitUpload}
            />
            
            <AiStudioControlsPanel
              loading={loading}
              uploadingPerson={uploadingPerson}
              uploadingOutfit={uploadingOutfit}
              showSettings={showSettings}
              prompt={prompt}
              resolution={resolution}
              remainingGenerations={remainingGenerations}
              maxGenerations={maxGenerations}
              isPremium={isPremium}
              personImageId={personImageId}
              outfitImageId={outfitImageId}
              personFile={personFile}
              outfitFile={outfitFile}
              onShowSettingsToggle={() => setShowSettings(!showSettings)}
              onPromptChange={setPrompt}
              onResolutionChange={setResolution}
              onGenerate={handleGenerate}
              onPersonUpload={handlePersonUpload}
              onOutfitUpload={handleOutfitUpload}
            />
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            <AiStudioResultsPanel
              loading={loading}
              currentResult={currentResult}
              assets={assets}
              remainingGenerations={remainingGenerations}
              isPremium={isPremium}
              onDownload={handleDownload}
              onResultSelect={handleResultSelect}
            />
            
            <AiStudioHelpPanel
              error={error}
              resolution={resolution}
              onResolutionChange={setResolution}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AiStudioModal;
