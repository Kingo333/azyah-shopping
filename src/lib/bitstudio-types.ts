
export type BitStudioStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface BitStudioImage {
  id: string;
  type: string;
  path?: string;
  status: BitStudioStatus;
  versions?: any[];
  credits_used?: number;
  error?: string;
  video_path?: string;
}

export interface BitStudioError {
  error: string;
  code?: string;
  details?: string;
  status?: number;
  bitstudio_error?: any;
  raw_response?: string;
}

// Exact types from BitStudio API documentation
export const BITSTUDIO_IMAGE_TYPES = {
  PERSON: 'virtual-try-on-person',
  OUTFIT: 'virtual-try-on-outfit',
  INPAINT_BASE: 'inpaint-base',
  INPAINT_MASK: 'inpaint-mask',
  INPAINT_REFERENCE: 'inpaint-reference',
  EDIT: 'edit',
  IMAGE_TO_VIDEO: 'image-to-video'
} as const;

export type AspectRatio = 'portrait' | 'landscape' | 'square';
export type Resolution = 'standard' | 'high' | 'low';
export type Style = 'studio' | 'smartphone';
export type UpscaleFactor = 1 | 2 | 4;
