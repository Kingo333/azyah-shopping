// Shared types for the Live Cam tab.

export type GarmentSource = 'product' | 'event_brand_product' | 'wardrobe_item';

export type LiveCamStatus = 'idle' | 'starting' | 'warming' | 'running' | 'ended' | 'failed';

export interface LiveCamGarmentSelection {
  id: string;
  source: GarmentSource;
  /** Display name for UI only. */
  label: string;
  /** Reference image used by FluxRT. Falls back to the garment's main image. */
  referenceImageUrl: string;
  promptHint?: string;
  /** Raw category string from DB (slug, label, or garment_type). Used for prompt building only. */
  category?: string;
  /** Optional item description from DB. Used for prompt building only. */
  description?: string;
}

export interface LiveCamSessionInfo {
  sessionId: string;
  podId: string | null;
  wsUrl: string;
}

/** FluxRT WS protocol — JSON messages only, base64 payloads. */
export interface LiveCamSetReferenceImageMessage {
  type: 'set_reference_image';
  image_b64: string;
}

export interface LiveCamSetPromptMessage {
  type: 'set_prompt';
  prompt: string;
}

export interface LiveCamFrameMessage {
  type: 'frame';
  frame_b64: string;
}
