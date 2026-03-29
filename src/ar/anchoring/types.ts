/**
 * Type contracts for the garment anchor system.
 *
 * These interfaces define the contract between:
 * - BodyMeasurement (produces BodyMeasurements)
 * - Anchor strategies (consume BodyMeasurements + GarmentConfig, produce AnchorResult)
 * - AnchorResolver (dispatches to the correct strategy by garment type)
 *
 * All anchor strategies implement AnchorStrategy. All strategies produce AnchorResult.
 * BodyMeasurements is the shared input computed once per frame from pose landmarks.
 */
import type { GarmentType } from '../types';

/**
 * Interface that all garment anchor strategies must implement.
 *
 * Each strategy computes position, scale, and rotation for a specific
 * garment type based on body measurements and garment configuration.
 */
export interface AnchorStrategy {
  compute(
    measurements: BodyMeasurements,
    config: GarmentConfig,
    modelDims: { w: number; h: number; d: number },
  ): AnchorResult | null;
}

/**
 * Output of an anchor strategy computation.
 *
 * Provides the full 3D transform for placing a garment model on the body,
 * plus quality metadata for UI feedback (opacity, degraded indicators).
 */
export interface AnchorResult {
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  rotationY: number;
  /** Overall confidence 0-1, drives garment opacity for graceful tracking loss. */
  confidence: number;
  /** True if using fallback estimation (e.g., ankles estimated from hip extrapolation). */
  degraded: boolean;
}

/**
 * Body measurements computed from pose landmarks.
 *
 * Strict separation:
 * - World-space measurements (meters) come from MediaPipe worldLandmarks
 * - Screen-space positions (Three.js world units) come from normalized landmarks + cover crop
 *
 * Computed once per frame by BodyMeasurement, consumed by all anchor strategies.
 */
export interface BodyMeasurements {
  // World-space measurements (meters, from worldLandmarks)
  shoulderWidthMetric: number;
  torsoHeightMetric: number;
  hipWidthMetric: number;
  shoulderToAnkleMetric: number;
  hipToAnkleMetric: number;

  // Screen-space positions (Three.js world units)
  shoulderCenter: { x: number; y: number };
  hipCenter: { x: number; y: number };
  kneeCenter: { x: number; y: number } | null;
  ankleCenter: { x: number; y: number } | null;
  nosePosition: { x: number; y: number } | null;
  earMidpoint: { x: number; y: number } | null;

  // Per-landmark visibility (0-1)
  visibility: Record<number, number>;

  // Rotation
  bodyTurnY: number;
  shoulderTiltZ: number;

  // Derived flags
  hasShoulders: boolean;
  hasHips: boolean;
  hasKnees: boolean;
  hasAnkles: boolean;
  hasHead: boolean;
}

/**
 * Per-garment-type configuration for anchor computation.
 *
 * Defines which landmarks are required/optional, visibility thresholds,
 * and scaling parameters for each garment type.
 */
export interface GarmentConfig {
  type: GarmentType;
  /** Landmark indices that must be visible above visibilityThreshold. */
  requiredLandmarks: number[];
  /** Landmark indices that improve quality if available. */
  optionalLandmarks: number[];
  /** Minimum visibility score (0-1) for a landmark to be considered visible. */
  visibilityThreshold: number;
  /** Multiplier on body width measurement for garment width. */
  widthPadding: number;
  /** Multiplier on body height measurement for garment height. */
  heightPadding: number;
  /** Fraction of garment height to shift vertically (negative = up). */
  verticalOffset: number;
  /** Which body measurement to use as width reference. */
  widthRef: 'shoulder' | 'hip' | 'ear';
  /** Which body measurement to use as height reference. */
  heightRef: 'torso' | 'shoulder_to_ankle' | 'hip_to_ankle' | 'head';
}
