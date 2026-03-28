import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CameraOff, AlertTriangle, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

interface ARProduct {
  id: string;
  image_url: string;
  ar_model_url: string;
  ar_scale: number;
  ar_position_offset?: { x: number; y: number; z: number };
  brand_name?: string;
  name?: string;
}

type TrackingState =
  | 'initializing'
  | 'camera_denied'
  | 'camera_error'
  | 'pose_init_failed'
  | 'model_loading'
  | 'model_error'
  | 'waiting_for_pose'
  | 'tracking_lost'
  | 'tracking_active';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const SMOOTHING = 0.3;

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

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraObjRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const animFrameRef = useRef<number>(0);
  const poseRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const framesWithoutPose = useRef(0);
  const smoothPos = useRef({ x: 0, y: 0, z: 0 });
  const smoothScale = useRef({ x: 1, y: 1, z: 1 });
  const smoothRot = useRef(0);
  const cleanedUpRef = useRef(false);
  const modelDimsRef = useRef({ w: 1, h: 1, d: 1 });
  const visibleDimsRef = useRef({ w: 4, h: 3 });

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

  // Main AR init effect — camera, pose, model, render loop
  useEffect(() => {
    if (isLoading || !selectedProduct || !canvasRef.current || !videoRef.current) return;

    cleanedUpRef.current = false;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    async function init() {
      // ── 1. Camera ──
      setTrackingState('initializing');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (cleanedUpRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setTrackingState('camera_denied');
        } else {
          setTrackingState('camera_error');
          setTrackingMessage(err.message || 'Camera access failed');
        }
        return;
      }

      // Wait for video metadata to properly size renderer
      await new Promise<void>(resolve => {
        if (video.videoWidth > 0) { resolve(); return; }
        video.onloadedmetadata = () => resolve();
      });
      if (cleanedUpRef.current) return;

      const vw = video.videoWidth || window.innerWidth;
      const vh = video.videoHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);

      // ── 2. Three.js ──
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      const aspectRatio = vw / vh;
      const camera = new THREE.PerspectiveCamera(63, aspectRatio, 0.1, 1000);
      camera.position.z = 2;
      cameraObjRef.current = camera;

      // Compute visible world dimensions at camera z-distance for FOV-based mapping
      const vFov = (camera.fov * Math.PI) / 180;
      const visibleHeight = 2 * Math.tan(vFov / 2) * camera.position.z;
      const visibleWidth = visibleHeight * aspectRatio;
      visibleDimsRef.current = { w: visibleWidth, h: visibleHeight };
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(dpr);
      renderer.setClearColor(0x000000, 0);
      rendererRef.current = renderer;

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(0, 1, 1);
      scene.add(dirLight);

      // ── 3. Load 3D model ──
      setTrackingState('model_loading');
      if (modelRef.current) { scene.remove(modelRef.current); modelRef.current = null; }

      try {
        const loader = new GLTFLoader();
        const gltf: any = await new Promise((resolve, reject) => {
          loader.load(selectedProduct.ar_model_url, resolve, undefined, reject);
        });
        if (cleanedUpRef.current) return;
        const model = gltf.scene;

        // Normalize model: compute bounding box, center at origin, store dimensions
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center); // re-center model geometry at origin

        // Store natural dimensions for body-proportional scaling
        modelDimsRef.current = {
          w: size.x || 1,
          h: size.y || 1,
          d: size.z || 1,
        };
        console.log('Model normalized dims:', modelDimsRef.current);

        // Wrap in a group so centering offset doesn't conflict with runtime positioning
        const wrapper = new THREE.Group();
        wrapper.add(model);
        wrapper.visible = false;
        scene.add(wrapper);
        modelRef.current = wrapper;
      } catch (err: any) {
        console.error('Model load error:', err);
        setTrackingState('model_error');
        setTrackingMessage('Could not load 3D model');
        return;
      }

      // ── 4. MediaPipe Pose ──
      setTrackingState('waiting_for_pose');
      const offset = selectedProduct.ar_position_offset || { x: 0, y: 0, z: 0 };
      framesWithoutPose.current = 0;

      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        if (cleanedUpRef.current) return;
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (cleanedUpRef.current) { landmarker.close(); return; }
        poseRef.current = landmarker;
      } catch (err: any) {
        console.error('MediaPipe init error:', err);
        setTrackingState('pose_init_failed');
        setTrackingMessage(err.message || 'Body tracking failed');
        return;
      }

      // ── 5. Render loop ──
      let lastPoseTime = 0;
      const animate = (time: number) => {
        if (cleanedUpRef.current) return;
        if (poseRef.current && video.readyState >= 2 && time - lastPoseTime > 66) {
          lastPoseTime = time;
          try {
            const result = (poseRef.current as PoseLandmarker).detectForVideo(video, time);
            if (result.landmarks && result.landmarks.length > 0 && result.landmarks[0].length > 0) {
              framesWithoutPose.current = 0;
              setTrackingState('tracking_active');
              updateModel(result.landmarks[0], offset, vw / vh);
            } else {
              framesWithoutPose.current++;
              if (framesWithoutPose.current > 30) {
                setTrackingState(prev => prev === 'tracking_active' ? 'tracking_lost' : 'waiting_for_pose');
                if (modelRef.current) modelRef.current.visible = false;
              }
            }
          } catch { /* ignore frame errors */ }
        }
        renderer.render(scene, camera);
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    }

    init();

    return () => {
      cleanedUpRef.current = true;
      cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      if (poseRef.current) { (poseRef.current as PoseLandmarker).close(); poseRef.current = null; }
      rendererRef.current?.dispose();
    };
  }, [isLoading, selectedProduct]);

  function updateModel(landmarks: any[], offset: { x: number; y: number; z: number }, aspectRatio: number) {
    if (!modelRef.current) return;
    const ls = landmarks[11]; // left shoulder
    const rs = landmarks[12]; // right shoulder
    const lh = landmarks[23]; // left hip
    const rh = landmarks[24]; // right hip

    const hasShoulders = (ls.visibility ?? 0) > 0.5 && (rs.visibility ?? 0) > 0.5;
    if (!hasShoulders) { modelRef.current.visible = false; return; }

    modelRef.current.visible = true;
    const hasHips = (lh.visibility ?? 0) > 0.3 && (rh.visibility ?? 0) > 0.3;

    const mirrorX = (x: number) => 1 - x;
    const cx = (mirrorX(ls.x) + mirrorX(rs.x)) / 2;
    const cy = hasHips
      ? (ls.y + rs.y + lh.y + rh.y) / 4
      : (ls.y + rs.y) / 2 + 0.15;
    const avgZ = hasHips
      ? (ls.z + rs.z + lh.z + rh.z) / 4
      : (ls.z + rs.z) / 2;

    const targetX = (cx - 0.5) * 4 * aspectRatio;
    const targetY = -(cy - 0.5) * 3;
    const targetZ = avgZ * 2 - 1;

    const sw = Math.abs(rs.x - ls.x);
    let bodyW = sw;
    if (hasHips) bodyW = Math.max(sw, Math.abs(rh.x - lh.x));
    const targetScale = bodyW * 5 * (selectedProduct?.ar_scale || 1);

    const shoulderAngle = Math.atan2(rs.z - ls.z, mirrorX(rs.x) - mirrorX(ls.x));

    smoothPos.current = {
      x: lerp(smoothPos.current.x, targetX, SMOOTHING),
      y: lerp(smoothPos.current.y, targetY, SMOOTHING),
      z: lerp(smoothPos.current.z, targetZ, SMOOTHING),
    };
    smoothScale.current = lerp(smoothScale.current, targetScale, SMOOTHING);
    smoothRot.current = lerp(smoothRot.current, shoulderAngle, SMOOTHING * 0.5);

    modelRef.current.position.set(
      smoothPos.current.x + offset.x,
      smoothPos.current.y + offset.y,
      smoothPos.current.z + offset.z
    );
    modelRef.current.scale.setScalar(smoothScale.current);
    modelRef.current.rotation.y = smoothRot.current;

    // Fade based on confidence
    const keyVis = [ls, rs, ...(hasHips ? [lh, rh] : [])];
    const avgVis = keyVis.reduce((s, l) => s + (l.visibility ?? 0), 0) / keyVis.length;
    modelRef.current.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material.transparent = true;
        child.material.opacity = Math.min(1, avgVis * 1.5);
      }
    });
  }

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (rendererRef.current && cameraObjRef.current) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        rendererRef.current.setSize(w, h);
        cameraObjRef.current.aspect = w / h;
        cameraObjRef.current.updateProjectionMatrix();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
        style={{ transform: 'scaleX(-1)' }}
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
