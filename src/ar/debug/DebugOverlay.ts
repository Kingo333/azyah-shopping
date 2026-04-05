/**
 * AR Debug Overlay — toggleable visualization for development.
 *
 * Draws landmark points, skeleton lines, segmentation mask preview,
 * FPS counter, and quality tier indicator on a 2D canvas overlay.
 *
 * Enable via: ?debug=true URL param or window.__AR_DEBUG = true
 */

interface LandmarkPoint {
  x: number;
  y: number;
  visibility?: number;
}

/** Bone connections for skeleton visualization (landmark index pairs). */
const SKELETON_CONNECTIONS: [number, number][] = [
  [11, 12], // shoulders
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], // torso
  [23, 24], // hips
  [23, 25], [25, 27], // left leg
  [24, 26], [26, 28], // right leg
];

export class DebugOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private enabled: boolean;
  private fps = 0;
  private frameCount = 0;
  private lastFpsTime = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:50';
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.ctx = this.canvas.getContext('2d')!;

    // Check if debug mode is enabled
    const urlDebug = new URLSearchParams(window.location.search).get('debug') === 'true';
    const windowDebug = (window as any).__AR_DEBUG === true;
    this.enabled = urlDebug || windowDebug;

    if (this.enabled) {
      container.appendChild(this.canvas);
      console.info('[DebugOverlay] Debug mode active — showing landmarks, skeleton, FPS');
    }
  }

  /** Draw debug visualization for the current frame. */
  draw(
    landmarks: LandmarkPoint[] | null,
    trackingQuality: string,
    segmentationEnabled: boolean,
    time: number,
  ): void {
    if (!this.enabled) return;

    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // FPS counter
    this.frameCount++;
    if (time - this.lastFpsTime > 1000) {
      this.fps = Math.round(this.frameCount / ((time - this.lastFpsTime) / 1000));
      this.frameCount = 0;
      this.lastFpsTime = time;
    }

    // FPS + quality tier (top-left)
    ctx.font = '14px monospace';
    ctx.fillStyle = this.fps > 25 ? '#00ff00' : this.fps > 18 ? '#ffff00' : '#ff0000';
    ctx.fillText(`FPS: ${this.fps}`, 10, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Tracking: ${trackingQuality}`, 10, 38);
    ctx.fillText(`Segmentation: ${segmentationEnabled ? 'ON' : 'OFF'}`, 10, 56);

    if (!landmarks || landmarks.length < 33) return;

    // Draw skeleton lines
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    for (const [a, b] of SKELETON_CONNECTIONS) {
      const la = landmarks[a];
      const lb = landmarks[b];
      if ((la.visibility ?? 0) < 0.3 || (lb.visibility ?? 0) < 0.3) continue;
      ctx.beginPath();
      ctx.moveTo((1 - la.x) * w, la.y * h); // mirror X for selfie
      ctx.lineTo((1 - lb.x) * w, lb.y * h);
      ctx.stroke();
    }

    // Draw landmark dots
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      if ((lm.visibility ?? 0) < 0.3) continue;
      const x = (1 - lm.x) * w; // mirror X
      const y = lm.y * h;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = (lm.visibility ?? 0) > 0.7 ? '#00ff00' : '#ffff00';
      ctx.fill();
    }
  }

  /** Resize canvas to match container. */
  resize(width: number, height: number): void {
    if (!this.enabled) return;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /** Clean up DOM. */
  dispose(): void {
    if (this.enabled) {
      this.canvas.remove();
    }
  }
}
