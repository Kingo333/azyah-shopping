/**
 * GarmentRenderer — single-class facade that owns the entire AR runtime.
 *
 * Replaces the manual orchestration that previously lived inside
 * ARExperience.tsx (~1100 lines of effects, refs, and a ~250-line render loop).
 * The React component is now a thin shell that constructs this class, wires
 * its events to component state, and calls a small handful of methods.
 *
 * What this class owns:
 * - Camera lifecycle (via CameraManager)
 * - Pose processor (MediaPipe PoseLandmarker @ 10 FPS throttled)
 * - Scene manager (Three.js renderer / scene / camera / lighting)
 * - 2D image overlay (alternate rendering path for `mode='2d'`)
 * - Body segmenter (occlusion mask, Tier-A only)
 * - Bone mapper (skeleton retargeting from pose landmarks)
 * - Anchor resolver + strategies (ShirtAnchor, AbayaAnchor, etc.)
 * - Smoothing pipeline (OneEuro + outlier filters per channel)
 * - Performance tier state machine (A/B/C with hysteresis)
 * - The single requestAnimationFrame loop driving everything
 *
 * What it does NOT own:
 * - React state (it emits events; the component translates to setState)
 * - Product fetching / Supabase
 * - UI controls / capture preview
 * - Pinch-to-zoom gesture wiring (component owns the touch listeners and
 *   forwards the pinch result via setPinchScale)
 *
 * Lifecycle:
 *   const renderer = new GarmentRenderer({ videoEl, glCanvas, overlayCanvas });
 *   renderer.on(handleEvent);
 *   await renderer.init();
 *   await renderer.loadGarment({ garmentType, modelUrl, ... });
 *   // ...
 *   renderer.dispose();
 */
import type { Object3D } from 'three';
import { startCamera, stopCamera } from './CameraManager';
import { createPoseProcessor, PoseProcessor } from './PoseProcessor';
import { SceneManager } from './SceneManager';
import { ImageOverlay } from './ImageOverlay';
import { BodySegmenter } from './BodySegmenter';
import { BoneMapper } from './BoneMapper';
import { loadModel, prefetchModel, clearModelCache } from './ModelLoader';
import { applyClothSway, updateClothSwayTime } from './ClothSway';
import { DebugOverlay } from '../debug/DebugOverlay';
import { AnchorResolver } from '../anchoring/AnchorResolver';
import { computeBodyMeasurements } from '../anchoring/BodyMeasurement';
import { ShirtAnchor } from '../anchoring/strategies/ShirtAnchor';
import { AbayaAnchor } from '../anchoring/strategies/AbayaAnchor';
import { PantsAnchor } from '../anchoring/strategies/PantsAnchor';
import { AccessoryAnchor } from '../anchoring/strategies/AccessoryAnchor';
import { GARMENT_PRESETS } from '../config/garmentPresets';
import { computeCoverCrop, CoverCropInfo } from '../utils/coordinateUtils';
import { OneEuroFilter, FILTER_PRESETS } from '../utils/OneEuroFilter';
import { OutlierFilter } from '../utils/OutlierFilter';
import { compositeCapture } from '../capture/captureCompositor';
import { getMissingBodyParts } from '../guidance/garmentGuidance';
import type { AnchorResult } from '../anchoring/types';
import type { ARMode, GarmentType, TrackingState } from '../types';

// ── Performance tier ──────────────────────────────────────────────────────

export type PerformanceTier = 'A' | 'B' | 'C';

const TIER_THRESHOLDS = {
  downToB: 22,
  downToC: 15,
  upFromB: 25,
  upFromC: 20,
};

/** Pose interval in ms per tier — A/B run ~15 FPS, C drops to ~10. */
const POSE_INTERVAL_MS: Record<PerformanceTier, number> = { A: 66, B: 66, C: 100 };

const SEG_BUDGET_MS = 20; // skip segmentation if frame already over budget

// ── Public types ──────────────────────────────────────────────────────────

export interface GarmentRendererOptions {
  videoEl: HTMLVideoElement;
  glCanvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
  /** Mount point for the 2D landmark debug overlay (typically canvas parent). */
  debugMount: HTMLElement;
  /** Emit `metrics` events at ~1 Hz when true. */
  enableMetrics?: boolean;
}

export interface GarmentSpec {
  garmentType: GarmentType;
  /** 2D garment image URL (transparent PNG/WebP). */
  overlayUrl?: string;
  /** 3D model URL (GLB). */
  modelUrl?: string;
  /** Retailer-chosen mode preference. */
  preferredMode?: 'auto' | '2d' | '3d';
  arScale?: number;
  arPositionOffset?: { x: number; y: number; z: number };
}

