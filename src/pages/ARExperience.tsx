import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle, Camera, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrackingGuidance } from '@/ar/guidance/TrackingGuidance';
import { shareImage } from '@/ar/capture/shareHandler';
import {
  GarmentRenderer,
  prefetchModel,
  resolveARMode,
  type GarmentRendererEvent,
  type GarmentSpec,
} from '@/ar/core/GarmentRenderer';
import type { ARProduct, TrackingState } from '@/ar/types';

const BUILD_ID = '2026-04-27T-3d-only';

/**
 * Phase C dev-override: when `?testMesh=<url>` is in the URL OR when
 * VITE_AR_TEST_MESH_URL is set, the renderer loads that GLB instead of the
 * product's database `ar_model_url`. Bypasses Supabase entirely with a
 * synthetic in-memory product.
 */
function getTestMeshOverride(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('testMesh') ?? import.meta.env.VITE_AR_TEST_MESH_URL ?? null;
}

function productToSpec(product: ARProduct): GarmentSpec {
  const testMesh = getTestMeshOverride();
  return {
    garmentType: product.garment_type || 'shirt',
    modelUrl: testMesh ?? product.ar_model_url ?? undefined,
    arScale: product.ar_scale,
    arPositionOffset: product.ar_position_offset,
  };
}

function getTouchDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function ARExperience() {
  const { eventId, brandId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedProductId = searchParams.get('productId');
  const isDebug = searchParams.get('debug') === 'true';

  const videoRef = useRef<HTMLVideoElement>(null);
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GarmentRenderer | null>(null);

  const [products, setProducts] = useState<ARProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ARProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidContext, setIsValidContext] = useState(true);
  const [trackingState, setTrackingState] = useState<TrackingState>('initializing');
  const [trackingMessage, setTrackingMessage] = useState('');
  const [missingParts, setMissingParts] = useState<string[]>([]);
  const [loadStage, setLoadStage] = useState('');
  const [loadProgress, setLoadProgress] = useState('');
  const [arDebugInfo, setArDebugInfo] = useState<{ status: string; error?: string }>({ status: 'pending' });
  const [modelLoadFailed, setModelLoadFailed] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [debugMetrics, setDebugMetrics] = useState({
    fps: 0, rafPerSec: 0, posePerSec: 0,
    visibility: {} as Record<number, number>,
    poseEverDetected: false,
  });

  // Capture preview URL lifecycle
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

  // ── Effect 0: Fetch products from Supabase (or use synthetic test product) ──
  useEffect(() => {
    let cancelled = false;
    async function fetchAndValidate() {
      const testMesh = getTestMeshOverride();
      if (testMesh) {
        const synthetic: ARProduct = {
          id: 'test-mesh',
          image_url: '',
          ar_model_url: testMesh,
          ar_scale: 1.0,
          ar_position_offset: { x: 0, y: 0, z: 0 },
          brand_name: 'Local test mesh',
          name: 'test-garment.glb',
          garment_type: 'shirt',
        };
        setProducts([synthetic]);
        setSelectedProduct(synthetic);
        prefetchModel(testMesh, (loaded, _t, percent) => {
          if (percent >= 0) setLoadProgress(`${percent}%`);
          else setLoadProgress(`${(loaded / (1024 * 1024)).toFixed(1)} MB`);
        }).catch(() => {/* swallowed; renderer will retry */});
        setIsLoading(false);
        return;
      }

      if (!brandId) { setIsValidContext(false); setIsLoading(false); return; }
      await supabase.auth.getSession();
      const { data, error: fetchError } = await supabase
        .from('event_brand_products')
        .select(`id, image_url, ar_model_url, ar_overlay_url, ar_scale, ar_position_offset, garment_type, ar_preferred_mode, event_brands!inner(brand_name, event_id)`)
        .eq('event_brand_id', brandId)
        .eq('ar_enabled', true);
      if (cancelled) return;
      if (fetchError || !data?.length) { setIsValidContext(false); setIsLoading(false); return; }
      if (eventId) {
        const belongsToEvent = data.some((p: any) => p.event_brands?.event_id === eventId);
        if (!belongsToEvent) { setIsValidContext(false); setIsLoading(false); return; }
      }
      const mapped: ARProduct[] = data.map((p: any) => ({
        id: p.id,
        image_url: p.image_url,
        ar_model_url: p.ar_model_url,
        ar_scale: p.ar_scale || 1.0,
        ar_position_offset: (p.ar_position_offset as any) || { x: 0, y: 0, z: 0 },
        brand_name: p.event_brands?.brand_name,
        name: (p as any).name,
        garment_type: (p as any).garment_type || 'shirt',
        ar_overlay_url: (p as any).ar_overlay_url || undefined,
        ar_preferred_mode: p.ar_preferred_mode || 'auto',
      }));
      setProducts(mapped);
      const selected = requestedProductId
        ? mapped.find((p) => p.id === requestedProductId) || mapped[0]
        : mapped[0];
      setSelectedProduct(selected);
      const modelUrl = selected.ar_model_url ?? undefined;
      if (modelUrl) {
        prefetchModel(modelUrl, (loaded, _t, percent) => {
          if (percent >= 0) setLoadProgress(`${percent}%`);
          else setLoadProgress(`${(loaded / (1024 * 1024)).toFixed(1)} MB`);
        }).catch(() => {/* swallowed; renderer will retry */});
      }
      setIsLoading(false);
    }
    fetchAndValidate();
    return () => { cancelled = true; };
  }, [brandId, eventId, requestedProductId]);

  // ── Effect 1: Construct GarmentRenderer once products loaded ──
  useEffect(() => {
    if (isLoading) return;
    const video = videoRef.current;
    const glCanvas = glCanvasRef.current;
    const stage = stageRef.current;
    if (!video || !glCanvas || !stage) return;

    const renderer = new GarmentRenderer({
      videoEl: video,
      glCanvas,
      debugMount: stage,
      enableMetrics: isDebug,
    });
    rendererRef.current = renderer;

    const unsubscribe = renderer.on(handleEvent);
    renderer.init();

    return () => {
      unsubscribe();
      renderer.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // ── Effect 2: When selectedProduct changes, swap the garment ──
  useEffect(() => {
    if (!selectedProduct) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    setModelLoadFailed(false);
    renderer.loadGarment(productToSpec(selectedProduct));
  }, [selectedProduct]);

  // ── Effect 3: Resize ──
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setCanvasSize({ w, h });
      rendererRef.current?.resize(w, h);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Effect 4: Pinch-to-zoom ──
  useEffect(() => {
    const canvas = glCanvasRef.current;
    if (!canvas) return;
    let initialDistance = 0;
    let initialScale = 1;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistance = getTouchDistance(e.touches[0], e.touches[1]);
        initialScale = 1;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance > 0) {
        e.preventDefault();
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const ratio = dist / initialDistance;
        rendererRef.current?.setPinchScale(initialScale * ratio);
      }
    };
    const onTouchEnd = () => { initialDistance = 0; };
    canvas.addEventListener('touchstart', onTouchStart);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // ── Event handler: translate renderer events to React state ──
  function handleEvent(event: GarmentRendererEvent) {
    switch (event.type) {
      case 'tracking-state':
        setTrackingState(event.state);
        return;
      case 'load-stage':
        setLoadStage(event.stage);
        return;
      case 'load-progress':
        setLoadProgress(event.progress);
        return;
      case 'missing-parts':
        setMissingParts(event.parts);
        return;
      case 'mode-change':
        // 3D-only runtime; mode is informational only.
        return;
      case 'camera-error':
        setTrackingState(event.state);
        setTrackingMessage(event.message);
        return;
      case 'pose-init-failed':
        setTrackingState('pose_init_failed');
        setTrackingMessage(event.message);
        return;
      case 'webgl-unsupported':
        setTrackingState('camera_error');
        setTrackingMessage(event.message);
        return;
      case 'model-error':
        setTrackingState('model_error');
        setTrackingMessage(event.message);
        if (event.canRetry) setModelLoadFailed(true);
        return;
      case 'init-error':
        setTrackingState('camera_error');
        setTrackingMessage(event.message);
        setLoadStage('');
        return;
      case 'metrics':
        setDebugMetrics({
          fps: event.fps,
          rafPerSec: event.rafPerSec,
          posePerSec: event.posePerSec,
          visibility: event.visibility,
          poseEverDetected: event.poseEverDetected,
        });
        return;
      case 'ar-debug':
        setArDebugInfo({ status: event.status, error: event.error });
        return;
    }
  }

  const handleCapture = async () => {
    if (isCapturing) return;
    const renderer = rendererRef.current;
    if (!renderer) return;
    setIsCapturing(true);
    try {
      const blob = await renderer.capture();
      setCapturedBlob(blob);
    } catch (err) {
      console.error('Capture failed:', err);
    } finally {
      setIsCapturing(false);
    }
  };
  const handleShare = async () => {
    if (!capturedBlob) return;
    try { await shareImage(capturedBlob); } catch (err) { console.error('Share failed:', err); }
  };

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
            : 'No AR products available for this brand.'}
        </p>
        <Button variant="secondary" onClick={() => navigate(eventId ? `/events` : '/dashboard')}>
          Back to Event
        </Button>
      </div>
    );
  }

  return (
    <div ref={stageRef} className="fixed inset-0 bg-black overflow-hidden">
      {/* Camera feed (mirrored via CSS to match selfie expectation) */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline muted autoPlay
      />

      {/* Three.js canvas (3D garment overlay) */}
      <canvas
        ref={glCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
        width={canvasSize.w}
        height={canvasSize.h}
      />

      <TrackingGuidance
        state={trackingState}
        message={trackingMessage}
        garmentType={selectedProduct?.garment_type || 'shirt'}
        missingParts={missingParts}
        loadProgress={loadProgress}
        loadStage={loadStage}
        onRetry={modelLoadFailed ? () => setSelectedProduct((prev) => (prev ? { ...prev } : prev)) : undefined}
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

      {/* Debug HUD */}
      {isDebug && (
        <div className="absolute top-16 left-4 z-20 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 max-w-[300px] text-[10px] font-mono text-white/80 space-y-0.5">
          <div className="text-yellow-300 font-bold">BUILD: {BUILD_ID}</div>
          <div>raf/s: <span className="text-green-400">{debugMetrics.rafPerSec}</span> | pose/s: <span className="text-green-400">{debugMetrics.posePerSec}</span></div>
          <div>tracking: {trackingState}</div>
          <div>cam: {videoRef.current?.readyState ?? '?'} | {videoRef.current?.videoWidth ?? 0}×{videoRef.current?.videoHeight ?? 0}</div>
          <div>pose-ever: <span className={debugMetrics.poseEverDetected ? 'text-green-400' : 'text-red-400'}>{debugMetrics.poseEverDetected ? 'yes' : 'NO'}</span></div>
          <div>vis 11/12 (shoulders): {(debugMetrics.visibility[11] ?? 0).toFixed(2)} / {(debugMetrics.visibility[12] ?? 0).toFixed(2)}</div>
          <div>vis 23/24 (hips): {(debugMetrics.visibility[23] ?? 0).toFixed(2)} / {(debugMetrics.visibility[24] ?? 0).toFixed(2)}</div>
          <div>status: {arDebugInfo.status}</div>
          {arDebugInfo.error && <div className="text-red-400 break-all">err: {arDebugInfo.error}</div>}
        </div>
      )}

      {trackingState === 'tracking_active' && (
        <div className="absolute top-44 right-4 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-white/80">Tracking</span>
        </div>
      )}

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

      {products.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent z-10">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {products.map((product) => (
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

export { resolveARMode };
