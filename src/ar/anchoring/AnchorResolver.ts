/**
 * AnchorResolver dispatches anchor computation to the correct strategy
 * based on garment type.
 *
 * Follows the Strategy pattern: each garment type has a registered
 * AnchorStrategy. The resolver looks up the strategy for the given
 * garment type, falling back to 'shirt' if no exact match exists.
 *
 * @see 03-RESEARCH.md for the strategy dispatch design
 * @see types.ts for AnchorStrategy, AnchorResult, BodyMeasurements interfaces
 */
import type { GarmentType } from '../types';
import type { AnchorStrategy, AnchorResult, BodyMeasurements, GarmentConfig } from './types';

export class AnchorResolver {
  private strategies: Map<GarmentType, AnchorStrategy> = new Map();

  /**
   * Register an anchor strategy for a garment type.
   *
   * @param type - The garment type this strategy handles.
   * @param strategy - The strategy implementation.
   */
  register(type: GarmentType, strategy: AnchorStrategy): void {
    this.strategies.set(type, strategy);
  }

  /**
   * Resolve anchor computation for a garment type.
   *
   * Dispatches to the registered strategy for the given type.
   * Falls back to 'shirt' strategy if no exact match.
   * Returns null if no strategy can handle the request.
   *
   * @param garmentType - The type of garment to anchor.
   * @param measurements - Body measurements from the current frame.
   * @param config - Garment-specific configuration.
   * @param modelDims - Dimensions of the 3D model.
   * @returns AnchorResult with position/scale/rotation, or null if unable to compute.
   */
  resolve(
    garmentType: GarmentType,
    measurements: BodyMeasurements,
    config: GarmentConfig,
    modelDims: { w: number; h: number; d: number },
  ): AnchorResult | null {
    // Try exact match first
    const strategy = this.strategies.get(garmentType);
    if (strategy) {
      return strategy.compute(measurements, config, modelDims);
    }

    // Fallback to shirt strategy
    const shirtStrategy = this.strategies.get('shirt');
    if (shirtStrategy) {
      return shirtStrategy.compute(measurements, config, modelDims);
    }

    // No strategy available
    return null;
  }
}
