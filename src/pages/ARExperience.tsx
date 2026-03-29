import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CameraOff, AlertTriangle, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startCamera, stopCamera } from '@/ar/core/CameraManager';
import { createPoseProcessor, PoseProcessor } from '@/ar/core/PoseProcessor';
import { SceneManager } from '@/ar/core/SceneManager';
import { loadModel } from '@/ar/core/ModelLoader';
import { ARProduct, TrackingState } from '@/ar/types';
import { landmarkToWorld, computeCoverCrop, CoverCropInfo } from '@/ar/utils/coordinateUtils';
import { OneEuroFilter, FILTER_PRESETS } from '@/ar/utils/OneEuroFilter';
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

  // Ref to access selectedProduct inside the render loop without stale closures
  const selectedProductRef = useRef<ARProduct | null>(null);
  selectedProductRef.current = selectedProduct;

  // Fetch AR-enabled products and validate context
  useEffect(() => {
    async function fetchAndValidate() {
      if (!brandId) { setIsValidContext(false); setIsLoading(false); return; }

      const { data, error: fetchError } = await supabase
        .from('event_brand_products')
        .select(`id, image_url, ar_model_url, ar_scale, ar_position_offset, event_brands!inner(brand_name, event_id)`)
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
            setTrackingState('tracking_active');
            const product = selectedProductRef.current;
            const offset = product?.ar_position_offset || { x: 0, y: 0, z: 0 };
            updateModel(result.landmarks[0], offset);
          } else {
            framesWithoutPose.current++;
            if (framesWithoutPose.current > 30) {
              setTrackingState(prev => prev === 'tracking_active' ? 'tracking_lost' : 'waiting_for_pose');
              // Hide model without disposing -- just toggle visibility
              if (modelRef.current) modelRef.current.visible = false;
              sm.dirty = true;
            }
          }
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

  function updateModel(landmarks: any[], offset: { x: number; y: number; z: number }) {
    if (!modelRef.current || !sceneManagerRef.current) return;

    const sm = sceneManagerRef.current;
    const visDims = sm.visibleDims;
    const dims = modelDimsRef.current;
    const arScale = selectedProductRef.current?.ar_scale || 1;

    const ls = landmarks[11]; // left shoulder
    const rs = landmarks[12]; // right shoulder
    const lh = landmarks[23]; // left hip
    const rh = landmarks[24]; // right hip

    const hasShoulders = (ls.visibility ?? 0) > 0.5 && (rs.visibility ?? 0) > 0.5;
    if (!hasShoulders) { modelRef.current.visible = false; sm.dirty = true; return; }

    modelRef.current.visible = true;
    const hasHips = (lh.visibility ?? 0) > 0.3 && (rh.visibility ?? 0) > 0.3;

    // Convert key landmarks to world coordinates (mirror + cover-crop + NDC-to-world in one step)
    const crop = coverCropRef.current;

    const lsWorld = landmarkToWorld(ls, crop, visDims, true);
    const rsWorld = landmarkToWorld(rs, crop, visDims, true);

    let lhWorld = { x: 0, y: 0 };
    let rhWorld = { x: 0, y: 0 };
    if (hasHips) {
      lhWorld = landmarkToWorld(lh, crop, visDims, true);
      rhWorld = landmarkToWorld(rh, crop, visDims, true);
    }

    // Shoulder midpoint in world coords
    const shoulderCenterWorld = {
      x: (lsWorld.x + rsWorld.x) / 2,
      y: (lsWorld.y + rsWorld.y) / 2,
    };

    // Hip midpoint in world coords (or estimate below shoulders)
    let hipCenterWorld = {
      x: shoulderCenterWorld.x,
      y: shoulderCenterWorld.y - (visDims.h * 0.25),  // fallback: 25% of visible height below shoulders
    };
    if (hasHips) {
      hipCenterWorld = {
        x: (lhWorld.x + rhWorld.x) / 2,
        y: (lhWorld.y + rhWorld.y) / 2,
      };
    }

    // Torso center
    const targetX = (shoulderCenterWorld.x + hipCenterWorld.x) / 2;
    const targetY = (shoulderCenterWorld.y + hipCenterWorld.y) / 2;
    const targetZ = 0;  // constant depth -- overlay is effectively 2D-on-camera-plane

    // Body-proportional non-uniform scaling (world coordinates)
    const shoulderWidthMeasured = Math.abs(rsWorld.x - lsWorld.x);
    const torsoHeightMeasured = Math.abs(shoulderCenterWorld.y - hipCenterWorld.y);

    const targetScaleX = (shoulderWidthMeasured / dims.w) * arScale * 1.15;
    const targetScaleY = (torsoHeightMeasured / dims.h) * arScale;
    const targetScaleZ = (targetScaleX + targetScaleY) / 2;

    // Body-turn rotation from shoulder Z difference (depth hint only)
    const shoulderWidthWorld = Math.abs(rsWorld.x - lsWorld.x);
    const shoulderZDiff = landmarks[12].z - landmarks[11].z;  // right - left in raw coords
    const bodyTurnY = shoulderWidthWorld > 0.01
      ? Math.atan2(shoulderZDiff, shoulderWidthWorld / visDims.w)
      : 0;

    // Adaptive smoothing via One Euro Filter (timestamp in seconds)
    const t = performance.now() / 1000;
    const smoothX = filterPosX.current.filter(targetX, t);
    const smoothY = filterPosY.current.filter(targetY, t);
    const smoothScX = filterScaleX.current.filter(targetScaleX, t);
    const smoothScY = filterScaleY.current.filter(targetScaleY, t);
    const smoothScZ = filterScaleZ.current.filter(targetScaleZ, t);
    const smoothRotY = filterRotY.current.filter(bodyTurnY, t);

    modelRef.current.position.set(
      smoothX + offset.x,
      smoothY + offset.y,
      targetZ + offset.z   // Z is constant 0, no smoothing needed
    );
    modelRef.current.scale.set(smoothScX, smoothScY, smoothScZ);
    modelRef.current.rotation.y = smoothRotY;

    // PERF-03: Fade based on landmark confidence using cached materials (no traversal)
    const keyVis = [ls, rs, ...(hasHips ? [lh, rh] : [])];
    const avgVis = keyVis.reduce((s: number, l: any) => s + (l.visibility ?? 0), 0) / keyVis.length;
    sm.updateOpacity(Math.min(1, avgVis * 1.5));

    // Mark scene dirty so renderIfDirty() renders this frame
    sm.dirty = true;
  }

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
      <TrackingGuidance state={trackingState} message={trackingMessage} />

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

function TrackingGuidance({ state, message }: { state: TrackingState; message: string }) {
  if (state === 'tracking_active') return null;

  const content = (() => {
    switch (state) {
      case 'initializing':
        return { icon: <Loader2 className="h-10 w-10 text-white animate-spin" />, title: 'Starting AR...', sub: 'Preparing camera and tracking' };
      case 'camera_denied':
        return { icon: <CameraOff className="h-10 w-10 text-red-400" />, title: 'Camera Access Required', sub: 'Please allow camera access to use AR try-on', action: <Button variant="secondary" onClick={() => window.location.reload()}>Try Again</Button> };
      case 'camera_error':
        return { icon: <CameraOff className="h-10 w-10 text-red-400" />, title: 'Camera Error', sub: message || 'Could not access camera', action: <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button> };
      case 'pose_init_failed':
        return { icon: <AlertTriangle className="h-10 w-10 text-yellow-400" />, title: 'AR Tracking Failed', sub: 'Could not initialize body tracking. Try refreshing or use a different browser.', action: <Button variant="secondary" onClick={() => window.location.reload()}>Refresh</Button> };
      case 'model_loading':
        return { icon: <Loader2 className="h-10 w-10 text-white animate-spin" />, title: 'Loading outfit...', sub: '' };
      case 'model_error':
        return { icon: <AlertTriangle className="h-10 w-10 text-yellow-400" />, title: "Couldn't Load 3D Model", sub: 'Try selecting a different item' };
      case 'waiting_for_pose':
        return { icon: <User className="h-10 w-10 text-white/70" />, title: 'Position Yourself', sub: 'Stand back so your shoulders and hips are visible' };
      case 'tracking_lost':
        return { icon: <RefreshCw className="h-10 w-10 text-yellow-400" />, title: 'Tracking Lost', sub: 'Move back into frame — show shoulders and hips' };
      default:
        return null;
    }
  })();

  if (!content) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 max-w-xs text-center space-y-3 pointer-events-auto">
        <div className="flex justify-center">{content.icon}</div>
        <p className="text-white font-semibold">{content.title}</p>
        {content.sub && <p className="text-white/60 text-sm">{content.sub}</p>}
        {content.action && <div>{content.action}</div>}
      </div>
    </div>
  );
}