export type GarmentRendererEvent =
  | { type: 'tracking-state'; state: TrackingState }
  | { type: 'load-stage'; stage: string }
  | { type: 'load-progress'; progress: string }
  | { type: 'missing-parts'; parts: string[] }
  | { type: 'mode-change'; mode: ARMode }
  | { type: 'camera-error'; state: TrackingState; message: string }
  | { type: 'pose-init-failed'; message: string }
  | { type: 'webgl-unsupported'; message: string }
  | { type: 'model-error'; message: string; canRetry: boolean }
  | { type: 'init-error'; message: string }
  | {
      type: 'metrics';
      fps: number;
      tier: PerformanceTier;
      rafPerSec: number;
      posePerSec: number;
      overlayPerSec: number;
      segPerSec: number;
      /** Per-landmark visibility from the most recent pose detection (0-1). */
      visibility: Record<number, number>;
      /** True if MediaPipe has produced at least one landmark since init. */
      poseEverDetected: boolean;
    }
  | { type: 'ar-debug'; status: string; error?: string };

export type GarmentRendererListener = (event: GarmentRendererEvent) => void;

/** Resolve which AR rendering mode to use, respecting retailer preference. */
export function resolveARMode(spec: { overlayUrl?: string; modelUrl?: string; preferredMode?: 'auto' | '2d' | '3d' }): ARMode {
  const pref = spec.preferredMode || 'auto';
  if (pref === '2d' && spec.overlayUrl) return '2d';
  if (pref === '3d' && spec.modelUrl) return '3d';
  if (spec.overlayUrl) return '2d';
  if (spec.modelUrl) return '3d';
  return 'none';
}

function mapCameraError(err: any): { state: TrackingState; message: string } {
  switch (err?.name || '') {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return { state: 'camera_denied', message: 'Camera permission denied.' };
    case 'NotFoundError':
      return { state: 'camera_error', message: 'No camera found. Please check your device has a camera.' };
    case 'NotReadableError':
      return { state: 'camera_error', message: 'Camera is in use by another app. Close other apps and try again.' };
    case 'OverconstrainedError':
      return { state: 'camera_error', message: 'Camera settings not supported by this device.' };
    case 'AbortError':
      return { state: 'camera_error', message: 'Camera initialization was interrupted. Please try again.' };
    default:
      return { state: 'camera_error', message: err?.message || 'Camera access failed.' };
  }
}

// ── Implementation ────────────────────────────────────────────────────────

export class GarmentRenderer {
  // Wiring
  private readonly video: HTMLVideoElement;
  private readonly glCanvas: HTMLCanvasElement;
  private readonly overlayCanvas: HTMLCanvasElement;
  private readonly debugMount: HTMLElement;
  private readonly enableMetrics: boolean;

  // Subsystems (created lazily during init)
  private sceneManager: SceneManager | null = null;
  private poseProcessor: PoseProcessor | null = null;
  private segmenter: BodySegmenter | null = null;
  private debugOverlay: DebugOverlay | null = null;
  private imageOverlay: ImageOverlay | null = null;
  private boneMapper: BoneMapper | null = null;
  private anchorResolver: AnchorResolver | null = null;
  private currentModel: Object3D | null = null;
  private modelDims = { w: 1, h: 1, d: 1 };

  // Camera state
  private stream: MediaStream | null = null;
  private coverCrop: CoverCropInfo = { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };

  // Smoothing pipeline (3D path)
  private readonly filters = {
    posX: new OneEuroFilter(FILTER_PRESETS.position.minCutoff, FILTER_PRESETS.position.beta, FILTER_PRESETS.position.dCutoff),
    posY: new OneEuroFilter(FILTER_PRESETS.position.minCutoff, FILTER_PRESETS.position.beta, FILTER_PRESETS.position.dCutoff),
    scaleX: new OneEuroFilter(FILTER_PRESETS.scale.minCutoff, FILTER_PRESETS.scale.beta, FILTER_PRESETS.scale.dCutoff),
    scaleY: new OneEuroFilter(FILTER_PRESETS.scale.minCutoff, FILTER_PRESETS.scale.beta, FILTER_PRESETS.scale.dCutoff),
    scaleZ: new OneEuroFilter(FILTER_PRESETS.scale.minCutoff, FILTER_PRESETS.scale.beta, FILTER_PRESETS.scale.dCutoff),
    rotY: new OneEuroFilter(FILTER_PRESETS.rotation.minCutoff, FILTER_PRESETS.rotation.beta, FILTER_PRESETS.rotation.dCutoff),
  };
  private readonly outliers = {
    posX: new OutlierFilter(15, 3.0),
    posY: new OutlierFilter(15, 3.0),
    scX: new OutlierFilter(15, 3.0),
    scY: new OutlierFilter(15, 3.0),
    rotY: new OutlierFilter(15, 3.0),
  };
  private lastAnchor: AnchorResult | null = null;

