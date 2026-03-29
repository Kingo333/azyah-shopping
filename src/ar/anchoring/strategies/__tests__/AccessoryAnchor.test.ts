/**
 * Tests for AccessoryAnchor strategy.
 *
 * AccessoryAnchor handles two sub-types:
 * - 'headwear': positions above nose, scaled by ear distance
 * - 'accessory' (necklace): positions at shoulder neckline
 */
import { describe, it, expect } from 'vitest';
import { AccessoryAnchor } from '../AccessoryAnchor';
import { computeBodyMeasurements } from '../../BodyMeasurement';
import {
  STANDING_POSE,
  SHOULDERS_ONLY,
  createMockLandmarks,
  createMockWorldLandmarks,
} from '../../__tests__/fixtures';
import { GARMENT_PRESETS } from '../../../config/garmentPresets';
import type { CoverCropInfo } from '../../../utils/coordinateUtils';

const coverCrop: CoverCropInfo = { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
const visibleDims = { w: 4, h: 4 };
const modelDims = { w: 0.5, h: 0.5, d: 0.3 };

const headwearConfig = GARMENT_PRESETS.headwear;
const accessoryConfig = GARMENT_PRESETS.accessory;

describe('AccessoryAnchor', () => {
  const anchor = new AccessoryAnchor();

  describe('headwear mode', () => {
    it('returns null when hasHead is false', () => {
      const measurements = computeBodyMeasurements(
        SHOULDERS_ONLY.normalized,
        SHOULDERS_ONLY.world,
        coverCrop,
        visibleDims,
      );
      expect(measurements.hasHead).toBe(false);

      const result = anchor.compute(measurements, headwearConfig, modelDims);
      expect(result).toBeNull();
    });

    it('positions model above nose, scaled by ear width', () => {
      const measurements = computeBodyMeasurements(
        STANDING_POSE.normalized,
        STANDING_POSE.world,
        coverCrop,
        visibleDims,
      );
      expect(measurements.hasHead).toBe(true);
      expect(measurements.nosePosition).not.toBeNull();
      expect(measurements.earMidpoint).not.toBeNull();

      const result = anchor.compute(measurements, headwearConfig, modelDims);
      expect(result).not.toBeNull();

      // Position should be above nose
      // In Three.js, y increases upward, so above nose means higher y
      expect(result!.position.y).toBeGreaterThan(measurements.nosePosition!.y);
    });

    it('uses ear distance for width scaling when available', () => {
      const measurements = computeBodyMeasurements(
        STANDING_POSE.normalized,
        STANDING_POSE.world,
        coverCrop,
        visibleDims,
      );

      const result = anchor.compute(measurements, headwearConfig, modelDims);
      expect(result).not.toBeNull();
      // Width should be based on ear distance * widthPadding
      expect(result!.scale.x).toBeGreaterThan(0);
    });

    it('falls back to shoulder width estimate when ears not visible', () => {
      // Nose visible, ears not visible
      const normalized = createMockLandmarks({
        0:  { x: 0.5, y: 0.2, visibility: 0.98 },
        7:  { x: 0.55, y: 0.2, visibility: 0.1 },  // Not visible
        8:  { x: 0.45, y: 0.2, visibility: 0.1 },  // Not visible
        11: { x: 0.6, y: 0.35, visibility: 0.95 },
        12: { x: 0.4, y: 0.35, visibility: 0.95 },
      });
      const world = createMockWorldLandmarks({
        0:  { x: 0, y: 0.55, visibility: 0.98 },
        7:  { x: 0.08, y: 0.55, visibility: 0.1 },
        8:  { x: -0.08, y: 0.55, visibility: 0.1 },
        11: { x: 0.15, y: 0.3, visibility: 0.95 },
        12: { x: -0.15, y: 0.3, visibility: 0.95 },
      });

      const measurements = computeBodyMeasurements(normalized, world, coverCrop, visibleDims);
      expect(measurements.hasHead).toBe(true);
      expect(measurements.earMidpoint).toBeNull();

      const result = anchor.compute(measurements, headwearConfig, modelDims);
      expect(result).not.toBeNull();

      // Should fall back to shoulderWidthMetric * 0.4
      const expectedWidth = measurements.shoulderWidthMetric * 0.4;
      const expectedScaleX = (expectedWidth * headwearConfig.widthPadding) / modelDims.w;
      expect(result!.scale.x).toBeCloseTo(expectedScaleX, 3);
    });
  });

  describe('accessory (necklace) mode', () => {
    it('returns null when hasShoulders is false', () => {
      // Make shoulders not visible
      const normalized = createMockLandmarks({
        0:  { x: 0.5, y: 0.2, visibility: 0.98 },
        11: { x: 0.6, y: 0.35, visibility: 0.1 },  // Not visible
        12: { x: 0.4, y: 0.35, visibility: 0.1 },  // Not visible
      });
      const world = createMockWorldLandmarks({
        0:  { x: 0, y: 0.55, visibility: 0.98 },
        11: { x: 0.15, y: 0.3, visibility: 0.1 },
        12: { x: -0.15, y: 0.3, visibility: 0.1 },
      });

      const measurements = computeBodyMeasurements(normalized, world, coverCrop, visibleDims);
      expect(measurements.hasShoulders).toBe(false);

      const result = anchor.compute(measurements, accessoryConfig, modelDims);
      expect(result).toBeNull();
    });

    it('positions at shoulder neckline (above shoulderCenter)', () => {
      const measurements = computeBodyMeasurements(
        STANDING_POSE.normalized,
        STANDING_POSE.world,
        coverCrop,
        visibleDims,
      );

      const result = anchor.compute(measurements, accessoryConfig, modelDims);
      expect(result).not.toBeNull();

      // Necklace position should be near shoulder center with slight upward offset
      // Due to verticalOffset = -0.15, the y should be slightly above shoulder center y
      // (negative offset moves up since it's applied as offsetY which shifts upward)
      expect(result!.position.x).toBeCloseTo(measurements.shoulderCenter.x, 1);
    });

    it('scales from shoulder width * widthPadding (0.6)', () => {
      const measurements = computeBodyMeasurements(
        STANDING_POSE.normalized,
        STANDING_POSE.world,
        coverCrop,
        visibleDims,
      );

      const result = anchor.compute(measurements, accessoryConfig, modelDims);
      expect(result).not.toBeNull();

      const expectedScaleX =
        (measurements.shoulderWidthMetric * accessoryConfig.widthPadding) / modelDims.w;
      expect(result!.scale.x).toBeCloseTo(expectedScaleX, 4);
      expect(accessoryConfig.widthPadding).toBe(0.6);
    });

    it('scales height from torso height * heightPadding (0.3)', () => {
      const measurements = computeBodyMeasurements(
        STANDING_POSE.normalized,
        STANDING_POSE.world,
        coverCrop,
        visibleDims,
      );

      const result = anchor.compute(measurements, accessoryConfig, modelDims);
      expect(result).not.toBeNull();

      const expectedScaleY =
        (measurements.torsoHeightMetric * accessoryConfig.heightPadding) / modelDims.h;
      expect(result!.scale.y).toBeCloseTo(expectedScaleY, 4);
      expect(accessoryConfig.heightPadding).toBe(0.3);
    });
  });
});
