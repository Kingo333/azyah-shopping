import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Temporary diagnostic controls — signed-in users only.
// "Smoke test worker" probes the FashionCLIP worker safely (no batch DB writes).
// "Analyze 3 closet items" runs the smallest backfill with per-item results.
export const AnalyzeClosetButton: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loadingMode, setLoadingMode] = useState<'smoke' | 'batch' | null>(null);
  const [summary, setSummary] = useState<any>(null);

  if (!user) return null;

  async function run(mode: 'smoke' | 'batch') {
    setLoadingMode(mode);
    setSummary(null);
    try {
      const body =
        mode === 'smoke'
          ? { mode: 'smoke-test' }
          : { limit: 3, chunkSize: 1 };
      const { data, error } = await supabase.functions.invoke(
        'reanalyze-wardrobe-fashionclip-batch',
        { body },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSummary({ mode, data });

      if (mode === 'batch') {
        toast.success(
          `Queued ${(data as any).queued ?? 0} / ${(data as any).total ?? 0}`,
        );
        queryClient.invalidateQueries({ queryKey: ['wardrobe-items'] });
        queryClient.invalidateQueries({ queryKey: ['wardrobe_garment_analysis'] });
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
      } else {
        toast.success(
          `Ping ${(data as any).pingStatus ?? '—'} · Analyze ${(data as any).analyzeStatus ?? '—'}`,
        );
      }
    } catch (e: any) {
      const msg = e?.message ? String(e.message).slice(0, 240) : 'Request failed';
      toast.error(msg);
      setSummary({ mode, error: msg });
    } finally {
      setLoadingMode(null);
    }
  }

  const data = summary?.data;

  return (
    <div className="px-4 pt-3 space-y-2">
      <div className="flex gap-2">
        <Button
          onClick={() => run('smoke')}
          disabled={loadingMode !== null}
          variant="outline"
          size="sm"
          className="flex-1 gap-2"
        >
          {loadingMode === 'smoke' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Activity className="h-4 w-4" />
          )}
          Smoke test worker
        </Button>
        <Button
          onClick={() => run('batch')}
          disabled={loadingMode !== null}
          variant="outline"
          size="sm"
          className="flex-1 gap-2"
        >
          {loadingMode === 'batch' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Analyze 3 closet items
        </Button>
      </div>

      {summary?.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-xs text-destructive">
          {summary.error}
        </div>
      )}

      {data && summary?.mode === 'smoke' && (
        <div className="rounded-md border bg-card p-3 text-xs space-y-0.5 text-muted-foreground">
          <div>workerConfigured: {String(data.workerConfigured)} · urlValid: {String(data.workerUrlValid)} · tokenConfigured: {String(data.workerTokenConfigured)} · runpodAuth: {String(data.runpodAuthConfigured)}</div>
          <div>workerHost: {data.workerHost || '—'} · pathShape: {data.workerPathShape}</div>
          <div>ping: {data.pingStatus ?? '—'} · {data.pingDurationMs ?? '—'}ms / {data.pingTimeoutMs ?? '—'}ms {data.pingError ? `(${data.pingError})` : ''}</div>
          {data.pingBodySummary && (
            <div className="text-[10px] opacity-75 break-all">pingBody: {String(data.pingBodySummary).slice(0, 200)}</div>
          )}
          <div>analyze: {data.analyzeStatus ?? '—'} · {data.analyzeDurationMs ?? '—'}ms / {data.analyzeTimeoutMs ?? '—'}ms {data.analyzeTimedOutBeforeResponse ? '· timedOut' : ''} {data.analyzeError ? `(${String(data.analyzeError).slice(0, 80)})` : ''}</div>
          {(data.analyzeBodySummary || data.analyzeResponseSummary) && (
            <div className="text-[10px] opacity-75 break-all">analyzeBody: {String(data.analyzeBodySummary || data.analyzeResponseSummary).slice(0, 200)}</div>
          )}
          <div>analyze response keys: {(data.analyzeResponseKeys || []).join(', ') || '—'}</div>
        </div>
      )}

      {data && summary?.mode === 'batch' && (
        <div className="rounded-md border bg-card p-3 text-xs space-y-1 text-muted-foreground">
          <div>total: {data.total} · eligible: {data.eligible} · queued: {data.queued}</div>
          <div>
            complete: {data.complete} · pending: {data.pending} · failed: {data.failed} · skipped: {data.skipped} · missing: {data.missing}
          </div>
          <div>workerConfigured: {String(data.workerConfigured)} · host: {data.workerHost || '—'} · pathShape: {data.workerPathShape} · authMode: {data.authMode}</div>
          {Array.isArray(data.items) && data.items.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {data.items.map((it: any) => (
                <div key={it.wardrobe_item_id} className="rounded border border-border/50 p-2">
                  <div className="font-mono text-[10px] truncate">{it.wardrobe_item_id}</div>
                  <div>called: {String(it.calledAnalyze)} · analyzeStatus: {it.analyzeStatus ?? '—'} · dbStatus: {it.finalDbStatus}</div>
                  {it.finalDbError && <div>dbError: {it.finalDbError}</div>}
                  {it.analyzeResponseSummary && (
                    <div className="text-[10px] opacity-75 break-all">resp: {String(it.analyzeResponseSummary).slice(0, 200)}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyzeClosetButton;
