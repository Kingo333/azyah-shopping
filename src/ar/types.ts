/**
 * Shared type definitions for the AR try-on system.
 */

export type GarmentType = 'shirt' | 'abaya' | 'pants' | 'jacket' | 'headwear' | 'accessory';

export interface ARProduct {
  id: string;
  image_url: string;
  ar_model_url: string;
  ar_scale: number;
  ar_position_offset?: { x: number; y: number; z: number };
  brand_name?: string;
  name?: string;
  garment_type?: GarmentType;
}

export type ARMode = '3d' | 'none';

export type TrackingState =
  | 'initializing'
  | 'camera_denied'
  | 'camera_error'
  | 'pose_init_failed'
  | 'model_loading'
  | 'model_error'
  | 'waiting_for_pose'
  | 'partial_tracking'
  | 'tracking_lost'
  | 'tracking_active';

/**
 * Runtime stability modes.
 *
 * anchor-only:
 * - stable torso placement only
 * - no skeleton driving
 *
 * anchor-plus-yaw:
 * - torso placement + yaw rotation
 * - no skeleton driving
 *
 * anchor-plus-safe-rig:
 * - torso placement + yaw + validated rig profile
 * - only for approved garments
 *
 * full-rig-experimental:
 * - reserved for future higher-risk rigs
 */
export type ARStabilityMode =
  | 'anchor-only'
  | 'anchor-plus-yaw'
  | 'anchor-plus-safe-rig'
  | 'full-rig-experimental';

/**
 * Optional garment-side calibration file that lives next to the GLB.
 * Example:
 *   shirt.glb
 *   shirt.ar.json
 */
export interface GarmentCalibration {
  version: 1;
  garmentType?: GarmentType;
  /** Canonical torso-space pivot inside the normalized model. */
  anchorPivot?: { x: number; y: number; z: number };
  /** Better-than-bbox fitting references. */
  fit?: {
    shoulderWidth?: number;
    torsoHeight?: number;
    hipWidth?: number;
  };
  /** Extra offsets after placement, in local garment space. */
  placementOffset?: { x?: number; y?: number; z?: number };
  /** Optional recommended multiplier for final scale. */
  scaleMultiplier?: number;
  /** Explicitly choose the safe runtime mode for this garment. */
  preferredMode?: ARStabilityMode;
  /** Rig profile to use if and only if rigging is allowed. */
  rigProfile?: string;
  /** Explicit guard so random rigged GLBs do not auto-enable bones. */
  allowBoneRetargeting?: boolean;
}

export interface GarmentFitRefs {
  shoulderWidth?: number;
  torsoHeight?: number;
  hipWidth?: number;
}

export interface ARAssetNormalization {
  upAxis: 'y-up' | 'z-up-corrected' | 'unknown';
  originalCenter: { x: number; y: number; z: number };
  normalizedCenter: { x: number; y: number; z: number };
  anchorPivot: { x: number; y: number; z: number };
}

export interface RigValidationResult {
  enabled: boolean;
  reason:
    | 'not-rigged'
    | 'no-profile'
    | 'profile-mismatch'
    | 'calibration-disallows-rigging'
    | 'mode-disallows-rigging'
    | 'validated';
  rigProfile?: string;
}
