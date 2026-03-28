import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface ARProduct {
  id: string;
  image_url: string;
  ar_model_url: string;
  ar_scale: number;
  ar_position_offset?: { x: number; y: number; z: number };
  brand_name?: string;
  name?: string;
}

export default function ARExperience() {
  const { eventId, brandId } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [products, setProducts] = useState<ARProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ARProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraObjRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const animFrameRef = useRef<number>(0);
  const poseRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fetch AR-enabled products
  useEffect(() => {
    async function fetchProducts() {
      if (!brandId) return;

      const { data, error: fetchError } = await supabase
        .from('event_brand_products')
        .select(`
          id, image_url, ar_model_url, ar_scale, ar_position_offset,
          event_brands!inner(brand_name)
        `)
        .eq('event_brand_id', brandId)
        .eq('ar_enabled', true)
        .not('ar_model_url', 'is', null);

      if (fetchError) {
        console.error('Error fetching AR products:', fetchError);
        setError('Failed to load AR products');
        setIsLoading(false);
        return;
      }

      const mapped = (data || []).map((p: any) => ({
        id: p.id,
        image_url: p.image_url,
        ar_model_url: p.ar_model_url,
        ar_scale: p.ar_scale || 1.0,
        ar_position_offset: p.ar_position_offset || { x: 0, y: 0, z: 0 },
        brand_name: p.event_brands?.brand_name,
        name: p.name,
      }));

      setProducts(mapped);
      if (mapped.length > 0) setSelectedProduct(mapped[0]);
      setIsLoading(false);
    }

    fetchProducts();
  }, [brandId]);

  // Initialize camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('Camera access is required for AR try-on. Please allow camera access.');
      }
    }

    if (!isLoading && products.length > 0) {
      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [isLoading, products.length]);

  // Initialize Three.js + MediaPipe
  useEffect(() => {
    if (!cameraReady || !selectedProduct || !canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    // Setup Three.js
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    camera.position.z = 2;
    cameraObjRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(canvas.width, canvas.height);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    // Load 3D model
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
    }

    const loader = new GLTFLoader();
    loader.load(
      selectedProduct.ar_model_url,
      (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(selectedProduct.ar_scale);
        scene.add(model);
        modelRef.current = model;
      },
      undefined,
      (err) => console.error('Model load error:', err)
    );

    // Setup MediaPipe Pose
    let poseInstance: any = null;
    const offset = selectedProduct.ar_position_offset || { x: 0, y: 0, z: 0 };

    async function initPose() {
      try {
        const { Pose } = await import('@mediapipe/pose');

        poseInstance = new Pose({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });

        poseInstance.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        poseInstance.onResults((results: any) => {
          if (!results.poseLandmarks || !modelRef.current) return;

          const landmarks = results.poseLandmarks;
          const leftShoulder = landmarks[11];
          const rightShoulder = landmarks[12];
          const leftHip = landmarks[23];
          const rightHip = landmarks[24];

          // Mirror X: video is mirrored via CSS scaleX(-1), so invert X for Three.js overlay
          const mirrorX = (x: number) => 1 - x;

          // Horizontal center from mirrored shoulders
          const shoulderCenterX = (mirrorX(leftShoulder.x) + mirrorX(rightShoulder.x)) / 2;
          const centerX = (shoulderCenterX - 0.5) * 4;

          // Vertical center from shoulders + hips for full-body alignment
          const bodyCenterY = (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4;
          const centerY = -(bodyCenterY - 0.5) * 3;

          // Depth from shoulders
          const depth = (leftShoulder.z + rightShoulder.z) / 2;

          // Apply ar_position_offset from DB
          modelRef.current!.position.set(
            centerX + offset.x,
            centerY + offset.y,
            depth * 2 + offset.z
          );

          // Scale based on shoulder width
          const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
          const torsoHeight = Math.abs(
            (leftShoulder.y + rightShoulder.y) / 2 -
            (leftHip.y + rightHip.y) / 2
          );
          const bodyScale = Math.max(shoulderWidth, torsoHeight * 0.8);
          const scale = bodyScale * 5 * (selectedProduct?.ar_scale || 1);
          modelRef.current!.scale.setScalar(scale);

          // Rotation: follow shoulder angle for body turns
          const shoulderAngle = Math.atan2(
            rightShoulder.z - leftShoulder.z,
            mirrorX(rightShoulder.x) - mirrorX(leftShoulder.x)
          );
          modelRef.current!.rotation.y = shoulderAngle;
        });

        poseRef.current = poseInstance;
      } catch (err) {
        console.error('MediaPipe Pose init error:', err);
      }
    }

    initPose();

    // Animation loop
    let lastPoseTime = 0;
    const animate = async (time: number) => {
      // Send to MediaPipe every 100ms
      if (poseRef.current && video.readyState >= 2 && time - lastPoseTime > 100) {
        lastPoseTime = time;
        try {
          await poseRef.current.send({ image: video });
        } catch (e) {
          // Ignore pose errors
        }
      }

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (poseInstance) {
        poseInstance.close?.();
      }
      renderer.dispose();
    };
  }, [cameraReady, selectedProduct]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && rendererRef.current && cameraObjRef.current) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvasRef.current.width = w;
        canvasRef.current.height = h;
        rendererRef.current.setSize(w, h);
        cameraObjRef.current.aspect = w / h;
        cameraObjRef.current.updateProjectionMatrix();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="text-center text-white space-y-4">
          <p className="text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white text-black rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="text-center text-white space-y-2">
          <p className="text-lg">No AR products available</p>
          <p className="text-sm text-white/60">This brand hasn't uploaded any 3D models yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Camera feed (mirrored for natural selfie view) */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline
        muted
        autoPlay
      />

      {/* Three.js canvas (mirrored to match video) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ transform: 'scaleX(-1)' }}
        width={window.innerWidth}
        height={window.innerHeight}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
        <h1 className="text-white text-lg font-bold">AR Try-On</h1>
        <p className="text-white/80 text-sm">{selectedProduct?.name || selectedProduct?.brand_name}</p>
      </div>

      {/* Product selector (bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent z-10">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                selectedProduct?.id === product.id
                  ? 'border-purple-500 scale-110'
                  : 'border-white/30'
              }`}
            >
              <img
                src={product.image_url}
                alt={product.name || 'Product'}
                className="w-full h-full object-cover"
              />
              {product.name && (
                <span className="absolute bottom-0 left-0 right-0 text-[10px] text-white bg-black/60 text-center truncate px-1">
                  {product.name}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
