/**
 * GarmentRenderer — single-class facade that owns the entire AR runtime.
 *
 * Session 3 simplification:
 * - 3D-only. The 2D image-overlay path has been removed; ImageOverlay.ts is
 *   gone. The retailer dashboard's ar_overlay_url field is ignored at runtime.
 * - No body segmentation (BodySegmenter.ts removed). Occlusion was Tier-A only
 *   and added significant complexity for marginal visual gain at the prototype
 *   stage.
 * - No performance tier auto-downgrade (A/B/C). Fixed-quality 15 FPS pose
 *   detection. Re-introduce later if a low-end device tests show jitter.
 * - State transitions in handleFrame3D are NO LONGER gated by `currentModel`
 *   being set — the prior gate caused the state to stay at init-time
 *   `waiting_for_pose` while the GLB was loading, which was the most likely
 *   root cause of the persistent "Show Upper Body" guidance message.
 *
 * What this class still owns:
 * - Camera lifecycle (CameraManager)
 * - MediaPipe PoseLandmarker (~15 FPS throttled)
 * - Three.js scene / renderer / camera / lighting (SceneManager)
 * - GLB load + skeleton retargeting (ModelLoader, BoneMapper)
 * - Anchor strategies (Shirt, Abaya, Pants, Accessory) for garment placement
 * - Smoothing pipeline (OneEuro + outlier filters per channel)
 * - The single requestAnimationFrame loop driving everything
 *
 * Lifecycle:
 *   const renderer = new GarmentRenderer({ videoEl, glCanvas, debugMount });
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

/** Pose detection cadence — fixed ~15 FPS. */
const POSE_INTERVAL_MS = 66;

// ── Public types ──────────────────────────────────────────────────────────

export interface GarmentRendererOptions {
  videoEl: HTMLVideoElement;
  glCanvas: HTMLCanvasElement;
  /** Mount point for the 2D landmark debug overlay (typically canvas parent). */
  debugMount: HTMLElement;
  /** Emit `metrics` events at ~1 Hz when true. */
  enableMetrics?: boolean;
}

export interface GarmentSpec {
  garmentType: GarmentType;
  /** 3D model URL (GLB). Required — runtime is 3D-only. */
  modelUrl?: string;
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
      rafPerSec: number;
      posePerSec: number;
      /** Per-landmark visibility from the most recent pose detection (0-1). */
      visibility: Record<number, number>;
      /** True if MediaPipe has produced at least one landmark since init. */
      poseEverDetected: boolean;
      /** Wrapper world-space Y position (after smoothing). 0 if no model loaded. */
      wrapperPosY: number;
      /** Wrapper Y-axis scale factor applied by the anchor strategy. */
      scaleY: number;
      /** Model bbox height. < 0.5 typically signals a Z-up GLB orientation bug. */
      modelDimsH: number;
      /** Last computed shoulder-center Y in three.js world coords (Y-up). */
      shoulderY: number;
      /** Last computed hip-center Y in three.js world coords (Y-up, may be estimated). */
      hipY: number;
      /** True when ?nobones=1 forced BoneMapper off — for bisection testing. */
      bonesDisabled: boolean;
    }
  | { type: 'ar-debug'; status: string; error?: string; boneCount?: number };

export type GarmentRendererListener = (event: GarmentRendererEvent) => void;

