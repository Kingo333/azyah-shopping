import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { User, Shirt, Video, Image, Download, Loader2, Play, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAiAssets } from '@/hooks/useAiAssets';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useTheNewBlack } from '@/hooks/useTheNewBlack';
import { useGuestGate } from '@/hooks/useGuestGate';
import { GuestActionPrompt } from '@/components/GuestActionPrompt';
import { useNavigate } from 'react-router-dom';
import { AnimatedProgress } from '@/components/ui/animated-progress';
import { ExpiryIndicator } from '@/components/ui/expiry-indicator';
import { useTryOnJobMonitor } from '@/hooks/useTryOnJobMonitor';
import {
  savePictureJob,
  getActivePictureJob,
  clearPictureJob,
  saveVideoJob,
  getActiveVideoJob,
  clearVideoJob,
  getElapsedSeconds,
  formatElapsedTime
} from '@/hooks/useJobPersistence';

export interface AiStudioModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: React.ReactNode;
}

// Helper: Check if an asset has expired (48 hours from creation)
const isAssetExpired = (createdAt: string, expiryHours = 48): boolean => {
  const created = new Date(createdAt);
  const expiresAt = new Date(created.getTime() + expiryHours * 60 * 60 * 1000);
  return Date.now() >= expiresAt.getTime();
};

