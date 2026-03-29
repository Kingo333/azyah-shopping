/**
 * Pants anchor strategy.
 *
 * Positions a pants garment model from hips to ankles with hip-width scaling.
 * Falls back to estimated ankle position when ankles are occluded, using
 * knee extrapolation or torso height ratio estimation.
 *
 * @see types.ts for AnchorStrategy interface
 * @see garmentPresets.ts for pants config values
 */
import { LANDMARK } from '../../config/landmarkIndices';
import type { AnchorStrategy, AnchorResult, BodyMeasurements, GarmentConfig } from '../types';

export class PantsAnchor implements AnchorStrategy {
  /**
   * Compute anchor position and scale for a pants garment.
   *
   * @returns AnchorResult or null if hips are not visible.
   */
  compute(
    measurements: BodyMeasurements,
    config: GarmentConfig,
    modelDims: { w: number; h: number; d: number },
  ): AnchorResult | null {
    // Pants require hips to be visible
    if (!measurements.hasHips) {
      return null;
    }

    let degraded = false;
    let hipToAnkleHeight: number;
    let bottomCenter: { x: number; y: number };

    if (measurements.hasAnkles && measurements.hipToAnkleMetric > 0) {
      // Full hip-to-ankle measurement available
      hipToAnkleHeight = measurements.hipToAnkleMetric;
      bottomCenter = measurements.ankleCenter!;
    } else if (measurements.hasKnees && measurements.kneeCenter) {
      // Knees visible, estimate ankle from knee extrapolation
      // Hip-to-knee + estimated knee-to-ankle (~0.5 * hip-to-knee)
      const kneeToHipDiffY = measurements.kneeCenter.y - measurements.hipCenter.y;
      bottomCenter = {
        x: measurements.kneeCenter.x,
        y: measurements.kneeCenter.y + kneeToHipDiffY * 0.5, // Extrapolate below knee
      };
      // Estimate hip-to-ankle from torso height ratio
      hipToAnkleHeight = measurements.torsoHeightMetric * 1.2;
      degraded = true;
    } else {
      // No knees or ankles, estimate from torso height
      hipToAnkleHeight = measurements.torsoHeightMetric * 1.2;
      bottomCenter = {
        x: measurements.hipCenter.x,
        y: measurements.hipCenter.y - hipToAnkleHeight, // Estimate below hips
      };
      degraded = true;
    }

    // --- Width scaling ---
    const scaleX =
      (measurements.hipWidthMetric * config.widthPadding) / modelDims.w;

    // --- Height scaling ---
    const scaleY = (hipToAnkleHeight * config.heightPadding) / modelDims.h;

    // Scale Z: average of scaleX and scaleY
    const scaleZ = (scaleX + scaleY) / 2;

    // --- Position ---
    // Center point: midpoint of hipCenter and bottom center
    const posX = (measurements.hipCenter.x + bottomCenter.x) / 2;
    const posY = (measurements.hipCenter.y + bottomCenter.y) / 2;
    // Apply vertical offset
    const offsetY = config.verticalOffset * scaleY * modelDims.h;

    // --- Rotation ---
    // Use bodyTurnY (derived from shoulders, most reliable)
    const rotationY = measurements.bodyTurnY;

    // --- Confidence ---
    const vis = measurements.visibility;
    const hipVis =
      ((vis[LANDMARK.LEFT_HIP] ?? 0) + (vis[LANDMARK.RIGHT_HIP] ?? 0)) / 2;

    let confidence: number;
    if (measurements.hasAnkles) {
      const ankleVis =
        ((vis[LANDMARK.LEFT_ANKLE] ?? 0) + (vis[LANDMARK.RIGHT_ANKLE] ?? 0)) / 2;
      confidence = (hipVis + ankleVis) / 2;
    } else {
      confidence = hipVis;
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
