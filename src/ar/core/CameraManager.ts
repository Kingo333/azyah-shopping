/**
 * Camera stream lifecycle management for the AR pipeline.
 *
 * Encapsulates getUserMedia acquisition, video element setup, and stream cleanup.
 * These are standalone functions (not a class) since camera has no internal state
 * worth encapsulating -- it is purely a start/stop lifecycle.
 *
 * Extracted from ARExperience.tsx lines 140-164 to enable independent camera
 * lifecycle that does not restart when the user switches products.
 */

/**
 * Result of a successful camera acquisition.
 */
export interface CameraResult {
  /** The active MediaStream from getUserMedia. */
  stream: MediaStream;
  /** Native width of the video feed in pixels. */
  videoWidth: number;
  /** Native height of the video feed in pixels. */
  videoHeight: number;
}

/** Default camera constraints targeting front-facing 720p video. */
const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
};

/**
 * Acquire a camera stream and attach it to a video element.
 *
 * Requests getUserMedia, sets the stream as the video source, plays the video,
 * and waits for metadata to be loaded so video dimensions are available.
 *
 * @param video - The HTMLVideoElement to receive the camera stream.
 * @param constraints - Optional MediaStreamConstraints. Defaults to front-facing 720p.
 * @returns A CameraResult with the stream and native video dimensions.
 * @throws DOMException if camera access is denied or unavailable.
 */
export async function startCamera(
  video: HTMLVideoElement,
  constraints?: MediaStreamConstraints,
): Promise<CameraResult> {
  const stream = await navigator.mediaDevices.getUserMedia(
    constraints ?? DEFAULT_CONSTRAINTS,
  );
  video.srcObject = stream;
  await video.play();

  // Wait for video metadata so dimensions are available
  await new Promise<void>((resolve) => {
    if (video.videoWidth > 0) {
      resolve();
      return;
    }
    video.onloadedmetadata = () => resolve();
  });

  return {
    stream,
    videoWidth: video.videoWidth || window.innerWidth,
    videoHeight: video.videoHeight || window.innerHeight,
  };
}

/**
 * Stop all tracks on a camera stream, releasing the device.
 *
 * Safe to call with null -- this is a no-op in that case.
 *
 * @param stream - The MediaStream to stop, or null.
 */
export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}