const AiStudioModal: React.FC<AiStudioModalProps> = ({
  open,
  onClose,
  trigger
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { registerJob } = useTryOnJobMonitor();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'picture' | 'video'>('picture');
  
  // Picture tab state
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [outfitFile, setOutfitFile] = useState<File | null>(null);
  const [personUrl, setPersonUrl] = useState<string | null>(null);
  const [outfitUrl, setOutfitUrl] = useState<string | null>(null);
  const [pictureResult, setPictureResult] = useState<string | null>(null);
  
  // Dedicated upload states for picture tab
  const [uploadingPerson, setUploadingPerson] = useState(false);
  const [uploadingOutfit, setUploadingOutfit] = useState(false);
  
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
  
  // Dedicated upload states for video tab
  const [uploadingVideoPerson, setUploadingVideoPerson] = useState(false);
  const [uploadingVideoOutfit, setUploadingVideoOutfit] = useState(false);
  
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

  // Track if we've already resumed polling
  const hasResumedVideoPolling = useRef(false);

  // Fetch assets when modal opens
  useEffect(() => {
    if (open) {
      fetchAssets();
    }
  }, [open]);

  // Resume video polling on modal open if there's an active job
  useEffect(() => {
    if (open && !videoPolling && !hasResumedVideoPolling.current) {
      const activeJob = getActiveVideoJob();
      if (activeJob) {
        hasResumedVideoPolling.current = true;
        setVideoJobId(activeJob.jobId);
        
        // Calculate true elapsed time from original start
        const elapsed = getElapsedSeconds(activeJob);
        setVideoStatus(`Processing... ${formatElapsedTime(elapsed)} (typically 2-5 min)`);
        
        // Continue polling with true elapsed time
        pollVideoUntilComplete(
          activeJob.jobId,
          (checkResult) => {
            if (checkResult.result_url) {
              setVideoResult(checkResult.result_url);
              setVideoStatus('');
              clearVideoJob();
              fetchAssets();
            }
          },
          (status) => setVideoStatus(status)
        );
      }
    }
    
    // Reset ref when modal closes
    if (!open) {
      hasResumedVideoPolling.current = false;
    }
  }, [open, videoPolling, pollVideoUntilComplete, fetchAssets]);

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
      setUploadingPerson(true);
      const url = await uploadImage(file, 'person');
      setUploadingPerson(false);
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
      setUploadingOutfit(true);
      const url = await uploadImage(file, 'outfit');
      setUploadingOutfit(false);
      if (url) {
        setOutfitUrl(url);
        toast({ title: 'Outfit image uploaded' });
      }
    });
  };

  // Clear picture tab uploads
  const handleClearPicture = () => {
    setPersonFile(null);
    setOutfitFile(null);
    setPersonUrl(null);
    setOutfitUrl(null);
    setPictureResult(null);
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
      // NOTE: Do NOT auto-set videoInputUrl - user must explicitly use "Make Video" button
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
      setUploadingVideoPerson(true);
      const url = await uploadImage(file, 'person');
      setUploadingVideoPerson(false);
      if (url) {
        setVideoPersonUrl(url);
        toast({ title: 'Person image uploaded' });
      } else {
        // Clear file state on failure so user can retry
        setVideoPersonFile(null);
        if (!videoOutfitFile) setVideoUploadMode(null);
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
      setUploadingVideoOutfit(true);
      const url = await uploadImage(file, 'outfit');
      setUploadingVideoOutfit(false);
      if (url) {
        setVideoOutfitUrl(url);
        toast({ title: 'Outfit image uploaded' });
      } else {
        // Clear file state on failure so user can retry
        setVideoOutfitFile(null);
        if (!videoPersonFile) setVideoUploadMode(null);
      }
    });
  };

  // Generate picture for video (uses 1 picture credit)
  const handleGeneratePictureForVideo = async () => {
    if (!videoPersonUrl || !videoOutfitUrl) {
      toast({
        title: 'Missing images',
        description: 'Please upload both person and outfit images',
        variant: 'destructive'
      });
      return;
    }

    // Check picture credits first
    if (pictureCredits <= 0) {
      toast({
        title: 'No picture credits',
        description: 'You need picture credits to generate a try-on for video',
        variant: 'destructive'
      });
      return;
    }

    setGeneratingVideoInput(true);
    const result = await generatePictureFree(videoPersonUrl, videoOutfitUrl);
    setGeneratingVideoInput(false);
    
    if (result.ok && result.result_url) {
      setVideoInputUrl(result.result_url);
      // Refresh credits and assets after generation
      await refetchCredits?.();
      await fetchAssets(); // Refresh gallery to show new result
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
      } else {
        // Clear file state on failure so user can retry
        setDirectImageFile(null);
        setVideoUploadMode(null);
      }
    });
  };

  // Clear person+outfit selection
  const handleClearPersonOutfit = () => {
    setVideoPersonFile(null);
    setVideoOutfitFile(null);
    setVideoPersonUrl(null);
    setVideoOutfitUrl(null);
    setVideoInputUrl(null);
    setVideoResult(null);
    setVideoJobId(null);
    setVideoUploadMode(null);
  };

  // Clear direct upload selection
  const handleClearDirectUpload = () => {
    setDirectImageFile(null);
    setUploadingDirectImage(false);
    setVideoInputUrl(null);
    setVideoResult(null);
    setVideoJobId(null);
    setVideoUploadMode(null);
  };

  // Start video generation - only use videoInputUrl (no pictureResult fallback)
  const handleGenerateVideo = async () => {
    if (!videoInputUrl) {
      toast({
        title: 'No image selected',
        description: 'Generate a try-on first or upload an image',
        variant: 'destructive'
      });
      return;
    }
    
    const imageUrl = videoInputUrl;

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
      // Save to localStorage for persistence
      saveVideoJob(result.job_id);
      // Register for background monitoring (continues even when modal is closed)
      registerJob(result.job_id);
      await refetchCredits();
      
      // Start polling
      pollVideoUntilComplete(
        result.job_id,
        (checkResult) => {
          if (checkResult.result_url) {
            setVideoResult(checkResult.result_url);
            setVideoStatus('');
            clearVideoJob(); // Clear localStorage on completion
            fetchAssets();
          }
        },
        (status) => setVideoStatus(status)
      );
    }
  };

  // Use picture result for video - clear other video state first
  const handleUseForVideo = () => {
    if (pictureResult) {
      // Clear any existing video upload state
      setVideoPersonFile(null);
      setVideoOutfitFile(null);
      setVideoPersonUrl(null);
      setVideoOutfitUrl(null);
      setDirectImageFile(null);
      setUploadingDirectImage(false);
      setVideoResult(null);
      setVideoJobId(null);
      setVideoUploadMode(null);
      // Now set the picture result
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

  // Filter assets by type AND remove expired ones
  const pictureAssets = assets
    .filter(a => a.asset_type !== 'tryon_video')
    .filter(a => !isAssetExpired(a.created_at));
  const videoAssets = assets
    .filter(a => a.asset_type === 'tryon_video')
    .filter(a => !isAssetExpired(a.created_at));

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-[95vw] w-[95vw] h-[100dvh] p-0 border-0 sm:max-w-md md:max-w-lg lg:max-w-xl sm:max-h-[92vh] sm:h-auto">
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
          
          {/* Sheet - White Frosted Glass UI */}
          <motion.div
            initial={{ y: 24, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative w-full sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[92vh]
                       rounded-t-3xl sm:rounded-3xl 
                       bg-white/90 backdrop-blur-2xl
                       shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)]
                       border border-gray-200/60
                       flex flex-col"
          >
            {/* Header - Clean White Glass */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 
                          bg-white/80 backdrop-blur-sm sticky top-0 z-10 rounded-t-3xl">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Shirt className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">AI Studio</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Virtual try-on & video</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5 text-foreground" />
                </button>
              </div>
            </div>

            {/* Tabs - Soft Glass Pill Style */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'picture' | 'video')} className="flex-1 flex flex-col min-h-0">
              <div className="flex-shrink-0 px-4 pt-3">
                <TabsList className="w-full bg-gray-100/80 border border-gray-200/50 p-1 rounded-full grid grid-cols-2 gap-1">
                  <TabsTrigger 
                    value="picture" 
                    className="flex items-center gap-2 text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-full transition-all"
                  >
                    <Image className="h-4 w-4" />
                    Picture
                  </TabsTrigger>
                  <TabsTrigger 
                    value="video" 
                    className="flex items-center gap-2 text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-full transition-all"
                  >
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

              {/* Body - scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* Picture Tab */}
                <TabsContent value="picture" className="mt-0 space-y-4">
                  {/* Upload Section - Light Glass Card */}
                  <div className="rounded-2xl border border-gray-200/50 bg-white/60 backdrop-blur-sm shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">
                        Upload a photo of yourself and an outfit to try on
                      </p>
                      {(personFile || outfitFile || personUrl || outfitUrl) && (
                        <button
                          onClick={handleClearPicture}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <UploadCard
                        icon={<User className="h-5 w-5" />}
                        label="Person"
                        file={personFile}
                        hasUrl={!!personUrl}
                        onFile={handlePersonUpload}
                        hint="Full-body photo"
                        loading={uploadingPerson}
                      />
                      <UploadCard
                        icon={<Shirt className="h-5 w-5" />}
                        label="Outfit"
                        file={outfitFile}
                        hasUrl={!!outfitUrl}
                        onFile={handleOutfitUpload}
                        hint="Clear front view"
                        loading={uploadingOutfit}
                      />
                    </div>
                  </div>

                  {/* Result - Light Glass Card */}
                  {pictureResult && (
                    <div className="rounded-2xl border border-gray-200/50 bg-white/60 backdrop-blur-sm shadow-sm p-4">
                      <div className="aspect-[3/4] w-full rounded-xl overflow-hidden bg-black/30 mb-3">
                        <img 
                          src={pictureResult} 
                          alt="AI Try-On Result" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownload(pictureResult, `tryon-${Date.now()}.png`)}
                          className="flex-1 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition flex items-center justify-center gap-2"
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
                          className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-gray-100 hover:bg-gray-200 text-muted-foreground transition"
                        >
                          {selectMode ? "Done" : "Select"}
                        </button>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {pictureAssets.map(asset => (
                          <button 
                            key={asset.id} 
                            onClick={() => handleAssetClick(asset)}
                            className={`shrink-0 relative w-16 h-20 rounded-lg overflow-hidden bg-gray-100 border
                                       ${selectMode && selectedAssets.includes(asset.id) ? 'ring-2 ring-primary' : 'border-gray-200'}`}
                          >
                            <img src={asset.asset_url} alt="" className="w-full h-full object-cover" />
                            {selectMode && selectedAssets.includes(asset.id) && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <span className="text-primary-foreground text-xs">✓</span>
                                </div>
                              </div>
                            )}
                            {/* Expiry countdown indicator */}
                            {!selectMode && <ExpiryIndicator createdAt={asset.created_at} />}
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
                    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center">
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
                  {/* Upload Section for Video Tab - Light Glass Card */}
                  <div className="rounded-2xl border border-gray-200/50 bg-white/60 backdrop-blur-sm shadow-sm p-4">
                    <p className="text-sm text-muted-foreground text-center mb-2">
                      Upload your photo and outfit to create a 5-second fashion video
                    </p>
                    <p className="text-xs text-muted-foreground/70 text-center mb-3">
                      Note: Video from photos uses 1 picture credit + 1 video credit
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
                              loading={uploadingVideoPerson}
                            />
                            <UploadCard
                              icon={<Shirt className="h-5 w-5" />}
                              label="Outfit"
                              file={videoOutfitFile}
                              hasUrl={!!videoOutfitUrl}
                              onFile={handleVideoOutfitUpload}
                              hint="Clear front view"
                              loading={uploadingVideoOutfit}
                            />
                          </div>
                          
                          {/* Generate Try-On Button */}
                          <motion.button
                            onClick={handleGeneratePictureForVideo}
                            disabled={generatingVideoInput || !videoPersonUrl || !videoOutfitUrl || videoUploadMode === 'direct' || pictureCredits <= 0}
                            whileTap={{ scale: 0.99 }}
                            className="w-full py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2
                              disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                              bg-gray-200 text-foreground hover:bg-gray-300"
                          >
                          {generatingVideoInput ? (
                              <div className="w-full px-2">
                                <AnimatedProgress isActive={true} duration={30} label="Generating Try-On" />
                              </div>
                            ) : pictureCredits <= 0 ? (
                              "No Picture Credits"
                            ) : !videoPersonUrl || !videoOutfitUrl ? (
                              "Upload Both Images"
                            ) : (
                              "Generate Try-On (~30 sec)"
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
                          <div className="flex-1 border-t border-gray-200/60" />
                          <span className="text-xs text-muted-foreground">or upload existing image</span>
                          <div className="flex-1 border-t border-gray-200/60" />
                        </div>

                        {/* Option 2: Direct Image Upload */}
                        <div className={`transition-all ${videoUploadMode === 'person-outfit' ? 'opacity-40 pointer-events-none' : ''}`}>
                          {/* Show image preview if file selected */}
                          {directImageFile ? (
                            <div className="space-y-2">
                              {/* Match UploadCard style: h-32 rounded-xl */}
                              <div className="relative h-32 rounded-xl overflow-hidden bg-black/30 border border-primary/50">
                                <img 
                                  src={URL.createObjectURL(directImageFile)} 
                                  alt="Upload preview"
                                  className="w-full h-full object-cover"
                                />
                                {uploadingDirectImage && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                                  </div>
                                )}
                                {!uploadingDirectImage && videoInputUrl && (
                                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full">
                                    <span className="text-xs">✓ Ready</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Clear button */}
                              <button
                                onClick={handleClearDirectUpload}
                                className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition flex items-center justify-center gap-1"
                              >
                                <X className="h-3 w-3" />
                                Clear selection
                              </button>
                            </div>
                          ) : (
                            <motion.label 
                              whileHover={{ scale: videoUploadMode === 'person-outfit' ? 1 : 1.02 }}
                              whileTap={{ scale: videoUploadMode === 'person-outfit' ? 1 : 0.98 }}
                              className={`group relative flex flex-col items-center justify-center gap-2
                                h-32 rounded-xl border transition-all cursor-pointer overflow-hidden
                                border-dashed border-gray-300 bg-gray-50 hover:border-primary/50 hover:bg-gray-100
                                ${videoUploadMode === 'person-outfit' ? 'cursor-not-allowed opacity-40' : ''}`}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                disabled={videoUploadMode === 'person-outfit'}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleDirectImageUpload(f);
                                }}
                              />
                              <div className="text-muted-foreground">
                                <Video className="h-5 w-5" />
                              </div>
                              <div className="text-sm font-medium text-foreground">Upload for Video</div>
                              <div className="text-[10px] text-muted-foreground">Any image to animate</div>
                            </motion.label>
                          )}
                        </div>

                        {/* Use from Picture Tab */}
                        {pictureResult && !videoUploadMode && (
                          <>
                            <div className="flex items-center gap-2 my-3">
                              <div className="flex-1 border-t border-gray-200/60" />
                              <span className="text-xs text-muted-foreground">or</span>
                              <div className="flex-1 border-t border-gray-200/60" />
                            </div>
                            <button
                              onClick={() => setVideoInputUrl(pictureResult)}
                              className="w-full py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition flex items-center justify-center gap-2"
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
                        <div className="aspect-[3/4] w-full max-w-[200px] mx-auto rounded-xl overflow-hidden bg-gray-100 mb-3 relative">
                          <img 
                            src={videoInputUrl} 
                            alt="Video input" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 left-2 right-2 text-center">
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
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

                    {/* Processing status - text only, progress bar is in the action bar */}
                    {videoPolling && (
                      <div className="text-center py-4 px-4">
                        <p className="text-sm text-muted-foreground">{videoStatus || 'Generating video...'}</p>
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          You can close this modal — we'll notify you when it's ready!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Video Result - Glass Card */}
                  {videoResult && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
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
                        className="w-full py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition flex items-center justify-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Video
                      </button>
                    </div>
                  )}

                  {/* Previous Videos */}
                  {videoAssets.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2">Previous Videos</h3>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {videoAssets.map(asset => (
                          <button 
                            key={asset.id} 
                            onClick={() => handleAssetClick(asset)}
                            className="shrink-0 relative w-16 h-24 rounded-lg overflow-hidden bg-black/30 border border-white/20"
                          >
                            <video src={asset.asset_url} className="w-full h-full object-cover" muted />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Play className="h-5 w-5 text-white" />
                            </div>
                            {/* Expiry countdown indicator */}
                            <ExpiryIndicator createdAt={asset.created_at} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previous Try-On Results - clickable to use for video */}
                  {pictureAssets.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">Previous Try-On Results</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {pictureAssets.slice(0, 8).map(asset => (
                          <button 
                            key={asset.id} 
                            onClick={() => {
                              setVideoInputUrl(asset.asset_url);
                              toast({ title: 'Image ready for video!' });
                            }}
                            className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 hover:border-primary/50 transition"
                          >
                            <img 
                              src={asset.asset_url} 
                              alt="Previous result" 
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Tap a result to use it for video
                      </p>
                    </div>
                  )}

                  {/* Upgrade prompt for video */}
                  {!isPremium && videoCredits <= 0 && (
                    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center">
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

              {/* Sticky Action Bar - White Glass Footer */}
              <div className="flex-shrink-0 p-3 border-t border-gray-200/50 bg-white/80 backdrop-blur-sm shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
                {activeTab === 'picture' ? (
                  <motion.button
                    onClick={handleGeneratePicture}
                    disabled={loading || uploadingPerson || uploadingOutfit || !personUrl || !outfitUrl || pictureCredits <= 0}
                    whileTap={{ scale: 0.99 }}
                    className="w-full h-12 rounded-xl font-semibold transition-all flex items-center justify-center gap-2
                      disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                      bg-primary text-primary-foreground hover:opacity-95"
                  >
                    {loading ? (
                      <div className="w-full px-4">
                        <AnimatedProgress isActive={true} duration={30} label="Generating Try-On" />
                      </div>
                    ) : uploadingPerson || uploadingOutfit ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : !personUrl || !outfitUrl ? (
                      "Upload Both Images"
                    ) : pictureCredits <= 0 ? (
                      "No Credits Left"
                    ) : (
                      "Generate Try-On (~30 sec)"
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    onClick={videoInputUrl ? handleGenerateVideo : handleGeneratePictureForVideo}
                    disabled={
                      videoPolling || 
                      generatingVideoInput || 
                      uploadingDirectImage ||
                      uploadingVideoPerson ||
                      uploadingVideoOutfit ||
                      (videoInputUrl ? videoCredits <= 0 : !(videoPersonUrl && videoOutfitUrl) && !directImageFile)
                    }
                    whileTap={{ scale: 0.99 }}
                    className="w-full h-12 rounded-xl font-semibold transition-all flex items-center justify-center gap-2
                      disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                      bg-primary text-primary-foreground hover:opacity-95"
                  >
                    {videoPolling ? (
                      <div className="w-full px-4">
                        <AnimatedProgress 
                          isActive={true} 
                          duration={90} 
                          label="Creating Video"
                          initialProgress={(() => {
                            const activeJob = getActiveVideoJob();
                            if (activeJob) {
                              const elapsed = getElapsedSeconds(activeJob);
                              return Math.min((elapsed / 90) * 95, 95); // Cap at 95%
                            }
                            return 0;
                          })()}
                        />
                      </div>
                    ) : generatingVideoInput ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Try-On (~30 sec)...
                      </>
                    ) : uploadingDirectImage || uploadingVideoPerson || uploadingVideoOutfit ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : videoInputUrl ? (
                      videoCredits <= 0 ? (
                        "No Video Credits"
                      ) : (
                        "Generate Video (~1-2 min)"
                      )
                    ) : videoUploadMode === 'person-outfit' ? (
                      videoPersonUrl && videoOutfitUrl ? (
                        "Generate Try-On (~30 sec)"
                      ) : (
                        "Upload Both Images"
                      )
                    ) : videoUploadMode === 'direct' ? (
                      "Uploading..."
                    ) : (
                      "Choose an Option Above"
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
                   ? 'border-primary/50 bg-primary/10' 
                   : 'border-dashed border-gray-300 bg-gray-50 hover:border-primary/50 hover:bg-gray-100'
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
