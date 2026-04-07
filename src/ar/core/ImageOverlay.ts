/**
 * 2D garment image overlay — proven simple approach from SevenSquareTech.
 *
 * Renders a transparent PNG/WebP garment image directly on a 2D canvas,
 * positioned and scaled to match detected body landmarks. No Three.js,
 * no FOV math, no world coordinates — just pixel-space positioning.
 *
 * Math (proven reliable):
 *   shoulderCenter = midpoint(landmark[11], landmark[12])
 *   shoulderWidth = distance(11, 12) * widthMultiplier
 *   torsoHeight = distance(shoulderCenter, hipCenter) * heightMultiplier
 *   position = (center_x - width/2, center_y - height * topOffset)
 *
 * Works on ALL devices. Fast. No loading issues.
 */

interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/** Per-garment-type sizing multipliers. */
const GARMENT_SIZING: Record<string, { widthMul: number; heightMul: number; topOffset: number }> = {
  shirt:     { widthMul: 1.4,  heightMul: 1.3,  topOffset: 0.12 },
  abaya:     { widthMul: 1.5,  heightMul: 2.8,  topOffset: 0.08 },
  pants:     { widthMul: 1.2,  heightMul: 1.4,  topOffset: 0.0 },
  jacket:    { widthMul: 1.5,  heightMul: 1.35, topOffset: 0.12 },
  headwear:  { widthMul: 1.6,  heightMul: 1.6,  topOffset: 0.9 },
  accessory: { widthMul: 0.8,  heightMul: 0.5,  topOffset: 0.3 },
};

/** Simple exponential smoothing. */
function smooth(prev: number, curr: number, factor: number): number {
  return prev + (curr - prev) * factor;
}

export class ImageOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private garmentImage: HTMLImageElement | null = null;
  private garmentType: string = 'shirt';

  // Smoothed values (prevents jitter)
  private sx = 0; private sy = 0; // position
  private sw = 0; private sh = 0; // size
  private initialized = false;
  private readonly smoothFactor = 0.35;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  /** Load a garment image (PNG/WebP with transparency). */
  async loadGarment(imageUrl: string, garmentType: string = 'shirt'): Promise<void> {
    this.garmentType = garmentType;
    this.initialized = false;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.garmentImage = img;
        console.log('[ImageOverlay] Garment loaded:', img.width, 'x', img.height);
        resolve();
      };
      img.onerror = () => reject(new Error('Failed to load garment image'));
      img.src = imageUrl;
    });
  }

  /**
   * Render one frame: draw mirrored video + garment overlay.
   *
   * @param video - Live camera HTMLVideoElement
   * @param landmarks - MediaPipe normalized landmarks (0-1) for first detected pose
   */
  updateFrame(video: HTMLVideoElement, landmarks: LandmarkPoint[]): void {
    if (!this.garmentImage) return;

    const { canvas, ctx } = this;
    const w = canvas.width;
    const h = canvas.height;

    // 1. Draw mirrored video feed
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    // 2. Check landmark visibility (shoulders required)
    const ls = landmarks[11]; // left shoulder
    const rs = landmarks[12]; // right shoulder
    if (!ls || !rs || (ls.visibility ?? 0) < 0.5 || (rs.visibility ?? 0) < 0.5) {
      return; // Can't place garment without shoulders
    }

    // 3. Convert normalized coords to pixel coords (mirrored for selfie)
    const lsx = (1 - ls.x) * w;
    const lsy = ls.y * h;
    const rsx = (1 - rs.x) * w;
    const rsy = rs.y * h;

    // 4. Shoulder center and width
    const centerX = (lsx + rsx) / 2;
    const centerY = (lsy + rsy) / 2;
    const shoulderWidth = Math.sqrt((rsx - lsx) ** 2 + (rsy - lsy) ** 2);

    // 5. Hip center (for torso height, or estimate)
    const lh = landmarks[23]; // left hip
    const rh = landmarks[24]; // right hip
    let torsoHeight: number;

    if (lh && rh && (lh.visibility ?? 0) > 0.3 && (rh.visibility ?? 0) > 0.3) {
      const hipCenterY = ((lh.y + rh.y) / 2) * h;
      torsoHeight = hipCenterY - centerY;
    } else {
      // Estimate torso height from shoulder width
      torsoHeight = shoulderWidth * 1.3;
    }

    // 6. Apply garment-type sizing
    const sizing = GARMENT_SIZING[this.garmentType] || GARMENT_SIZING.shirt;

    // For pants, anchor at hips not shoulders
    let anchorX = centerX;
    let anchorY = centerY;
    if (this.garmentType === 'pants' && lh && rh && (lh.visibility ?? 0) > 0.3) {
      anchorX = ((1 - lh.x) * w + (1 - rh.x) * w) / 2;
      anchorY = ((lh.y + rh.y) / 2) * h;
      torsoHeight = Math.abs(
        ((landmarks[27]?.y ?? landmarks[25]?.y ?? lh.y + 0.4) * h) - anchorY
      );
    }

    // For headwear, anchor at nose/forehead
    if (this.garmentType === 'headwear' && landmarks[0] && (landmarks[0].visibility ?? 0) > 0.5) {
      anchorX = (1 - landmarks[0].x) * w;
      anchorY = landmarks[0].y * h;
      torsoHeight = shoulderWidth * 0.8; // head-relative size
    }

    const targetW = shoulderWidth * sizing.widthMul;
    const targetH = torsoHeight * sizing.heightMul;
    const targetX = anchorX - targetW / 2;
    const targetY = anchorY - targetH * sizing.topOffset;

    // 7. Smooth to prevent jitter
    if (!this.initialized) {
      this.sx = targetX; this.sy = targetY;
      this.sw = targetW; this.sh = targetH;
      this.initialized = true;
    } else {
      this.sx = smooth(this.sx, targetX, this.smoothFactor);
      this.sy = smooth(this.sy, targetY, this.smoothFactor);
      this.sw = smooth(this.sw, targetW, this.smoothFactor);
      this.sh = smooth(this.sh, targetH, this.smoothFactor);
    }

    // 8. Draw garment with alpha blending
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.garmentImage, this.sx, this.sy, this.sw, this.sh);
  }

  /** Clear the canvas. */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Release resources. */
  dispose(): void {
    this.garmentImage = null;
    this.initialized = false;
  }
}
