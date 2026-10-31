// Garment photo clean-up before it is sent to the try-on worker: flatten
// transparency onto white (background-removed PNGs) and cap the long side at
// 1024 px. JoyAI resizes the reference to ~768 px anyway; huge photos only cost
// upload time, and transparent pixels decode as black on the GPU side.

export const GARMENT_MAX_SIDE = 1024;

export function garmentTargetSize(width: number, height: number, maxSide = GARMENT_MAX_SIDE): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width, height };
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Returns a white-background JPEG no larger than 1024 px; on any failure, the original blob. */
export async function prepareGarmentImage(blob: Blob, quality = 0.92): Promise<Blob> {
  try {
    if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return blob;
    const bitmap = await createImageBitmap(blob);
    const { width, height } = garmentTargetSize(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return out ?? blob;
  } catch {
    return blob;
  }
}
