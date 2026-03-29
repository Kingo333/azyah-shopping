/**
 * Tests for AbayaAnchor strategy.
 *
 * AbayaAnchor positions a garment model from shoulders to ankles with a 4-tier
 * fallback chain: ankles -> knees -> hips -> shoulders-only.
 */
import { describe, it, expect } from 'vitest';
import { AbayaAnchor } from '../AbayaAnchor';
import { computeBodyMeasurements } from '../../BodyMeasurement';
import {
  STANDING_POSE,
  UPPER_BODY_ONLY,
  SHOULDERS_ONLY,
  createMockLandmarks,
  createMockWorldLandmarks,
} from '../../__tests__/fixtures';
import { GARMENT_PRESETS } from '../../../config/garmentPresets';
import type { CoverCropInfo } from '../../../utils/coordinateUtils';

const coverCrop: CoverCropInfo = { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
const visibleDims = { w: 4, h: 4 };
const modelDims = { w: 1, h: 3, d: 0.5 };
const abayaConfig = GARMENT_PRESETS.abaya;

describe('AbayaAnchor', () => {
  const anchor = new AbayaAnchor();

  it('returns null when hasShoulders is false', () => {
    const normalized = createMockLandmarks({
      11: { x: 0.6, y: 0.35, visibility: 0.1 },
      12: { x: 0.4, y: 0.35, visibility: 0.1 },
    });
    const world = createMockWorldLandmarks({
      11: { x: 0.15, y: 0.3, visibility: 0.1 },
      12: { x: -0.15, y: 0.3, visibility: 0.1 },
    });
    const measurements = computeBodyMeasurements(normalized, world, coverCrop, visibleDims);
    expect(measurements.hasShoulders).toBe(false);

    const result = anchor.compute(measurements, abayaConfig, modelDims);
    expect(result).toBeNull();
  });

  describe('Tier 1: shoulders + ankles (full body)', () => {
    it('uses shoulderToAnkleMetric for height', () => {
      const measurements = computeBodyMeasurements(
        STANDING_POSE.normalized,
        STANDING_POSE.world,
        coverCrop,
        visibleDims,
      );
      expect(measurements.hasAnkles).toBe(true);

      const result = anchor.compute(measurements, abayaConfig, modelDims);
      expect(result).not.toBeNull();

      const expectedScaleY =
        (measurements.shoulderToAnkleMetric * abayaConfig.heightPadding) / modelDims.h;
      expect(result!.scale.y).toBeCloseTo(expectedScaleY, 4);
      expect(result!.degraded).toBe(false);
    });
  });

  describe('Tier 2: shoulders + knees, no ankles', () => {
    it('estimates ankle from knee extrapolation and marks degraded=true', () => {
      // Create pose with knees visible but ankles not
      const normalized = createMockLandmarks({
        0:  { x: 0.5,  y: 0.2,  visibility: 0.98 },
        7:  { x: 0.55, y: 0.2,  visibility: 0.9 },
        8:  { x: 0.45, y: 0.2,  visibility: 0.9 },
        11: { x: 0.6,  y: 0.35, visibility: 0.95 },
        12: { x: 0.4,  y: 0.35, visibility: 0.95 },
        23: { x: 0.55, y: 0.55, visibility: 0.85 },
        24: { x: 0.45, y: 0.55, visibility: 0.85 },
        25: { x: 0.55, y: 0.70, visibility: 0.75 },
        26: { x: 0.45, y: 0.70, visibility: 0.75 },
        27: { x: 0.55, y: 0.85, visibility: 0.1 },  // Not visible
        28: { x: 0.45, y: 0.85, visibility: 0.1 },  // Not visible
      });
      const world = createMockWorldLandmarks({
        0:  { x: 0,     y: 0.55,  visibility: 0.98 },
        7:  { x: 0.08,  y: 0.55,  visibility: 0.9 },
        8:  { x: -0.08, y: 0.55,  visibility: 0.9 },
        11: { x: 0.15,  y: 0.3,   visibility: 0.95 },
        12: { x: -0.15, y: 0.3,   visibility: 0.95 },
        23: { x: 0.10,  y: -0.1,  visibility: 0.85 },
        24: { x: -0.10, y: -0.1,  visibility: 0.85 },
        25: { x: 0.10,  y: -0.35, visibility: 0.75 },
        26: { x: -0.10, y: -0.35, visibility: 0.75 },
        27: { x: 0.10,  y: -0.6,  visibility: 0.1 },
        28: { x: -0.10, y: -0.6,  visibility: 0.1 },
      });

      const measurements = computeBodyMeasurements(normalized, world, coverCrop, visibleDims);
      expect(measurements.hasKnees).toBe(true);
      expect(measurements.hasAnkles).toBe(false);

      const result = anchor.compute(measurements, abayaConfig, modelDims);
      expect(result).not.toBeNull();
      expect(result!.degraded).toBe(true);
      // Height should be estimated, not zero
      expect(result!.scale.y).toBeGreaterThan(0);
    });
  });

  describe('Tier 3: shoulders + hips, no knees/ankles', () => {
    it('estimates ankle from torsoHeight * 2.2 and marks degraded=true', () => {
      const measurements = computeBodyMeasurements(
        UPPER_BODY_ONLY.normalized,
        UPPER_BODY_ONLY.world,
        coverCrop,
        visibleDims,
      );
      expect(measurements.hasHips).toBe(true);
      expect(measurements.hasKnees).toBe(false);
      expect(measurements.hasAnkles).toBe(false);

      const result = anchor.compute(measurements, abayaConfig, modelDims);
      expect(result).not.toBeNull();
      expect(result!.degraded).toBe(true);

      // Height should be estimated from torsoHeight * 2.2
      const estimatedHeight = measurements.torsoHeightMetric * 2.2;
      const expectedScaleY = (estimatedHeight * abayaConfig.heightPadding) / modelDims.h;
      expect(result!.scale.y).toBeCloseTo(expectedScaleY, 4);
    });
  });

  describe('Tier 4: shoulders only', () => {
    it('falls back to shirt-style with torso*2.5 height estimate and marks degraded=true', () => {
      const measurements = computeBodyMeasurements(
        SHOULDERS_ONLY.normalized,
        SHOULDERS_ONLY.world,
        coverCrop,
        visibleDims,
      );
      expect(measurements.hasHips).toBe(false);
      expect(measurements.hasKnees).toBe(false);
      expect(measurements.hasAnkles).toBe(false);

      const result = anchor.compute(measurements, abayaConfig, modelDims);
      expect(result).not.toBeNull();
      expect(result!.degraded).toBe(true);

      // Tier 4: use shoulder width * 1.3 (torso estimate) * 2.5 for full-length
      const estimatedTorso = measurements.shoulderWidthMetric * 1.3;
      const estimatedFullHeight = estimatedTorso * 2.5;
      const expectedScaleY = (estimatedFullHeight * abayaConfig.heightPadding) / modelDims.h;
      expect(result!.scale.y).toBeCloseTo(expectedScaleY, 4);
    });
  });

  it('uses widthPadding 1.2 (wider drape than shirt)', () => {
    const measurements = computeBodyMeasurements(
      STANDING_POSE.normalized,
      STANDING_POSE.world,
      coverCrop,
      visibleDims,
    );

    const result = anchor.compute(measurements, abayaConfig, modelDims);
    expect(result).not.toBeNull();

    const expectedScaleX =
      (measurements.shoulderWidthMetric * abayaConfig.widthPadding) / modelDims.w;
    expect(result!.scale.x).toBeCloseTo(expectedScaleX, 4);
    // Verify the config uses 1.2
    expect(abayaConfig.widthPadding).toBe(1.2);
  });
});
