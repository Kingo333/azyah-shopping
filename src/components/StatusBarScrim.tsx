/**
 * StatusBarScrim is no longer needed when using overlay: false
 * iOS handles the status bar automatically in Safari-style mode.
 * Keeping this component as a no-op for backwards compatibility.
 */
export function StatusBarScrim() {
  return null;
}
