import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { preloadCanvasImages } from '@/utils/canvasImageLoader';
import { renderCanvasToBase64 } from '@/utils/canvasToImage';
import type { WardrobeItem } from '@/hooks/useWardrobeItems';
import type { CanvasLayer } from '@/components/EnhancedInteractiveCanvas';

const AUTOSAVE_KEY = 'dressme_canvas_autosave';
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;
const MAX_IMAGE_SIZE_MB = 5;

interface Background {
  type: 'solid' | 'gradient' | 'pattern' | 'image';
  value: string;
}

interface CanvasState {
  layers: CanvasLayer[];
  background: Background;
}

interface SaveParams {
  title?: string;
  occasion?: string;
  isPublic: boolean;
}

export const useCanvasEditor = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [background, setBackground] = useState<Background>({ 
    type: 'solid', 
    value: '#FFFFFF' 
  });
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  // Auto-save to localStorage
  useEffect(() => {
    if (layers.length > 0) {
      const state: CanvasState = { layers, background };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(state));
    }
  }, [layers, background]);

  // Add layer
  const addLayer = useCallback((item: WardrobeItem) => {
    const newLayer: CanvasLayer = {
      id: `layer-${Date.now()}`,
      wardrobeItem: item,
      transform: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        scale: 0.5,
        rotation: 0,
      },
      opacity: 1,
      flipH: false,
      visible: true,
      zIndex: layers.length,
    };
    
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  }, [layers.length]);

  // Update layer
  const updateLayer = useCallback((id: string, updates: Partial<CanvasLayer>) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, ...updates } : layer
    ));
  }, []);

  // Delete layer
  const deleteLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  }, [selectedLayerId]);

  // Reorder layers
  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    setLayers(prev => {
      const newLayers = [...prev];
      const [removed] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, removed);
      return newLayers.map((layer, index) => ({ ...layer, zIndex: index }));
    });
  }, []);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    setLayers([]);
    setSelectedLayerId(null);
    setBackground({ type: 'solid', value: '#FFFFFF' });
    localStorage.removeItem(AUTOSAVE_KEY);
  }, []);

  // Load from localStorage
  const loadFromLocal = useCallback(() => {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      try {
        const parsed: CanvasState = JSON.parse(saved);
        if (parsed.layers?.length > 0) {
          setLayers(parsed.layers);
          setBackground(parsed.background || { type: 'solid', value: '#FFFFFF' });
          toast.success('Loaded autosaved canvas');
        }
      } catch (e) {
        console.error('Failed to load autosave:', e);
      }
    }
  }, []);

  // Load from cloud
  const loadFromCloud = useCallback(async (fitId: string) => {
    try {
      const { data: fitData, error } = await supabase
        .from('fits')
        .select('*')
        .eq('id', fitId)
        .single();

      if (error) throw error;

      if (fitData?.canvas_json) {
        const canvasData = fitData.canvas_json as any;
        setLayers(canvasData.layers || []);
        setBackground(canvasData.background || { type: 'solid', value: '#FFFFFF' });
        toast.success('Loaded outfit from cloud');
      }
    } catch (error) {
      console.error('Failed to load fit:', error);
      toast.error('Failed to load outfit');
    }
  }, []);

  // Save to cloud
  const saveToCloud = useCallback(async (params: SaveParams) => {
    if (!user) {
      toast.error('Please sign in to save');
      return;
    }

    if (layers.length === 0) {
      toast.error('Please add items to your outfit first');
      return;
    }

    setIsSaving(true);
    setSaveProgress(0);

    try {
      // Step 1: Pre-load images (0-30%)
      toast.loading('Preparing images...', { id: 'save-toast' });
      setSaveProgress(10);

      const imagesToLoad = layers
        .filter(l => l.visible)
        .map(l => ({
          id: l.id,
          url: l.wardrobeItem.image_bg_removed_url || l.wardrobeItem.image_url,
        }));

      const { loaded, failed } = await preloadCanvasImages(
        imagesToLoad,
        (loadedCount, total) => {
          setSaveProgress(10 + (loadedCount / total) * 20);
        }
      );

      if (loaded.length === 0) {
        throw new Error('Failed to load images');
      }

      if (failed.length > 0) {
        console.warn(`${failed.length} images failed to load`);
      }

      // Step 2: Render canvas (30-60%)
      toast.loading('Rendering outfit...', { id: 'save-toast' });
      setSaveProgress(40);

      const imageMap = new Map<string, HTMLImageElement>();
      loaded.forEach(({ id, image }) => imageMap.set(id, image));

      // Debug: Log layer positions before rendering
      console.log('📸 Rendering canvas with layers:', layers.map(l => ({
        id: l.id,
        position: { x: l.transform.x, y: l.transform.y },
        scale: l.transform.scale,
      })));

      const canvasImageBase64 = await renderCanvasToBase64(
        layers
          .filter(l => l.visible && imageMap.has(l.id))
          .map(l => ({
            id: l.id,
            imageUrl: '',
            preloadedImage: imageMap.get(l.id)!,
            position: { 
              x: l.transform.x || CANVAS_WIDTH / 2,
              y: l.transform.y || CANVAS_HEIGHT / 2
            },
            scale: l.transform.scale || 1,
            rotation: l.transform.rotation || 0,
            flippedH: l.flipH,
            opacity: l.opacity,
            visible: l.visible,
            zIndex: l.zIndex,
          })),
        background,
        CANVAS_WIDTH,
        CANVAS_HEIGHT
      );

      setSaveProgress(60);

      if (!canvasImageBase64 || !canvasImageBase64.startsWith('data:image')) {
        throw new Error('Failed to generate preview');
      }

      // Validate size
      const sizeInBytes = (canvasImageBase64.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      
      if (sizeInMB > MAX_IMAGE_SIZE_MB) {
        throw new Error(`Image too large (${Math.round(sizeInMB)}MB). Please remove some items.`);
      }

      // Step 3: Upload to storage (60-80%)
      toast.loading('Uploading...', { id: 'save-toast' });
      setSaveProgress(70);

      const fitId = crypto.randomUUID();
      const base64Data = canvasImageBase64.split(',')[1];
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });

      const fileName = `${user.id}/${fitId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('saved-outfits')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('saved-outfits')
        .getPublicUrl(fileName);

      setSaveProgress(80);

      // Step 4: Save to database (80-100%)
      toast.loading('Saving outfit...', { id: 'save-toast' });

      const canvasData = {
        layers: layers.map(layer => ({
          wardrobeItemId: layer.wardrobeItem.id,
          transform: layer.transform,
          opacity: layer.opacity,
          flipH: layer.flipH,
          visible: layer.visible,
          zIndex: layer.zIndex,
        })),
        background,
      };

      const { error: fitError } = await supabase
        .from('fits')
        .insert({
          user_id: user.id,
          title: params.title || undefined,
          occasion: params.occasion,
          canvas_json: canvasData as any,
          image_preview: publicUrl,
          render_path: publicUrl,
          is_public: params.isPublic,
        })
        .select()
        .single();

      if (fitError) throw fitError;

      const savedFitId = fitId;
      const fitItems = layers.map(layer => ({
        fit_id: savedFitId,
        wardrobe_item_id: layer.wardrobeItem.id,
        z_index: layer.zIndex,
        transform: layer.transform as any,
      }));

      const { error: itemsError } = await supabase
        .from('fit_items')
        .insert(fitItems);

      if (itemsError) throw itemsError;

      setSaveProgress(100);

      // Success!
      toast.success('Outfit saved!', { id: 'save-toast' });
      localStorage.removeItem(AUTOSAVE_KEY);
      
      setTimeout(() => {
        navigate('/dress-me/wardrobe?tab=outfits');
      }, 500);

    } catch (error) {
      console.error('Save failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to save outfit';
      toast.error(message, { id: 'save-toast' });
    } finally {
      setIsSaving(false);
      setSaveProgress(0);
    }
  }, [user, layers, background, navigate]);

  return {
    // State
    layers,
    background,
    selectedLayerId,
    isSaving,
    saveProgress,
    
    // Setters
    setLayers,
    setBackground,
    setSelectedLayerId,
    
    // Actions
    addLayer,
    updateLayer,
    deleteLayer,
    reorderLayers,
    clearCanvas,
    
    // Save/Load
    saveToCloud,
    loadFromCloud,
    loadFromLocal,
  };
};
