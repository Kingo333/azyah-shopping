import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useBitStudio } from '@/hooks/useBitStudio';
import { BITSTUDIO_IMAGE_TYPES } from '@/lib/bitstudio-types';
import { useToast } from '@/hooks/use-toast';
import { useAiAssets } from '@/hooks/useAiAssets';
import { useSubscription } from '@/hooks/useSubscription';

export interface AiStudioModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: React.ReactNode;
}

const AiStudioModal: React.FC<AiStudioModalProps> = ({
  open,
  onClose,
  trigger
}) => {
  // File uploads
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [outfitFile, setOutfitFile] = useState<File | null>(null);

  // Form data
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<'standard' | 'high'>('standard');
  const [numImages, setNumImages] = useState(1);

  // Results
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [personImageId, setPersonImageId] = useState<string | null>(null);
  const [outfitImageId, setOutfitImageId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const {
    loading,
    error,
    uploadImage,
    virtualTryOn,
    clearError
  } = useBitStudio();
  
  const { toast } = useToast();
  const { assets, loading: assetsLoading, fetchAssets, saveAsset, deleteAssets } = useAiAssets();
  const { isPremium, createPaymentIntent } = useSubscription();

  // Generation limits based on user type
  const maxGenerations = isPremium ? 20 : 4;
  
  // For premium users, count today's generations; for free users, count all lifetime generations
  const relevantAssets = isPremium 
    ? assets.filter(asset => {
        const assetDate = new Date(asset.created_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return assetDate >= today;
      })
    : assets;
    
  const remainingGenerations = maxGenerations - relevantAssets.length;
  const canUpload = personImageId && outfitImageId && !loading && remainingGenerations > 0;

  useEffect(() => {
    if (open) {
      fetchAssets();
    }
  }, [open]);

  // File validation helper
  const validateFile = (file: File): boolean => {
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image file smaller than 10MB',
        variant: 'destructive'
      });
      return false;
    }
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return false;
    }
    return true;
  };

  // File upload handlers
  const handleFileUpload = async (file: File, type: string, setImageId: (id: string) => void, setFile: (file: File) => void) => {
    if (!file || !validateFile(file)) return;
    try {
      clearError();
      setFile(file);
      const result = await uploadImage(file, type);
      if (result?.id) {
        setImageId(result.id);
        toast({
          title: 'Upload Complete',
          description: `${type === BITSTUDIO_IMAGE_TYPES.PERSON ? 'Person' : 'Outfit'} image uploaded successfully`
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: 'Upload Failed',
        description: `Failed to upload ${type === BITSTUDIO_IMAGE_TYPES.PERSON ? 'person' : 'outfit'} image. Please try again.`,
        variant: 'destructive'
      });
    }
  };

  // Virtual Try-On handler
  const handleVirtualTryOn = async () => {
    if (!personImageId || !outfitImageId) {
      toast({
        title: 'Missing Images',
        description: 'Please upload both person and outfit images',
        variant: 'destructive'
      });
      return;
    }

    if (remainingGenerations <= 0) {
      toast({
        title: 'Generation Limit Reached',
        description: isPremium 
          ? 'You have reached your daily limit of 20 try-ons' 
          : 'You have reached your lifetime limit of 4 generations. Upgrade to Premium for 20 daily try-ons.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await virtualTryOn({
        person_image_id: personImageId,
        outfit_image_id: outfitImageId,
        resolution: resolution as 'standard' | 'high',
        num_images: numImages,
        prompt: prompt || undefined
      });

      if (result) {
        setCurrentResult(result);
        
        // Save the result to database
        if (result.path) {
          const savedAsset = await saveAsset(result.path, result.id, `Virtual Try-On ${new Date().toLocaleDateString()}`);
          if (savedAsset) {
            toast({
              title: 'Try-On Complete',
              description: 'Result saved successfully',
            });
          }
        }
      }
    } catch (error) {
      console.error('Virtual try-on failed:', error);
      toast({
        title: 'Try-On Failed',
        description: 'There was an error generating your try-on. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleUpgradeClick = async () => {
    await createPaymentIntent();
  };

  const handleAssetClick = (asset: any) => {
    if (selectMode) {
      setSelectedAssets(prev => 
        prev.includes(asset.id) 
          ? prev.filter(id => id !== asset.id)
          : [...prev, asset.id]
      );
    } else {
      setCurrentResult(asset);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedAssets.length > 0) {
      await deleteAssets(selectedAssets);
      setSelectedAssets([]);
      setSelectMode(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-[95vw] w-[95vw] h-[100dvh] p-0 border-0 sm:max-w-md md:max-w-lg lg:max-w-xl sm:max-h-[92vh] sm:h-auto">
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: 24, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative w-full sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[92vh] overflow-hidden
                       rounded-t-2xl sm:rounded-2xl bg-[#F2EFE8] shadow-2xl border border-black/5"
            style={{ backgroundColor: 'hsl(40 15% 94%)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 bg-white/60 sticky top-0 z-10">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] inline-flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full bg-[#7B2E2E]/10 text-[#7B2E2E] font-medium">
                    AI Outfit try-on
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-semibold mt-1 text-[#121212]">AI Studio</h2>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 mt-2">
                <CreditsPill used={remainingGenerations} total={maxGenerations} />
                {/* Mobile progress bar */}
                <div className="flex sm:hidden items-center gap-2 px-3 py-1.5 rounded-full bg-[#7B2E2E]/10">
                  <div className="w-16 h-1 rounded-full bg-black/10 overflow-hidden">
                    <div className="h-full bg-[#7B2E2E] transition-all duration-300" style={{ width: '50%' }} />
                  </div>
                  <span className="text-xs text-[#7B2E2E] font-semibold">2/4</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-2 rounded-xl hover:bg-black/5 active:scale-95 transition"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-4 w-4 sm:h-6 sm:w-6 text-[#121212]" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(92vh-160px)]">
              {/* Results strip */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[#121212]">Your Results</h3>
                  {assets.length > 0 && (
                    <button 
                      onClick={() => {
                        setSelectMode(!selectMode);
                        setSelectedAssets([]);
                      }}
                      className="text-sm px-3 py-1.5 rounded-full border border-black/10 bg-white hover:bg-black/5 transition"
                    >
                      {selectMode ? "Done" : "Select"}
                    </button>
                  )}
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {assets?.length ? assets.map(asset => (
                    <motion.button 
                      key={asset.id} 
                      onClick={() => handleAssetClick(asset)}
                      whileTap={{ scale: 0.98 }}
                      className={`shrink-0 relative w-20 h-28 rounded-xl overflow-hidden bg-white shadow
                                 focus:outline-none focus:ring-2 focus:ring-[#7B2E2E] transition-all
                                 ${selectMode && selectedAssets.includes(asset.id) ? 'ring-2 ring-[#7B2E2E]' : ''}`}
                    >
                      <img src={asset.asset_url} alt="" className="w-full h-full object-cover" />
                      {selectMode && selectedAssets.includes(asset.id) && (
                        <div className="absolute inset-0 bg-[#7B2E2E]/20 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-[#7B2E2E] flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        </div>
                      )}
                    </motion.button>
                  )) : (
                    <div className="text-xs text-black/60">No results yet</div>
                  )}
                </div>
                
                {selectMode && selectedAssets.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={handleDeleteSelected}
                      className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      Delete ({selectedAssets.length})
                    </button>
                  </div>
                )}
              </div>

              {/* Current Result Display */}
              {currentResult && (
                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="aspect-[3/4] w-full rounded-xl overflow-hidden bg-gray-100 mb-3">
                    <img 
                      src={currentResult.path || currentResult.asset_url} 
                      alt="AI Try-On Result" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (currentResult.path || currentResult.image_url) {
                        try {
                          const response = await fetch(currentResult.path || currentResult.asset_url);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `ai-studio-result-${currentResult.id}.png`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        } catch (err) {
                          toast({
                            title: 'Download Failed',
                            description: 'Could not download the image',
                            variant: 'destructive'
                          });
                        }
                      }
                    }}
                    className="w-full py-2 text-sm font-medium text-[#7B2E2E] border border-[#7B2E2E]/20 rounded-lg hover:bg-[#7B2E2E]/5 transition"
                  >
                    Download Result
                  </button>
                </div>
              )}

              {/* Dropzone */}
              <div className="rounded-2xl border border-black/10 bg-white shadow-sm p-4">
                <div className="mb-3 text-center">
                  <div className="text-base font-semibold text-[#121212]">Ready to generate</div>
                  <p className="text-sm text-black/60">Drop or upload two images to get started.</p>
                  <p className="text-xs text-black/50 mt-1">{remainingGenerations}/{maxGenerations} credits left</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <UploadCard
                    label="Person Image"
                    fileName={personFile?.name}
                    file={personFile}
                    onFile={(file) => handleFileUpload(file, BITSTUDIO_IMAGE_TYPES.PERSON, setPersonImageId, setPersonFile)}
                    hint="Full-body, front-facing"
                    hasImage={!!personImageId}
                  />
                  <UploadCard
                    label="Outfit Image"
                    fileName={outfitFile?.name}
                    file={outfitFile}
                    onFile={(file) => handleFileUpload(file, BITSTUDIO_IMAGE_TYPES.OUTFIT, setOutfitImageId, setOutfitFile)}
                    hint="Clear front view"
                    hasImage={!!outfitImageId}
                  />
                </div>
              </div>

              {/* Tips */}
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <h4 className="text-sm font-semibold mb-2">Pro Tips</h4>
                <ul className="text-sm text-black/70 list-disc pl-5 space-y-1">
                  <li>Front-facing, full-body photos</li>
                  <li>Plain backgrounds work best</li>
                  <li>High resolution</li>
                  <li>Clear outfit visibility</li>
                </ul>
                {!isPremium && (
                  <p className="text-[11px] text-black/50 mt-3">
                    By continuing, you agree to use one credit for this try-on.
                  </p>
                )}
              </div>

              {/* Advanced Settings */}
              <details className="rounded-2xl border border-black/10 bg-white p-4">
                <summary className="text-sm font-semibold cursor-pointer">Advanced Settings</summary>
                <div className="text-sm text-black/70 mt-2 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-black/60 mb-1">Prompt (optional)</label>
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe any specific styling requests..."
                      className="w-full px-3 py-2 text-sm border border-black/10 rounded-lg focus:ring-2 focus:ring-[#7B2E2E] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-black/60 mb-1">Resolution</label>
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value as 'standard' | 'high')}
                      className="w-full px-3 py-2 text-sm border border-black/10 rounded-lg focus:ring-2 focus:ring-[#7B2E2E] focus:border-transparent"
                    >
                      <option value="standard">Standard</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </details>
            </div>

            {/* Sticky action bar */}
            <div className="p-3 border-t border-black/10 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
              <motion.button
                onClick={handleVirtualTryOn}
                disabled={!canUpload}
                whileTap={canUpload ? { scale: 0.99 } : {}}
                className={`w-full h-12 rounded-xl font-semibold transition-all
                  ${canUpload
                    ? "bg-[#7B2E2E] text-white hover:opacity-95"
                    : "bg-black/10 text-black/40 cursor-not-allowed"}`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </div>
                ) : !personImageId || !outfitImageId ? (
                  "Upload Both Images"
                ) : remainingGenerations <= 0 ? (
                  "No Credits Left"
                ) : (
                  "Generate Try-On"
                )}
              </motion.button>
              
              {!isPremium && (
                <div className="flex items-center justify-end mt-2">
                  <button
                    onClick={handleUpgradeClick}
                    className="text-[11px] text-[#7B2E2E] font-medium hover:underline"
                  >
                    Upgrade
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ---- Subcomponents ---- */

function CreditsPill({ used, total }: { used: number; total: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((used / total) * 100)));
  return (
    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7B2E2E]/10">
      <div className="w-20 h-1.5 rounded-full bg-black/10 overflow-hidden">
        <div className="h-full bg-[#7B2E2E] transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-[#7B2E2E] font-semibold">{used}/{total}</span>
    </div>
  );
}

function UploadCard({
  label, fileName, onFile, hint, hasImage, file
}: { 
  label: string; 
  fileName?: string; 
  onFile: (f: File) => void; 
  hint: string;
  hasImage: boolean;
  file?: File | null;
}) {
  return (
    <motion.label 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative flex flex-col items-center justify-center gap-2
                 h-36 rounded-xl border transition-all cursor-pointer overflow-hidden
                 ${hasImage 
                   ? 'border-[#7B2E2E] bg-[#7B2E2E]/5' 
                   : 'border-dashed border-black/20 bg-[#F7F6F3] hover:border-[#7B2E2E] hover:bg-white'
                 }`}
    >
      <input
        type="file"
        accept="image/*"
        className="absolute inset-0 opacity-0 cursor-pointer z-10"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      
      {/* Show uploaded image if available */}
      {file && (
        <div className="absolute inset-0">
          <img 
            src={URL.createObjectURL(file)} 
            alt={`${label} preview`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20" />
          {hasImage && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#7B2E2E] text-white px-2 py-1 rounded-full">
              <span className="text-xs">✓</span>
              <span className="text-[10px]">Uploaded</span>
            </div>
          )}
          <div className="absolute bottom-2 left-2 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">
            {fileName}
          </div>
        </div>
      )}
      
      {/* Show upload state when no file */}
      {!file && (
        <>
          <div className="text-[11px] uppercase tracking-wide text-black/60">{label}</div>
          <div className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-black/10 group-hover:border-[#7B2E2E] transition-colors">
            Upload
          </div>
          <div className="text-[11px] text-black/40">{hint}</div>
          <span className="absolute bottom-2 right-2 text-[10px] text-black/40">JPG/PNG</span>
        </>
      )}
    </motion.label>
  );
}

export default AiStudioModal;