/** Resolve which AR rendering mode to use. 3D-only at runtime. */
export function resolveARMode(spec: { modelUrl?: string }): ARMode {
  return spec.modelUrl ? '3d' : 'none';
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
  private readonly debugMount: HTMLElement;
  private readonly enableMetrics: boolean;

  // Subsystems (created during init)
  private sceneManager: SceneManager | null = null;
  private poseProcessor: PoseProcessor | null = null;
  private debugOverlay: DebugOverlay | null = null;
  private boneMapper: BoneMapper | null = null;
  private anchorResolver: AnchorResolver | null = null;
  private currentModel: Object3D | null = null;
  private modelDims = { w: 1, h: 1, d: 1 };

  // Camera state
  private stream: MediaStream | null = null;
  private coverCrop: CoverCropInfo = { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };

  // Smoothing pipeline
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

  // Debug HUD counters
  private debugCounters = { rafTicks: 0, poseCalls: 0 };
  private metricsLastEmit = 0;
  private latestVisibility: Record<number, number> = {};
  private poseEverDetected = false;

  // Interaction
  private pinchScale = 1.0;

  // Spec
  private currentSpec: GarmentSpec | null = null;
  private currentMode: ARMode = 'none';
  private modelLoadCancel: { cancelled: boolean } | null = null;
  // Holds a spec passed to loadGarment() before init() finished building
  // sceneManager. Flushed at the end of init().
  private pendingSpec: GarmentSpec | null = null;

  // Diagnostic snapshots — emitted on the 'metrics' event each second so the
  // HUD can show what the placement math is actually doing on-device.
  private lastShoulderY = 0;
  private lastHipY = 0;
  private bonesDisabled = false;

  // Listeners
  private readonly listeners = new Set<GarmentRendererListener>();
  private disposed = false;

  // Event handler refs (so dispose can remove them)
  private readonly handleVideoMetadata = () => {
    const v = this.video;
    if (v.videoWidth > 0 && v.videoHeight > 0) {
      this.coverCrop = computeCoverCrop(
        v.videoWidth,
        v.videoHeight,
        this.glCanvas.width,
        this.glCanvas.height,
      );
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
    this.debugMount = opts.debugMount;
    this.enableMetrics = !!opts.enableMetrics;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  on(listener: GarmentRendererListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get mode(): ARMode {
    return this.currentMode;
  }

  get isReady(): boolean {
    return this.sceneManager !== null && this.poseProcessor !== null;
  }

  /**
   * Initialize camera + pose + scene in parallel where possible.
   * Idempotent: subsequent calls no-op.
   */
  async init(): Promise<void> {
    if (this.disposed) throw new Error('GarmentRenderer already disposed');
    if (this.poseProcessor && this.sceneManager) return;

    try {
      // WebGL2 capability gate. Synchronous, fails fast.
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

      // Kick off camera + pose in parallel
      const cameraPromise = startCamera(this.video).catch((err: any) => ({ error: err }));
      const posePromise = createPoseProcessor().catch((err: any) => ({ error: err }));

      const [camResult, poseResult] = await Promise.all([cameraPromise, posePromise]);

      if (this.disposed) {
        if (camResult && !('error' in camResult)) stopCamera(camResult.stream);
        if (poseResult && !('error' in poseResult)) (poseResult as PoseProcessor).close();
        return;
      }

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

      if ('error' in poseResult) {
        this.emit({
          type: 'pose-init-failed',
          message: poseResult.error?.message || 'Body tracking failed. Try refreshing.',
        });
        return;
      }
      this.poseProcessor = poseResult as PoseProcessor;

      this.video.addEventListener('loadedmetadata', this.handleVideoMetadata);
      document.addEventListener('visibilitychange', this.handleVisibility);

      this.sceneManager = new SceneManager(this.glCanvas);
      this.debugOverlay = new DebugOverlay(this.debugMount);
      this.anchorResolver = this.buildAnchorResolver();

      this.setTrackingState('waiting_for_pose');
      this.emit({ type: 'load-stage', stage: '' });

      // Flush any spec passed to loadGarment() before sceneManager existed.
      // Reuse the existing cancel token so a later loadGarment can supersede.
      if (this.pendingSpec && !this.disposed) {
        const queued = this.pendingSpec;
        this.pendingSpec = null;
        const cancelToken = this.modelLoadCancel ?? { cancelled: false };
        this.modelLoadCancel = cancelToken;
        void this.load3D(queued, cancelToken);
      }

      this.startLoop();
    } catch (err: any) {
      console.error('[GarmentRenderer] init crashed:', err);
      this.emit({ type: 'init-error', message: err?.message || 'AR failed to initialize. Try refreshing.' });
    }
  }

  /**
   * Swap to the given garment. Resolves when the GLB is loaded.
   * Cancels any in-flight load from a prior call.
   */
  async loadGarment(spec: GarmentSpec): Promise<void> {
    if (this.disposed) return;

    if (this.modelLoadCancel) this.modelLoadCancel.cancelled = true;
    const cancelToken = { cancelled: false };
    this.modelLoadCancel = cancelToken;

    this.currentSpec = spec;

    const mode = resolveARMode({ modelUrl: spec.modelUrl });
    this.currentMode = mode;
    this.emit({ type: 'mode-change', mode });

    if (mode === 'none') {
      this.setTrackingState('model_error');
      this.emit({
        type: 'model-error',
        message: 'No 3D model found for this product. Ask the retailer to upload a GLB.',
        canRetry: false,
      });
      this.emit({ type: 'ar-debug', status: 'error', error: 'no model URL' });
      return;
    }

    // Tear down prior garment state
    if (this.currentModel) {
      this.sceneManager?.swapModel(null);
      this.currentModel = null;
    }
    this.boneMapper?.reset();
    this.boneMapper = null;
    this.resetSmoothingPipeline();
    this.lastLandmarks = null;
    this.sceneManager?.setShadowsEnabled(true);

    this.emit({ type: 'ar-debug', status: 'loading_3d' });

    if (!this.sceneManager) {
      // init() hasn't finished building sceneManager yet. Queue the spec; the
      // tail of init() will flush it. Status stays at loading_3d, which is
      // accurate — the request is in flight, just waiting on init.
      this.pendingSpec = spec;
      return;
    }
    this.pendingSpec = null;

    await this.load3D(spec, cancelToken);
  }

  setPinchScale(scale: number): void {
    this.pinchScale = Math.max(0.5, Math.min(2.0, scale));
    if (this.sceneManager) this.sceneManager.dirty = true;
  }

  resize(width: number, height: number): void {
    this.sceneManager?.handleResize();
    this.debugOverlay?.resize(width, height);
    if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
      this.coverCrop = computeCoverCrop(this.video.videoWidth, this.video.videoHeight, width, height);
    }
  }

  /**
   * Capture the current frame as a PNG Blob. Renders fresh + composites
   * synchronously (preserveDrawingBuffer: false requires the toBlob/drawImage
   * to happen before the browser yields).
   */
  async capture(): Promise<Blob> {
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

    this.debugOverlay?.dispose();
    this.debugOverlay = null;

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

        // Bisection kill-switch: ?nobones=1 forces static T-pose (no rig
        // retargeting). Lets us isolate placement bugs from rig bugs without
        // modifying any other code path.
        const skipBones = new URLSearchParams(window.location.search).get('nobones') === '1';
        this.bonesDisabled = skipBones;
        if (result.isRigged && result.skeleton && !skipBones) {
          this.boneMapper = BoneMapper.create(result.skeleton);
          if (!this.boneMapper) {
            console.warn('[GarmentRenderer] BoneMapper.create returned null — skeleton has too few mappable bones');
          }
        } else {
          this.boneMapper = null;
          if (skipBones) {
            console.info('[GarmentRenderer] BoneMapper disabled via ?nobones=1 — model in static T-pose');
          }
        }

        this.setTrackingState('waiting_for_pose');
        this.emit({ type: 'load-progress', progress: '' });
        this.emit({ type: 'load-stage', stage: '' });
        this.emit({
          type: 'ar-debug',
          status: '3d_loaded',
          boneCount: this.boneMapper?.boneCount ?? 0,
        });
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
      this.maybeEmitMetrics(time);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private renderFrame(time: number): void {
    const sm = this.sceneManager;
    const pp = this.poseProcessor;
    if (!sm || !pp) return;

    // ── Pose detection (throttled) ──
    if (this.video.readyState >= 2 && time - this.lastPoseTime > POSE_INTERVAL_MS) {
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
        const lm = result.landmarks[0];
        const KEY_INDICES = [0, 11, 12, 23, 24, 25, 26, 27, 28];
        for (const idx of KEY_INDICES) {
          this.latestVisibility[idx] = lm[idx]?.visibility ?? 0;
        }
        this.handleFrame3D(result, sm);
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

    // Cloth sway animation
    if (this.currentModel?.visible) {
      updateClothSwayTime(this.currentModel, time / 1000);
      sm.dirty = true;
    }

    // Adaptive lighting from camera
    if (this.video.readyState >= 2) {
      sm.updateLightingFromVideo(this.video);
    }
    sm.renderIfDirty();

    // Debug overlay
    this.debugOverlay?.draw(this.lastLandmarks, this.trackingState, false, time);
  }

  /**
   * Handle a frame with valid landmarks.
   *
   * IMPORTANT: state transitions are NOT gated on `currentModel`. Tracking
   * state reflects what MediaPipe sees, regardless of whether the GLB has
   * finished loading. The model's visibility + transform updates are gated
   * separately below.
   */
  private handleFrame3D(result: any, sm: SceneManager): void {
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

    this.lastShoulderY = measurements.shoulderCenter?.y ?? 0;
    this.lastHipY = measurements.hipCenter?.y ?? 0;

    const requiredVisible = config.requiredLandmarks.filter(
      (idx) => (measurements.visibility[idx] ?? 0) >= config.visibilityThreshold,
    );
    const allRequiredVisible = requiredVisible.length === config.requiredLandmarks.length;
    const someRequiredVisible = requiredVisible.length > 0;

    // ── Tracking state (decoupled from currentModel; bug fix from Session 2) ──
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

    // ── Anchor solve + model placement (gated on currentModel being loaded) ──
    if (!this.currentModel) return;

    const anchor = this.anchorResolver!.resolve(garmentType, measurements, config, this.modelDims);
    if (anchor) {
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

      const floorY = measurements.ankleCenter?.y ?? (measurements.hipCenter.y + 0.8);
      sm.updateShadowPlane(floorY, garmentType);
      sm.dirty = true;

      this.lastAnchor = { ...anchor, scale: { x: sx, y: sy, z: sz } };
    } else {
      this.currentModel.visible = false;
      sm.dirty = true;
    }
  }

  // ── Private: metrics ───────────────────────────────────────────────────

  private maybeEmitMetrics(time: number): void {
    if (!this.enableMetrics) return;
    if (time - this.metricsLastEmit < 1000) return;
    if (this.metricsLastEmit === 0) {
      this.metricsLastEmit = time;
      return;
    }
    const elapsed = (time - this.metricsLastEmit) / 1000;
    this.emit({
      type: 'metrics',
      fps: Math.round(this.debugCounters.rafTicks / elapsed),
      rafPerSec: Math.round(this.debugCounters.rafTicks / elapsed),
      posePerSec: Math.round(this.debugCounters.poseCalls / elapsed),
      visibility: { ...this.latestVisibility },
      poseEverDetected: this.poseEverDetected,
      wrapperPosY: this.currentModel?.position.y ?? 0,
      scaleY: this.currentModel?.scale.y ?? 0,
      modelDimsH: this.modelDims.h,
      shoulderY: this.lastShoulderY,
      hipY: this.lastHipY,
      bonesDisabled: this.bonesDisabled,
    });
    this.debugCounters = { rafTicks: 0, poseCalls: 0 };
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

/** Convenience: prefetch a model URL outside the renderer. */
export { prefetchModel };
