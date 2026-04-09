import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle, Camera, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrackingGuidance } from '@/ar/guidance/TrackingGuidance';
import { getMissingBodyParts } from '@/ar/guidance/garmentGuidance';
import { compositeCapture } from '@/ar/capture/captureCompositor';
import { shareImage } from '@/ar/capture/shareHandler';
import { startCamera, stopCamera } from '@/ar/core/CameraManager';
import { createPoseProcessor, PoseProcessor } from '@/ar/core/PoseProcessor';
import { SceneManager } from '@/ar/core/SceneManager';
import { loadModel, prefetchModel, clearModelCache } from '@/ar/core/ModelLoader';
import { ARProduct, TrackingState } from '@/ar/types';
import { computeCoverCrop, CoverCropInfo } from '@/ar/utils/coordinateUtils';
import { OneEuroFilter, FILTER_PRESETS } from '@/ar/utils/OneEuroFilter';
import { AnchorResolver } from '@/ar/anchoring/AnchorResolver';
import { computeBodyMeasurements } from '@/ar/anchoring/BodyMeasurement';
import { GARMENT_PRESETS } from '@/ar/config/garmentPresets';
import { ShirtAnchor } from '@/ar/anchoring/strategies/ShirtAnchor';
import { AbayaAnchor } from '@/ar/anchoring/strategies/AbayaAnchor';
import { PantsAnchor } from '@/ar/anchoring/strategies/PantsAnchor';
import { AccessoryAnchor } from '@/ar/anchoring/strategies/AccessoryAnchor';
import { OutlierFilter } from '@/ar/utils/OutlierFilter';
import { BoneMapper } from '@/ar/core/BoneMapper';
import { BodySegmenter } from '@/ar/core/BodySegmenter';
import { DebugOverlay } from '@/ar/debug/DebugOverlay';
import { applyClothSway, updateClothSwayTime } from '@/ar/core/ClothSway';
import { ImageOverlay } from '@/ar/core/ImageOverlay';
import type { ARMode } from '@/ar/types';
import type { AnchorResult } from '@/ar/anchoring/types';
import type { Object3D } from 'three';

/** Resolve which AR rendering mode to use, respecting retailer preference. */
export function resolveARMode(product: ARProduct): ARMode {
  const pref = product.ar_preferred_mode || 'auto';
  if (pref === '2d' && product.ar_overlay_url) return '2d';
  if (pref === '3d' && product.ar_model_url) return '3d';
  if (product.ar_overlay_url) return '2d';
  if (product.ar_model_url) return '3d';
  return 'none';
}

// ── Fix 6: Camera error mapping ──
function mapCameraError(err: any): { state: TrackingState; message: string; retry?: boolean } {
  const name = err.name || '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return { state: 'camera_denied', message: 'Camera permission denied.' };
    case 'NotFoundError':
      return { state: 'camera_error', message: 'No camera found. Please check your device has a camera.' };
    case 'NotReadableError':
      return { state: 'camera_error', message: 'Camera is in use by another app. Close other apps and try again.' };
    case 'OverconstrainedError':
      return { state: 'camera_error', message: 'Camera settings not supported. Retrying…', retry: true };
    case 'AbortError':
      return { state: 'camera_error', message: 'Camera initialization was interrupted. Please try again.' };
    default:
      return { state: 'camera_error', message: err.message || 'Camera access failed.' };
  }
}

// ── Fix 5: Performance tier system ──
type PerformanceTier = 'A' | 'B' | 'C';

const TIER_THRESHOLDS = {
  downToB: 22,  // FPS < 22 for 2s → Tier B
  downToC: 15,  // FPS < 15 for 2s → Tier C
  upFromB: 25,  // FPS > 25 for 5s → Tier A
  upFromC: 20,  // FPS > 20 for 5s → Tier B
};

const POSE_INTERVAL_MS = { A: 66, B: 66, C: 100 }; // ~15fps, ~15fps, ~10fps

