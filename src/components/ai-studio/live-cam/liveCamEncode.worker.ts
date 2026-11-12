// Live Cam JPEG encoder, off the main thread (kiosk speed work, 2026-11-12).
// Gets an ImageBitmap already cropped (and, where the browser can, resized) to the send size,
// draws it at exactly width x height and returns the JPEG as base64 with its encode time.
// The same encoder and quality as the main-thread canvas path, so the worker gets the same picture.

interface EncodeRequest {
  id: number;
  bitmap: ImageBitmap;
  width: number;
  height: number;
  quality: number;
}

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<EncodeRequest>) => void) | null;
  postMessage: (msg: unknown) => void;
};

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(s);
}

scope.onmessage = async (e: MessageEvent<EncodeRequest>) => {
  const { id, bitmap, width, height, quality } = e.data;
  const t0 = performance.now();
  try {
    if (!canvas || canvas.width !== width || canvas.height !== height) {
      canvas = new OffscreenCanvas(width, height);
      ctx = canvas.getContext('2d');
    }
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    const b64 = bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
    scope.postMessage({ id, b64, ms: performance.now() - t0 });
  } catch (err) {
    try { bitmap.close(); } catch { /* already closed */ }
    scope.postMessage({ id, error: String(err) });
  }
};
