/**
 * Tests for ShirtAnchor strategy.
 *
 * ShirtAnchor positions a garment model from shoulders to hips,
 * with 1.15x shoulder width padding and torso height scaling.
 */
import { describe, it, expect } from 'vitest';
import { ShirtAnchor } from '../ShirtAnchor';
import { computeBodyMeasurements } from '../../BodyMeasurement';
import { STANDING_POSE, SHOULDERS_ONLY } from '../../__tests__/fixtures';
import { GARMENT_PRESETS } from '../../../config/garmentPresets';
import type { CoverCropInfo } from '../../../utils/coordinateUtils';

const coverCrop: CoverCropInfo = { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
const visibleDims = { w: 4, h: 4 };
const modelDims = { w: 1, h: 2, d: 0.5 };
const shirtConfig = GARMENT_PRESETS.shirt;

describe('ShirtAnchor', () => {
  const anchor = new ShirtAnchor();

  it('returns null when hasShoulders is false', () => {
    // Create measurements with hasShoulders = false
    const measurements = computeBodyMeasurements(
      SHOULDERS_ONLY.normalized.map((lm, i) =>
        i === 11 || i === 12 ? { ...lm, visibility: 0.1 } : lm,
      ),
      SHOULDERS_ONLY.world,
      coverCrop,
      visibleDims,
    );
    expect(measurements.hasShoulders).toBe(false);

    const result = anchor.compute(measurements, shirtConfig, modelDims);
    expect(result).toBeNull();
  });

  it('positions model at torso center (midpoint of shoulderCenter and hipCenter)', () => {
    const measurements = computeBodyMeasurements(
      STANDING_POSE.normalized,
      STANDING_POSE.world,
      coverCrop,
      visibleDims,
    );
    const result = anchor.compute(measurements, shirtConfig, modelDims);
    expect(result).not.toBeNull();

    // Position Y should be between shoulderCenter.y and hipCenter.y
    const midY = (measurements.shoulderCenter.y + measurements.hipCenter.y) / 2;
    // Apply vertical offset (0 for shirt), so position should be at midY
    expect(result!.position.y).toBeCloseTo(midY, 1);
    // X should be at shoulder/hip center average
    const midX = (measurements.shoulderCenter.x + measurements.hipCenter.x) / 2;
    expect(result!.position.x).toBeCloseTo(midX, 1);
  });

  it('scales X by (shoulderWidthMetric * widthPadding) / modelDims.w', () => {
    const measurements = computeBodyMeasurements(
      STANDING_POSE.normalized,
      STANDING_POSE.world,
      coverCrop,
      visibleDims,
    );
    const result = anchor.compute(measurements, shirtConfig, modelDims);
    expect(result).not.toBeNull();

    const expectedScaleX =
      (measurements.shoulderWidthMetric * shirtConfig.widthPadding) / modelDims.w;
    expect(result!.scale.x).toBeCloseTo(expectedScaleX, 4);
  });

  it('scales Y by (torsoHeightMetric * heightPadding) / modelDims.h', () => {
    const measurements = computeBodyMeasurements(
      STANDING_POSE.normalized,
      STANDING_POSE.world,
      coverCrop,
      visibleDims,
    );
    const result = anchor.compute(measurements, shirtConfig, modelDims);
    expect(result).not.toBeNull();

    const expectedScaleY =
      (measurements.torsoHeightMetric * shirtConfig.heightPadding) / modelDims.h;
    expect(result!.scale.y).toBeCloseTo(expectedScaleY, 4);
  });

  it('uses estimated torso height when hasHips is false', () => {
    // SHOULDERS_ONLY has hasHips = false
    const measurements = computeBodyMeasurements(
      SHOULDERS_ONLY.normalized,
      SHOULDERS_ONLY.world,
      coverCrop,
      visibleDims,
    );
    expect(measurements.hasHips).toBe(false);
    expect(measurements.hasShoulders).toBe(true);

    const result = anchor.compute(measurements, shirtConfig, modelDims);
    expect(result).not.toBeNull();
    // Should use estimated torso height: shoulderWidthMetric * 1.3
    const estimatedTorso = measurements.shoulderWidthMetric * 1.3;
    const expectedScaleY = (estimatedTorso * shirtConfig.heightPadding) / modelDims.h;
    expect(result!.scale.y).toBeCloseTo(expectedScaleY, 4);
    expect(result!.degraded).toBe(true);
  });

  it('confidence reflects average visibility of used landmarks', () => {
    const measurements = computeBodyMeasurements(
      STANDING_POSE.normalized,
      STANDING_POSE.world,
      coverCrop,
      visibleDims,
    );
    const result = anchor.compute(measurements, shirtConfig, modelDims);
    expect(result).not.toBeNull();

    // Shoulders: 0.95, 0.95; Hips: 0.85, 0.85
    // Average = (0.95 + 0.95 + 0.85 + 0.85) / 4 = 0.9
    expect(result!.confidence).toBeCloseTo(0.9, 1);
  });

  it('passes through bodyTurnY as rotationY', () => {
    const measurements = computeBodyMeasurements(
      STANDING_POSE.normalized,
      STANDING_POSE.world,
      coverCrop,
      visibleDims,
    );
    const result = anchor.compute(measurements, shirtConfig, modelDims);
    expect(result).not.toBeNull();

    expect(result!.rotationY).toBe(measurements.bodyTurnY);
  });

  it('sets z position to 0', () => {
    const measurements = computeBodyMeasurements(
      STANDING_POSE.normalized,
      STANDING_POSE.world,
      coverCrop,
      visibleDims,
    );
    const result = anchor.compute(measurements, shirtConfig, modelDims);
    expect(result).not.toBeNull();
    expect(result!.position.z).toBe(0);
  });
});