export default function ARExperience() {
  const { eventId, brandId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedProductId = searchParams.get('productId');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [products, setProducts] = useState<ARProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ARProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidContext, setIsValidContext] = useState(true);
  const [trackingState, setTrackingState] = useState<TrackingState>('initializing');
  const [trackingMessage, setTrackingMessage] = useState('');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [missingParts, setMissingParts] = useState<string[]>([]);
  const [loadProgress, setLoadProgress] = useState<string>('');
  const [loadStage, setLoadStage] = useState<string>('');
  const [modelLoadFailed, setModelLoadFailed] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [arMode, setArMode] = useState<ARMode>('none');
  const [arDebugInfo, setArDebugInfo] = useState<{ status: string; error?: string }>({ status: 'pending' });

  const imageOverlayRef = useRef<ImageOverlay | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const modelPrefetchRef = useRef<{ url: string; promise: Promise<any> } | null>(null);

  const sceneReadyResolveRef = useRef<(() => void) | null>(null);
  const sceneReadyRejectRef = useRef<((err: Error) => void) | null>(null);
  const sceneReadyPromiseRef = useRef<Promise<void>>(
    (() => {
      const p = new Promise<void>((resolve, reject) => {
        sceneReadyResolveRef.current = resolve;
        sceneReadyRejectRef.current = reject;
      });
      p.catch(() => {});
      return p;
    })()
  );

  const sceneManagerRef = useRef<SceneManager | null>(null);
  const poseProcessorRef = useRef<PoseProcessor | null>(null);
  const modelRef = useRef<Object3D | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const framesWithoutPose = useRef(0);
  const cleanedUpRef = useRef(false);
  const modelDimsRef = useRef({ w: 1, h: 1, d: 1 });
  const coverCropRef = useRef<CoverCropInfo>({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });

  // One Euro Filters (3D path)
  const filterPosX = useRef(new OneEuroFilter(FILTER_PRESETS.position.minCutoff, FILTER_PRESETS.position.beta, FILTER_PRESETS.position.dCutoff));
  const filterPosY = useRef(new OneEuroFilter(FILTER_PRESETS.position.minCutoff, FILTER_PRESETS.position.beta, FILTER_PRESETS.position.dCutoff));
  const filterScaleX = useRef(new OneEuroFilter(FILTER_PRESETS.scale.minCutoff, FILTER_PRESETS.scale.beta, FILTER_PRESETS.scale.dCutoff));
  const filterScaleY = useRef(new OneEuroFilter(FILTER_PRESETS.scale.minCutoff, FILTER_PRESETS.scale.beta, FILTER_PRESETS.scale.dCutoff));
  const filterScaleZ = useRef(new OneEuroFilter(FILTER_PRESETS.scale.minCutoff, FILTER_PRESETS.scale.beta, FILTER_PRESETS.scale.dCutoff));
  const filterRotY = useRef(new OneEuroFilter(FILTER_PRESETS.rotation.minCutoff, FILTER_PRESETS.rotation.beta, FILTER_PRESETS.rotation.dCutoff));

  // Outlier filters (3D path)
  const outlierPosX = useRef(new OutlierFilter(15, 3.0));
  const outlierPosY = useRef(new OutlierFilter(15, 3.0));
  const outlierScX = useRef(new OutlierFilter(15, 3.0));
  const outlierScY = useRef(new OutlierFilter(15, 3.0));
  const outlierRotY = useRef(new OutlierFilter(15, 3.0));

  const anchorResolverRef = useRef<AnchorResolver | null>(null);
  const boneMapperRef = useRef<BoneMapper | null>(null);
  const segmenterRef = useRef<BodySegmenter | null>(null);
  const debugRef = useRef<DebugOverlay | null>(null);
  const lastLandmarksRef = useRef<any[] | null>(null);

  // Fix 5: Performance tier state
  const fpsFrames = useRef(0);
  const fpsLastCheck = useRef(0);
  const currentTier = useRef<PerformanceTier>('A');
  const tierStableStart = useRef(0); // timestamp when FPS crossed recovery threshold

  const lastAnchorRef = useRef<AnchorResult | null>(null);
  const pinchScaleRef = useRef(1.0);
  const selectedProductRef = useRef<ARProduct | null>(null);
  selectedProductRef.current = selectedProduct;
  const lastMissingPartsJson = useRef<string>('[]');

  // Ref to track current arMode inside animation loop without stale closure
  const arModeRef = useRef<ARMode>('none');

  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = capturedBlob ? URL.createObjectURL(capturedBlob) : null;
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [capturedBlob]);

  // ── Fix 1: Mode-aware capture ──
  const handleCapture = async () => {
    if (!videoRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      let blob: Blob;
      if (arModeRef.current === '2d' && overlayCanvasRef.current) {
        // 2D mode: overlay canvas already contains video + garment composite
        blob = await new Promise<Blob>((resolve, reject) => {
          overlayCanvasRef.current!.toBlob(
            (b) => {
              if (b) resolve(b);
              else {
                // iOS Safari fallback: use toDataURL
                try {
                  const dataUrl = overlayCanvasRef.current!.toDataURL('image/png');
                  const byteStr = atob(dataUrl.split(',')[1]);
                  const arr = new Uint8Array(byteStr.length);
                  for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
                  resolve(new Blob([arr], { type: 'image/png' }));
                } catch (fallbackErr) {
                  reject(fallbackErr);
                }
              }
            },
            'image/png',
          );
        });
      } else if (canvasRef.current) {
        // 3D mode: composite video + Three.js canvas
        sceneManagerRef.current?.renderIfDirty();
        blob = await compositeCapture(videoRef.current, canvasRef.current);
      } else {
        throw new Error('No canvas available for capture');
      }
      setCapturedBlob(blob);
    } catch (err) {
      console.error('Capture failed:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleShare = async () => {
    if (!capturedBlob) return;
    try {
      await shareImage(capturedBlob);
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  // ── Effect 0: Fetch products ──
  useEffect(() => {
    async function fetchAndValidate() {
      if (!brandId) { setIsValidContext(false); setIsLoading(false); return; }

      await supabase.auth.getSession();

      const { data, error: fetchError } = await supabase
        .from('event_brand_products')
        .select(`id, image_url, ar_model_url, ar_overlay_url, ar_scale, ar_position_offset, garment_type, ar_preferred_mode, event_brands!inner(brand_name, event_id)`)
        .eq('event_brand_id', brandId)
        .eq('ar_enabled', true);

      if (fetchError || !data?.length) {
        setIsValidContext(false);
        setIsLoading(false);
        return;
      }

      if (eventId) {
        const belongsToEvent = data.some((p: any) => p.event_brands?.event_id === eventId);
        if (!belongsToEvent) { setIsValidContext(false); setIsLoading(false); return; }
      }

      const mapped: ARProduct[] = data.map((p: any) => ({
        id: p.id,
        image_url: p.image_url,
        ar_model_url: p.ar_model_url,
        ar_scale: p.ar_scale || 1.0,
        ar_position_offset: p.ar_position_offset as any || { x: 0, y: 0, z: 0 },
        brand_name: p.event_brands?.brand_name,
        name: (p as any).name,
        garment_type: (p as any).garment_type || 'shirt',
        ar_overlay_url: (p as any).ar_overlay_url || undefined,
        ar_preferred_mode: p.ar_preferred_mode || 'auto',
      }));

      setProducts(mapped);

      const selected = requestedProductId
        ? mapped.find(p => p.id === requestedProductId) || mapped[0]
        : mapped[0];
      setSelectedProduct(selected);

      if (selected.ar_model_url && !modelPrefetchRef.current) {
        modelPrefetchRef.current = {
          url: selected.ar_model_url,
          promise: prefetchModel(selected.ar_model_url, (loaded, _total, percent) => {
            if (percent >= 0) setLoadProgress(`${percent}%`);
            else setLoadProgress(`${(loaded / (1024 * 1024)).toFixed(1)} MB`);
          }),
        };
      }

      setIsLoading(false);
    }
    fetchAndValidate();
  }, [brandId, eventId, requestedProductId]);

  // ── Effect 1: Camera + Pose + Scene + Render loop ──
  useEffect(() => {
    if (isLoading) return;
    if (!canvasRef.current || !videoRef.current) return;
    cleanedUpRef.current = false;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    async function initPipeline() {
      try {
        // 1. Check WebGL
        console.log('[AR] Step 1: Checking WebGL support…');
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
        if (!gl) {
          console.error('[AR] WebGL not available');
          setTrackingState('camera_error');
          setTrackingMessage('Your browser does not support WebGL. Try Chrome or Safari.');
          sceneReadyRejectRef.current?.(new Error('webgl_unavailable'));
          return;
        }

        // 2. Camera + Pose + Segmenter in parallel
        setTrackingState('initializing');
        setLoadStage('Starting camera & body tracking…');

        const cameraPromise = startCamera(video).catch((err: any) => ({ error: err }));
        const posePromise = createPoseProcessor().catch((err: any) => ({ error: err }));
        const segPromise = BodySegmenter.create();

        const [camResult, poseResult] = await Promise.all([cameraPromise, posePromise]);
        segPromise.then((seg) => { if (!cleanedUpRef.current) segmenterRef.current = seg; });

        if (cleanedUpRef.current) {
          if (camResult && !('error' in camResult)) stopCamera(camResult.stream);
          if (poseResult && !('error' in poseResult)) poseResult.close();
          return;
        }

        // Fix 6: Handle camera errors with specific messages
        if ('error' in camResult) {
          const err = camResult.error;
          const mapped = mapCameraError(err);

          if (mapped.retry) {
            // OverconstrainedError: retry with relaxed constraints
            console.warn('[AR] Camera overconstrained, retrying with basic constraints…');
            try {
              const retryStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
              video.srcObject = retryStream;
              await video.play();
              streamRef.current = retryStream;
              const vw = video.videoWidth || 640;
              const vh = video.videoHeight || 480;
              coverCropRef.current = computeCoverCrop(vw, vh, window.innerWidth, window.innerHeight);
              // Fall through to continue pipeline
            } catch (retryErr: any) {
              const retryMapped = mapCameraError(retryErr);
              setTrackingState(retryMapped.state);
              setTrackingMessage(retryMapped.message);
              if (poseResult && !('error' in poseResult)) poseResult.close();
              sceneReadyRejectRef.current?.(new Error('camera_failed'));
              return;
            }
          } else {
            setTrackingState(mapped.state);
            setTrackingMessage(mapped.message);
            if (poseResult && !('error' in poseResult)) poseResult.close();
            sceneReadyRejectRef.current?.(new Error('camera_failed'));
            return;
          }
        } else {
          streamRef.current = camResult.stream;
          coverCropRef.current = computeCoverCrop(camResult.videoWidth, camResult.videoHeight, window.innerWidth, window.innerHeight);
        }

        if ('error' in poseResult) {
          setTrackingState('pose_init_failed');
          setTrackingMessage(poseResult.error.message || 'Body tracking failed. Try refreshing.');
          sceneReadyRejectRef.current?.(new Error('pose_failed'));
          return;
        }

        poseProcessorRef.current = poseResult;

        // 3. Scene
        const sm = new SceneManager(canvas);
        sceneManagerRef.current = sm;
        sceneReadyResolveRef.current?.();

        debugRef.current = new DebugOverlay(canvas.parentElement!);

        const resolver = new AnchorResolver();
        resolver.register('shirt', new ShirtAnchor());
        resolver.register('abaya', new AbayaAnchor());
        resolver.register('pants', new PantsAnchor());
        resolver.register('jacket', new ShirtAnchor());
        resolver.register('headwear', new AccessoryAnchor());
        resolver.register('accessory', new AccessoryAnchor());
        anchorResolverRef.current = resolver;

        setTrackingState('waiting_for_pose');
        setLoadStage('');

        // 4. Render loop
        let lastPoseTime = 0;

        const animate = (time: number) => {
          if (cleanedUpRef.current) return;
          const pp = poseProcessorRef.current;
          const poseInterval = POSE_INTERVAL_MS[currentTier.current];

          if (pp && video.readyState >= 2 && time - lastPoseTime > poseInterval) {
            lastPoseTime = time;
            const now = performance.now();
            const result = pp.detectForVideo(video, now);

            if (result && result.landmarks.length > 0 && result.landmarks[0].length > 0) {
              framesWithoutPose.current = 0;
              lastLandmarksRef.current = result.landmarks[0];

              // ── 2D IMAGE OVERLAY PATH ──
              if (imageOverlayRef.current) {
                imageOverlayRef.current.updateFrame(video, result.landmarks[0]);
                setTrackingState('tracking_active');

                // Fix 3: Run segmentation for 2D occlusion too (respects tier)
                if (currentTier.current === 'A') {
                  const frameBudgetMs = performance.now() - now;
                  const seg = segmenterRef.current;
                  if (seg?.isEnabled && frameBudgetMs < 20) {
                    const mask = seg.segment(video, performance.now());
                    if (mask) {
                      imageOverlayRef.current.updateOcclusionMask(mask);
                    }
                  }
                } else {
                  // Tier B/C: no segmentation for 2D
                  imageOverlayRef.current.updateOcclusionMask(null);
                }

                sm.renderIfDirty();
                animFrameRef.current = requestAnimationFrame(animate);
                return;
              }

              // ── 3D GLB PATH ──
              const product = selectedProductRef.current;
              const garmentType = product?.garment_type || 'shirt';
              const config = GARMENT_PRESETS[garmentType];
              const offset = product?.ar_position_offset || { x: 0, y: 0, z: 0 };
              const arScale = product?.ar_scale || 1;

              const measurements = computeBodyMeasurements(
                result.landmarks[0],
                result.worldLandmarks[0],
                coverCropRef.current,
                sm.visibleDims,
              );

              const requiredVisible = config.requiredLandmarks.filter(
                idx => (measurements.visibility[idx] ?? 0) >= config.visibilityThreshold
              );
              const allRequiredVisible = requiredVisible.length === config.requiredLandmarks.length;
              const someRequiredVisible = requiredVisible.length > 0;

              if (allRequiredVisible) {
                setTrackingState('tracking_active');
                if (lastMissingPartsJson.current !== '[]') {
                  lastMissingPartsJson.current = '[]';
                  setMissingParts([]);
                }
              } else if (someRequiredVisible) {
                setTrackingState('partial_tracking');
                const parts = getMissingBodyParts(garmentType, measurements.visibility, config.visibilityThreshold);
                const partsJson = JSON.stringify(parts);
                if (partsJson !== lastMissingPartsJson.current) {
                  lastMissingPartsJson.current = partsJson;
                  setMissingParts(parts);
                }
              } else {
                setTrackingState('waiting_for_pose');
              }

              const anchor = anchorResolverRef.current!.resolve(
                garmentType, measurements, config, modelDimsRef.current
              );

              if (anchor && modelRef.current) {
                modelRef.current.visible = true;

                const px = outlierPosX.current.filter(anchor.position.x) ?? lastAnchorRef.current?.position.x ?? anchor.position.x;
                const py = outlierPosY.current.filter(anchor.position.y) ?? lastAnchorRef.current?.position.y ?? anchor.position.y;
                const sx = outlierScX.current.filter(anchor.scale.x * arScale) ?? lastAnchorRef.current?.scale.x ?? anchor.scale.x * arScale;
                const sy = outlierScY.current.filter(anchor.scale.y * arScale) ?? lastAnchorRef.current?.scale.y ?? anchor.scale.y * arScale;
                const ry = outlierRotY.current.filter(anchor.rotationY) ?? lastAnchorRef.current?.rotationY ?? anchor.rotationY;
                const sz = (sx + sy) / 2;

                const t = performance.now() / 1000;
                const smoothX = filterPosX.current.filter(px, t);
                const smoothY = filterPosY.current.filter(py, t);
                const smoothScX = filterScaleX.current.filter(sx, t);
                const smoothScY = filterScaleY.current.filter(sy, t);
                const smoothScZ = filterScaleZ.current.filter(sz, t);
                const smoothRotY = filterRotY.current.filter(ry, t);

                modelRef.current.position.set(smoothX + offset.x, smoothY + offset.y, anchor.position.z + offset.z);
                modelRef.current.scale.set(
                  smoothScX * pinchScaleRef.current,
                  smoothScY * pinchScaleRef.current,
                  smoothScZ * pinchScaleRef.current,
                );
                modelRef.current.rotation.y = smoothRotY;

                sm.updateOpacity(Math.min(1, anchor.confidence * 1.5));

                if (boneMapperRef.current && result.worldLandmarks[0]) {
                  boneMapperRef.current.update(result.worldLandmarks[0]);
                }

                // Segmentation for 3D occlusion (respects tier — only Tier A)
                if (currentTier.current === 'A') {
                  const frameBudgetMs = performance.now() - now;
                  const seg = segmenterRef.current;
                  if (seg?.isEnabled && frameBudgetMs < 20) {
                    const mask = seg.segment(video, performance.now());
                    if (mask) {
                      sm.updateOcclusionMask(mask.data, mask.width, mask.height);
                    }
                  }
                }

                const floorY = measurements.ankleCenter?.y ?? (measurements.hipCenter.y + 0.8);
                sm.updateShadowPlane(floorY, garmentType);
                sm.dirty = true;

                lastAnchorRef.current = {
                  ...anchor,
                  scale: { x: sx, y: sy, z: sz },
                };
              } else if (modelRef.current) {
                modelRef.current.visible = false;
                sm.dirty = true;
              }
            } else {
              framesWithoutPose.current++;
              if (framesWithoutPose.current > 30) {
                setTrackingState(prev => (prev === 'tracking_active' || prev === 'partial_tracking') ? 'tracking_lost' : 'waiting_for_pose');
                if (modelRef.current) modelRef.current.visible = false;
                sm.dirty = true;
              }
            }
          }

          // Cloth sway animation
          if (modelRef.current?.visible) {
            updateClothSwayTime(modelRef.current, time / 1000);
            sm.dirty = true;
          }

          // Adaptive lighting
          if (video.readyState >= 2) {
            sm.updateLightingFromVideo(video);
          }
          sm.renderIfDirty();

          // Debug overlay
          debugRef.current?.draw(lastLandmarksRef.current, trackingState, segmenterRef.current?.isEnabled ?? false, time);

          // ── Fix 5: Performance tier management ──
          fpsFrames.current++;
          if (time - fpsLastCheck.current > 2000) {
            const fps = fpsFrames.current / ((time - fpsLastCheck.current) / 1000);
            fpsFrames.current = 0;
            fpsLastCheck.current = time;

            const tier = currentTier.current;

            // Downgrade logic
            if (tier === 'A' && fps < TIER_THRESHOLDS.downToB) {
              currentTier.current = 'B';
              segmenterRef.current?.setEnabled(false);
              tierStableStart.current = 0;
              console.warn(`[AR] FPS ${fps.toFixed(0)} → Tier B (segmentation OFF)`);
            } else if (tier === 'B' && fps < TIER_THRESHOLDS.downToC) {
              currentTier.current = 'C';
              sm.setShadowsEnabled(false);
              tierStableStart.current = 0;
              console.warn(`[AR] FPS ${fps.toFixed(0)} → Tier C (shadows OFF, pose 10fps)`);
            } else if (tier === 'A' && fps < TIER_THRESHOLDS.downToC) {
              // Direct jump A→C if very low
              currentTier.current = 'C';
              segmenterRef.current?.setEnabled(false);
              sm.setShadowsEnabled(false);
              tierStableStart.current = 0;
              console.warn(`[AR] FPS ${fps.toFixed(0)} → Tier C (direct from A)`);
            }

            // Recovery logic (step up one tier if FPS sustained for 5s)
            if (tier === 'C' && fps > TIER_THRESHOLDS.upFromC) {
              if (!tierStableStart.current) tierStableStart.current = time;
              else if (time - tierStableStart.current > 5000) {
                currentTier.current = 'B';
                sm.setShadowsEnabled(true);
                tierStableStart.current = 0;
                console.info(`[AR] FPS ${fps.toFixed(0)} → Tier B (recovered, shadows ON)`);
              }
            } else if (tier === 'B' && fps > TIER_THRESHOLDS.upFromB) {
              if (!tierStableStart.current) tierStableStart.current = time;
              else if (time - tierStableStart.current > 5000) {
                currentTier.current = 'A';
                segmenterRef.current?.setEnabled(true);
                tierStableStart.current = 0;
                console.info(`[AR] FPS ${fps.toFixed(0)} → Tier A (recovered, segmentation ON)`);
              }
            } else if (
              (tier === 'C' && fps <= TIER_THRESHOLDS.upFromC) ||
              (tier === 'B' && fps <= TIER_THRESHOLDS.upFromB)
            ) {
              tierStableStart.current = 0; // Reset recovery timer
            }
          }

          animFrameRef.current = requestAnimationFrame(animate);
        };
        animFrameRef.current = requestAnimationFrame(animate);

      } catch (err: any) {
        console.error('[AR] initPipeline crashed:', err);
        setTrackingState('camera_error');
        setTrackingMessage(err.message || 'AR failed to initialize. Try refreshing.');
        setLoadStage('');
        sceneReadyRejectRef.current?.(err instanceof Error ? err : new Error(String(err)));
      }
    }

    initPipeline();

    return () => {
      cleanedUpRef.current = true;
      cancelAnimationFrame(animFrameRef.current);
      stopCamera(streamRef.current);
      streamRef.current = null;
      poseProcessorRef.current?.close();
      poseProcessorRef.current = null;
      sceneManagerRef.current?.dispose();
      sceneManagerRef.current = null;
      clearModelCache();
      segmenterRef.current?.close();
      segmenterRef.current = null;
      debugRef.current?.dispose();
      debugRef.current = null;
      imageOverlayRef.current?.dispose();
      imageOverlayRef.current = null;
    };
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: Model loading ──
  useEffect(() => {
    if (!selectedProduct) return;
    let cancelled = false;

    async function loadWhenReady() {
      try {
        await sceneReadyPromiseRef.current;
      } catch (sceneErr: any) {
        console.error('[AR] sceneReadyPromise rejected:', sceneErr?.message);
        if (!cancelled) {
          setTrackingState(prev => {
            const errorStates: TrackingState[] = ['camera_denied', 'camera_error', 'pose_init_failed'];
            if (errorStates.includes(prev)) return prev;
            return 'camera_error';
          });
          const msg = sceneErr?.message || '';
          if (msg.includes('camera') || msg.includes('Camera')) {
            setTrackingMessage('Camera access failed. Please allow camera permissions and reload.');
          } else if (msg.includes('pose') || msg.includes('Pose') || msg.includes('WASM')) {
            setTrackingMessage('Body tracking failed to load. Check your internet connection and reload.');
          } else if (msg.includes('webgl') || msg.includes('WebGL')) {
            setTrackingMessage('Your browser does not support WebGL. Try Chrome or Safari.');
          } else {
            setTrackingMessage(prev => prev || 'AR scene failed to initialize. Try refreshing.');
          }
        }
        return;
      }
      if (cancelled || !sceneManagerRef.current) return;
      const sm = sceneManagerRef.current;

      // Reset filters
      filterPosX.current.reset(); filterPosY.current.reset();
      filterScaleX.current.reset(); filterScaleY.current.reset(); filterScaleZ.current.reset();
      filterRotY.current.reset();
      outlierPosX.current.reset(); outlierPosY.current.reset();
      outlierScX.current.reset(); outlierScY.current.reset();
      outlierRotY.current.reset();
      lastAnchorRef.current = null;
      pinchScaleRef.current = 1.0;
      boneMapperRef.current?.reset();
      boneMapperRef.current = null;

      // Reset performance tier on product switch
      currentTier.current = 'A';
      tierStableStart.current = 0;
      segmenterRef.current?.setEnabled(true);
      sm.setShadowsEnabled(true);

      const resolvedMode = resolveARMode(selectedProduct);
      console.log('[AR] Mode resolved:', resolvedMode, {
        overlay: selectedProduct.ar_overlay_url,
        model: selectedProduct.ar_model_url,
        pref: selectedProduct.ar_preferred_mode,
      });
      const use2D = resolvedMode === '2d';
      setArMode(resolvedMode);
      arModeRef.current = resolvedMode;

      if (resolvedMode === 'none') {
        setTrackingState('model_error');
        setTrackingMessage('No AR assets found for this product. Ask the retailer to upload a 2D overlay or 3D model.');
        return;
      }

      // Dispose previous 2D overlay
      imageOverlayRef.current?.dispose();
      imageOverlayRef.current = null;

      if (use2D) {
        setTrackingState('model_loading');
        setLoadStage('Loading garment image…');
        try {
          const overlayCanvas = overlayCanvasRef.current;
          if (!overlayCanvas) { setTrackingState('model_error'); return; }
          overlayCanvas.width = window.innerWidth;
          overlayCanvas.height = window.innerHeight;
          const overlay = new ImageOverlay(overlayCanvas);

          // Fix 2/9: Initialize cover crop for 2D overlay
          const v = videoRef.current;
          if (v && v.videoWidth > 0 && v.videoHeight > 0) {
            overlay.updateCoverCrop(v.videoWidth, v.videoHeight, overlayCanvas.width, overlayCanvas.height);
          }

          await overlay.loadGarment(selectedProduct.ar_overlay_url!, selectedProduct.garment_type || 'shirt');
          if (cancelled) return;
          imageOverlayRef.current = overlay;
          setTrackingState('waiting_for_pose');
          setLoadStage('');
        } catch (err: any) {
          if (!cancelled) {
            console.error('[AR] 2D overlay load error:', err, 'URL:', selectedProduct.ar_overlay_url);
            setTrackingState('model_error');
            setTrackingMessage(`Could not load garment image. ${err?.message || ''}`);
          }
        }
        return;
      }

      // ── 3D GLB PATH ──
      setTrackingState('model_loading');
      setLoadStage('Downloading 3D model…');
      setLoadProgress('');
      setModelLoadFailed(false);

      const attemptLoad = (attempt: number) => {
        const prefetch = modelPrefetchRef.current;
        const modelPromise = (prefetch && prefetch.url === selectedProduct.ar_model_url)
          ? (modelPrefetchRef.current = null, prefetch.promise)
          : loadModel(selectedProduct.ar_model_url, (loaded, _total, percent) => {
              if (cancelled) return;
              if (percent >= 0) setLoadProgress(`${percent}%`);
              else setLoadProgress(`${(loaded / (1024 * 1024)).toFixed(1)} MB`);
            });

        modelPromise.then((result) => {
          if (cancelled) return;
          console.log('[AR] Model loaded OK:', { dims: result.dims, isRigged: result.isRigged, boneCount: result.boneNames.length });
          modelRef.current = result.wrapper;
          modelDimsRef.current = result.dims;
          sm.swapModel(result.wrapper);
          sm.enhanceMaterials(selectedProduct.garment_type || 'shirt');
          applyClothSway(result.wrapper, selectedProduct.garment_type || 'shirt');

          if (result.isRigged && result.skeleton) {
            boneMapperRef.current = BoneMapper.create(result.skeleton);
          } else {
            boneMapperRef.current = null;
          }

          setTrackingState('waiting_for_pose');
          setLoadProgress('');
          setLoadStage('');
          sm.dirty = true;
        }).catch((err) => {
          if (cancelled) return;
          console.error(`Model load error (attempt ${attempt}):`, err);
          if (attempt < 2) {
            setLoadProgress('Retrying...');
            setTimeout(() => attemptLoad(attempt + 1), 1000);
          } else {
            setTrackingState('model_error');
            setTrackingMessage(
              err.message?.includes('timed out')
                ? 'Model is too large to load on this connection. Ask the retailer for a smaller file.'
                : 'Could not load 3D model. Check your connection and try again.'
            );
            setModelLoadFailed(true);
          }
        });
      };

      attemptLoad(1);
    }

    loadWhenReady();

    return () => { cancelled = true; };
  }, [selectedProduct]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 3: Resize handler ──
  useEffect(() => {
    const handleResize = () => {
      const sm = sceneManagerRef.current;
      if (!sm) return;
      sm.handleResize();
      const newW = window.innerWidth;
      const newH = window.innerHeight;
      setCanvasSize({ w: newW, h: newH });
      debugRef.current?.resize(newW, newH);
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        coverCropRef.current = computeCoverCrop(
          videoRef.current.videoWidth, videoRef.current.videoHeight,
          newW, newH
        );
        // Fix 9: Update 2D overlay cover crop on resize
        imageOverlayRef.current?.updateCoverCrop(
          videoRef.current.videoWidth, videoRef.current.videoHeight,
          newW, newH
        );
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Effect 4: Pinch-to-zoom ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let initialDistance = 0;
    let initialScale = 1;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistance = getTouchDistance(e.touches[0], e.touches[1]);
        initialScale = pinchScaleRef.current;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance > 0) {
        e.preventDefault();
        const newDist = getTouchDistance(e.touches[0], e.touches[1]);
        const ratio = newDist / initialDistance;
        pinchScaleRef.current = Math.max(0.5, Math.min(2.0, initialScale * ratio));
        if (sceneManagerRef.current) {
          sceneManagerRef.current.dirty = true;
        }
      }
    };

    const onTouchEnd = () => {
      initialDistance = 0;
    };

    canvas.addEventListener('touchstart', onTouchStart);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // ── Render ──

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!isValidContext || products.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4 gap-4">
        <AlertTriangle className="h-12 w-12 text-yellow-400" />
        <p className="text-lg text-white text-center">AR Experience Unavailable</p>
        <p className="text-sm text-white/60 text-center">
          {!isValidContext
            ? "This product doesn't have AR enabled or the link is invalid."
            : "No AR products available for this brand."}
        </p>
        <Button variant="secondary" onClick={() => navigate(eventId ? `/events` : '/dashboard')}>
          Back to Event
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline muted autoPlay
      />

      {/* 2D garment overlay canvas */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: arMode === '2d' ? 'block' : 'none' }}
        width={canvasSize.w}
        height={canvasSize.h}
      />

      {/* Three.js canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: arMode === '3d' || arMode === 'none' ? 'block' : 'none' }}
        width={canvasSize.w}
        height={canvasSize.h}
      />

      {/* Tracking guidance */}
      <TrackingGuidance
        state={trackingState}
        message={trackingMessage}
        garmentType={selectedProduct?.garment_type || 'shirt'}
        missingParts={missingParts}
        loadProgress={loadProgress}
        loadStage={loadStage}
        onRetry={modelLoadFailed ? () => setSelectedProduct(prev => prev ? { ...prev } : prev) : undefined}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-lg font-bold">AR Try-On</h1>
            <p className="text-white/80 text-sm">{selectedProduct?.name || selectedProduct?.brand_name}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={() => navigate(eventId ? `/events` : '/dashboard')}
          >
            Close
          </Button>
        </div>
      </div>

      {/* Tracking quality indicator */}
      {trackingState === 'tracking_active' && (
        <div className="absolute top-16 right-4 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-white/80">Tracking</span>
          <span className="text-xs text-white/60 ml-0.5">({arMode.toUpperCase()})</span>
        </div>
      )}

      {/* Capture button */}
      {(trackingState === 'tracking_active' || trackingState === 'partial_tracking') && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-50"
            aria-label="Take photo"
          >
            <Camera className="h-6 w-6 text-gray-800" />
          </button>
        </div>
      )}

      {/* Capture preview */}
      {capturedBlob && previewUrlRef.current && (
        <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center gap-4 p-6">
          <img
            src={previewUrlRef.current}
            alt="AR capture preview"
            className="max-w-full max-h-[70vh] rounded-xl shadow-2xl object-contain"
          />
          <div className="flex gap-4">
            <Button variant="secondary" className="gap-2" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button variant="ghost" className="text-white hover:bg-white/20" onClick={() => setCapturedBlob(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Product selector */}
      {products.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent z-10">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {products.map(product => (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                  selectedProduct?.id === product.id ? 'border-purple-500 scale-110' : 'border-white/30'
                }`}
              >
                <img src={product.image_url} alt={product.name || 'Product'} className="w-full h-full object-cover" />
                {product.name && (
                  <span className="absolute bottom-0 left-0 right-0 text-[10px] text-white bg-black/60 text-center truncate px-1">
                    {product.name}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getTouchDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
