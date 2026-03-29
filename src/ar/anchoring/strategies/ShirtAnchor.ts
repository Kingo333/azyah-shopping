/**
 * Shirt anchor strategy.
 *
 * Positions a shirt/top garment model from shoulders to hips.
 * Uses shoulder width with 1.15x padding for garment drape,
 * and torso height for vertical scaling.
 *
 * Falls back to estimated torso height (shoulderWidth * 1.3) when
 * hips are not visible, marking the result as degraded.
 *
 * @see types.ts for AnchorStrategy interface
 * @see garmentPresets.ts for shirt config values
 */
import { LANDMARK } from '../../config/landmarkIndices';
import type { AnchorStrategy, AnchorResult, BodyMeasurements, GarmentConfig } from '../types';

export class ShirtAnchor implements AnchorStrategy {
  /**
   * Compute anchor position and scale for a shirt garment.
   *
   * @returns AnchorResult or null if shoulders are not visible.
   */
  compute(
    measurements: BodyMeasurements,
    config: GarmentConfig,
    modelDims: { w: number; h: number; d: number },
  ): AnchorResult | null {
    // Shirts require shoulders to be visible
    if (!measurements.hasShoulders) {
      return null;
    }

    let degraded = false;

    // --- Width scaling ---
    const scaleX =
      (measurements.shoulderWidthMetric * config.widthPadding) / modelDims.w;

    // --- Height scaling ---
    let torsoHeight = measurements.torsoHeightMetric;
    if (!measurements.hasHips || torsoHeight === 0) {
      // Estimate torso height from shoulder width (typical body proportion)
      torsoHeight = measurements.shoulderWidthMetric * 1.3;
      degraded = true;
    }
    const scaleY = (torsoHeight * config.heightPadding) / modelDims.h;

    // Scale Z: average of scaleX and scaleY
    const scaleZ = (scaleX + scaleY) / 2;

    // --- Position ---
    // Torso center: midpoint of shoulderCenter and hipCenter in screen space
    const posX = (measurements.shoulderCenter.x + measurements.hipCenter.x) / 2;
    const posY = (measurements.shoulderCenter.y + measurements.hipCenter.y) / 2;
    // Apply vertical offset as fraction of computed height in screen space
    const offsetY = config.verticalOffset * scaleY * modelDims.h;

    // --- Rotation ---
    const rotationY = measurements.bodyTurnY;

    // --- Confidence ---
    // Average visibility of used landmarks (shoulders + hips if available)
    const vis = measurements.visibility;
    const shoulderVis =
      ((vis[LANDMARK.LEFT_SHOULDER] ?? 0) + (vis[LANDMARK.RIGHT_SHOULDER] ?? 0)) / 2;
    let confidence: number;
    if (measurements.hasHips) {
      const hipVis =
        ((vis[LANDMARK.LEFT_HIP] ?? 0) + (vis[LANDMARK.RIGHT_HIP] ?? 0)) / 2;
      confidence = (shoulderVis + hipVis) / 2;
    } else {
      confidence = shoulderVis;
    }

    return {
      position: { x: posX, y: posY + offsetY, z: 0 },
      scale: { x: scaleX, y: scaleY, z: scaleZ },
      rotationY,
      confidence,
      degraded,
    };
  }
}
