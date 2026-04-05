/**
 * Unified garment rendering class — consolidates the AR rendering pipeline.
 *
 * Owns: SceneManager, AnchorResolver, smoothing filters, BoneMapper, BodySegmenter.
 * Exposes a clean API: loadGarment(), updateFrame(), render(), dispose().
 *
 * This is the "GarmentRenderer" from the simplified architecture diagram:
 *   AREngine → CameraManager → PoseTracker → GarmentRenderer
 */
import { SceneManager } from './SceneManager';
import { loadModel, clearModelCache, type ModelResult } from './ModelLoader';
import { BoneMapper } from './BoneMapper';
import { BodySegmenter } from './BodySegmenter';
import { AnchorResolver } from '../anchoring/AnchorResolver';
import { computeBodyMeasurements } from '../anchoring/BodyMeasurement';
import { ShirtAnchor } from '../anchoring/strategies/ShirtAnchor';
import { AbayaAnchor } from '../anchoring/strategies/AbayaAnchor';
import { PantsAnchor } from '../anchoring/strategies/PantsAnchor';
import { AccessoryAnchor } from '../anchoring/strategies/AccessoryAnchor';
import { GARMENT_PRESETS } from '../config/garmentPresets';
import { OneEuroFilter, FILTER_PRESETS } from '../utils/OneEuroFilter';
import { OutlierFilter } from '../utils/OutlierFilter';
import type { GarmentType } from '../types';
import type { AnchorResult } from '../anchoring/types';
import type { CoverCropInfo } from '../utils/coordinateUtils';
import type { Object3D } from 'three';

export interface FrameResult {
  quality: 'active' | 'partial' | 'lost' | 'no_model';
  missingParts: string[];
}

/**
 * Consolidated garment rendering pipeline.
 *
 * Call order per frame:
 *   1. updateFrame(video, landmarks, worldLandmarks, ...) → FrameResult
 *   2. render()
 */
export class GarmentRenderer {
  readonly sceneManager: SceneManager;
  private resolver: AnchorResolver;
  private boneMapper: BoneMapper | null = null;
  private segmenter: BodySegmenter | null = null;

  // Smoothing filters (one per axis)
  private filterPosX = new OneEuroFilter(FILTER_PRESETS.position.minCutoff, FILTER_PRESETS.position.beta, FILTER_PRESETS.position.dCutoff);
  private filterPosY = new OneEuroFilter(FILTER_PRESETS.position.minCutoff, FILTER_PRESETS.position.beta, FILTER_PRESETS.position.dCutoff);
  private filterScaleX = new OneEuroFilter(FILTER_PRESETS.scale.minCutoff, FILTER_PRESETS.scale.beta, FILTER_PRESETS.scale.dCutoff);
  private filterScaleY = new OneEuroFilter(FILTER_PRESETS.scale.minCutoff, FILTER_PRESETS.scale.beta, FILTER_PRESETS.scale.dCutoff);
  private filterScaleZ = new OneEuroFilter(FILTER_PRESETS.scale.minCutoff, FILTER_PRESETS.scale.beta, FILTER_PRESETS.scale.dCutoff);
  private filterRotY = new OneEuroFilter(FILTER_PRESETS.rotation.minCutoff, FILTER_PRESETS.rotation.beta, FILTER_PRESETS.rotation.dCutoff);

  // Outlier rejection (before smoothing)
  private outlierPosX = new OutlierFilter(15, 3.0);
  private outlierPosY = new OutlierFilter(15, 3.0);
  private outlierScX = new OutlierFilter(15, 3.0);
  private outlierScY = new OutlierFilter(15, 3.0);
  private outlierRotY = new OutlierFilter(15, 3.0);

  // State
  private model: Object3D | null = null;
  private modelDims = { w: 1, h: 1, d: 1 };
  private lastAnchor: AnchorResult | null = null;
  private pinchScale = 1.0;

  constructor(canvas: HTMLCanvasElement) {
    this.sceneManager = new SceneManager(canvas);

    this.resolver = new AnchorResolver();
    this.resolver.register('shirt', new ShirtAnchor());
    this.resolver.register('abaya', new AbayaAnchor());
    this.resolver.register('pants', new PantsAnchor());
    this.resolver.register('jacket', new ShirtAnchor());
    this.resolver.register('headwear', new AccessoryAnchor());
    this.resolver.register('accessory', new AccessoryAnchor());
  }

  /** Set the optional body segmenter (for occlusion). */
  setSegmenter(seg: BodySegmenter | null): void {
    this.segmenter = seg;
  }

  /** Load a garment model and prepare it for rendering. */
  async loadGarment(url: string, garmentType: GarmentType, onProgress?: (loaded: number, total: number, percent: number) => void): Promise<ModelResult> {
    this.resetFilters();

    const result = await loadModel(url, onProgress);

    this.model = result.wrapper;
    this.modelDims = result.dims;
    this.sceneManager.swapModel(result.wrapper);
    this.sceneManager.enhanceMaterials(garmentType);

    // Bone deformation for rigged models
    if (result.isRigged && result.skeleton) {
      this.boneMapper = BoneMapper.create(result.skeleton);
    } else {
      this.boneMapper = null;
    }

    return result;
  }

