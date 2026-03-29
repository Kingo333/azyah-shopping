/**
 * Accessory anchor strategy.
 *
 * Handles two sub-types based on GarmentConfig.type:
 * - 'headwear': positions above nose, scaled by ear-to-ear distance
 * - 'accessory' (necklace): positions at shoulder neckline
 *
 * Each sub-type has different required landmarks and positioning logic.
 *
 * @see types.ts for AnchorStrategy interface
 * @see garmentPresets.ts for headwear and accessory config values
 */
import { LANDMARK } from '../../config/landmarkIndices';
import type { AnchorStrategy, AnchorResult, BodyMeasurements, GarmentConfig } from '../types';

export class AccessoryAnchor implements AnchorStrategy {
  /**
   * Compute anchor position and scale for an accessory garment.
   *
   * Dispatches to headwear or necklace logic based on config.type.
   *
   * @returns AnchorResult or null if required landmarks are not visible.
   */
  compute(
    measurements: BodyMeasurements,
    config: GarmentConfig,
    modelDims: { w: number; h: number; d: number },
  ): AnchorResult | null {
    if (config.type === 'headwear') {
      return this.computeHeadwear(measurements, config, modelDims);
    }
    // Default: accessory (necklace)
    return this.computeNecklace(measurements, config, modelDims);
  }

  /**
   * Compute anchor for headwear (hat, cap, hijab).
   *
   * Requires nose visibility. Uses ear distance for width if available,
   * falls back to shoulder width * 0.4 estimate.
   */
  private computeHeadwear(
    measurements: BodyMeasurements,
    config: GarmentConfig,
    modelDims: { w: number; h: number; d: number },
  ): AnchorResult | null {
    // Headwear requires head (nose) to be visible
    if (!measurements.hasHead || !measurements.nosePosition) {
      return null;
    }

    // --- Width ---
    let headWidth: number;
    if (measurements.earMidpoint) {
      // Ear-to-ear metric distance
      const vis = measurements.visibility;
      const leftEarVis = vis[LANDMARK.LEFT_EAR] ?? 0;
      const rightEarVis = vis[LANDMARK.RIGHT_EAR] ?? 0;
      // Use ear width: approximate from shoulder width * ear/shoulder ratio
      // In practice the ear distance is much smaller, use direct calculation
      // For now, estimate ear distance as shoulderWidthMetric * 0.55 (head ~55% of shoulder width)
      headWidth = measurements.shoulderWidthMetric * 0.55;
      // If ears visible but shoulder not, use a fixed estimate
      if (measurements.shoulderWidthMetric === 0) {
        headWidth = 0.15; // ~15cm default head width
      }
    } else {
      // No ears visible, fall back to shoulder width * 0.4
      headWidth = measurements.shoulderWidthMetric * 0.4;
    }

    const scaleX = (headWidth * config.widthPadding) / modelDims.w;

    // --- Height ---
    // Head height approximately equals head width
    const headHeight = headWidth;
    const scaleY = (headHeight * config.heightPadding) / modelDims.h;

    // Scale Z: average of scaleX and scaleY
    const scaleZ = (scaleX + scaleY) / 2;

    // --- Position ---
    // Above nose by half the scaled height
    const scaledHeight = scaleY * modelDims.h;
    const posX = measurements.nosePosition.x;
    const posY = measurements.nosePosition.y + scaledHeight * 0.5;
    // Apply vertical offset (headwear config has -0.5, moves up by 50% of height)
    const offsetY = config.verticalOffset * scaledHeight;

    // --- Rotation ---
    const rotationY = measurements.bodyTurnY;

    // --- Confidence ---
    const vis = measurements.visibility;
    const noseVis = vis[LANDMARK.NOSE] ?? 0;
    let confidence: number;
    if (measurements.earMidpoint) {
      const earVis =
        ((vis[LANDMARK.LEFT_EAR] ?? 0) + (vis[LANDMARK.RIGHT_EAR] ?? 0)) / 2;
      confidence = (noseVis + earVis) / 2;
    } else {
      confidence = noseVis;
    }

    return {
      position: { x: posX, y: posY + offsetY, z: 0 },
      scale: { x: scaleX, y: scaleY, z: scaleZ },
      rotationY,
      confidence,
      degraded: false,
    };
  }

  /**
   * Compute anchor for necklace accessory.
   *
   * Requires shoulders to be visible. Positions at shoulder center
   * with slight upward offset for neckline.
   */
  private computeNecklace(
    measurements: BodyMeasurements,
    config: GarmentConfig,
    modelDims: { w: number; h: number; d: number },
  ): AnchorResult | null {
    // Necklace requires shoulders to be visible
    if (!measurements.hasShoulders) {
      return null;
    }

    // --- Width scaling ---
    const scaleX =
      (measurements.shoulderWidthMetric * config.widthPadding) / modelDims.w;

    // --- Height scaling ---
    const heightMetric = measurements.torsoHeightMetric > 0
      ? measurements.torsoHeightMetric
      : measurements.shoulderWidthMetric * 1.3; // Estimate if no hips

    const scaleY = (heightMetric * config.heightPadding) / modelDims.h;

    // Scale Z: average of scaleX and scaleY
    const scaleZ = (scaleX + scaleY) / 2;

    // --- Position ---
    // At shoulder center with slight upward offset (neckline)
    const posX = measurements.shoulderCenter.x;
    const posY = measurements.shoulderCenter.y;
    // Apply vertical offset (accessory config has -0.15, moves up by 15% of height)
    const scaledHeight = scaleY * modelDims.h;
    const offsetY = config.verticalOffset * scaledHeight;

    // --- Rotation ---
    const rotationY = measurements.bodyTurnY;

    // --- Confidence ---
    const vis = measurements.visibility;
    const shoulderVis =
      ((vis[LANDMARK.LEFT_SHOULDER] ?? 0) + (vis[LANDMARK.RIGHT_SHOULDER] ?? 0)) / 2;

    return {
      position: { x: posX, y: posY + offsetY, z: 0 },
      scale: { x: scaleX, y: scaleY, z: scaleZ },
      rotationY,
      confidence: shoulderVis,
      degraded: false,
    };
  }
}
