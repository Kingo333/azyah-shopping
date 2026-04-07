/**
 * 2D garment image overlay with rotation, smoothing, and per-category placement.
 *
 * Ported from proven Python implementation (SevenSquareTech + enhanced version)
 * with shoulder rotation, stability guards, EMA smoothing, and per-category
 * anchor logic (shirt/abaya/dress/pants/watch).
 *
 * Renders a transparent PNG/WebP garment image directly on a 2D canvas.
 * No Three.js, no FOV math, no world coordinates — just pixel-space positioning.
 * Works on ALL devices. Fast. No loading issues.
 */

interface Pt { x: number; y: number }
interface Landmark { x: number; y: number; z: number; visibility?: number }

// ── Helpers ──

function dist(a: Pt, b: Pt): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function midpoint(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function ema(prev: number, curr: number, alpha: number): number {
  return alpha * prev + (1 - alpha) * curr;
}

function emaPt(prev: Pt | null, curr: Pt, alpha: number): Pt {
  if (!prev) return curr;
  return { x: ema(prev.x, curr.x, alpha), y: ema(prev.y, curr.y, alpha) };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function vis(lm: Landmark | undefined): number {
  return lm?.visibility ?? 0;
}

/** Convert normalized MediaPipe landmark to pixel coords (mirrored for selfie). */
function toPixel(lm: Landmark, w: number, h: number): Pt {
  return { x: (1 - lm.x) * w, y: lm.y * h };
}

// ── Smoothed state ──

interface SmoothedState {
  lm11: Pt | null;  // left shoulder
  lm12: Pt | null;  // right shoulder
  hipL: Pt | null;
  hipR: Pt | null;
  hipC: Pt | null;
  wristR: Pt | null;
  wristL: Pt | null;
  // Garment transform
  gx: number; gy: number; gw: number; gh: number; gAngle: number;
  initialized: boolean;
  // Stability guard
  lastGoodShoulders: { l: Pt; r: Pt; hc: Pt } | null;
}

const SMOOTH_ALPHA = 0.70;     // Higher = smoother but more lag
const GARMENT_SMOOTH = 0.35;   // Garment position/scale smoothing
const MAX_POINT_JUMP = 90;     // Reject landmark jumps larger than this (pixels)

export class ImageOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private garmentImage: HTMLImageElement | null = null;
  private garmentType: string = 'shirt';
  private sm: SmoothedState;

  // Offscreen canvas for rotation
  private rotCanvas: HTMLCanvasElement;
  private rotCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.rotCanvas = document.createElement('canvas');
    this.rotCtx = this.rotCanvas.getContext('2d')!;
    this.sm = this.createFreshState();
  }

  private createFreshState(): SmoothedState {
    return {
      lm11: null, lm12: null, hipL: null, hipR: null, hipC: null,
      wristR: null, wristL: null,
      gx: 0, gy: 0, gw: 0, gh: 0, gAngle: 0,
      initialized: false,
      lastGoodShoulders: null,
    };
  }

  async loadGarment(imageUrl: string, garmentType: string = 'shirt'): Promise<void> {
    this.garmentType = garmentType;
    this.sm = this.createFreshState();

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.garmentImage = img;
        console.log('[ImageOverlay] Garment loaded:', img.width, 'x', img.height, 'type:', garmentType);
        resolve();
      };
      img.onerror = () => reject(new Error('Failed to load garment image'));
      img.src = imageUrl;
    });
  }

  /**
   * Render one frame: mirrored video + garment overlay with rotation and smoothing.
   */
  updateFrame(video: HTMLVideoElement, landmarks: Landmark[]): void {
    if (!this.garmentImage || !landmarks || landmarks.length < 25) return;

    const { canvas, ctx, sm } = this;
    const w = canvas.width;
    const h = canvas.height;

    // 1. Draw mirrored video feed
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    // 2. Extract pixel-space landmarks
    const pts: Record<number, Pt> = {};
    for (let i = 0; i < landmarks.length; i++) {
      if (vis(landmarks[i]) > 0.3) {
        pts[i] = toPixel(landmarks[i], w, h);
      }
    }

    // 3. Smooth key landmarks with EMA + stability guard
    if (pts[11] && pts[12] && pts[23] && pts[24]) {
      let lm11 = pts[11];
      let lm12 = pts[12];
      const hipL = pts[23];
      const hipR = pts[24];
      const hipC = midpoint(hipL, hipR);

      // Stability guard: reject sudden jumps
      if (sm.lastGoodShoulders) {
        const { l, r, hc } = sm.lastGoodShoulders;
        if (dist(lm11, l) > MAX_POINT_JUMP || dist(lm12, r) > MAX_POINT_JUMP) {
          lm11 = l; lm12 = r; // Use last good values
        } else {
          sm.lastGoodShoulders = { l: lm11, r: lm12, hc: hipC };
        }
      } else {
        sm.lastGoodShoulders = { l: lm11, r: lm12, hc: hipC };
      }

      sm.lm11 = emaPt(sm.lm11, lm11, SMOOTH_ALPHA);
      sm.lm12 = emaPt(sm.lm12, lm12, SMOOTH_ALPHA);
      sm.hipL = emaPt(sm.hipL, hipL, SMOOTH_ALPHA);
      sm.hipR = emaPt(sm.hipR, hipR, SMOOTH_ALPHA);
      sm.hipC = emaPt(sm.hipC, hipC, SMOOTH_ALPHA);
    }

    if (pts[16]) sm.wristR = emaPt(sm.wristR, pts[16], SMOOTH_ALPHA);
    if (pts[15]) sm.wristL = emaPt(sm.wristL, pts[15], SMOOTH_ALPHA);

    // 4. Dispatch to category-specific rendering
    const type = this.garmentType;
    if (type === 'shirt' || type === 'jacket') {
      this.renderShirt(ctx, w, h, pts);
    } else if (type === 'abaya' || type === 'dress') {
      this.renderAbayaDress(ctx, w, h, pts);
    } else if (type === 'pants') {
      this.renderPants(ctx, w, h, pts);
    } else if (type === 'headwear') {
      this.renderHeadwear(ctx, w, h, pts);
    } else if (type === 'accessory') {
      this.renderWatch(ctx, w, h, pts);
    } else {
      this.renderShirt(ctx, w, h, pts); // fallback
    }
  }

  // ── Category renderers ──

  private renderShirt(ctx: CanvasRenderingContext2D, _w: number, _h: number, pts: Record<number, Pt>): void {
    const { sm } = this;
    if (!sm.lm11 || !sm.lm12 || !sm.hipC || !this.garmentImage) return;

    const shoulderCenter = midpoint(sm.lm11, sm.lm12);
    const shoulderDist = Math.max(1, Math.abs(sm.lm11.x - sm.lm12.x));
    const torsoH = Math.max(1, sm.hipC.y - shoulderCenter.y);

    // Scale: from Python tuning (262/190 ratio, 581/440 shirt aspect)
    const fixedRatio = 262 / 190;
    const shirtAspect = 581 / 440;
    const width = clamp(shoulderDist * fixedRatio, 90, 900);
    const height = width * shirtAspect;

    // Shoulder rotation angle
    const angle = Math.atan2(sm.lm11.y - sm.lm12.y, sm.lm11.x - sm.lm12.x) * (180 / Math.PI);

    // Placement: center on shoulders, drop into torso
    const offY = torsoH * 0.35;
    const x = shoulderCenter.x - width / 2;
    const y = shoulderCenter.y - offY;

    this.drawRotatedGarment(ctx, x, y, width, height, angle);
  }

  private renderAbayaDress(ctx: CanvasRenderingContext2D, _w: number, _h: number, _pts: Record<number, Pt>): void {
    const { sm } = this;
    if (!sm.lm11 || !sm.lm12 || !sm.hipC || !sm.hipL || !sm.hipR || !this.garmentImage) return;

    const shoulderCenter = midpoint(sm.lm11, sm.lm12);
    const shoulderDist = Math.max(1, Math.abs(sm.lm11.x - sm.lm12.x));
    const hipWidth = Math.max(1, Math.abs(sm.hipL.x - sm.hipR.x));
    const torsoH = Math.max(1, sm.hipC.y - shoulderCenter.y);

    // Width: blend of shoulder + hip width for drape feel (from Python)
    const isAbaya = this.garmentType === 'abaya';
    const baseWidth = clamp((0.6 * shoulderDist + 0.4 * hipWidth) * 1.55, 120, 1000);
    const heightFactor = isAbaya ? 2.9 : 2.4;
    const baseHeight = clamp(torsoH * heightFactor, 220, 1400);

    // Gentle shoulder rotation (35% of full angle for flowing garments)
    const angle = Math.atan2(sm.lm11.y - sm.lm12.y, sm.lm11.x - sm.lm12.x) * (180 / Math.PI) * 0.35;

    // Placement: center on shoulders, slight neckline offset
    const neckDrop = torsoH * (isAbaya ? 0.10 : 0.14);
    const x = shoulderCenter.x - baseWidth / 2;
    const y = shoulderCenter.y - neckDrop;

    this.drawRotatedGarment(ctx, x, y, baseWidth, baseHeight, angle);
  }

  private renderPants(ctx: CanvasRenderingContext2D, _w: number, h: number, pts: Record<number, Pt>): void {
    const { sm } = this;
    if (!sm.hipL || !sm.hipR || !this.garmentImage) return;

    const hipCenter = midpoint(sm.hipL, sm.hipR);
    const hipWidth = Math.max(1, Math.abs(sm.hipL.x - sm.hipR.x));

    // Leg height from knees (or estimate)
    let legH: number;
    if (pts[25] && pts[26]) {
      legH = ((pts[25].y + pts[26].y) / 2) - hipCenter.y;
    } else {
      legH = hipWidth * 2.0; // estimate
    }
    legH = clamp(legH, 80, 900);

    const width = clamp(hipWidth * 2.0, 120, 1000);
    const height = clamp(legH * 2.2, 200, 1400);

    // Mild hip rotation
    const angle = Math.atan2(sm.hipL.y - sm.hipR.y, sm.hipL.x - sm.hipR.x) * (180 / Math.PI) * 0.25;

    const x = hipCenter.x - width / 2;
    const y = hipCenter.y - height * 0.10;

    this.drawRotatedGarment(ctx, x, y, width, height, angle);
  }

  private renderHeadwear(ctx: CanvasRenderingContext2D, w: number, h: number, pts: Record<number, Pt>): void {
    const { sm } = this;
    if (!this.garmentImage) return;

    // Use nose or forehead
    const nose = pts[0];
    if (!nose) return;

    const shoulderDist = (sm.lm11 && sm.lm12) ? Math.abs(sm.lm11.x - sm.lm12.x) : 150;
    const size = shoulderDist * 0.9;
    const x = nose.x - size / 2;
    const y = nose.y - size * 0.9; // Above nose

    this.drawRotatedGarment(ctx, x, y, size, size, 0);
  }

  private renderWatch(ctx: CanvasRenderingContext2D, _w: number, _h: number, pts: Record<number, Pt>): void {
    const { sm } = this;
    if (!this.garmentImage) return;

    // Prefer right wrist (16), fallback left (15)
    const useRight = !!pts[14] && !!pts[16];
    const useLeft = !!pts[13] && !!pts[15];
    if (!useRight && !useLeft) return;

    const wrist = useRight ? (sm.wristR || pts[16]) : (sm.wristL || pts[15]);
    const elbow = useRight ? pts[14] : pts[13];
    if (!wrist || !elbow) return;

    // Scale based on forearm length
    const forearmLen = Math.max(1, dist(elbow, wrist));
    const watchSize = clamp(forearmLen * 0.55, 40, 220);

    // Rotate along forearm direction
    const angle = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x) * (180 / Math.PI);

    const x = wrist.x - watchSize / 2;
    const y = wrist.y - watchSize / 2;

    this.drawRotatedGarment(ctx, x, y, watchSize, watchSize, angle);
  }

  // ── Rotation + drawing ──

  /**
   * Draw a garment image at (x,y) with (w,h) size, rotated by angle degrees.
   * Uses an offscreen canvas to rotate with proper alpha preservation.
   * Applies EMA smoothing to prevent jitter.
   */
  private drawRotatedGarment(
    ctx: CanvasRenderingContext2D,
    targetX: number, targetY: number,
    targetW: number, targetH: number,
    targetAngle: number,
  ): void {
    if (!this.garmentImage) return;
    const { sm } = this;

    // Smooth garment transform
    if (!sm.initialized) {
      sm.gx = targetX; sm.gy = targetY;
      sm.gw = targetW; sm.gh = targetH;
      sm.gAngle = targetAngle;
      sm.initialized = true;
    } else {
      sm.gx = ema(sm.gx, targetX, GARMENT_SMOOTH);
      sm.gy = ema(sm.gy, targetY, GARMENT_SMOOTH);
      sm.gw = ema(sm.gw, targetW, GARMENT_SMOOTH);
      sm.gh = ema(sm.gh, targetH, GARMENT_SMOOTH);
      sm.gAngle = ema(sm.gAngle, targetAngle, GARMENT_SMOOTH);
    }

    const x = sm.gx;
    const y = sm.gy;
    const w = sm.gw;
    const h = sm.gh;
    const angleDeg = sm.gAngle;

    if (w < 5 || h < 5) return; // Too small, skip

    // For small angles, skip rotation overhead
    if (Math.abs(angleDeg) < 1.5) {
      ctx.drawImage(this.garmentImage, x, y, w, h);
      return;
    }

    // Rotate around garment center
    const cx = x + w / 2;
    const cy = y + h / 2;
    const angleRad = angleDeg * (Math.PI / 180);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRad);
    ctx.drawImage(this.garmentImage, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  dispose(): void {
    this.garmentImage = null;
    this.sm = this.createFreshState();
  }
}
