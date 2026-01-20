import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { User, Shirt, Video, Image, Download, Loader2, Play, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAiAssets } from '@/hooks/useAiAssets';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useTheNewBlack } from '@/hooks/useTheNewBlack';
import { useGuestGate } from '@/hooks/useGuestGate';
import { GuestActionPrompt } from '@/components/GuestActionPrompt';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'picture' | 'video'>('picture');
  
  // Picture tab state
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [outfitFile, setOutfitFile] = useState<File | null>(null);
  const [personUrl, setPersonUrl] = useState<string | null>(null);
  const [outfitUrl, setOutfitUrl] = useState<string | null>(null);
  const [pictureResult, setPictureResult] = useState<string | null>(null);
  
  // Video tab state
  const [videoPersonFile, setVideoPersonFile] = useState<File | null>(null);
  const [videoOutfitFile, setVideoOutfitFile] = useState<File | null>(null);
  const [videoPersonUrl, setVideoPersonUrl] = useState<string | null>(null);
  const [videoOutfitUrl, setVideoOutfitUrl] = useState<string | null>(null);
  const [videoInputUrl, setVideoInputUrl] = useState<string | null>(null);
  const [videoJobId, setVideoJobId] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<string>('');
  const [generatingVideoInput, setGeneratingVideoInput] = useState(false);
  const [directImageFile, setDirectImageFile] = useState<File | null>(null);
  const [uploadingDirectImage, setUploadingDirectImage] = useState(false);
  
  // Mutual exclusivity: which upload mode is active in video tab
  const [videoUploadMode, setVideoUploadMode] = useState<'person-outfit' | 'direct' | null>(null);
  
  // Asset selection for deletion
  const [selectMode, setSelectMode] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  // Hooks
  const { 
    loading, 
    videoPolling, 
    uploadImage, 
    generatePicture,
    generatePictureFree,
    startVideoGeneration,
    pollVideoUntilComplete 
  } = useTheNewBlack();
  
  const { assets, loading: assetsLoading, fetchAssets, deleteAssets } = useAiAssets();
  const { isPremium, createPaymentIntent } = useSubscription();
  const { credits, loading: creditsLoading, refetch: refetchCredits } = useUserCredits();
  const { requireAuth, showPrompt, setShowPrompt, promptAction } = useGuestGate();

  // Credits
  const pictureCredits = credits?.ai_studio_credits ?? 0;
  const videoCredits = credits?.video_credits ?? 0;
  const maxPictureCredits = isPremium ? 10 : 4;
  const maxVideoCredits = isPremium ? 4 : 1;

  // Fetch assets when modal opens
  useEffect(() => {
    if (open) {
      fetchAssets();
    }
  }, [open]);

  // File validation
  const validateFile = (file: File): boolean => {
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 10MB',
        variant: 'destructive'
      });
      return false;
    }
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return false;
    }
    return true;
  };

  // Handle person file upload
  const handlePersonUpload = async (file: File) => {
    if (!validateFile(file)) return;
    
    requireAuth('upload images for AI Try-On', async () => {
      setPersonFile(file);
      const url = await uploadImage(file, 'person');
      if (url) {
        setPersonUrl(url);
        toast({ title: 'Person image uploaded' });
      }
    });
  };

  // Handle outfit file upload
  const handleOutfitUpload = async (file: File) => {
    if (!validateFile(file)) return;
    
    requireAuth('upload images for AI Try-On', async () => {
      setOutfitFile(file);
      const url = await uploadImage(file, 'outfit');
      if (url) {
        setOutfitUrl(url);
        toast({ title: 'Outfit image uploaded' });
      }
    });
  };

  // Generate picture try-on
  const handleGeneratePicture = async () => {
    if (!personUrl || !outfitUrl) {
      toast({
        title: 'Missing images',
        description: 'Please upload both person and outfit images',
        variant: 'destructive'
      });
      return;
    }

    if (pictureCredits <= 0) {
      toast({
        title: 'No credits remaining',
        description: isPremium 
          ? 'You have used all your daily picture credits' 
          : 'Upgrade to premium for more daily credits!',
        variant: 'destructive'
      });
      return;
    }

    const result = await generatePicture(personUrl, outfitUrl);
    if (result.ok && result.result_url) {
      setPictureResult(result.result_url);
      setVideoInputUrl(result.result_url); // Auto-set for video tab
      await refetchCredits();
      await fetchAssets();
    }
  };

  // Handle video tab person upload
  const handleVideoPersonUpload = async (file: File) => {
    if (!validateFile(file)) return;
    
    requireAuth('upload images for AI Try-On', async () => {
      // Clear direct upload mode when using person+outfit
      if (directImageFile) {
        setDirectImageFile(null);
      }
      setVideoUploadMode('person-outfit');
      
      setVideoPersonFile(file);
      const url = await uploadImage(file, 'person');
      if (url) {
        setVideoPersonUrl(url);
        toast({ title: 'Person image uploaded' });
      }
    });
  };

  // Handle video tab outfit upload
  const handleVideoOutfitUpload = async (file: File) => {
    if (!validateFile(file)) return;
    
    requireAuth('upload images for AI Try-On', async () => {
      // Clear direct upload mode when using person+outfit
      if (directImageFile) {
        setDirectImageFile(null);
      }
      setVideoUploadMode('person-outfit');
      
      setVideoOutfitFile(file);
      const url = await uploadImage(file, 'outfit');
      if (url) {
        setVideoOutfitUrl(url);
        toast({ title: 'Outfit image uploaded' });
      }
    });
  };

  // Generate picture for video (FREE - no credit deduction)
  const handleGeneratePictureForVideo = async () => {
    if (!videoPersonUrl || !videoOutfitUrl) {
      toast({
        title: 'Missing images',
        description: 'Please upload both person and outfit images',
        variant: 'destructive'
      });
      return;
    }

    setGeneratingVideoInput(true);
    const result = await generatePictureFree(videoPersonUrl, videoOutfitUrl);
    setGeneratingVideoInput(false);
    
    if (result.ok && result.result_url) {
      setVideoInputUrl(result.result_url);
      toast({ title: 'Try-on ready for video!' });
    }
  };

  // Handle direct image upload for video
  const handleDirectImageUpload = async (file: File) => {
    if (!validateFile(file)) return;
    
    requireAuth('upload images for video', async () => {
      // Clear person+outfit when using direct upload
      setVideoPersonFile(null);
      setVideoOutfitFile(null);
      setVideoPersonUrl(null);
      setVideoOutfitUrl(null);
      setVideoUploadMode('direct');
      
      setDirectImageFile(file);
      setUploadingDirectImage(true);
      const url = await uploadImage(file, 'person');
      setUploadingDirectImage(false);
      if (url) {
        setVideoInputUrl(url);
        toast({ title: 'Image ready for video!' });
      }
    });
  };

  // Clear person+outfit selection
  const handleClearPersonOutfit = () => {
    setVideoPersonFile(null);
    setVideoOutfitFile(null);
    setVideoPersonUrl(null);
    setVideoOutfitUrl(null);
    setVideoUploadMode(null);
  };

  // Clear direct upload selection
  const handleClearDirectUpload = () => {
    setDirectImageFile(null);
    setVideoInputUrl(null);
    setVideoUploadMode(null);
  };

  // Start video generation
  const handleGenerateVideo = async () => {
    const imageUrl = videoInputUrl || pictureResult;
    
    if (!imageUrl) {
      toast({
        title: 'No image selected',
        description: 'Generate a picture try-on first or upload an image',
        variant: 'destructive'
      });
      return;
    }

    if (videoCredits <= 0) {
      toast({
        title: 'No video credits remaining',
        description: isPremium 
          ? 'You have used all your daily video credits' 
          : 'Sign up for premium to get 4 video credits daily!',
        variant: 'destructive'
      });
      return;
    }

    const result = await startVideoGeneration(imageUrl);
    if (result.ok && result.job_id) {
      setVideoJobId(result.job_id);
      await refetchCredits();
      
      // Start polling
      pollVideoUntilComplete(
        result.job_id,
        (checkResult) => {
          if (checkResult.result_url) {
            setVideoResult(checkResult.result_url);
            setVideoStatus('');
            fetchAssets();
          }
        },
        (status) => setVideoStatus(status)
      );
    }
  };

  // Use picture result for video
  const handleUseForVideo = () => {
    if (pictureResult) {
      setVideoInputUrl(pictureResult);
      setActiveTab('video');
      toast({ title: 'Image ready for video generation' });
    }
  };

  // Download handler
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch {
      toast({
        title: 'Download failed',
        description: 'Could not download the file',
        variant: 'destructive'
      });
    }
  };

  // Asset handlers
  const handleAssetClick = (asset: any) => {
    if (selectMode) {
      setSelectedAssets(prev => 
        prev.includes(asset.id) 
          ? prev.filter(id => id !== asset.id)
          : [...prev, asset.id]
      );
    } else {
      // Set as current result based on type
      if (asset.asset_type === 'tryon_video') {
        setVideoResult(asset.asset_url);
        setActiveTab('video');
      } else {
        setPictureResult(asset.asset_url);
        setVideoInputUrl(asset.asset_url);
        setActiveTab('picture');
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedAssets.length > 0) {
      await deleteAssets(selectedAssets);
      setSelectedAssets([]);
      setSelectMode(false);
    }
  };

  const handleUpgradeClick = () => {
    onClose();
    navigate('/dashboard/upgrade');
  };

  // Filter assets by type
  const pictureAssets = assets.filter(a => a.asset_type !== 'tryon_video');
  const videoAssets = assets.filter(a => a.asset_type === 'tryon_video');

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
                       rounded-t-2xl sm:rounded-2xl bg-background shadow-2xl border border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">AI Studio</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Virtual try-on & video</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-muted active:scale-95 transition"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5 text-foreground" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'picture' | 'video')} className="flex-1">
              <div className="px-4 pt-3 bg-card">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="picture" className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Picture
                  </TabsTrigger>
                  <TabsTrigger value="video" className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Video
                  </TabsTrigger>
                </TabsList>
                
                {/* Credits display */}
                <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>Picture: <strong className="text-foreground">{pictureCredits}/{maxPictureCredits}</strong></span>
                  <span>Video: <strong className="text-foreground">{videoCredits}/{maxVideoCredits}</strong></span>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(92vh-180px)]">
                
                {/* Picture Tab */}
                <TabsContent value="picture" className="mt-0 space-y-4">
                  {/* Upload Section */}
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-sm text-muted-foreground text-center mb-3">
                      Upload a photo of yourself and an outfit to try on
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <UploadCard
                        icon={<User className="h-5 w-5" />}
                        label="Person"
                        file={personFile}
                        hasUrl={!!personUrl}
                        onFile={handlePersonUpload}
                        hint="Full-body photo"
                        loading={loading && personFile && !personUrl}
                      />
                      <UploadCard
                        icon={<Shirt className="h-5 w-5" />}
                        label="Outfit"
                        file={outfitFile}
                        hasUrl={!!outfitUrl}
                        onFile={handleOutfitUpload}
                        hint="Clear front view"
                        loading={loading && outfitFile && !outfitUrl}
                      />
                    </div>
                  </div>

                  {/* Result */}
                  {pictureResult && (
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <div className="aspect-[3/4] w-full rounded-xl overflow-hidden bg-muted mb-3">
                        <img 
                          src={pictureResult} 
                          alt="AI Try-On Result" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownload(pictureResult, `tryon-${Date.now()}.png`)}
                          className="flex-1 py-2 text-sm font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition flex items-center justify-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                        <button
                          onClick={handleUseForVideo}
                          className="flex-1 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2"
                        >
                          <Video className="h-4 w-4" />
                          Make Video
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Previous Results */}
                  {pictureAssets.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-foreground">Previous Results</h3>
                        <button 
                          onClick={() => {
                            setSelectMode(!selectMode);
                            setSelectedAssets([]);
                          }}
                          className="text-xs px-2 py-1 rounded-full border border-border bg-card hover:bg-muted transition"
                        >
                          {selectMode ? "Done" : "Select"}
                        </button>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {pictureAssets.map(asset => (
                          <button 
                            key={asset.id} 
                            onClick={() => handleAssetClick(asset)}
                            className={`shrink-0 relative w-16 h-20 rounded-lg overflow-hidden bg-muted border
                                       ${selectMode && selectedAssets.includes(asset.id) ? 'ring-2 ring-primary' : 'border-border'}`}
                          >
                            <img src={asset.asset_url} alt="" className="w-full h-full object-cover" />
                            {selectMode && selectedAssets.includes(asset.id) && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <span className="text-primary-foreground text-xs">✓</span>
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                      {selectMode && selectedAssets.length > 0 && (
                        <button
                          onClick={handleDeleteSelected}
                          className="mt-2 px-3 py-1.5 text-xs bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition"
                        >
                          Delete ({selectedAssets.length})
                        </button>
                      )}
                    </div>
                  )}

                  {/* Upgrade prompt for non-premium */}
                  {!isPremium && pictureCredits <= 0 && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
                      <p className="text-sm text-foreground mb-2">
                        You've used your free credits
                      </p>
                      <button
                        onClick={handleUpgradeClick}
                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
                      >
                        Upgrade for 10 daily credits
                      </button>
                    </div>
                  )}
                </TabsContent>

                {/* Video Tab */}
                <TabsContent value="video" className="mt-0 space-y-4">
                  {/* Upload Section for Video Tab */}
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-sm text-muted-foreground text-center mb-3">
                      Upload your photo and outfit to create a 5-second fashion video
                    </p>
                    
                    {!videoInputUrl ? (
                      <>
                        {/* Option 1: Person + Outfit Flow */}
                        <div className={`transition-all ${videoUploadMode === 'direct' ? 'opacity-40 pointer-events-none' : ''}`}>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <UploadCard
                              icon={<User className="h-5 w-5" />}
                              label="Person"
                              file={videoPersonFile}
                              hasUrl={!!videoPersonUrl}
                              onFile={handleVideoPersonUpload}
                              hint="Full-body photo"
                              loading={loading && videoPersonFile && !videoPersonUrl}
                            />
                            <UploadCard
                              icon={<Shirt className="h-5 w-5" />}
                              label="Outfit"
                              file={videoOutfitFile}
                              hasUrl={!!videoOutfitUrl}
                              onFile={handleVideoOutfitUpload}
                              hint="Clear front view"
                              loading={loading && videoOutfitFile && !videoOutfitUrl}
                            />
                          </div>
                          
                          {/* Generate Try-On Button */}
                          <motion.button
                            onClick={handleGeneratePictureForVideo}
                            disabled={generatingVideoInput || !videoPersonUrl || !videoOutfitUrl || videoUploadMode === 'direct'}
                            whileTap={{ scale: 0.99 }}
                            className="w-full py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2
                              disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed
                              bg-secondary text-secondary-foreground hover:opacity-90"
                          >
                            {generatingVideoInput ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating (~30 sec)...
                              </>
                            ) : !videoPersonUrl || !videoOutfitUrl ? (
                              "Upload Both Images"
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                Generate Try-On (~30 sec)
                              </>
                            )}
                          </motion.button>
                          
                          {/* Clear button for person+outfit */}
                          {videoUploadMode === 'person-outfit' && (videoPersonFile || videoOutfitFile) && (
                            <button
                              onClick={handleClearPersonOutfit}
                              className="w-full mt-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                            >
                              Clear selection
                            </button>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-2 my-3">
                          <div className="flex-1 border-t border-border" />
                          <span className="text-xs text-muted-foreground">or upload existing image</span>
                          <div className="flex-1 border-t border-border" />
                        </div>

                        {/* Option 2: Direct Image Upload */}
                        <div className={`transition-all ${videoUploadMode === 'person-outfit' ? 'opacity-40 pointer-events-none' : ''}`}>
                          <motion.label 
                            whileHover={{ scale: videoUploadMode === 'person-outfit' ? 1 : 1.01 }}
                            whileTap={{ scale: videoUploadMode === 'person-outfit' ? 1 : 0.99 }}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all cursor-pointer
                              ${directImageFile 
                                ? 'border-primary bg-primary/5' 
                                : 'border-dashed border-border hover:border-primary hover:bg-muted'
                              }
                              ${videoUploadMode === 'person-outfit' ? 'cursor-not-allowed' : ''}`}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={videoUploadMode === 'person-outfit'}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleDirectImageUpload(f);
                              }}
                            />
                            {uploadingDirectImage ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Image className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Upload Image for Video</span>
                              </>
                            )}
                          </motion.label>
                          
                          {/* Clear button for direct upload */}
                          {videoUploadMode === 'direct' && directImageFile && (
                            <button
                              onClick={handleClearDirectUpload}
                              className="w-full mt-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                            >
                              Clear selection
                            </button>
                          )}
                        </div>

                        {/* Use from Picture Tab */}
                        {pictureResult && !videoUploadMode && (
                          <>
                            <div className="flex items-center gap-2 my-3">
                              <div className="flex-1 border-t border-border" />
                              <span className="text-xs text-muted-foreground">or</span>
                              <div className="flex-1 border-t border-border" />
                            </div>
                            <button
                              onClick={() => setVideoInputUrl(pictureResult)}
                              className="w-full py-2 text-sm font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition flex items-center justify-center gap-2"
                            >
                              <Sparkles className="h-4 w-4" />
                              Use Picture Tab Result
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Input image preview */}
                        <div className="aspect-[3/4] w-full max-w-[200px] mx-auto rounded-xl overflow-hidden bg-muted mb-3 relative">
                          <img 
                            src={videoInputUrl} 
                            alt="Video input" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 left-2 right-2 text-center">
                            <span className="text-xs bg-black/50 text-white px-2 py-1 rounded">
                              Ready for video
                            </span>
                          </div>
                        </div>
                        
                        {/* Change image button */}
                        <button
                          onClick={() => {
                            setVideoInputUrl(null);
                            setVideoPersonFile(null);
                            setVideoOutfitFile(null);
                            setVideoPersonUrl(null);
                            setVideoOutfitUrl(null);
                            setDirectImageFile(null);
                            setVideoUploadMode(null);
                          }}
                          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition"
                        >
                          ← Change image
                        </button>
                      </>
                    )}

                    {/* Processing status */}
                    {videoPolling && (
                      <div className="text-center py-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
                        <p className="text-sm text-muted-foreground">{videoStatus || 'Generating video...'}</p>
                        <p className="text-xs text-muted-foreground mt-1">Estimated time: ~59 seconds</p>
                      </div>
                    )}
                  </div>

                  {/* Video Result */}
                  {videoResult && (
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <div className="aspect-[9/16] w-full max-w-[300px] mx-auto rounded-xl overflow-hidden bg-black mb-3">
                        <video 
                          src={videoResult} 
                          controls 
                          autoPlay
                          loop
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <button
                        onClick={() => handleDownload(videoResult, `fashion-video-${Date.now()}.mp4`)}
                        className="w-full py-2 text-sm font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition flex items-center justify-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Video
                      </button>
                    </div>
                  )}

                  {/* Previous Videos */}
                  {videoAssets.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">Previous Videos</h3>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {videoAssets.map(asset => (
                          <button 
                            key={asset.id} 
                            onClick={() => handleAssetClick(asset)}
                            className="shrink-0 relative w-16 h-24 rounded-lg overflow-hidden bg-muted border border-border"
                          >
                            <video src={asset.asset_url} className="w-full h-full object-cover" muted />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Play className="h-5 w-5 text-white" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upgrade prompt for video */}
                  {!isPremium && videoCredits <= 0 && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
                      <p className="text-sm text-foreground mb-2">
                        Sign up for premium to get 4 video credits daily!
                      </p>
                      <button
                        onClick={handleUpgradeClick}
                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
                      >
                        Upgrade to Premium
                      </button>
                    </div>
                  )}
                </TabsContent>
              </div>

              {/* Sticky Action Bar */}
              <div className="p-3 border-t border-border bg-card">
                {activeTab === 'picture' ? (
                  <motion.button
                    onClick={handleGeneratePicture}
                    disabled={loading || !personUrl || !outfitUrl || pictureCredits <= 0}
                    whileTap={{ scale: 0.99 }}
                    className="w-full h-12 rounded-xl font-semibold transition-all flex items-center justify-center gap-2
                      disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed
                      bg-primary text-primary-foreground hover:opacity-95"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating (~30 sec)...
                      </>
                    ) : !personUrl || !outfitUrl ? (
                      "Upload Both Images"
                    ) : pictureCredits <= 0 ? (
                      "No Credits Left"
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Try-On (~30 sec)
                      </>
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={handleGenerateVideo}
                    disabled={videoPolling || generatingVideoInput || !videoInputUrl || videoCredits <= 0}
                    whileTap={{ scale: 0.99 }}
                    className="w-full h-12 rounded-xl font-semibold transition-all flex items-center justify-center gap-2
                      disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed
                      bg-primary text-primary-foreground hover:opacity-95"
                  >
                    {videoPolling ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating Video (~59 sec)...
                      </>
                    ) : generatingVideoInput ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Preparing...
                      </>
                    ) : !videoInputUrl ? (
                      "Generate Try-On First"
                    ) : videoCredits <= 0 ? (
                      "No Video Credits"
                    ) : (
                      <>
                        <Video className="h-4 w-4" />
                        Generate Video (~59 sec)
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </Tabs>
          </motion.div>
        </div>
      </DialogContent>
      
      {/* Guest Action Prompt */}
      <GuestActionPrompt 
        open={showPrompt} 
        onOpenChange={setShowPrompt} 
        action={promptAction} 
      />
    </Dialog>
  );
};

/* ---- Subcomponents ---- */

function UploadCard({
  icon, label, file, hasUrl, onFile, hint, loading
}: { 
  icon: React.ReactNode;
  label: string;
  file?: File | null;
  hasUrl: boolean;
  onFile: (f: File) => void; 
  hint: string;
  loading?: boolean;
}) {
  return (
    <motion.label 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative flex flex-col items-center justify-center gap-2
                 h-32 rounded-xl border transition-all cursor-pointer overflow-hidden
                 ${hasUrl 
                   ? 'border-primary bg-primary/5' 
                   : 'border-dashed border-border bg-muted hover:border-primary hover:bg-card'
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
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          {hasUrl && !loading && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full">
              <span className="text-xs">✓</span>
            </div>
          )}
        </div>
      )}
      
      {/* Show upload state when no file */}
      {!file && (
        <>
          <div className="text-muted-foreground">{icon}</div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="text-[10px] text-muted-foreground">{hint}</div>
        </>
      )}
    </motion.label>
  );
}

export default AiStudioModal;
