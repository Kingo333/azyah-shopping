/**
 * Abaya anchor strategy.
 *
 * Positions a full-length garment model from shoulders to ankles with a
 * 4-tier fallback chain for graceful degradation when lower-body landmarks
 * are occluded.
 *
 * Fallback tiers (ANCH-08):
 * - Tier 1: Shoulders + ankles visible -> full shoulder-to-ankle height
 * - Tier 2: Shoulders + knees (no ankles) -> knee extrapolation estimate
 * - Tier 3: Shoulders + hips (no knees/ankles) -> torsoHeight * 2.2 estimate
 * - Tier 4: Shoulders only -> shoulder-based estimate * 2.5
 *
 * Uses wider width padding (1.2) than shirts for the abaya's draped silhouette.
 *
 * @see types.ts for AnchorStrategy interface
 * @see garmentPresets.ts for abaya config values
 * @see 03-RESEARCH.md for fallback chain rationale
 */
import { LANDMARK } from '../../config/landmarkIndices';
import type { AnchorStrategy, AnchorResult, BodyMeasurements, GarmentConfig } from '../types';

export class AbayaAnchor implements AnchorStrategy {
  /**
   * Compute anchor position and scale for an abaya garment.
   *
   * @returns AnchorResult or null if shoulders are not visible.
   */
  compute(
    measurements: BodyMeasurements,
    config: GarmentConfig,
    modelDims: { w: number; h: number; d: number },
  ): AnchorResult | null {
    // Abaya requires shoulders to be visible
    if (!measurements.hasShoulders) {
      return null;
    }

    let degraded = false;
    let fullHeight: number;
    let bottomCenter: { x: number; y: number };

    // --- 4-tier fallback chain ---

    if (measurements.hasAnkles && measurements.shoulderToAnkleMetric > 0) {
      // Tier 1: Full shoulder-to-ankle measurement available
      fullHeight = measurements.shoulderToAnkleMetric;
      bottomCenter = measurements.ankleCenter!;
    } else if (measurements.hasKnees && measurements.kneeCenter) {
      // Tier 2: Knees visible, estimate ankle position from knee extrapolation
      // Ankle estimated as knee + (knee - hip) extension
      const kneeToHipDiffY = measurements.kneeCenter.y - measurements.hipCenter.y;
      bottomCenter = {
        x: measurements.kneeCenter.x,
        y: measurements.kneeCenter.y + kneeToHipDiffY, // Extrapolate below knee
      };
      // Height from torso * 2.2 (full body ~ 2.2x torso)
      fullHeight = measurements.torsoHeightMetric * 2.2;
      degraded = true;
    } else if (measurements.hasHips && measurements.torsoHeightMetric > 0) {
      // Tier 3: Hips visible, estimate from torso height ratio
      fullHeight = measurements.torsoHeightMetric * 2.2;
      // Estimate bottom center below hip center
      const estimatedLegLength = fullHeight - measurements.torsoHeightMetric;
      bottomCenter = {
        x: measurements.hipCenter.x,
        y: measurements.hipCenter.y - estimatedLegLength, // Below hips in screen space (y decreases downward in Three.js)
      };
      degraded = true;
    } else {
      // Tier 4: Shoulders only - estimate from shoulder width
      const estimatedTorso = measurements.shoulderWidthMetric * 1.3;
      fullHeight = estimatedTorso * 2.5;
      // Estimate bottom center below shoulder center
      bottomCenter = {
        x: measurements.shoulderCenter.x,
        y: measurements.shoulderCenter.y - fullHeight, // Rough estimate
      };
      degraded = true;
    }

    // --- Width scaling ---
    const scaleX =
      (measurements.shoulderWidthMetric * config.widthPadding) / modelDims.w;

    // --- Height scaling ---
    const scaleY = (fullHeight * config.heightPadding) / modelDims.h;

    // Scale Z: average of scaleX and scaleY
    const scaleZ = (scaleX + scaleY) / 2;

    // --- Position ---
    // Center point: midpoint of shoulderCenter and bottom center
    const posX = (measurements.shoulderCenter.x + bottomCenter.x) / 2;
    const posY = (measurements.shoulderCenter.y + bottomCenter.y) / 2;
    // Apply vertical offset
    const offsetY = config.verticalOffset * scaleY * modelDims.h;

    // --- Rotation ---
    const rotationY = measurements.bodyTurnY;

    // --- Confidence ---
    const vis = measurements.visibility;
    const shoulderVis =
      ((vis[LANDMARK.LEFT_SHOULDER] ?? 0) + (vis[LANDMARK.RIGHT_SHOULDER] ?? 0)) / 2;

    let confidence: number;
    if (measurements.hasAnkles) {
      const ankleVis =
        ((vis[LANDMARK.LEFT_ANKLE] ?? 0) + (vis[LANDMARK.RIGHT_ANKLE] ?? 0)) / 2;
      confidence = (shoulderVis + ankleVis) / 2;
    } else if (measurements.hasHips) {
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