  // Loop state
  private rafId = 0;
  private lastPoseTime = 0;
  private framesWithoutPose = 0;
  private lastLandmarks: any[] | null = null;
  private trackingState: TrackingState = 'initializing';
  private lastMissingPartsJson = '[]';

  // Performance tier
  private tier: PerformanceTier = 'A';
  private fpsFrames = 0;
  private fpsLastCheck = 0;
  private tierStableStart = 0;

  // Debug HUD counters
  private debugCounters = { rafTicks: 0, poseCalls: 0, overlayDraws: 0, segCalls: 0 };
  private metricsLastEmit = 0;
  private latestVisibility: Record<number, number> = {};
  private poseEverDetected = false;

  // Interaction
  private pinchScale = 1.0;

  // Spec
  private currentSpec: GarmentSpec | null = null;
  private currentMode: ARMode = 'none';
  private modelLoadCancel: { cancelled: boolean } | null = null;

  // Listeners
  private readonly listeners = new Set<GarmentRendererListener>();
  private disposed = false;

  // Event handler refs (so dispose can remove them)
  private readonly handleVideoMetadata = () => {
    const v = this.video;
    if (v.videoWidth > 0 && v.videoHeight > 0) {
      this.coverCrop = computeCoverCrop(v.videoWidth, v.videoHeight, this.glCanvas.width, this.glCanvas.height);
      this.imageOverlay?.updateCoverCrop(v.videoWidth, v.videoHeight, this.overlayCanvas.width, this.overlayCanvas.height);
    }
  };
  private readonly handleVisibility = () => {
    if (document.visibilityState === 'visible' && this.video.paused) {
      this.video.play().catch(() => {});
      setTimeout(this.handleVideoMetadata, 300);
    }
  };

