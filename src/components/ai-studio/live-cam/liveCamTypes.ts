// Shared types for the Live Cam tab.

export type GarmentSource = 'product' | 'event_brand_product' | 'wardrobe_item';

export type LiveCamStatus = 'idle' | 'starting' | 'running' | 'ended' | 'failed';

export interface LiveCamGarmentSelection {
  id: string;
  source: GarmentSource;
  /** Display name for UI only. */
  label: string;
  /** Reference image used by FluxRT. Falls back to the garment's main image. */
  referenceImageUrl: string;
  promptHint?: string;
}

export interface LiveCamSessionInfo {
  sessionId: string;
  podId: string | null;
  wsUrl: string;
}

/** FluxRT WS init handshake — matches the server.py / config_with_reference.json format. */
export interface LiveCamInitMessage {
  type: 'init';
  config: {
    resolution: [number, number]; // [width, height]
    use_reference_image: boolean;
    fps_cap: number;
  };
}

/** Reference-image blob message (sent once after init). */
export interface LiveCamReferenceMessage {
  type: 'reference';
  mime: string;
  // Binary payload sent as a second WS frame immediately following this JSON frame.
}

/** Frame metadata sent immediately before each binary frame payload. */
export interface LiveCamFrameMeta {
  type: 'frame';
  ts: number; // client-side performance.now() at capture
  seq: number;
  width: number;
  height: number;
  mime: 'image/jpeg';
}

/** Response frame metadata expected from the pod. */
export interface LiveCamRemoteFrameMeta {
  type: 'frame';
  ts?: number; // echoed client ts if present
  seq?: number;
  width?: number;
  height?: number;
  mime?: string;
}
