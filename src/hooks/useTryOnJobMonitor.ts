import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const PENDING_JOBS_KEY = 'pending_tryon_jobs';

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
            toast({
              title: 'Try-On Complete! ✨',
              description: 'Your virtual try-on is ready. Check AI Studio to view it.',
            });
            // Remove from pending
            const updated = pending.filter((id: string) => id !== jobId);
            localStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(updated));
            continue;
          } else if (data.status === 'failed') {
            toast({
              title: 'Try-On Failed',
              description: 'There was a problem generating your try-on. Please try again.',
              variant: 'destructive',
            });
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
              toast({
                title: 'Video Ready! 🎬',
                description: 'Your fashion video has been generated. Check AI Studio to view it.',
              });
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
