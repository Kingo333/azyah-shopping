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
import { loadModel, clearModelCache } from '@/ar/core/ModelLoader';
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
import type { AnchorResult } from '@/ar/anchoring/types';
import type { Object3D } from 'three';


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

  // Module refs -- SceneManager and PoseProcessor persist for component lifetime
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const poseProcessorRef = useRef<PoseProcessor | null>(null);

  const modelRef = useRef<Object3D | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const framesWithoutPose = useRef(0);
  const cleanedUpRef = useRef(false);
  const modelDimsRef = useRef({ w: 1, h: 1, d: 1 });
  const coverCropRef = useRef<CoverCropInfo>({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });

  // One Euro Filter instances -- one per smoothed axis for independent adaptive smoothing
  const filterPosX = useRef(new OneEuroFilter(FILTER_PRESETS.position.minCutoff, FILTER_PRESETS.position.beta, FILTER_PRESETS.position.dCutoff));
  const filterPosY = useRef(new OneEuroFilter(FILTER_PRESETS.position.minCutoff, FILTER_PRESETS.position.beta, FILTER_PRESETS.position.dCutoff));
  const filterScaleX = useRef(new OneEuroFilter(FILTER_PRESETS.scale.minCutoff, FILTER_PRESETS.scale.beta, FILTER_PRESETS.scale.dCutoff));
  const filterScaleY = useRef(new OneEuroFilter(FILTER_PRESETS.scale.minCutoff, FILTER_PRESETS.scale.beta, FILTER_PRESETS.scale.dCutoff));
  const filterScaleZ = useRef(new OneEuroFilter(FILTER_PRESETS.scale.minCutoff, FILTER_PRESETS.scale.beta, FILTER_PRESETS.scale.dCutoff));
  const filterRotY = useRef(new OneEuroFilter(FILTER_PRESETS.rotation.minCutoff, FILTER_PRESETS.rotation.beta, FILTER_PRESETS.rotation.dCutoff));

  // Outlier rejection filters -- run BEFORE One Euro smoothing (ANCH-10)
  const outlierPosX = useRef(new OutlierFilter(15, 3.0));
  const outlierPosY = useRef(new OutlierFilter(15, 3.0));
  const outlierScX = useRef(new OutlierFilter(15, 3.0));
  const outlierScY = useRef(new OutlierFilter(15, 3.0));
  const outlierRotY = useRef(new OutlierFilter(15, 3.0));

  // AnchorResolver -- created once, persists for component lifetime
  const anchorResolverRef = useRef<AnchorResolver | null>(null);

  // Last known good anchor result for outlier fallback
  const lastAnchorRef = useRef<AnchorResult | null>(null);

  // VIS-01: Pinch-to-zoom manual scale multiplier (persists across frames, no re-render)
  const pinchScaleRef = useRef(1.0);

  // Ref to access selectedProduct inside the render loop without stale closures
  const selectedProductRef = useRef<ARProduct | null>(null);
  selectedProductRef.current = selectedProduct;

  // Missing body parts tracking for partial_tracking state (throttled to avoid re-render storms)
  const lastMissingPartsJson = useRef<string>('[]');

  // Preview URL management -- revoke old URLs to prevent memory leaks
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

  // Capture handler: composites video + Three.js overlay into a single image
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      // Force a render so the overlay canvas has the current frame
      sceneManagerRef.current?.renderIfDirty();
      const blob = await compositeCapture(videoRef.current, canvasRef.current);
      setCapturedBlob(blob);
    } catch (err) {
      console.error('Capture failed:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Share handler: uses Web Share API with download fallback
  const handleShare = async () => {
    if (!capturedBlob) return;
    try {
      await shareImage(capturedBlob);
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  // Fetch AR-enabled products and validate context
  useEffect(() => {
    async function fetchAndValidate() {
      if (!brandId) { setIsValidContext(false); setIsLoading(false); return; }

      const { data, error: fetchError } = await supabase
        .from('event_brand_products')
        .select(`id, image_url, ar_model_url, ar_scale, ar_position_offset, garment_type, event_brands!inner(brand_name, event_id)`)
        .eq('event_brand_id', brandId)
        .eq('ar_enabled', true)
        .not('ar_model_url', 'is', null);

      if (fetchError || !data?.length) {
        setIsValidContext(false);
        setIsLoading(false);
        return;
      }

      // Validate eventId matches
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
      }));

      setProducts(mapped);

      // Preselect requested product or fall back to first
      if (requestedProductId) {
        const requested = mapped.find(p => p.id === requestedProductId);
        setSelectedProduct(requested || mapped[0]);
      } else {
        setSelectedProduct(mapped[0]);
      }
      setIsLoading(false);
    }
    fetchAndValidate();
  }, [brandId, eventId, requestedProductId]);

  // ── Effect 1: Camera + Pose + Scene + Render loop (runs once on mount) ──
  // Empty deps: camera, pose, scene, and render loop persist for component lifetime.
  // Product switches only swap the 3D model (Effect 2), never restart this pipeline.
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;
    cleanedUpRef.current = false;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    async function initPipeline() {
      // 1. Camera
      setTrackingState('initializing');
      try {
        const cam = await startCamera(video);
        if (cleanedUpRef.current) { stopCamera(cam.stream); return; }
        streamRef.current = cam.stream;
        coverCropRef.current = computeCoverCrop(cam.videoWidth, cam.videoHeight, window.innerWidth, window.innerHeight);
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setTrackingState('camera_denied');
        } else {
          setTrackingState('camera_error');
          setTrackingMessage(err.message || 'Camera access failed');
        }
        return;
      }

      // 2. Scene (persistent -- survives product switches)
      const sm = new SceneManager(canvas);
      sceneManagerRef.current = sm;

      // Initialize anchor resolver with all strategies
      const resolver = new AnchorResolver();
      resolver.register('shirt', new ShirtAnchor());
      resolver.register('abaya', new AbayaAnchor());
      resolver.register('pants', new PantsAnchor());
      resolver.register('jacket', new ShirtAnchor());  // Jacket uses shirt strategy with different config
      resolver.register('headwear', new AccessoryAnchor());
      resolver.register('accessory', new AccessoryAnchor());
      anchorResolverRef.current = resolver;

      // 3. Pose
      setTrackingState('waiting_for_pose');
      try {
        const pp = await createPoseProcessor();
        if (cleanedUpRef.current) { pp.close(); return; }
        poseProcessorRef.current = pp;
      } catch (err: any) {
        setTrackingState('pose_init_failed');
        setTrackingMessage(err.message || 'Body tracking failed');
        return;
      }

      // 4. Render loop
      let lastPoseTime = 0;
      const animate = (time: number) => {
        if (cleanedUpRef.current) return;
        const pp = poseProcessorRef.current;
        if (pp && video.readyState >= 2 && time - lastPoseTime > 66) {
          lastPoseTime = time;
          const result = pp.detectForVideo(video, time);
          if (result && result.landmarks.length > 0 && result.landmarks[0].length > 0) {
            framesWithoutPose.current = 0;

            const product = selectedProductRef.current;
            const garmentType = product?.garment_type || 'shirt';
            const config = GARMENT_PRESETS[garmentType];
            const offset = product?.ar_position_offset || { x: 0, y: 0, z: 0 };
            const arScale = product?.ar_scale || 1;

            // Compute body measurements from landmarks (ANCH-02: uses worldLandmarks for metric)
            const measurements = computeBodyMeasurements(
              result.landmarks[0],
              result.worldLandmarks[0],
              coverCropRef.current,
              sm.visibleDims,
            );

            // Check required landmark visibility for partial_tracking detection (UX-01)
            const requiredVisible = config.requiredLandmarks.filter(
              idx => (measurements.visibility[idx] ?? 0) >= config.visibilityThreshold
            );
            const allRequiredVisible = requiredVisible.length === config.requiredLandmarks.length;
            const someRequiredVisible = requiredVisible.length > 0;

            if (allRequiredVisible) {
              setTrackingState('tracking_active');
              // Clear missing parts when fully tracking
              if (lastMissingPartsJson.current !== '[]') {
                lastMissingPartsJson.current = '[]';
                setMissingParts([]);
              }
            } else if (someRequiredVisible) {
              setTrackingState('partial_tracking');
              // Compute and throttle missing parts updates
              const parts = getMissingBodyParts(garmentType, measurements.visibility, config.visibilityThreshold);
              const partsJson = JSON.stringify(parts);
              if (partsJson !== lastMissingPartsJson.current) {
                lastMissingPartsJson.current = partsJson;
                setMissingParts(parts);
              }
            } else {
              setTrackingState('waiting_for_pose');
            }

            // Resolve anchor for garment type (ANCH-01: strategy dispatch)
            const anchor = anchorResolverRef.current!.resolve(
              garmentType, measurements, config, modelDimsRef.current
            );

            if (anchor && modelRef.current) {
              modelRef.current.visible = true;

              // Outlier rejection (ANCH-10): filter before smoothing
              const px = outlierPosX.current.filter(anchor.position.x) ?? lastAnchorRef.current?.position.x ?? anchor.position.x;
              const py = outlierPosY.current.filter(anchor.position.y) ?? lastAnchorRef.current?.position.y ?? anchor.position.y;
              const sx = outlierScX.current.filter(anchor.scale.x * arScale) ?? lastAnchorRef.current?.scale.x ?? anchor.scale.x * arScale;
              const sy = outlierScY.current.filter(anchor.scale.y * arScale) ?? lastAnchorRef.current?.scale.y ?? anchor.scale.y * arScale;
              const ry = outlierRotY.current.filter(anchor.rotationY) ?? lastAnchorRef.current?.rotationY ?? anchor.rotationY;
              const sz = (sx + sy) / 2;  // Z scale is average of X and Y

              // Adaptive smoothing via One Euro Filter
              const t = performance.now() / 1000;
              const smoothX = filterPosX.current.filter(px, t);
              const smoothY = filterPosY.current.filter(py, t);
              const smoothScX = filterScaleX.current.filter(sx, t);
              const smoothScY = filterScaleY.current.filter(sy, t);
              const smoothScZ = filterScaleZ.current.filter(sz, t);
              const smoothRotY = filterRotY.current.filter(ry, t);

              // Apply position with per-product offset
              modelRef.current.position.set(
                smoothX + offset.x,
                smoothY + offset.y,
                anchor.position.z + offset.z,
              );
              // VIS-01: Apply pinch-to-zoom manual scale multiplier
              modelRef.current.scale.set(
                smoothScX * pinchScaleRef.current,
                smoothScY * pinchScaleRef.current,
                smoothScZ * pinchScaleRef.current,
              );
              modelRef.current.rotation.y = smoothRotY;

              // Opacity from anchor confidence
              sm.updateOpacity(Math.min(1, anchor.confidence * 1.5));
              sm.dirty = true;

              // Store for outlier fallback
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
              // Hide model without disposing -- just toggle visibility
              if (modelRef.current) modelRef.current.visible = false;
              sm.dirty = true;
            }
          }
        }
        // VIS-02: Adaptive lighting from camera brightness (self-throttles to 500ms)
        if (video.readyState >= 2) {
          sm.updateLightingFromVideo(video);
        }
        sm.renderIfDirty();  // PERF-02: only render when pose updated or dirty
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
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
      clearModelCache(); // PERF-04: Free cached GPU resources on unmount
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: Model loading (runs when selectedProduct changes) ──
  // Only selectedProduct triggers model reload. Camera, pose, and scene persist.
  useEffect(() => {
    if (!selectedProduct || !sceneManagerRef.current) return;
    const sm = sceneManagerRef.current;
    let cancelled = false;

    // Reset smoothing filters for new product
    filterPosX.current.reset();
    filterPosY.current.reset();
    filterScaleX.current.reset();
    filterScaleY.current.reset();
    filterScaleZ.current.reset();
    filterRotY.current.reset();
    // Reset outlier filters too
    outlierPosX.current.reset();
    outlierPosY.current.reset();
    outlierScX.current.reset();
    outlierScY.current.reset();
    outlierRotY.current.reset();
    lastAnchorRef.current = null;
    pinchScaleRef.current = 1.0; // VIS-01: Reset pinch zoom on product switch

    setTrackingState('model_loading');

    loadModel(selectedProduct.ar_model_url).then((result) => {
      if (cancelled) return;
      modelRef.current = result.wrapper;
      modelDimsRef.current = result.dims;
      sm.swapModel(result.wrapper);
      setTrackingState('waiting_for_pose');
      sm.dirty = true; // Trigger re-render with new model
    }).catch((err) => {
      if (cancelled) return;
      console.error('Model load error:', err);
      setTrackingState('model_error');
      setTrackingMessage('Could not load 3D model');
    });

    return () => { cancelled = true; };
  }, [selectedProduct]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 3: Resize handler (runs once) ──
  useEffect(() => {
    const handleResize = () => {
      const sm = sceneManagerRef.current;
      if (!sm) return;
      sm.handleResize();
      // Recalculate cover crop with new display dimensions
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        coverCropRef.current = computeCoverCrop(
          videoRef.current.videoWidth, videoRef.current.videoHeight,
          window.innerWidth, window.innerHeight
        );
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Effect 4: Pinch-to-zoom gesture handling (VIS-01) ──
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
        e.preventDefault(); // Prevent page zoom
        const newDist = getTouchDistance(e.touches[0], e.touches[1]);
        const ratio = newDist / initialDistance;
        // Clamp pinch scale to [0.5, 2.0]
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

      {/* Three.js canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        width={window.innerWidth}
        height={window.innerHeight}
      />

      {/* Tracking guidance overlay */}
      <TrackingGuidance
        state={trackingState}
        message={trackingMessage}
        garmentType={selectedProduct?.garment_type || 'shirt'}
        missingParts={missingParts}
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
        </div>
      )}

      {/* Capture button -- visible when tracking is active or partial */}
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

      {/* Capture preview overlay */}
      {capturedBlob && previewUrlRef.current && (
        <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center gap-4 p-6">
          <img
            src={previewUrlRef.current}
            alt="AR capture preview"
            className="max-w-full max-h-[70vh] rounded-xl shadow-2xl object-contain"
          />
          <div className="flex gap-4">
            <Button
              variant="secondary"
              className="gap-2"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => setCapturedBlob(null)}
            >
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

/** VIS-01: Compute Euclidean distance between two touch points for pinch gesture. */
function getTouchDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
