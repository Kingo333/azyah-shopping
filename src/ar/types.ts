/**
 * Shared type definitions for the AR try-on system.
 *
 * These types are imported by all AR modules (CameraManager, PoseProcessor,
 * SceneManager, ModelLoader) and by the ARExperience orchestrator page.
 */

/**
 * Garment type classification for AR anchor strategy selection.
 *
 * Each garment type determines which body landmarks and scaling approach
 * the anchor system uses to position the 3D model on the user's body.
 * Values match the database CHECK constraint on event_brand_products.garment_type.
 */
export type GarmentType = 'shirt' | 'abaya' | 'pants' | 'jacket' | 'headwear' | 'accessory';

/**
 * AR product metadata loaded from the event_brand_products table.
 *
 * Represents a product that has AR try-on enabled with a 3D model URL.
 */
export interface ARProduct {
  id: string;
  image_url: string;
  ar_model_url: string;
  ar_scale: number;
  ar_position_offset?: { x: number; y: number; z: number };
  brand_name?: string;
  name?: string;
  /** Garment type for anchor strategy selection. Optional for backward compatibility. */
  garment_type?: GarmentType;
}

/**
 * Tracking state machine for the AR experience.
 *
 * Drives the user-facing guidance overlay (TrackingGuidance component).
 * Transitions follow this general flow:
 *   initializing -> camera_denied | camera_error
 *   initializing -> model_loading -> model_error
 *   model_loading -> waiting_for_pose -> tracking_active <-> tracking_lost
 *   initializing -> pose_init_failed
 */
export type TrackingState =
  | 'initializing'
  | 'camera_denied'
  | 'camera_error'
  | 'pose_init_failed'
  | 'model_loading'
  | 'model_error'
  | 'waiting_for_pose'
  | 'tracking_lost'
  | 'tracking_active';
