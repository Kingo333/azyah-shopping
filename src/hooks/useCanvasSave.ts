import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { preloadCanvasImages, ImageLoadResult } from '@/utils/canvasImageLoader';
import { renderCanvasToBase64 } from '@/utils/canvasToImage';
import { useSaveFit } from '@/hooks/useSaveFit';
import type { CanvasLayer } from '@/components/EnhancedInteractiveCanvas';

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
  layers: CanvasLayer[];
  background: { type: 'solid' | 'gradient' | 'pattern' | 'image'; value: string };
  title?: string;
  occasion?: string;
  isPublic: boolean;
}

const MAX_IMAGE_SIZE_MB = 5;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 800;

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
      if (params.layers.length === 0) {
        throw new Error('Please add items to your outfit first');
      }

      // Step 2: Preparing - Pre-load all images
      console.log('🎯 Step 1: Preparing images...');
      setCurrentStep('preparing');
      setProgress(10);

      const imagesToLoad = params.layers
        .filter(l => l.visible)
        .map(l => ({
          id: l.id,
          url: l.wardrobeItem.image_bg_removed_url || l.wardrobeItem.image_url,
        }));

      const { loaded, failed } = await preloadCanvasImages(
        imagesToLoad,
        (loadedCount, total) => {
          const loadProgress = 10 + (loadedCount / total) * 20; // 10-30%
          setProgress(loadProgress);
        }
      );

      if (loaded.length === 0) {
        throw new Error('Failed to load any outfit images. Please check your internet connection.');
      }

      if (failed.length > 0) {
        console.warn(`⚠️ ${failed.length} images failed to load, continuing with ${loaded.length} images`);
      }

      // Step 3: Rendering - Create canvas image
      console.log('🎯 Step 2: Rendering canvas...');
      setCurrentStep('rendering');
      setProgress(40);

      // Create image map for quick lookup
      const imageMap = new Map<string, HTMLImageElement>();
      loaded.forEach(({ id, image }) => imageMap.set(id, image));

      const canvasImageBase64 = await renderCanvasToBase64(
        params.layers
          .filter(l => l.visible && imageMap.has(l.id))
          .map(l => ({
            id: l.id,
            imageUrl: '', // Not used anymore
            preloadedImage: imageMap.get(l.id)!,
            position: { x: l.transform.x || 0, y: l.transform.y || 0 },
            scale: l.transform.scale || 1,
            rotation: l.transform.rotation || 0,
            flippedH: l.flipH,
            opacity: l.opacity,
            visible: l.visible,
            zIndex: l.zIndex,
          })),
        params.background,
        CANVAS_WIDTH,
        CANVAS_HEIGHT
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

      // Step 5: Saving to database
      console.log('🎯 Step 4: Saving outfit...');
      setCurrentStep('saving');
      setProgress(85);

      const canvasData = {
        layers: params.layers.map(layer => ({
          wardrobeItemId: layer.wardrobeItem.id,
          transform: layer.transform,
          opacity: layer.opacity,
          flipH: layer.flipH,
          visible: layer.visible,
          zIndex: layer.zIndex,
        })),
        background: params.background,
      };

      const fitItems = params.layers.map(layer => ({
        wardrobe_item_id: layer.wardrobeItem.id,
        z_index: layer.zIndex,
        transform: layer.transform,
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
