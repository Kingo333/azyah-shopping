export interface LayerTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flipH: boolean;
}

export interface TransformMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/**
 * Generate CSS/Canvas2D compatible transform matrix
 * Single source of truth for both editor and export rendering
 */
export function layerMatrix({ x, y, scale, rotation, flipH }: LayerTransform): TransformMatrix {
  const rad = rotation * Math.PI / 180;
  const sx = (flipH ? -1 : 1) * scale;
  const sy = scale;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  return {
    a: cos * sx,
    b: sin * sx,
    c: -sin * sy,
    d: cos * sy,
    e: x,
    f: y,
  };
}

/**
 * Convert transform matrix to CSS matrix() string
 */
export function matrixToCss(m: TransformMatrix): string {
  return `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, ${m.e}, ${m.f})`;
}

/**
 * Apply transform matrix to Canvas2D context
 */
export function applyMatrixToCanvas(
  ctx: CanvasRenderingContext2D,
  m: TransformMatrix
): void {
  ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
}

/**
 * Reset Canvas2D context transform to identity
 */
export function resetCanvasTransform(ctx: CanvasRenderingContext2D): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
