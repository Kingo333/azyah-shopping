import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { renderSceneToBase64 } from '@/utils/canvasRenderer';
import { useSaveFit } from '@/hooks/useSaveFit';
import type { CanvasScene } from '@/types/canvas';

export type SaveStep = 
  | 'idle'
  | 'preparing' 
  | 'rendering' 
  | 'uploading' 
  | 'saving' 
  | 'success' 
  | 'error';

interface UseCanvasSaveResult {
  saveOutfit: (params: SaveOutfitParams) => Promise<void>;
  currentStep: SaveStep;
  progress: number;
  errorMessage: string | null;
  isLoading: boolean;
  reset: () => void;
}

interface SaveOutfitParams {
  scene: CanvasScene;
  title?: string;
  occasion?: string;
  isPublic: boolean;
  exportQuality?: 'high' | 'medium' | 'low';
}

const MAX_IMAGE_SIZE_MB = 5;

// Phase 6: Configurable export resolution
const EXPORT_CONFIGS = {
  'high': { width: 1080, height: 1920, quality: 0.92 },
  'medium': { width: 720, height: 1280, quality: 0.88 },
  'low': { width: 540, height: 960, quality: 0.85 },
} as const;

const DEFAULT_EXPORT_CONFIG = 'high';

export const useCanvasSave = (): UseCanvasSaveResult => {
  const navigate = useNavigate();
  const saveFit = useSaveFit();
  
  const [currentStep, setCurrentStep] = useState<SaveStep>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setCurrentStep('idle');
    setProgress(0);
    setErrorMessage(null);
  }, []);

  const saveOutfit = useCallback(async (params: SaveOutfitParams) => {
    try {
      // Reset state
      reset();
      
      // Step 1: Validate
      if (params.scene.items.length === 0) {
        throw new Error('Please add items to your outfit first');
      }

      // Step 2: Preparing
      console.log('🎯 Step 1: Preparing to render...');
      setCurrentStep('preparing');
      setProgress(10);

      // Step 3: Rendering - Create canvas image using universal renderer
      console.log('🎯 Step 2: Rendering canvas...');
      setCurrentStep('rendering');
      setProgress(40);

      // Use configured export resolution
      const config = EXPORT_CONFIGS[params.exportQuality ?? DEFAULT_EXPORT_CONFIG];
      console.log(`📐 Rendering canvas at ${config.width}x${config.height} with quality ${config.quality}`);

      // Use universal renderer for export
      const canvasImageBase64 = await renderSceneToBase64(
        params.scene,
        config.width,
        config.height,
        config.quality,
        2 // 2x DPR for high quality
      );

      setProgress(60);

      // Validate generated image
      if (!canvasImageBase64 || !canvasImageBase64.startsWith('data:image')) {
        throw new Error('Failed to generate outfit preview. The canvas may be empty.');
      }

      // Check image size
      const sizeInBytes = (canvasImageBase64.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      
      console.log(`📐 Generated image: ${Math.round(sizeInMB * 100) / 100}MB`);
      
      if (sizeInMB > MAX_IMAGE_SIZE_MB) {
        throw new Error(`Image too large (${Math.round(sizeInMB)}MB). Please remove some items.`);
      }

      // Step 4: Uploading
      console.log('🎯 Step 3: Uploading to storage...');
      setCurrentStep('uploading');
      setProgress(70);

      // Step 4: Saving to database
      console.log('🎯 Step 3: Saving outfit...');
      setCurrentStep('saving');
      setProgress(85);

      // Store the normalized scene data
      const canvasData = params.scene;

      // Create fit items from scene
      const fitItems = params.scene.items.map(item => ({
        wardrobe_item_id: item.wardrobeItemId,
        z_index: item.z,
        transform: {
          x: item.x * params.scene.stageWidth,
          y: item.y * params.scene.stageHeight,
          scale: 1,
          rotation: item.rotation,
        },
      }));

      const result = await saveFit.mutateAsync({
        title: params.title || undefined,
        occasion: params.occasion,
        canvas_json: canvasData,
        canvas_image_base64: canvasImageBase64,
        is_public: params.isPublic,
        items: fitItems,
      });

      // Success!
      console.log('✅ Outfit saved successfully!');
      setCurrentStep('success');
      setProgress(100);
      
      // Clean up autosave
      localStorage.removeItem('dressme_autosave');
      
      // Navigate after short delay
      setTimeout(() => {
        navigate('/dress-me/wardrobe?tab=outfits');
      }, 1000);

    } catch (error) {
      console.error('❌ Save failed:', error);
      setCurrentStep('error');
      setProgress(0);
      
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrorMessage(message);
      toast.error(message);
    }
  }, [navigate, saveFit, reset]);

  return {
    saveOutfit,
    currentStep,
    progress,
    errorMessage,
    isLoading: currentStep !== 'idle' && currentStep !== 'success' && currentStep !== 'error',
    reset,
  };
};
