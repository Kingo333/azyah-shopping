/**
 * Tests for the BodyMeasurement computation layer.
 *
 * Verifies that computeBodyMeasurements correctly extracts body measurements
 * from raw MediaPipe landmarks, using worldLandmarks for metric distances
 * and normalized landmarks (via landmarkToWorld) for screen-space positions.
 */
import { describe, it, expect } from 'vitest';
import { computeBodyMeasurements } from '../BodyMeasurement';
import { STANDING_POSE, UPPER_BODY_ONLY, SHOULDERS_ONLY } from './fixtures';
import type { CoverCropInfo } from '../../utils/coordinateUtils';

// Simple coverCrop and visibleDims for easy math verification
const coverCrop: CoverCropInfo = { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
const visibleDims = { w: 4, h: 4 };

describe('computeBodyMeasurements', () => {
  describe('with STANDING_POSE (full body visible)', () => {
    const result = computeBodyMeasurements(
      STANDING_POSE.normalized,
      STANDING_POSE.world,
      coverCrop,
      visibleDims,
    );

    it('returns hasShoulders=true', () => {
      expect(result.hasShoulders).toBe(true);
    });

    it('returns hasHips=true', () => {
      expect(result.hasHips).toBe(true);
    });

    it('returns hasKnees=true', () => {
      expect(result.hasKnees).toBe(true);
    });

    it('returns hasAnkles=true', () => {
      expect(result.hasAnkles).toBe(true);
    });

    it('returns hasHead=true', () => {
      expect(result.hasHead).toBe(true);
    });

    it('shoulderWidthMetric equals distance between worldLandmarks[11] and worldLandmarks[12]', () => {
      // world[11] = { x: 0.15, y: 0.3 }, world[12] = { x: -0.15, y: 0.3 }
      // distance = sqrt((0.15 - (-0.15))^2 + (0.3 - 0.3)^2) = sqrt(0.3^2) = 0.3
      expect(result.shoulderWidthMetric).toBeCloseTo(0.3, 4);
    });

    it('torsoHeightMetric equals distance from shoulder midpoint to hip midpoint in world', () => {
      // shoulderMid world = { x: 0, y: 0.3 }, hipMid world = { x: 0, y: -0.1 }
      // distance = sqrt(0 + (0.3 - (-0.1))^2) = 0.4
      expect(result.torsoHeightMetric).toBeCloseTo(0.4, 4);
    });

    it('hipWidthMetric equals distance between worldLandmarks[23] and worldLandmarks[24]', () => {
      // world[23] = { x: 0.10, y: -0.1 }, world[24] = { x: -0.10, y: -0.1 }
      // distance = 0.2
      expect(result.hipWidthMetric).toBeCloseTo(0.2, 4);
    });

    it('shoulderToAnkleMetric is computed from world landmarks', () => {
      // shoulderMid = { x: 0, y: 0.3 }, ankleMid = { x: 0, y: -0.6 }
      // distance = 0.9
      expect(result.shoulderToAnkleMetric).toBeCloseTo(0.9, 4);
    });

    it('hipToAnkleMetric is computed from world landmarks', () => {
      // hipMid = { x: 0, y: -0.1 }, ankleMid = { x: 0, y: -0.6 }
      // distance = 0.5
      expect(result.hipToAnkleMetric).toBeCloseTo(0.5, 4);
    });

    it('nosePosition is not null', () => {
      expect(result.nosePosition).not.toBeNull();
    });

    it('earMidpoint is not null', () => {
      expect(result.earMidpoint).not.toBeNull();
    });

    it('kneeCenter is not null', () => {
      expect(result.kneeCenter).not.toBeNull();
    });

    it('ankleCenter is not null', () => {
      expect(result.ankleCenter).not.toBeNull();
    });
  });

  describe('with UPPER_BODY_ONLY (knees and ankles not visible)', () => {
    const result = computeBodyMeasurements(
      UPPER_BODY_ONLY.normalized,
      UPPER_BODY_ONLY.world,
      coverCrop,
      visibleDims,
    );

    it('returns hasAnkles=false', () => {
      expect(result.hasAnkles).toBe(false);
    });

    it('returns hasKnees=false', () => {
      expect(result.hasKnees).toBe(false);
    });

    it('returns hasShoulders=true', () => {
      expect(result.hasShoulders).toBe(true);
    });

    it('returns hasHips=true', () => {
      expect(result.hasHips).toBe(true);
    });

    it('returns ankleCenter as null', () => {
      expect(result.ankleCenter).toBeNull();
    });

    it('returns kneeCenter as null', () => {
      expect(result.kneeCenter).toBeNull();
    });

    it('shoulderToAnkleMetric is 0 when ankles not visible', () => {
      expect(result.shoulderToAnkleMetric).toBe(0);
    });

    it('hipToAnkleMetric is 0 when ankles not visible', () => {
      expect(result.hipToAnkleMetric).toBe(0);
    });
  });

  describe('with SHOULDERS_ONLY', () => {
    const result = computeBodyMeasurements(
      SHOULDERS_ONLY.normalized,
      SHOULDERS_ONLY.world,
      coverCrop,
      visibleDims,
    );

    it('returns hasHips=false', () => {
      expect(result.hasHips).toBe(false);
    });

    it('returns hasHead=false', () => {
      expect(result.hasHead).toBe(false);
    });

    it('returns hasShoulders=true', () => {
      expect(result.hasShoulders).toBe(true);
    });

    it('returns nosePosition as null', () => {
      expect(result.nosePosition).toBeNull();
    });

    it('returns earMidpoint as null', () => {
      expect(result.earMidpoint).toBeNull();
    });
  });

  describe('visibility map', () => {
    const result = computeBodyMeasurements(
      STANDING_POSE.normalized,
      STANDING_POSE.world,
      coverCrop,
      visibleDims,
    );

    it('has entries for key landmarks (11, 12, 23, 24, 27, 28)', () => {
      expect(result.visibility[11]).toBeDefined();
      expect(result.visibility[12]).toBeDefined();
      expect(result.visibility[23]).toBeDefined();
      expect(result.visibility[24]).toBeDefined();
      expect(result.visibility[27]).toBeDefined();
      expect(result.visibility[28]).toBeDefined();
    });

    it('visibility values match landmark visibility scores', () => {
      expect(result.visibility[11]).toBeCloseTo(0.95, 2);
      expect(result.visibility[12]).toBeCloseTo(0.95, 2);
    });
  });

  describe('bodyTurnY', () => {
    it('is approximately 0 when shoulders are at equal Z depth', () => {
      // STANDING_POSE world shoulders: z=0 for both
      const result = computeBodyMeasurements(
        STANDING_POSE.normalized,
        STANDING_POSE.world,
        coverCrop,
        visibleDims,
      );
      expect(result.bodyTurnY).toBeCloseTo(0, 2);
    });
  });

  describe('visibility-weighted midpoint', () => {
    it('with equal visibility returns geometric midpoint', () => {
      // STANDING_POSE shoulders have equal visibility (0.95)
      // Normalized: left=[0.6, 0.35], right=[0.4, 0.35]
      // With mirror=true, coverCrop identity, visibleDims 4x4:
      // left: nx = 1-0.6 = 0.4, worldX = (0.4-0.5)*4 = -0.4, worldY = -(0.35-0.5)*4 = 0.6
      // right: nx = 1-0.4 = 0.6, worldX = (0.6-0.5)*4 = 0.4, worldY = -(0.35-0.5)*4 = 0.6
      // midpoint = (0, 0.6) -- geometric midpoint
      const result = computeBodyMeasurements(
        STANDING_POSE.normalized,
        STANDING_POSE.world,
        coverCrop,
        visibleDims,
      );
      // shoulderCenter should be geometric midpoint of the two screen-space shoulder positions
      expect(result.shoulderCenter.x).toBeCloseTo(0, 1);
      expect(result.shoulderCenter.y).toBeCloseTo(0.6, 1);
    });

    it('with one low-vis landmark does NOT drift significantly (floor at 0.3)', () => {
      // Create landmarks where one shoulder has very low visibility
      // The floor at 0.3 should prevent extreme drift
      const { createMockLandmarks, createMockWorldLandmarks } = require('./fixtures');
      const normalized = createMockLandmarks({
        11: { x: 0.6, y: 0.35, visibility: 0.95 },
        12: { x: 0.4, y: 0.35, visibility: 0.05 }, // Very low vis
      });
      const world = createMockWorldLandmarks({
        11: { x: 0.15, y: 0.3, visibility: 0.95 },
        12: { x: -0.15, y: 0.3, visibility: 0.05 }, // Very low vis
      });

      const result = computeBodyMeasurements(normalized, world, coverCrop, visibleDims);

      // Even with low vis right shoulder, the midpoint should NOT drift all the way to left shoulder
      // With floor at 0.3: weights are 0.95 and 0.3 (floored from 0.05)
      // Weighted midpoint should be closer to the high-vis landmark but not drastically
      // Geometric midpoint of shoulderCenter.x would be 0
      // With weighted: should be biased toward left shoulder but still close to center
      // The key test: it shouldn't equal the left shoulder position (extreme drift)
      const leftShoulderScreenX = (1 - 0.6 - 0.5) * 4; // -0.4
      expect(Math.abs(result.shoulderCenter.x - leftShoulderScreenX)).toBeGreaterThan(0.1);
    });
  });
});
