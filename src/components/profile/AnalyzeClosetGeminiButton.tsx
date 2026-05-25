import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Activity, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Gemini Vision closet backfill — parallel to FashionCLIP, never replaces it.
// Writes gemini_status / gemini_metadata; FashionCLIP's status / prompt_hint stay untouched.
type Coverage = {
  totalRows: number;
  coveredRows: number;
  uniqueUrlsTotal: number;
  uniqueUrlsRemaining: number;
};

function normalizeUrl(row: { image_url: string | null; image_bg_removed_url: string | null }) {
  return (row.image_bg_removed_url || row.image_url || '').trim();
}

export const AnalyzeClosetGeminiButton: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loadingMode, setLoadingMode] = useState<'smoke' | 'batch' | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(false);

  const refreshCoverage = useCallback(async () => {
    if (!user) return;
    setCoverageLoading(true);
    try {
      const { data: items } = await supabase
        .from('wardrobe_items')
        .select('id, image_url, image_bg_removed_url')
        .eq('user_id', user.id);
      const rows = (items ?? []).filter((r) => normalizeUrl(r));
      const totalRows = rows.length;
      const ids = rows.map((r) => r.id);
      const completeUrls = new Set<string>();
      if (ids.length > 0) {
        const { data: analyses } = await supabase
          .from('wardrobe_garment_analysis' as any)
          .select('wardrobe_item_id, gemini_status, gemini_metadata')
          .in('wardrobe_item_id', ids);
        const byItem = new Map<string, any>(
          (analyses ?? []).map((a: any) => [a.wardrobe_item_id, a]),
        );
        for (const r of rows) {
          const a = byItem.get(r.id);
          if (a?.gemini_status === 'complete' && a.gemini_metadata) {
            completeUrls.add(normalizeUrl(r));
          }
        }
      }
      const allUrls = new Set(rows.map(normalizeUrl));
      const coveredRows = rows.filter((r) => completeUrls.has(normalizeUrl(r))).length;
      setCoverage({
        totalRows,
        coveredRows,
        uniqueUrlsTotal: allUrls.size,
        uniqueUrlsRemaining: allUrls.size - completeUrls.size,
      });
    } catch {
      // ignore
    } finally {
      setCoverageLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCoverage();
  }, [refreshCoverage]);

  if (!user) return null;

  async function run(mode: 'smoke' | 'batch') {
    setLoadingMode(mode);
    setSummary(null);
    try {
      const queueSize = Math.max(1, Math.min(25, coverage?.uniqueUrlsRemaining ?? 25));
      const body =
        mode === 'smoke'
          ? { mode: 'smoke-test' }
          : { limit: queueSize, chunkSize: 2 };
      const { data, error } = await supabase.functions.invoke(
        'reanalyze-wardrobe-gemini-batch',
        { body },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSummary({ mode, data });

      if (mode === 'batch') {
        const d: any = data;
        toast.success(
          `Gemini calls ${d.workerCalls ?? 0} · fanout ${d.rowsCompletedByFanout ?? 0}`,
        );
        queryClient.invalidateQueries({ queryKey: ['wardrobe-items'] });
        queryClient.invalidateQueries({ queryKey: ['wardrobe_garment_analysis'] });
        await refreshCoverage();
      } else {
        toast.success(
          `Gemini key: ${(data as any).geminiKeyConfigured ? 'ok' : 'missing'}`,
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
  const remaining = coverage?.uniqueUrlsRemaining ?? null;
  const allDone = remaining === 0 && (coverage?.totalRows ?? 0) > 0;
  const batchLabel = allDone
    ? 'All items analyzed (Gemini)'
    : remaining != null
      ? `Analyze ${Math.min(25, remaining)} item${remaining === 1 ? '' : 's'} with Gemini`
      : 'Analyze with Gemini';

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
          Smoke test Gemini
        </Button>
        <Button
          onClick={() => run('batch')}
          disabled={loadingMode !== null || allDone}
          variant="outline"
          size="sm"
          className="flex-1 gap-2"
        >
          {loadingMode === 'batch' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : allDone ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {batchLabel}
        </Button>
      </div>

      {coverage && (
        <div className="text-[11px] text-muted-foreground px-0.5">
          {coverageLoading ? 'Checking…' : (
            allDone
              ? `${coverage.coveredRows} of ${coverage.totalRows} items analyzed (Gemini)`
              : `${coverage.coveredRows} of ${coverage.totalRows} items analyzed (Gemini) · ${coverage.uniqueUrlsRemaining} unique image${coverage.uniqueUrlsRemaining === 1 ? '' : 's'} remaining`
          )}
        </div>
      )}

      {summary?.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-xs text-destructive">
          {summary.error}
        </div>
      )}

      {data && summary?.mode === 'batch' && (
        <div className="rounded-md border bg-card p-3 text-xs space-y-1 text-muted-foreground">
          <div>
            totalRows: {data.totalRows} · uniqueUrls: {data.uniqueUrlsTotal} · alreadyComplete: {data.uniqueUrlsAlreadyComplete} · remaining: {data.uniqueUrlsRemaining}
          </div>
          <div>
            workerCalls: {data.workerCalls} · fanout: {data.rowsCompletedByFanout} · complete: {data.complete} · cached: {data.cached} · failed: {data.failed} · skipped: {data.skipped}
          </div>
          {Array.isArray(data.perUrl) && data.perUrl.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {data.perUrl.map((u: any) => (
                <div key={u.urlHash} className="rounded border border-border/50 p-2">
                  <div className="font-mono text-[10px]">url#{u.urlHash} · dup {u.duplicateCount} · fanout {u.fannedOutCount}</div>
                  <div>analyze: {u.analyzeStatus ?? '—'} · http {u.httpStatus}</div>
                  {u.summary && (
                    <div className="text-[10px] opacity-75 break-all">resp: {String(u.summary).slice(0, 200)}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {data && summary?.mode === 'smoke' && (
        <div className="rounded-md border bg-card p-3 text-xs text-muted-foreground">
          geminiKeyConfigured: {String(data.geminiKeyConfigured)}
        </div>
      )}
    </div>
  );
};

export default AnalyzeClosetGeminiButton;
