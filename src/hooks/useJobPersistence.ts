/**
 * Persistence layer for AI try-on job state
 * Allows resuming polling when modal is closed and reopened
 */

const PICTURE_JOB_KEY = 'active_picture_job';
const VIDEO_JOB_KEY = 'active_video_job';

export interface ActiveJob {
  jobId: string;
  startedAt: number;
  type: 'picture' | 'video';
}

// Picture job persistence
export function savePictureJob(jobId: string): void {
  const job: ActiveJob = {
    jobId,
    startedAt: Date.now(),
    type: 'picture'
  };
  localStorage.setItem(PICTURE_JOB_KEY, JSON.stringify(job));
}

export function getActivePictureJob(): ActiveJob | null {
  try {
    const stored = localStorage.getItem(PICTURE_JOB_KEY);
    if (!stored) return null;
    
    const job = JSON.parse(stored) as ActiveJob;
    // Expire after 10 minutes (picture jobs should complete faster)
    if (Date.now() - job.startedAt > 10 * 60 * 1000) {
      clearPictureJob();
      return null;
    }
    return job;
  } catch {
    return null;
  }
}

export function clearPictureJob(): void {
  localStorage.removeItem(PICTURE_JOB_KEY);
}

// Video job persistence
export function saveVideoJob(jobId: string): void {
  const job: ActiveJob = {
    jobId,
    startedAt: Date.now(),
    type: 'video'
  };
  localStorage.setItem(VIDEO_JOB_KEY, JSON.stringify(job));
}

export function getActiveVideoJob(): ActiveJob | null {
  try {
    const stored = localStorage.getItem(VIDEO_JOB_KEY);
    if (!stored) return null;
    
    const job = JSON.parse(stored) as ActiveJob;
    // Expire after 10 minutes (video jobs take 2-5 min typically)
    if (Date.now() - job.startedAt > 10 * 60 * 1000) {
      clearVideoJob();
      return null;
    }
    return job;
  } catch {
    return null;
  }
}

export function clearVideoJob(): void {
  localStorage.removeItem(VIDEO_JOB_KEY);
}

// Helper to get elapsed time in seconds
export function getElapsedSeconds(job: ActiveJob): number {
  return Math.floor((Date.now() - job.startedAt) / 1000);
}

// Format elapsed time as MM:SS
export function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
