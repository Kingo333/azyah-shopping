/**
 * 2D garment image overlay with cover-crop alignment, OneEuro smoothing,
 * segmentation-based occlusion, and per-category placement.
 *
 * Fix 2: Cover-crop alignment — video drawn with proper source rect matching
 *         object-fit:cover, landmarks mapped through crop offsets.
 * Fix 3: Segmentation occlusion — arms/hands drawn over garment via mask.
 * Fix 4: OneEuro + Outlier smoothing replacing basic EMA.
 */

import { OneEuroFilter, FILTER_PRESETS } from '../utils/OneEuroFilter';
import { OutlierFilter } from '../utils/OutlierFilter';

interface Pt { x: number; y: number }
interface Landmark { x: number; y: number; z: number; visibility?: number }

// ── Helpers ──

function dist(a: Pt, b: Pt): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function midpoint(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function vis(lm: Landmark | undefined): number {
  return lm?.visibility ?? 0;
}

// ── Cover crop info ──
interface CoverCropRect {
  srcX: number; srcY: number; srcW: number; srcH: number;
  videoW: number; videoH: number;
}

/**
 * Compute the source rect for cover-crop drawing, matching object-fit:cover.
 */
function computeCoverCropRect(videoW: number, videoH: number, canvasW: number, canvasH: number): CoverCropRect {
  const videoAspect = videoW / videoH;
  const canvasAspect = canvasW / canvasH;

  let srcX = 0, srcY = 0, srcW = videoW, srcH = videoH;

  if (videoAspect > canvasAspect) {
    // Video wider than canvas: crop sides
    srcW = videoH * canvasAspect;
    srcX = (videoW - srcW) / 2;
  } else {
    // Video taller than canvas: crop top/bottom
    srcH = videoW / canvasAspect;
    srcY = (videoH - srcH) / 2;
  }

  return { srcX, srcY, srcW, srcH, videoW, videoH };
}

// ── Smoothing filter bank ──

/** One filter pair (outlier + 1€) per axis */
interface FilterPair {
  outlier: OutlierFilter;
  euro: OneEuroFilter;
}

function createFilterPair(preset: { minCutoff: number; beta: number; dCutoff: number }): FilterPair {
  return {
    outlier: new OutlierFilter(15, 3.0),
    euro: new OneEuroFilter(preset.minCutoff, preset.beta, preset.dCutoff),
  };
}

function filterValue(fp: FilterPair, value: number, t: number, fallback: number): number {
  const checked = fp.outlier.filter(value);
  if (checked === null) return fallback;
  return fp.euro.filter(checked, t);
}

function resetFilterPair(fp: FilterPair): void {
  fp.outlier.reset();
  fp.euro.reset();
}

// ── SmoothedState (filter-based) ──
interface SmoothedLandmarks {
  lm11: Pt | null;  // left shoulder
  lm12: Pt | null;  // right shoulder
  hipL: Pt | null;
  hipR: Pt | null;
  hipC: Pt | null;
  wristR: Pt | null;
  wristL: Pt | null;
}

export class ImageOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private garmentImage: HTMLImageElement | null = null;
  private garmentType: string = 'shirt';
  private sm: SmoothedLandmarks;

  // Cover crop
  private crop: CoverCropRect = { srcX: 0, srcY: 0, srcW: 1, srcH: 1, videoW: 1, videoH: 1 };
  private cropValid = false;

  // Occlusion mask from segmenter
  private occlusionMask: { data: Float32Array; width: number; height: number } | null = null;

  // OneEuro filters for landmark smoothing (7 landmarks × 2 axes = 14 pairs)
  private filters = {
    lm11x: createFilterPair(FILTER_PRESETS.position),
    lm11y: createFilterPair(FILTER_PRESETS.position),
    lm12x: createFilterPair(FILTER_PRESETS.position),
    lm12y: createFilterPair(FILTER_PRESETS.position),
    hipLx: createFilterPair(FILTER_PRESETS.position),
    hipLy: createFilterPair(FILTER_PRESETS.position),
    hipRx: createFilterPair(FILTER_PRESETS.position),
    hipRy: createFilterPair(FILTER_PRESETS.position),
    wristRx: createFilterPair(FILTER_PRESETS.position),
    wristRy: createFilterPair(FILTER_PRESETS.position),
    wristLx: createFilterPair(FILTER_PRESETS.position),
    wristLy: createFilterPair(FILTER_PRESETS.position),
    // Garment transform
    gx: createFilterPair(FILTER_PRESETS.position),
    gy: createFilterPair(FILTER_PRESETS.position),
    gw: createFilterPair(FILTER_PRESETS.scale),
    gh: createFilterPair(FILTER_PRESETS.scale),
    gAngle: createFilterPair(FILTER_PRESETS.rotation),
  };

  // Track if garment transform has been initialized (first frame)
  private garmentInitialized = false;
  // Last good garment values for outlier fallback
  private lastGarment = { x: 0, y: 0, w: 100, h: 100, angle: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.sm = this.createFreshLandmarks();
  }

  private createFreshLandmarks(): SmoothedLandmarks {
    return {
      lm11: null, lm12: null, hipL: null, hipR: null, hipC: null,
      wristR: null, wristL: null,
    };
  }

  /** Update cover crop when video or canvas dimensions change. */
  updateCoverCrop(videoW: number, videoH: number, canvasW: number, canvasH: number): void {
    if (videoW <= 0 || videoH <= 0 || canvasW <= 0 || canvasH <= 0) return;
    this.crop = computeCoverCropRect(videoW, videoH, canvasW, canvasH);
    this.cropValid = true;
  }

  /** Feed segmentation mask for body occlusion. */
  updateOcclusionMask(mask: { data: Float32Array; width: number; height: number } | null): void {
    this.occlusionMask = mask;
  }

  async loadGarment(imageUrl: string, garmentType: string = 'shirt'): Promise<void> {
    this.garmentType = garmentType;
    this.resetFilters();

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

  /** Convert normalized landmark to canvas pixel coords with cover-crop correction and mirror. */
  private toPixel(lm: Landmark, w: number, _h: number): Pt {
    if (!this.cropValid) {
      // Fallback: no cover crop info yet
      return { x: (1 - lm.x) * w, y: lm.y * this.canvas.height };
    }
    const { srcX, srcY, srcW, srcH, videoW, videoH } = this.crop;
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;

    // Convert normalized landmark (0..1 in full video space) to video pixels
    const vx = lm.x * videoW;
    const vy = lm.y * videoH;

    // Map through cover-crop to canvas coords
    let cx = (vx - srcX) * (canvasW / srcW);
    const cy = (vy - srcY) * (canvasH / srcH);

    // Mirror once (selfie camera)
    cx = canvasW - cx;

    return { x: cx, y: cy };
  }

  /**
   * Render one frame: cover-cropped mirrored video + garment overlay + occlusion.
   */
  updateFrame(video: HTMLVideoElement, landmarks: Landmark[]): void {
    if (!this.garmentImage || !landmarks || landmarks.length < 25) return;

    const { canvas, ctx } = this;
    const w = canvas.width;
    const h = canvas.height;

    // Auto-update cover crop if video dimensions are available
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      if (!this.cropValid || this.crop.videoW !== video.videoWidth || this.crop.videoH !== video.videoHeight) {
        this.updateCoverCrop(video.videoWidth, video.videoHeight, w, h);
      }
    }

    const { srcX, srcY, srcW, srcH } = this.crop;

    // 1. Draw cover-cropped mirrored video feed
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    if (this.cropValid) {
      ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, w, h);
    } else {
      ctx.drawImage(video, 0, 0, w, h);
    }
    ctx.restore();

    // 2. Extract pixel-space landmarks (with cover-crop correction)
    const pts: Record<number, Pt> = {};
    for (let i = 0; i < landmarks.length; i++) {
      if (vis(landmarks[i]) > 0.3) {
        pts[i] = this.toPixel(landmarks[i], w, h);
      }
    }

    // 3. Smooth key landmarks with OneEuro + Outlier filters
    const t = performance.now() / 1000;
    if (pts[11] && pts[12] && pts[23] && pts[24]) {
      const raw11 = pts[11];
      const raw12 = pts[12];
      const rawHipL = pts[23];
      const rawHipR = pts[24];

      const s11x = filterValue(this.filters.lm11x, raw11.x, t, this.sm.lm11?.x ?? raw11.x);
      const s11y = filterValue(this.filters.lm11y, raw11.y, t, this.sm.lm11?.y ?? raw11.y);
      const s12x = filterValue(this.filters.lm12x, raw12.x, t, this.sm.lm12?.x ?? raw12.x);
      const s12y = filterValue(this.filters.lm12y, raw12.y, t, this.sm.lm12?.y ?? raw12.y);
      const sHLx = filterValue(this.filters.hipLx, rawHipL.x, t, this.sm.hipL?.x ?? rawHipL.x);
      const sHLy = filterValue(this.filters.hipLy, rawHipL.y, t, this.sm.hipL?.y ?? rawHipL.y);
      const sHRx = filterValue(this.filters.hipRx, rawHipR.x, t, this.sm.hipR?.x ?? rawHipR.x);
      const sHRy = filterValue(this.filters.hipRy, rawHipR.y, t, this.sm.hipR?.y ?? rawHipR.y);

      this.sm.lm11 = { x: s11x, y: s11y };
      this.sm.lm12 = { x: s12x, y: s12y };
      this.sm.hipL = { x: sHLx, y: sHLy };
      this.sm.hipR = { x: sHRx, y: sHRy };
      this.sm.hipC = midpoint(this.sm.hipL, this.sm.hipR);
    }

    if (pts[16]) {
      const rx = filterValue(this.filters.wristRx, pts[16].x, t, this.sm.wristR?.x ?? pts[16].x);
      const ry = filterValue(this.filters.wristRy, pts[16].y, t, this.sm.wristR?.y ?? pts[16].y);
      this.sm.wristR = { x: rx, y: ry };
    }
    if (pts[15]) {
      const lx = filterValue(this.filters.wristLx, pts[15].x, t, this.sm.wristL?.x ?? pts[15].x);
      const ly = filterValue(this.filters.wristLy, pts[15].y, t, this.sm.wristL?.y ?? pts[15].y);
      this.sm.wristL = { x: lx, y: ly };
    }

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

    // 5. Segmentation-based occlusion: draw body pixels OVER the garment
    this.applyOcclusion(ctx, video, w, h);
  }

  // ── Occlusion composite ──

  private applyOcclusion(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, w: number, h: number): void {
    const mask = this.occlusionMask;
    if (!mask || mask.data.length === 0) return;

    const { srcX, srcY, srcW, srcH } = this.crop;

    // Draw cover-cropped mirrored video into a temp canvas to get pixel data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.save();
    tempCtx.translate(w, 0);
    tempCtx.scale(-1, 1);
    if (this.cropValid) {
      tempCtx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, w, h);
    } else {
      tempCtx.drawImage(video, 0, 0, w, h);
    }
    tempCtx.restore();

    const videoPixels = tempCtx.getImageData(0, 0, w, h);

    // Get current canvas (video + garment) pixels
    const composited = ctx.getImageData(0, 0, w, h);

    const mw = mask.width;
    const mh = mask.height;
    const data = mask.data;

    // Where mask > 0.5 (body detected), replace garment pixels with original video
    // This makes body parts (arms/hands) appear IN FRONT of the garment
    for (let cy = 0; cy < h; cy++) {
      // Map canvas y to mask y (mirror not needed — mask is in camera space, video is mirrored)
      const my = Math.floor((cy / h) * mh);
      for (let cx = 0; cx < w; cx++) {
        // Mirror x for mask lookup since canvas is mirrored
        const mx = Math.floor(((w - 1 - cx) / w) * mw);
        const maskIdx = my * mw + mx;
        if (data[maskIdx] > 0.5) {
          const pi = (cy * w + cx) * 4;
          composited.data[pi] = videoPixels.data[pi];
          composited.data[pi + 1] = videoPixels.data[pi + 1];
          composited.data[pi + 2] = videoPixels.data[pi + 2];
          composited.data[pi + 3] = videoPixels.data[pi + 3];
        }
      }
    }

    ctx.putImageData(composited, 0, 0);
  }

  // ── Category renderers ──

  private renderShirt(ctx: CanvasRenderingContext2D, _w: number, _h: number, _pts: Record<number, Pt>): void {
    const { sm } = this;
    if (!sm.lm11 || !sm.lm12 || !sm.hipC || !this.garmentImage) return;

    const shoulderCenter = midpoint(sm.lm11, sm.lm12);
    const shoulderDist = Math.max(1, Math.abs(sm.lm11.x - sm.lm12.x));
    const torsoH = Math.max(1, sm.hipC.y - shoulderCenter.y);

    const fixedRatio = 262 / 190;
    const shirtAspect = 581 / 440;
    const width = clamp(shoulderDist * fixedRatio, 90, 900);
    const height = width * shirtAspect;

    const angle = Math.atan2(sm.lm11.y - sm.lm12.y, sm.lm11.x - sm.lm12.x) * (180 / Math.PI);

    const offY = torsoH * 0.35;
    const x = shoulderCenter.x - width / 2;
    const y = shoulderCenter.y - offY;

    this.drawSmoothedGarment(ctx, x, y, width, height, angle);
  }

  private renderAbayaDress(ctx: CanvasRenderingContext2D, _w: number, _h: number, _pts: Record<number, Pt>): void {
    const { sm } = this;
    if (!sm.lm11 || !sm.lm12 || !sm.hipC || !sm.hipL || !sm.hipR || !this.garmentImage) return;

    const shoulderCenter = midpoint(sm.lm11, sm.lm12);
    const shoulderDist = Math.max(1, Math.abs(sm.lm11.x - sm.lm12.x));
    const hipWidth = Math.max(1, Math.abs(sm.hipL.x - sm.hipR.x));
    const torsoH = Math.max(1, sm.hipC.y - shoulderCenter.y);

    const isAbaya = this.garmentType === 'abaya';
    const baseWidth = clamp((0.6 * shoulderDist + 0.4 * hipWidth) * 1.55, 120, 1000);
    const heightFactor = isAbaya ? 2.9 : 2.4;
    const baseHeight = clamp(torsoH * heightFactor, 220, 1400);

    const angle = Math.atan2(sm.lm11.y - sm.lm12.y, sm.lm11.x - sm.lm12.x) * (180 / Math.PI) * 0.35;

    const neckDrop = torsoH * (isAbaya ? 0.10 : 0.14);
    const x = shoulderCenter.x - baseWidth / 2;
    const y = shoulderCenter.y - neckDrop;

    this.drawSmoothedGarment(ctx, x, y, baseWidth, baseHeight, angle);
  }

  private renderPants(ctx: CanvasRenderingContext2D, _w: number, _h: number, pts: Record<number, Pt>): void {
    const { sm } = this;
    if (!sm.hipL || !sm.hipR || !this.garmentImage) return;

    const hipCenter = midpoint(sm.hipL, sm.hipR);
    const hipWidth = Math.max(1, Math.abs(sm.hipL.x - sm.hipR.x));

    let legH: number;
    if (pts[25] && pts[26]) {
      legH = ((pts[25].y + pts[26].y) / 2) - hipCenter.y;
    } else {
      legH = hipWidth * 2.0;
    }
    legH = clamp(legH, 80, 900);

    const width = clamp(hipWidth * 2.0, 120, 1000);
    const height = clamp(legH * 2.2, 200, 1400);

    const angle = Math.atan2(sm.hipL.y - sm.hipR.y, sm.hipL.x - sm.hipR.x) * (180 / Math.PI) * 0.25;

    const x = hipCenter.x - width / 2;
    const y = hipCenter.y - height * 0.10;

    this.drawSmoothedGarment(ctx, x, y, width, height, angle);
  }

  private renderHeadwear(ctx: CanvasRenderingContext2D, _w: number, _h: number, pts: Record<number, Pt>): void {
    const { sm } = this;
    if (!this.garmentImage) return;

    const nose = pts[0];
    if (!nose) return;

    const shoulderDist = (sm.lm11 && sm.lm12) ? Math.abs(sm.lm11.x - sm.lm12.x) : 150;
    const size = shoulderDist * 0.9;
    const x = nose.x - size / 2;
    const y = nose.y - size * 0.9;

    this.drawSmoothedGarment(ctx, x, y, size, size, 0);
  }

  private renderWatch(ctx: CanvasRenderingContext2D, _w: number, _h: number, pts: Record<number, Pt>): void {
    const { sm } = this;
    if (!this.garmentImage) return;

    const useRight = !!pts[14] && !!pts[16];
    const useLeft = !!pts[13] && !!pts[15];
    if (!useRight && !useLeft) return;

    const wrist = useRight ? (sm.wristR || pts[16]) : (sm.wristL || pts[15]);
    const elbow = useRight ? pts[14] : pts[13];
    if (!wrist || !elbow) return;

    const forearmLen = Math.max(1, dist(elbow, wrist));
    const watchSize = clamp(forearmLen * 0.55, 40, 220);

    const angle = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x) * (180 / Math.PI);

    const x = wrist.x - watchSize / 2;
    const y = wrist.y - watchSize / 2;

    this.drawSmoothedGarment(ctx, x, y, watchSize, watchSize, angle);
  }

  // ── Smoothed garment drawing ──

  private drawSmoothedGarment(
    ctx: CanvasRenderingContext2D,
    targetX: number, targetY: number,
    targetW: number, targetH: number,
    targetAngle: number,
  ): void {
    if (!this.garmentImage) return;

    const t = performance.now() / 1000;

    let x: number, y: number, w: number, h: number, angleDeg: number;

    if (!this.garmentInitialized) {
      x = targetX; y = targetY; w = targetW; h = targetH; angleDeg = targetAngle;
      this.garmentInitialized = true;
      this.lastGarment = { x, y, w, h, angle: angleDeg };
    } else {
      x = filterValue(this.filters.gx, targetX, t, this.lastGarment.x);
      y = filterValue(this.filters.gy, targetY, t, this.lastGarment.y);
      w = filterValue(this.filters.gw, targetW, t, this.lastGarment.w);
      h = filterValue(this.filters.gh, targetH, t, this.lastGarment.h);
      angleDeg = filterValue(this.filters.gAngle, targetAngle, t, this.lastGarment.angle);
      this.lastGarment = { x, y, w, h, angle: angleDeg };
    }

    if (w < 5 || h < 5) return;

    if (Math.abs(angleDeg) < 1.5) {
      ctx.drawImage(this.garmentImage, x, y, w, h);
      return;
    }

    const cx = x + w / 2;
    const cy = y + h / 2;
    const angleRad = angleDeg * (Math.PI / 180);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRad);
    ctx.drawImage(this.garmentImage, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  /** Reset all smoothing filters. Call on product switch. */
  resetFilters(): void {
    this.sm = this.createFreshLandmarks();
    this.garmentInitialized = false;
    this.occlusionMask = null;
    Object.values(this.filters).forEach(fp => resetFilterPair(fp));
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  dispose(): void {
    this.garmentImage = null;
    this.resetFilters();
  }
}
