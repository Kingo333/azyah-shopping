/**
 * 2D garment image overlay with cover-crop alignment, OneEuro smoothing,
 * segmentation-based occlusion, and per-category placement.
 *
 * v2: Split drawVideo / drawGarment for continuous repaint.
 *     Cached + downscaled occlusion buffer. Throttled to ~8fps.
 *     try/catch around occlusion so failures never break rendering.
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

function computeCoverCropRect(videoW: number, videoH: number, canvasW: number, canvasH: number): CoverCropRect {
  const videoAspect = videoW / videoH;
  const canvasAspect = canvasW / canvasH;

  let srcX = 0, srcY = 0, srcW = videoW, srcH = videoH;

  if (videoAspect > canvasAspect) {
    srcW = videoH * canvasAspect;
    srcX = (videoW - srcW) / 2;
  } else {
    srcH = videoW / canvasAspect;
    srcY = (videoH - srcH) / 2;
  }

  return { srcX, srcY, srcW, srcH, videoW, videoH };
}

// ── Smoothing filter bank ──

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
  lm11: Pt | null;
  lm12: Pt | null;
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
  // Cached occlusion canvases (never re-created per frame)
  private occTempCanvas: HTMLCanvasElement;
  private occTempCtx: CanvasRenderingContext2D;
  private occMaskCanvas: HTMLCanvasElement;
  private occMaskCtx: CanvasRenderingContext2D;
  private occDisabled = false;
  private occLastTime = 0;
  private static readonly OCC_THROTTLE_MS = 120; // ~8fps
  private static readonly OCC_SCALE = 256; // downscaled width

  // OneEuro filters for landmark smoothing
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
    gx: createFilterPair(FILTER_PRESETS.position),
    gy: createFilterPair(FILTER_PRESETS.position),
    gw: createFilterPair(FILTER_PRESETS.scale),
    gh: createFilterPair(FILTER_PRESETS.scale),
    gAngle: createFilterPair(FILTER_PRESETS.rotation),
  };

  private garmentInitialized = false;
  private lastGarment = { x: 0, y: 0, w: 100, h: 100, angle: 0 };

  // Keep reference to the last video used for occlusion compositing
  private lastVideo: HTMLVideoElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.sm = this.createFreshLandmarks();

    // Pre-create cached occlusion canvases
    this.occTempCanvas = document.createElement('canvas');
    this.occTempCtx = this.occTempCanvas.getContext('2d')!;
    this.occMaskCanvas = document.createElement('canvas');
    this.occMaskCtx = this.occMaskCanvas.getContext('2d')!;
  }

  private createFreshLandmarks(): SmoothedLandmarks {
    return {
      lm11: null, lm12: null, hipL: null, hipR: null, hipC: null,
      wristR: null, wristL: null,
    };
  }

  updateCoverCrop(videoW: number, videoH: number, canvasW: number, canvasH: number): void {
    if (videoW <= 0 || videoH <= 0 || canvasW <= 0 || canvasH <= 0) return;
    this.crop = computeCoverCropRect(videoW, videoH, canvasW, canvasH);
    this.cropValid = true;
  }

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
      return { x: (1 - lm.x) * w, y: lm.y * this.canvas.height };
    }
    const { srcX, srcY, srcW, srcH, videoW, videoH } = this.crop;
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;

    const vx = lm.x * videoW;
    const vy = lm.y * videoH;

    let cx = (vx - srcX) * (canvasW / srcW);
    const cy = (vy - srcY) * (canvasH / srcH);

    cx = canvasW - cx;

    return { x: cx, y: cy };
  }

  // ═══════════════════════════════════════════════════════
  // PUBLIC API: split into drawVideo + drawGarment
  // ═══════════════════════════════════════════════════════

  /**
   * Draw cover-cropped mirrored video only. Call every rAF for continuous repaint.
   */
  drawVideo(video: HTMLVideoElement): void {
    const { canvas, ctx } = this;
    const w = canvas.width;
    const h = canvas.height;

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      if (!this.cropValid || this.crop.videoW !== video.videoWidth || this.crop.videoH !== video.videoHeight) {
        this.updateCoverCrop(video.videoWidth, video.videoHeight, w, h);
      }
    }

    const { srcX, srcY, srcW, srcH } = this.crop;

    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    if (this.cropValid) {
      ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, w, h);
    } else {
      ctx.drawImage(video, 0, 0, w, h);
    }
    ctx.restore();

    this.lastVideo = video;
  }

  /**
   * Draw garment overlay + occlusion over the already-drawn video.
   * Call only when landmarks are available.
   */
  drawGarment(landmarks: Landmark[]): void {
    if (!this.garmentImage || !landmarks || landmarks.length < 25) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Extract pixel-space landmarks
    const pts: Record<number, Pt> = {};
    for (let i = 0; i < landmarks.length; i++) {
      if (vis(landmarks[i]) > 0.3) {
        pts[i] = this.toPixel(landmarks[i], w, h);
      }
    }

    // Smooth key landmarks
    const t = performance.now() / 1000;
    if (pts[11] && pts[12] && pts[23] && pts[24]) {
      const raw11 = pts[11];
      const raw12 = pts[12];
      const rawHipL = pts[23];
      const rawHipR = pts[24];

      this.sm.lm11 = {
        x: filterValue(this.filters.lm11x, raw11.x, t, this.sm.lm11?.x ?? raw11.x),
        y: filterValue(this.filters.lm11y, raw11.y, t, this.sm.lm11?.y ?? raw11.y),
      };
      this.sm.lm12 = {
        x: filterValue(this.filters.lm12x, raw12.x, t, this.sm.lm12?.x ?? raw12.x),
        y: filterValue(this.filters.lm12y, raw12.y, t, this.sm.lm12?.y ?? raw12.y),
      };
      this.sm.hipL = {
        x: filterValue(this.filters.hipLx, rawHipL.x, t, this.sm.hipL?.x ?? rawHipL.x),
        y: filterValue(this.filters.hipLy, rawHipL.y, t, this.sm.hipL?.y ?? rawHipL.y),
      };
      this.sm.hipR = {
        x: filterValue(this.filters.hipRx, rawHipR.x, t, this.sm.hipR?.x ?? rawHipR.x),
        y: filterValue(this.filters.hipRy, rawHipR.y, t, this.sm.hipR?.y ?? rawHipR.y),
      };
      this.sm.hipC = midpoint(this.sm.hipL, this.sm.hipR);
    }

    if (pts[16]) {
      this.sm.wristR = {
        x: filterValue(this.filters.wristRx, pts[16].x, t, this.sm.wristR?.x ?? pts[16].x),
        y: filterValue(this.filters.wristRy, pts[16].y, t, this.sm.wristR?.y ?? pts[16].y),
      };
    }
    if (pts[15]) {
      this.sm.wristL = {
        x: filterValue(this.filters.wristLx, pts[15].x, t, this.sm.wristL?.x ?? pts[15].x),
        y: filterValue(this.filters.wristLy, pts[15].y, t, this.sm.wristL?.y ?? pts[15].y),
      };
    }

    // Dispatch to category-specific rendering
    const type = this.garmentType;
    if (type === 'shirt' || type === 'jacket') {
      this.renderShirt(this.ctx, w, h, pts);
    } else if (type === 'abaya' || type === 'dress') {
      this.renderAbayaDress(this.ctx, w, h, pts);
    } else if (type === 'pants') {
      this.renderPants(this.ctx, w, h, pts);
    } else if (type === 'headwear') {
      this.renderHeadwear(this.ctx, w, h, pts);
    } else if (type === 'accessory') {
      this.renderWatch(this.ctx, w, h, pts);
    } else {
      this.renderShirt(this.ctx, w, h, pts);
    }

    // Occlusion (throttled, cached, try/catch guarded)
    this.applyOcclusion(this.ctx, w, h);
  }

  /**
   * Legacy convenience: draw video + garment in one call.
   */
  updateFrame(video: HTMLVideoElement, landmarks: Landmark[]): void {
    this.drawVideo(video);
    this.drawGarment(landmarks);
  }

  // ── Occlusion composite (cached + downscaled + throttled) ──

  private applyOcclusion(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.occDisabled) return;
    const mask = this.occlusionMask;
    if (!mask || mask.data.length === 0) return;
    const video = this.lastVideo;
    if (!video) return;

    // Throttle: run at most ~8fps
    const now = performance.now();
    if (now - this.occLastTime < ImageOverlay.OCC_THROTTLE_MS) return;
    this.occLastTime = now;

    try {
      const { srcX, srcY, srcW, srcH } = this.crop;
      const mw = mask.width;
      const mh = mask.height;
      const data = mask.data;

      // Use downscaled buffer for compositing
      const occW = ImageOverlay.OCC_SCALE;
      const occH = Math.round((h / w) * occW);

      // Ensure cached canvases are correctly sized
      if (this.occTempCanvas.width !== occW || this.occTempCanvas.height !== occH) {
        this.occTempCanvas.width = occW;
        this.occTempCanvas.height = occH;
      }
      if (this.occMaskCanvas.width !== occW || this.occMaskCanvas.height !== occH) {
        this.occMaskCanvas.width = occW;
        this.occMaskCanvas.height = occH;
      }

      // 1. Draw cover-cropped mirrored video at small size
      const tc = this.occTempCtx;
      tc.save();
      tc.translate(occW, 0);
      tc.scale(-1, 1);
      if (this.cropValid) {
        tc.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, occW, occH);
      } else {
        tc.drawImage(video, 0, 0, occW, occH);
      }
      tc.restore();

      // 2. Build an alpha mask on the mask canvas
      const mc = this.occMaskCtx;
      const maskImgData = mc.createImageData(occW, occH);
      const md = maskImgData.data;

      for (let cy = 0; cy < occH; cy++) {
        const my = Math.floor((cy / occH) * mh);
        for (let cx = 0; cx < occW; cx++) {
          const mx = Math.floor(((occW - 1 - cx) / occW) * mw);
          const maskIdx = my * mw + mx;
          const pi = (cy * occW + cx) * 4;
          if (data[maskIdx] > 0.5) {
            md[pi] = 255;
            md[pi + 1] = 255;
            md[pi + 2] = 255;
            md[pi + 3] = 255;
          } else {
            md[pi + 3] = 0;
          }
        }
      }
      mc.putImageData(maskImgData, 0, 0);

      // 3. Use mask as clip: draw body video through mask onto main canvas
      // source-in on temp: keep only masked body pixels
      tc.save();
      tc.globalCompositeOperation = 'destination-in';
      tc.drawImage(this.occMaskCanvas, 0, 0);
      tc.restore();

      // 4. Draw the masked body (small) onto the main canvas, scaled up
      ctx.drawImage(this.occTempCanvas, 0, 0, w, h);

    } catch (err) {
      console.warn('[ImageOverlay] Occlusion failed, disabling:', err);
      this.occDisabled = true;
    }
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
    this.occDisabled = false;
    this.occLastTime = 0;
    Object.values(this.filters).forEach(fp => resetFilterPair(fp));
  }

  /** Whether garment image is loaded and ready */
  get isReady(): boolean {
    return this.garmentImage !== null;
  }

  /** Garment image dimensions for debug HUD */
  get garmentDims(): { w: number; h: number } | null {
    return this.garmentImage ? { w: this.garmentImage.width, h: this.garmentImage.height } : null;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  dispose(): void {
    this.garmentImage = null;
    this.lastVideo = null;
    this.resetFilters();
  }
}
