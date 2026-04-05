/**
 * PBR material presets per garment type.
 *
 * Applied after model loading to make garments look like fabric instead of plastic.
 * Only overrides materials that still have Three.js defaults (roughness=1, metalness=0),
 * preserving hand-authored PBR from the original GLB.
 */
import type { GarmentType } from '../types';

export interface MaterialPreset {
  /** Surface roughness: 0 = mirror, 1 = matte. Fabric is typically 0.4-0.8. */
  roughness: number;
  /** Metalness: 0 = dielectric (fabric), 1 = metal. Jewelry ~0.4, fabric ~0.02. */
  metalness: number;
}

export const MATERIAL_PRESETS: Record<GarmentType, MaterialPreset> = {
  shirt:     { roughness: 0.72, metalness: 0.02 },  // cotton/linen
  abaya:     { roughness: 0.45, metalness: 0.06 },  // silk/satin sheen
  pants:     { roughness: 0.68, metalness: 0.03 },  // denim/cotton
  jacket:    { roughness: 0.55, metalness: 0.08 },  // leather/nylon
  headwear:  { roughness: 0.60, metalness: 0.04 },  // mixed fabric
  accessory: { roughness: 0.30, metalness: 0.40 },  // metallic jewelry
};
