/**
 * Garment-aware tracking guidance overlay component.
 *
 * Displays context-sensitive instructions to help users position themselves
 * correctly for AR try-on based on the garment type being tried on.
 *
 * - waiting_for_pose: Garment-specific body position instructions
 * - partial_tracking: Shows which body parts are still missing (amber indicator)
 * - tracking_lost: Garment-specific "move back into frame" message
 * - tracking_active: Hidden (no overlay)
 * - Other states: Generic messages (initializing, camera errors, model loading)
 */
import { Loader2, CameraOff, AlertTriangle, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TrackingState, GarmentType } from '../types';
import { getTrackingGuidance } from './garmentGuidance';

interface TrackingGuidanceProps {
  state: TrackingState;
  message: string;
  garmentType: GarmentType;
  missingParts: string[];
  /** Download progress text (e.g. "45%" or "2.3 MB") shown during model_loading. */
  loadProgress?: string;
  /** Granular stage label (e.g. "Starting camera & body tracking…") shown during initializing/model_loading. */
  loadStage?: string;
  /** Called when user taps retry after model_error. */
  onRetry?: () => void;
}

export function TrackingGuidance({ state, message, garmentType, missingParts, loadProgress, loadStage, onRetry }: TrackingGuidanceProps) {
  if (state === 'tracking_active') return null;

  const content = (() => {
    // For garment-aware states, use the guidance module
    const garmentGuidance = getTrackingGuidance(garmentType, state, missingParts);

    switch (state) {
      case 'initializing':
        return {
          icon: <Loader2 className="h-10 w-10 text-white animate-spin" />,
          title: 'Starting AR...',
          sub: loadStage || 'Preparing camera and tracking',
        };

      case 'camera_denied':
        return {
          icon: <CameraOff className="h-10 w-10 text-red-400" />,
          title: 'Camera Access Required',
          sub: 'Please allow camera access to use AR try-on',
          action: <Button variant="secondary" onClick={() => window.location.reload()}>Try Again</Button>,
        };

      case 'camera_error':
        return {
          icon: <CameraOff className="h-10 w-10 text-red-400" />,
          title: 'Camera Error',
          sub: message || 'Could not access camera',
          action: <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>,
        };

      case 'pose_init_failed':
        return {
          icon: <AlertTriangle className="h-10 w-10 text-yellow-400" />,
          title: 'AR Tracking Failed',
          sub: 'Could not initialize body tracking. Try refreshing or use a different browser.',
          action: <Button variant="secondary" onClick={() => window.location.reload()}>Refresh</Button>,
        };

      case 'model_loading':
        return {
          icon: <Loader2 className="h-10 w-10 text-white animate-spin" />,
          title: 'Loading outfit...',
          sub: loadProgress
            ? `${loadStage || 'Downloading 3D model'} — ${loadProgress}`
            : loadStage || 'Downloading 3D model',
        };

      case 'model_error':
        return {
          icon: <AlertTriangle className="h-10 w-10 text-yellow-400" />,
          title: "Couldn't Load AR Asset",
          sub: message || 'The asset file may be too large or your connection is slow.',
          action: onRetry ? <Button variant="secondary" onClick={onRetry}>Try Again</Button> : undefined,
        };

      case 'waiting_for_pose':
        return {
          icon: <User className="h-10 w-10 text-white/70" />,
          title: garmentGuidance?.title || 'Position Yourself',
          sub: garmentGuidance?.subtitle || 'Stand back so your shoulders and hips are visible',
        };

      case 'partial_tracking':
        return {
          icon: <AlertTriangle className="h-10 w-10 text-yellow-400" />,
          title: garmentGuidance?.title || 'Position Yourself',
          sub: garmentGuidance?.subtitle || 'Show more of your body',
        };

      case 'tracking_lost':
        return {
          icon: <RefreshCw className="h-10 w-10 text-yellow-400" />,
          title: garmentGuidance?.title || 'Tracking Lost',
          sub: garmentGuidance?.subtitle || 'Move back into frame',
        };

      default:
        return null;
    }
  })();

  if (!content) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 max-w-xs text-center space-y-3 pointer-events-auto">
        <div className="flex justify-center">{content.icon}</div>
        <p className="text-white font-semibold">{content.title}</p>
        {content.sub && <p className="text-white/60 text-sm">{content.sub}</p>}
        {content.action && <div>{content.action}</div>}
      </div>
    </div>
  );
}
