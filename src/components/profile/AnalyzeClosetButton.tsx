import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Temporary admin/test button — backfills FashionCLIP analysis for existing
// wardrobe items. Hidden from public/guest users.
export const AnalyzeClosetButton: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  if (!user) return null;

  const handleClick = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        'reanalyze-wardrobe-fashionclip-batch',
        { body: { limit: 3, chunkSize: 1 } },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      setSummary(data);
      toast.success(
        `Analyzed ${(data as any).queued ?? 0} of ${(data as any).total ?? 0} items`,
      );

      // Refetch wardrobe data
      queryClient.invalidateQueries({ queryKey: ['wardrobe-items'] });
      queryClient.invalidateQueries({ queryKey: ['wardrobe_garment_analysis'] });

      // Safe console peek of one prompt_hint
      try {
        const { data: rows } = await supabase
          .from('wardrobe_garment_analysis' as any)
          .select('wardrobe_item_id, status, prompt_hint')
          .eq('status', 'complete')
          .limit(1);
        if (rows && rows.length > 0) {
          console.log('[fashionclip] example prompt_hint:', (rows[0] as any).prompt_hint);
        }
      } catch {/* ignore */}
    } catch (e: any) {
      const msg = e?.message ? String(e.message).slice(0, 200) : 'Request failed';
      toast.error(msg);
      setSummary({ error: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-3">
      <Button
        onClick={handleClick}
        disabled={loading}
        variant="outline"
        size="sm"
        className="w-full gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing 3 closet items...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Analyze Closet Items
          </>
        )}
      </Button>
      {summary && !summary.error && (
        <div className="mt-2 rounded-md border bg-card p-3 text-xs text-muted-foreground space-y-0.5">
          <div>total: {summary.total}</div>
          <div>eligible: {summary.eligible}</div>
          <div>queued: {summary.queued}</div>
          <div>complete: {summary.complete}</div>
          <div>pending: {summary.pending}</div>
          <div>failed: {summary.failed}</div>
          <div>skipped: {summary.skipped}</div>
          <div>missing: {summary.missing}</div>
          <div>workerConfigured: {String(summary.workerConfigured)}</div>
        </div>
      )}
      {summary?.error && (
        <div className="mt-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-xs text-destructive">
          {summary.error}
        </div>
      )}
    </div>
  );
};

export default AnalyzeClosetButton;
