import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const PENDING_JOBS_KEY = 'pending_tryon_jobs';
const NOTIFIED_JOBS_KEY = 'notified_tryon_jobs';

// Helper: Check if already notified for this job (prevents duplicate toasts)
const hasNotified = (jobId: string): boolean => {
  const notified = JSON.parse(sessionStorage.getItem(NOTIFIED_JOBS_KEY) || '[]');
  return notified.includes(jobId);
};

// Helper: Mark job as notified
const markNotified = (jobId: string): void => {
  const notified = JSON.parse(sessionStorage.getItem(NOTIFIED_JOBS_KEY) || '[]');
  if (!notified.includes(jobId)) {
    notified.push(jobId);
    sessionStorage.setItem(NOTIFIED_JOBS_KEY, JSON.stringify(notified));
  }
};

export const useTryOnJobMonitor = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Register a new job to monitor
  const registerJob = useCallback((jobId: string) => {
    const pending = JSON.parse(localStorage.getItem(PENDING_JOBS_KEY) || '[]');
    if (!pending.includes(jobId)) {
      pending.push(jobId);
      localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(pending));
    }
  }, []);

  // Poll for pending jobs on mount
  useEffect(() => {
    if (!user?.id) return;

    const checkPendingJobs = async () => {
      const pending: string[] = JSON.parse(localStorage.getItem(PENDING_JOBS_KEY) || '[]');
      if (pending.length === 0) return;

      // Check each pending job
      for (const jobId of pending) {
        // First try database for picture jobs
        const { data } = await supabase
          .from('ai_tryon_jobs')
          .select('status, result_url')
          .eq('id', jobId)
          .maybeSingle();

        if (data) {
          if (data.status === 'succeeded' && data.result_url) {
            // Only show toast if not already notified (prevents duplicates)
            if (!hasNotified(jobId)) {
              toast({
                title: 'Try-On Complete! ✨',
                description: 'Your virtual try-on is ready. Check AI Studio to view it.',
              });
              markNotified(jobId);
            }
            // Remove from pending
            const updated = pending.filter((id: string) => id !== jobId);
            localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(updated));
            continue;
          } else if (data.status === 'failed') {
            if (!hasNotified(jobId)) {
              toast({
                title: 'Try-On Failed',
                description: 'There was a problem generating your try-on. Please try again.',
                variant: 'destructive',
              });
              markNotified(jobId);
            }
            // Remove failed jobs
            const updated = pending.filter((id: string) => id !== jobId);
            localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(updated));
            continue;
          }
        }

        // If not in database or still processing, check via edge function (for video jobs)
        if (!data || data.status === 'processing') {
          try {
            const { data: checkResult } = await supabase.functions.invoke('thenewblack-video', {
              body: { action: 'check', job_id: jobId }
            });

            if (checkResult?.ok && checkResult?.status === 'completed') {
              // Only show toast if not already notified (prevents duplicates)
              if (!hasNotified(jobId)) {
                toast({
                  title: 'Video Ready! 🎬',
                  description: 'Your fashion video has been generated. Check AI Studio to view it.',
                });
                markNotified(jobId);
              }
              // Remove from pending
              const updated = pending.filter((id: string) => id !== jobId);
              localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(updated));
            }
          } catch (err) {
            console.log('[useTryOnJobMonitor] Edge function check failed:', err);
          }
        }
      }
    };

    // Check immediately and then every 30 seconds
    checkPendingJobs();
    const interval = setInterval(checkPendingJobs, 30000);

    return () => clearInterval(interval);
  }, [user?.id, toast]);

  return { registerJob };
};

export default useTryOnJobMonitor;
