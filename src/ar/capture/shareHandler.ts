/**
 * Handles sharing or downloading a captured AR try-on image.
 *
 * Uses the Web Share API Level 2 (with files) when available -- this works
 * in both Capacitor WebViews (iOS 15+, Android Chrome) and desktop browsers
 * that support it. Falls back to a download link when sharing is unavailable.
 *
 * Does NOT use Capacitor Share directly because it requires file URIs,
 * adding unnecessary complexity when Web Share API covers both native
 * and web use cases.
 */

/**
 * Share or download a captured image Blob.
 *
 * Priority:
 * 1. Web Share API with files (native share sheet on mobile)
 * 2. Download fallback (creates a temporary link and clicks it)
 *
 * If the user cancels the share dialog (AbortError), it is silently ignored.
 * Other errors are re-thrown.
 *
 * @param blob - The PNG Blob to share or download.
 */
export async function shareImage(blob: Blob): Promise<void> {
  const file = new File([blob], 'ar-tryon.png', { type: 'image/png' });

  // Try Web Share API Level 2 (with files support)
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'AR Try-On',
        text: 'Check out this look!',
      });
      return;
    }
  } catch (err: unknown) {
    // If user cancelled the share dialog, silently ignore
    if (err instanceof Error && err.name === 'AbortError') {
      return;
    }
    // For other share errors, fall through to download fallback
    console.warn('Web Share API failed, falling back to download:', err);
  }

  // Fallback: trigger a download
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ar-tryon.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
}