  /** Set pinch-to-zoom manual scale multiplier. */
  setPinchScale(scale: number): void {
    this.pinchScale = Math.max(0.5, Math.min(2.0, scale));
  }

  get currentPinchScale(): number {
    return this.pinchScale;
  }

  /**
   * Process one frame of the AR pipeline.
   *
   * Runs: measurements → anchor → outlier → smooth → bones → segmentation → shadow → transform.
   */
  updateFrame(
    video: HTMLVideoElement,
    landmarks: any[],
    worldLandmarks: any[],
    coverCrop: CoverCropInfo,
    timestamp: number,
    garmentType: GarmentType,
    arScale: number,
    positionOffset: { x: number; y: number; z: number },
  ): FrameResult {
    if (!this.model) return { quality: 'no_model', missingParts: [] };

    const sm = this.sceneManager;
    const config = GARMENT_PRESETS[garmentType];

    // 1. Body measurements
    const measurements = computeBodyMeasurements(landmarks, worldLandmarks, coverCrop, sm.visibleDims);

    // 2. Anchor resolution
    const anchor = this.resolver.resolve(garmentType, measurements, config, this.modelDims);

    if (anchor) {
      this.model.visible = true;

      // 3. Outlier rejection
      const px = this.outlierPosX.filter(anchor.position.x) ?? this.lastAnchor?.position.x ?? anchor.position.x;
      const py = this.outlierPosY.filter(anchor.position.y) ?? this.lastAnchor?.position.y ?? anchor.position.y;
      const sx = this.outlierScX.filter(anchor.scale.x * arScale) ?? this.lastAnchor?.scale.x ?? anchor.scale.x * arScale;
      const sy = this.outlierScY.filter(anchor.scale.y * arScale) ?? this.lastAnchor?.scale.y ?? anchor.scale.y * arScale;
      const ry = this.outlierRotY.filter(anchor.rotationY) ?? this.lastAnchor?.rotationY ?? anchor.rotationY;
      const sz = (sx + sy) / 2;

      // 4. Adaptive smoothing
      const t = timestamp / 1000;
      const smoothX = this.filterPosX.filter(px, t);
      const smoothY = this.filterPosY.filter(py, t);
      const smoothScX = this.filterScaleX.filter(sx, t);
      const smoothScY = this.filterScaleY.filter(sy, t);
      const smoothScZ = this.filterScaleZ.filter(sz, t);
      const smoothRotY = this.filterRotY.filter(ry, t);

      // 5. Apply transform
      this.model.position.set(smoothX + positionOffset.x, smoothY + positionOffset.y, anchor.position.z + positionOffset.z);
      this.model.scale.set(smoothScX * this.pinchScale, smoothScY * this.pinchScale, smoothScZ * this.pinchScale);
      this.model.rotation.y = smoothRotY;

      // 6. Bone deformation
      if (this.boneMapper && worldLandmarks) {
        this.boneMapper.update(worldLandmarks);
      }

      // 7. Segmentation occlusion
      if (this.segmenter?.isEnabled) {
        const mask = this.segmenter.segment(video, timestamp);
        if (mask) {
          sm.updateOcclusionMask(mask.data, mask.width, mask.height);
        }
      }

      // 8. Shadow + opacity
      const floorY = measurements.ankleCenter?.y ?? (measurements.hipCenter.y + 0.8);
      sm.updateShadowPlane(floorY, garmentType);
      sm.updateOpacity(Math.min(1, anchor.confidence * 1.5));
      sm.dirty = true;

      this.lastAnchor = { ...anchor, scale: { x: sx, y: sy, z: sz } };

      return { quality: 'active', missingParts: [] };
    } else {
      this.model.visible = false;
      sm.dirty = true;
      return { quality: 'lost', missingParts: [] };
    }
  }

  /** Render the scene (only if dirty). */
  render(): void {
    this.sceneManager.renderIfDirty();
  }

  /** Reset all filters and bone mapper (call on product switch). */
  resetFilters(): void {
    this.filterPosX.reset(); this.filterPosY.reset();
    this.filterScaleX.reset(); this.filterScaleY.reset(); this.filterScaleZ.reset();
    this.filterRotY.reset();
    this.outlierPosX.reset(); this.outlierPosY.reset();
    this.outlierScX.reset(); this.outlierScY.reset();
    this.outlierRotY.reset();
    this.lastAnchor = null;
    this.pinchScale = 1.0;
    this.boneMapper?.reset();
    this.boneMapper = null;
  }

  /** Dispose all resources. */
  dispose(): void {
    this.sceneManager.dispose();
    this.segmenter?.close();
    this.segmenter = null;
    this.boneMapper = null;
    clearModelCache();
  }
}
