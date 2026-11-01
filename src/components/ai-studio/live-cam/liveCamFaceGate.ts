// JoyAI waits for a still, centred face before it starts editing (and pauses when the
// person leaves). That blocks try-ons where no face is in view: shoes and bottoms are
// framed on the legs and feet, and the back camera films someone else at any framing.

import { normalizeCategory } from './buildTryOnPrompt';
import type { CameraFacing } from '@/ar/core/CameraManager';

const NO_FACE_CATEGORIES = new Set(['shoes', 'bottoms']);

export function needsFaceGate(category: string | null | undefined, facing: CameraFacing): boolean {
  if (facing === 'environment') return false;
  const cat = normalizeCategory(category);
  return !(cat && NO_FACE_CATEGORIES.has(cat));
}