  constructor(opts: GarmentRendererOptions) {
    this.video = opts.videoEl;
    this.glCanvas = opts.glCanvas;
    this.overlayCanvas = opts.overlayCanvas;
    this.debugMount = opts.debugMount;
    this.enableMetrics = !!opts.enableMetrics;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Subscribe to renderer events. Returns an unsubscribe fn. */
  on(listener: GarmentRendererListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Read-only current AR mode. */
  get mode(): ARMode {
    return this.currentMode;
  }

  /** Optional helper exposed for anchor-debug snapshotting. */
  get isReady(): boolean {
    return this.sceneManager !== null && this.poseProcessor !== null;
  }

  /**
   * Initialize camera + pose + scene + segmenter in parallel where possible.
   * Idempotent: subsequent calls no-op.
   */
  async init(): Promise<void> {
    if (this.disposed) throw new Error('GarmentRenderer already disposed');
    if (this.poseProcessor && this.sceneManager) return; // already initialized

    try {
      // Step 1 — WebGL2 capability gate (R-A2). Synchronous, fails fast.
      const gl = document.createElement('canvas').getContext('webgl2')
        || document.createElement('canvas').getContext('webgl');
      if (!gl) {
        this.emit({
          type: 'webgl-unsupported',
          message: 'Your browser does not support WebGL. Try Chrome or Safari.',
        });
        return;
      }

      this.setTrackingState('initializing');
      this.emit({ type: 'load-stage', stage: 'Starting camera & body tracking…' });

      // Step 2 — kick off camera + pose + segmenter in parallel
      const cameraPromise = startCamera(this.video).catch((err: any) => ({ error: err }));
      const posePromise = createPoseProcessor().catch((err: any) => ({ error: err }));
      const segPromise = BodySegmenter.create();

      const [camResult, poseResult] = await Promise.all([cameraPromise, posePromise]);
      segPromise.then((seg) => { if (!this.disposed) this.segmenter = seg; }).catch(() => {});

      if (this.disposed) {
        if (camResult && !('error' in camResult)) stopCamera(camResult.stream);
        if (poseResult && !('error' in poseResult)) (poseResult as PoseProcessor).close();
        return;
      }

      // Step 3 — handle camera result
      if ('error' in camResult) {
        const mapped = mapCameraError(camResult.error);
        this.emit({ type: 'camera-error', state: mapped.state, message: mapped.message });
        if (poseResult && !('error' in poseResult)) (poseResult as PoseProcessor).close();
        return;
      }
      this.stream = camResult.stream;
      this.coverCrop = computeCoverCrop(
        camResult.videoWidth,
        camResult.videoHeight,
        window.innerWidth,
        window.innerHeight,
      );

      // Step 4 — handle pose result
      if ('error' in poseResult) {
        this.emit({
          type: 'pose-init-failed',
          message: poseResult.error?.message || 'Body tracking failed. Try refreshing.',
        });
        return;
      }
      this.poseProcessor = poseResult as PoseProcessor;

      // Re-check video on metadata + visibility
      this.video.addEventListener('loadedmetadata', this.handleVideoMetadata);
      document.addEventListener('visibilitychange', this.handleVisibility);

      // Step 5 — scene manager + debug overlay + anchor resolver
      this.sceneManager = new SceneManager(this.glCanvas);
      this.debugOverlay = new DebugOverlay(this.debugMount);
      this.anchorResolver = this.buildAnchorResolver();

      this.setTrackingState('waiting_for_pose');
      this.emit({ type: 'load-stage', stage: '' });

      // Step 6 — start the rAF loop
      this.startLoop();
    } catch (err: any) {
      console.error('[GarmentRenderer] init crashed:', err);
      this.emit({ type: 'init-error', message: err?.message || 'AR failed to initialize. Try refreshing.' });
    }
  }

  /**
   * Swap to the given garment. Resolves when the asset is loaded (image or GLB).
   * Cancels any in-flight load from a prior call.
   */
  async loadGarment(spec: GarmentSpec): Promise<void> {
    if (this.disposed) return;

    // Cancel any in-flight load from a previous call
    if (this.modelLoadCancel) this.modelLoadCancel.cancelled = true;
    const cancelToken = { cancelled: false };
    this.modelLoadCancel = cancelToken;

    this.currentSpec = spec;

    // Resolve mode and announce
    const mode = resolveARMode({
      overlayUrl: spec.overlayUrl,
      modelUrl: spec.modelUrl,
      preferredMode: spec.preferredMode,
    });
    this.currentMode = mode;
    this.emit({ type: 'mode-change', mode });

    if (mode === 'none') {
      this.setTrackingState('model_error');
      this.emit({
        type: 'model-error',
        message: 'No AR assets found for this product. Ask the retailer to upload a 2D overlay or 3D model.',
        canRetry: false,
      });
      this.emit({ type: 'ar-debug', status: 'error', error: 'resolveARMode returned none — no overlay/model URL' });
      return;
    }

    // Tear down prior garment state
    this.imageOverlay?.dispose();
    this.imageOverlay = null;
    if (this.currentModel) {
      this.sceneManager?.swapModel(null);
      this.currentModel = null;
    }
    this.boneMapper?.reset();
    this.boneMapper = null;
    this.resetSmoothingPipeline();
    this.lastLandmarks = null;

    // Reset perf tier and segmenter on swap
    this.tier = 'A';
    this.tierStableStart = 0;
    this.segmenter?.setEnabled(true);
    this.sceneManager?.setShadowsEnabled(true);

    this.emit({ type: 'ar-debug', status: 'loading_' + mode });

    if (mode === '2d') {
      await this.load2D(spec, cancelToken);
    } else {
      await this.load3D(spec, cancelToken);
    }
  }

  /** Pinch-to-zoom scale, clamped to [0.5, 2.0]. */
  setPinchScale(scale: number): void {
    this.pinchScale = Math.max(0.5, Math.min(2.0, scale));
    if (this.sceneManager) this.sceneManager.dirty = true;
  }

  /** Re-compute cover crop and renderer size for new viewport dimensions. */
  resize(width: number, height: number): void {
    this.sceneManager?.handleResize();
    this.debugOverlay?.resize(width, height);
    if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
      this.coverCrop = computeCoverCrop(this.video.videoWidth, this.video.videoHeight, width, height);
      this.imageOverlay?.updateCoverCrop(this.video.videoWidth, this.video.videoHeight, width, height);
    }
    this.overlayCanvas.width = width;
    this.overlayCanvas.height = height;
  }

  /**
   * Capture the current frame as a PNG Blob.
   * - 2D mode: snapshot the overlay canvas directly.
   * - 3D mode: render once + composite video & three.js canvas.
   *
   * R8: with preserveDrawingBuffer:false, the 3D path needs a fresh render
   * immediately before the composite read.
   */
  async capture(): Promise<Blob> {
    if (this.currentMode === '2d') {
      return new Promise<Blob>((resolve, reject) => {
        this.overlayCanvas.toBlob(
          (b) => {
            if (b) { resolve(b); return; }
            try {
              const dataUrl = this.overlayCanvas.toDataURL('image/png');
              const byteStr = atob(dataUrl.split(',')[1]);
              const arr = new Uint8Array(byteStr.length);
              for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
              resolve(new Blob([arr], { type: 'image/png' }));
            } catch (err) {
              reject(err);
            }
          },
          'image/png',
        );
      });
    }
    // 3D path — render fresh and composite video + three.js canvas synchronously.
    if (!this.sceneManager) throw new Error('Scene not ready for capture');
    this.sceneManager.dirty = true;
    this.sceneManager.renderIfDirty();
    return compositeCapture(this.video, this.glCanvas);
  }

  /** Tear down all resources. Safe to call multiple times. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.modelLoadCancel) this.modelLoadCancel.cancelled = true;

    cancelAnimationFrame(this.rafId);
    this.rafId = 0;

    this.video.removeEventListener('loadedmetadata', this.handleVideoMetadata);
    document.removeEventListener('visibilitychange', this.handleVisibility);

    stopCamera(this.stream);
    this.stream = null;

    this.poseProcessor?.close();
    this.poseProcessor = null;

    this.sceneManager?.dispose();
    this.sceneManager = null;

    this.segmenter?.close();
    this.segmenter = null;

    this.debugOverlay?.dispose();
    this.debugOverlay = null;

    this.imageOverlay?.dispose();
    this.imageOverlay = null;

    this.boneMapper?.reset();
    this.boneMapper = null;

    clearModelCache();
    this.currentModel = null;
    this.listeners.clear();
  }

  // ── Private: setup helpers ──────────────────────────────────────────────

  private buildAnchorResolver(): AnchorResolver {
    const r = new AnchorResolver();
    r.register('shirt', new ShirtAnchor());
    r.register('abaya', new AbayaAnchor());
    r.register('pants', new PantsAnchor());
    r.register('jacket', new ShirtAnchor());
    r.register('headwear', new AccessoryAnchor());
    r.register('accessory', new AccessoryAnchor());
    return r;
  }

  private resetSmoothingPipeline(): void {
    Object.values(this.filters).forEach((f) => f.reset());
    Object.values(this.outliers).forEach((f) => f.reset());
    this.lastAnchor = null;
    this.pinchScale = 1.0;
  }

  private async load2D(spec: GarmentSpec, cancel: { cancelled: boolean }): Promise<void> {
    this.setTrackingState('model_loading');
    this.emit({ type: 'load-stage', stage: 'Loading garment image…' });
    try {
      this.overlayCanvas.width = window.innerWidth;
      this.overlayCanvas.height = window.innerHeight;

      const overlay = new ImageOverlay(this.overlayCanvas);
      if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
        overlay.updateCoverCrop(
          this.video.videoWidth,
          this.video.videoHeight,
          this.overlayCanvas.width,
          this.overlayCanvas.height,
        );
      }
      await overlay.loadGarment(spec.overlayUrl!, spec.garmentType);
      if (cancel.cancelled || this.disposed) return;
      this.imageOverlay = overlay;
      this.setTrackingState('waiting_for_pose');
      this.emit({ type: 'load-stage', stage: '' });
      this.emit({ type: 'ar-debug', status: '2d_loaded' });
    } catch (err: any) {
      if (cancel.cancelled || this.disposed) return;
      console.error('[GarmentRenderer] 2D overlay load error:', err, 'URL:', spec.overlayUrl);
      this.setTrackingState('model_error');
      this.emit({
        type: 'model-error',
        message: `Could not load garment image. ${err?.message || ''}`,
        canRetry: false,
      });
      this.emit({
        type: 'ar-debug',
        status: 'error',
        error: `2D load failed: ${err?.message || 'unknown'} | URL: ${spec.overlayUrl}`,
      });
    }
  }

  private async load3D(spec: GarmentSpec, cancel: { cancelled: boolean }): Promise<void> {
    if (!this.sceneManager) {
      this.emit({ type: 'init-error', message: 'Scene not ready' });
      return;
    }
    const sm = this.sceneManager;

    this.setTrackingState('model_loading');
    this.emit({ type: 'load-stage', stage: 'Downloading 3D model…' });
    this.emit({ type: 'load-progress', progress: '' });

    const tryLoad = async (attempt: number): Promise<void> => {
      try {
        const result = await loadModel(spec.modelUrl!, (loaded, _total, percent) => {
          if (cancel.cancelled) return;
          if (percent >= 0) this.emit({ type: 'load-progress', progress: `${percent}%` });
          else this.emit({ type: 'load-progress', progress: `${(loaded / (1024 * 1024)).toFixed(1)} MB` });
        });
        if (cancel.cancelled || this.disposed) return;

        this.currentModel = result.wrapper;
        this.modelDims = result.dims;
        sm.swapModel(result.wrapper);
        sm.enhanceMaterials(spec.garmentType);
        applyClothSway(result.wrapper, spec.garmentType);

        if (result.isRigged && result.skeleton) {
          this.boneMapper = BoneMapper.create(result.skeleton);
          if (!this.boneMapper) {
            console.warn('[GarmentRenderer] BoneMapper.create returned null — skeleton has too few mappable bones');
          }
        } else {
          this.boneMapper = null;
        }

        this.setTrackingState('waiting_for_pose');
        this.emit({ type: 'load-progress', progress: '' });
        this.emit({ type: 'load-stage', stage: '' });
        this.emit({ type: 'ar-debug', status: '3d_loaded' });
        sm.dirty = true;
      } catch (err: any) {
        if (cancel.cancelled || this.disposed) return;
        console.error(`[GarmentRenderer] Model load error (attempt ${attempt}):`, err);
        if (attempt < 2) {
          this.emit({ type: 'load-progress', progress: 'Retrying…' });
          setTimeout(() => { if (!cancel.cancelled && !this.disposed) tryLoad(attempt + 1); }, 1000);
        } else {
          this.setTrackingState('model_error');
          const msg = err?.message?.includes('timed out')
            ? 'Model is too large to load on this connection. Ask the retailer for a smaller file.'
            : 'Could not load 3D model. Check your connection and try again.';
          this.emit({ type: 'model-error', message: msg, canRetry: true });
          this.emit({ type: 'ar-debug', status: 'error', error: `3D load failed: ${err?.message || 'unknown'}` });
        }
      }
    };

    tryLoad(1);
  }

  // ── Private: render loop ────────────────────────────────────────────────

  private startLoop(): void {
    const tick = (time: number) => {
      if (this.disposed) return;
      this.debugCounters.rafTicks++;
      try {
        this.renderFrame(time);
      } catch (err: any) {
        // Never let a per-frame error break the loop
        console.error('[GarmentRenderer] Frame error:', err);
        this.emit({ type: 'ar-debug', status: 'frame_error', error: err?.message || String(err) });
      }
      this.updatePerformanceTier(time);
      this.maybeEmitMetrics(time);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private renderFrame(time: number): void {
    const sm = this.sceneManager;
    const pp = this.poseProcessor;
    if (!sm || !pp) return;

    const is2D = this.currentMode === '2d';
    const poseInterval = POSE_INTERVAL_MS[this.tier];

    // ── A: 2D path always repaints video every frame to avoid stuttering ──
    if (is2D && this.imageOverlay && this.video.readyState >= 2) {
      this.imageOverlay.drawVideo(this.video);
      this.debugCounters.overlayDraws++;
      // Re-paint garment with last known landmarks so position holds across pose-frame gaps
      if (this.lastLandmarks) {
        this.imageOverlay.drawGarment(this.lastLandmarks);
      }
    }

    // ── B: pose detection (throttled) ──
    if (this.video.readyState >= 2 && time - this.lastPoseTime > poseInterval) {
      this.lastPoseTime = time;
      const now = performance.now();

      let result: any = null;
      try {
        result = pp.detectForVideo(this.video, now);
        this.debugCounters.poseCalls++;
      } catch (poseErr: any) {
        this.emit({ type: 'ar-debug', status: 'pose_error', error: poseErr?.message || String(poseErr) });
      }

      const haveLandmarks = result && result.landmarks?.length > 0 && result.landmarks[0]?.length > 0;
      if (haveLandmarks) {
        this.framesWithoutPose = 0;
        this.lastLandmarks = result.landmarks[0];
        this.poseEverDetected = true;
        // Snapshot visibility for HUD: shoulders + hips + ankles + face for diagnostics.
        const lm = result.landmarks[0];
        const KEY_INDICES = [0, 11, 12, 23, 24, 25, 26, 27, 28];
        for (const idx of KEY_INDICES) {
          this.latestVisibility[idx] = lm[idx]?.visibility ?? 0;
        }

        if (is2D) {
          this.handleFrame2D(now, result);
        } else {
          this.handleFrame3D(time, now, result, sm);
        }
      } else if (result) {
        this.framesWithoutPose++;
        if (this.framesWithoutPose > 30) {
          this.setTrackingState(
            this.trackingState === 'tracking_active' || this.trackingState === 'partial_tracking'
              ? 'tracking_lost'
              : 'waiting_for_pose',
          );
          if (this.currentModel) {
            this.currentModel.visible = false;
            sm.dirty = true;
          }
        }
      }
    }

    // ── C: cloth sway animation (3D only) ──
    if (this.currentModel?.visible) {
      updateClothSwayTime(this.currentModel, time / 1000);
      sm.dirty = true;
    }

    // ── D: adaptive lighting (3D only) ──
    if (!is2D && this.video.readyState >= 2) {
      sm.updateLightingFromVideo(this.video);
    }
    sm.renderIfDirty();

    // ── E: debug overlay ──
    this.debugOverlay?.draw(this.lastLandmarks, this.trackingState, this.segmenter?.isEnabled ?? false, time);
  }

  private handleFrame2D(now: number, _result: any): void {
    this.setTrackingState('tracking_active');
    if (this.tier !== 'A' || !this.imageOverlay) {
      this.imageOverlay?.updateOcclusionMask(null);
      return;
    }
    try {
      const frameBudget = performance.now() - now;
      const seg = this.segmenter;
      if (seg?.isEnabled && frameBudget < SEG_BUDGET_MS) {
        const mask = seg.segment(this.video, performance.now());
        this.debugCounters.segCalls++;
        if (mask) this.imageOverlay.updateOcclusionMask(mask);
      }
    } catch (err: any) {
      this.emit({ type: 'ar-debug', status: 'seg2d_error', error: err?.message || String(err) });
      this.segmenter?.setEnabled(false);
    }
  }

  private handleFrame3D(_time: number, now: number, result: any, sm: SceneManager): void {
    const spec = this.currentSpec!;
    const garmentType = spec.garmentType;
    const config = GARMENT_PRESETS[garmentType];
    const offset = spec.arPositionOffset || { x: 0, y: 0, z: 0 };
    const arScale = spec.arScale ?? 1;

    const measurements = computeBodyMeasurements(
      result.landmarks[0],
      result.worldLandmarks[0],
      this.coverCrop,
      sm.visibleDims,
    );

    // ── Tracking state from required-landmark visibility ──
    const requiredVisible = config.requiredLandmarks.filter(
      (idx) => (measurements.visibility[idx] ?? 0) >= config.visibilityThreshold,
    );
    const allRequiredVisible = requiredVisible.length === config.requiredLandmarks.length;
    const someRequiredVisible = requiredVisible.length > 0;

    if (this.currentModel) {
      if (allRequiredVisible) {
        this.setTrackingState('tracking_active');
        if (this.lastMissingPartsJson !== '[]') {
          this.lastMissingPartsJson = '[]';
          this.emit({ type: 'missing-parts', parts: [] });
        }
      } else if (someRequiredVisible) {
        this.setTrackingState('partial_tracking');
        const parts = getMissingBodyParts(garmentType, measurements.visibility, config.visibilityThreshold);
        const partsJson = JSON.stringify(parts);
        if (partsJson !== this.lastMissingPartsJson) {
          this.lastMissingPartsJson = partsJson;
          this.emit({ type: 'missing-parts', parts });
        }
      } else {
        this.setTrackingState('waiting_for_pose');
      }
    }

    // ── Anchor solve ──
    const anchor = this.anchorResolver!.resolve(garmentType, measurements, config, this.modelDims);
    if (anchor && this.currentModel) {
      this.currentModel.visible = true;

      const px = this.outliers.posX.filter(anchor.position.x) ?? this.lastAnchor?.position.x ?? anchor.position.x;
      const py = this.outliers.posY.filter(anchor.position.y) ?? this.lastAnchor?.position.y ?? anchor.position.y;
      const sx = this.outliers.scX.filter(anchor.scale.x * arScale) ?? this.lastAnchor?.scale.x ?? anchor.scale.x * arScale;
      const sy = this.outliers.scY.filter(anchor.scale.y * arScale) ?? this.lastAnchor?.scale.y ?? anchor.scale.y * arScale;
      const ry = this.outliers.rotY.filter(anchor.rotationY) ?? this.lastAnchor?.rotationY ?? anchor.rotationY;
      const sz = (sx + sy) / 2;

      const t = performance.now() / 1000;
      const smoothX = this.filters.posX.filter(px, t);
      const smoothY = this.filters.posY.filter(py, t);
      const smoothScX = this.filters.scaleX.filter(sx, t);
      const smoothScY = this.filters.scaleY.filter(sy, t);
      const smoothScZ = this.filters.scaleZ.filter(sz, t);
      const smoothRotY = this.filters.rotY.filter(ry, t);

      this.currentModel.position.set(
        smoothX + offset.x,
        smoothY + offset.y,
        anchor.position.z + offset.z,
      );
      this.currentModel.scale.set(
        smoothScX * this.pinchScale,
        smoothScY * this.pinchScale,
        smoothScZ * this.pinchScale,
      );
      this.currentModel.rotation.y = smoothRotY;

      sm.updateOpacity(Math.min(1, anchor.confidence * 1.5));

      if (this.boneMapper && result.worldLandmarks[0]) {
        this.boneMapper.update(result.worldLandmarks[0]);
      }

      // Tier-A: segmentation occlusion mask drives Three.js depth wall
      if (this.tier === 'A') {
        try {
          const frameBudget = performance.now() - now;
          const seg = this.segmenter;
          if (seg?.isEnabled && frameBudget < SEG_BUDGET_MS) {
            const mask = seg.segment(this.video, performance.now());
            this.debugCounters.segCalls++;
            if (mask) sm.updateOcclusionMask(mask.data, mask.width, mask.height);
          }
        } catch (err: any) {
          this.emit({ type: 'ar-debug', status: 'seg3d_error', error: err?.message || String(err) });
          this.segmenter?.setEnabled(false);
        }
      }

      const floorY = measurements.ankleCenter?.y ?? (measurements.hipCenter.y + 0.8);
      sm.updateShadowPlane(floorY, garmentType);
      sm.dirty = true;

      this.lastAnchor = { ...anchor, scale: { x: sx, y: sy, z: sz } };
    } else if (this.currentModel) {
      this.currentModel.visible = false;
      sm.dirty = true;
    }
  }

  // ── Private: tier + metrics ─────────────────────────────────────────────

  private updatePerformanceTier(time: number): void {
    this.fpsFrames++;
    if (time - this.fpsLastCheck < 2000) return;
    const fps = this.fpsFrames / ((time - this.fpsLastCheck) / 1000);
    this.fpsFrames = 0;
    this.fpsLastCheck = time;

    const t = this.tier;
    const sm = this.sceneManager;

    if (t === 'A' && fps < TIER_THRESHOLDS.downToC) {
      this.tier = 'C';
      this.segmenter?.setEnabled(false);
      sm?.setShadowsEnabled(false);
      this.tierStableStart = 0;
    } else if (t === 'A' && fps < TIER_THRESHOLDS.downToB) {
      this.tier = 'B';
      this.segmenter?.setEnabled(false);
      this.tierStableStart = 0;
    } else if (t === 'B' && fps < TIER_THRESHOLDS.downToC) {
      this.tier = 'C';
      sm?.setShadowsEnabled(false);
      this.tierStableStart = 0;
    } else if (t === 'C' && fps > TIER_THRESHOLDS.upFromC) {
      if (!this.tierStableStart) this.tierStableStart = time;
      else if (time - this.tierStableStart > 5000) {
        this.tier = 'B';
        sm?.setShadowsEnabled(true);
        this.tierStableStart = 0;
      }
    } else if (t === 'B' && fps > TIER_THRESHOLDS.upFromB) {
      if (!this.tierStableStart) this.tierStableStart = time;
      else if (time - this.tierStableStart > 5000) {
        this.tier = 'A';
        this.segmenter?.setEnabled(true);
        this.tierStableStart = 0;
      }
    } else if (
      (t === 'C' && fps <= TIER_THRESHOLDS.upFromC) ||
      (t === 'B' && fps <= TIER_THRESHOLDS.upFromB)
    ) {
      this.tierStableStart = 0;
    }
  }

  private maybeEmitMetrics(time: number): void {
    if (!this.enableMetrics) return;
    if (time - this.metricsLastEmit < 1000) return;
    const elapsed = (time - this.metricsLastEmit) / 1000;
    if (this.metricsLastEmit === 0) {
      this.metricsLastEmit = time;
      return;
    }
    this.emit({
      type: 'metrics',
      fps: Math.round(this.debugCounters.rafTicks / elapsed),
      tier: this.tier,
      rafPerSec: Math.round(this.debugCounters.rafTicks / elapsed),
      posePerSec: Math.round(this.debugCounters.poseCalls / elapsed),
      overlayPerSec: Math.round(this.debugCounters.overlayDraws / elapsed),
      segPerSec: Math.round(this.debugCounters.segCalls / elapsed),
      visibility: { ...this.latestVisibility },
      poseEverDetected: this.poseEverDetected,
    });
    this.debugCounters = { rafTicks: 0, poseCalls: 0, overlayDraws: 0, segCalls: 0 };
    this.metricsLastEmit = time;
  }

  // ── Private: state and event emitter ────────────────────────────────────

  private setTrackingState(next: TrackingState): void {
    if (this.trackingState === next) return;
    this.trackingState = next;
    this.emit({ type: 'tracking-state', state: next });
  }

  private emit(event: GarmentRendererEvent): void {
    for (const l of this.listeners) {
      try { l(event); } catch (err) {
        console.error('[GarmentRenderer] listener threw:', err);
      }
    }
  }
}

/** Convenience: prefetch a model URL outside the renderer (e.g. on product fetch). */
export { prefetchModel };
