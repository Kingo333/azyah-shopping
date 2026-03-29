/**
 * Composites the camera video feed with the Three.js garment overlay
 * into a single image for screenshot capture.
 *
 * The composite mirrors the video horizontally (matching the selfie camera
 * CSS transform) and applies cover-crop logic to match the exact framing
 * the user sees on screen.
 */

/**
 * Composite the camera video and Three.js overlay canvas into a single PNG Blob.
 *
 * Steps:
 * 1. Create an offscreen canvas at the display resolution (capped at 2x DPR)
 * 2. Draw the video feed mirrored and cover-cropped to match on-screen framing
 * 3. Draw the Three.js overlay canvas on top (preserves alpha transparency)
 * 4. Export as PNG Blob
 *
 * @param video - The HTMLVideoElement with the live camera feed.
 * @param overlayCanvas - The Three.js canvas with the garment overlay.
 * @returns A PNG Blob of the composited image.
 */
export async function compositeCapture(
  video: HTMLVideoElement,
  overlayCanvas: HTMLCanvasElement,
): Promise<Blob> {
  // Cap DPR at 2 to avoid excessively large images on high-DPI screens
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvasWidth = Math.round(window.innerWidth * dpr);
  const canvasHeight = Math.round(window.innerHeight * dpr);

  const offscreen = document.createElement('canvas');
  offscreen.width = canvasWidth;
  offscreen.height = canvasHeight;

  const ctx = offscreen.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D context for capture canvas');
  }

  // -- Draw video feed (mirrored + cover-cropped) --

  // Compute cover-crop source rect: which portion of the video is visible
  const videoW = video.videoWidth;
  const videoH = video.videoHeight;
  const videoAspect = videoW / videoH;
  const displayAspect = canvasWidth / canvasHeight;

  let srcX = 0;
  let srcY = 0;
  let srcW = videoW;
  let srcH = videoH;

  if (videoAspect > displayAspect) {
    // Video is wider than display: crop sides
    srcW = videoH * displayAspect;
    srcX = (videoW - srcW) / 2;
  } else {
    // Video is taller than display: crop top/bottom
    srcH = videoW / displayAspect;
    srcY = (videoH - srcH) / 2;
  }

  // Mirror horizontally to match the CSS scaleX(-1) on the video element
  ctx.save();
  ctx.translate(canvasWidth, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvasWidth, canvasHeight);
  ctx.restore();

  // -- Draw Three.js overlay on top (alpha composited) --
  ctx.drawImage(overlayCanvas, 0, 0, canvasWidth, canvasHeight);

  // -- Export as PNG Blob --
  return new Promise<Blob>((resolve, reject) => {
    offscreen.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create image blob from capture canvas'));
        }
      },
      'image/png',
    );
  });
}
