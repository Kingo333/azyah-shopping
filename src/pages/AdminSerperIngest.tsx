
import React, { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';

type IngestRun = {
  id: string;
  source: string;
  started_at: string;
  finished_at: string | null;
  attempted: number;
  inserted: number;
  updated: number;
  rejected: number;
  status: string;
  notes: Record<string, any>;
};

const useIngestRuns = () => {
  return useQuery({
    queryKey: ['ingest_runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingest_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as IngestRun[];
    },
    refetchOnWindowFocus: false,
  });
};

const jsonToCsv = (rows: any[]) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = typeof v === 'string' ? v : JSON.stringify(v ?? '');
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.map(esc).join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => esc((r as any)[h])).join(','));
  }
  return lines.join('\n');
};

const AdminSerperIngest: React.FC = () => {
  const { data: runs, refetch } = useIngestRuns();
  const { isEnabled } = useFeatureFlags();
  const [loading, setLoading] = useState<'dry' | 'live' | null>(null);

  const featureEnabled = isEnabled('serper_ingest');

  const onRun = async (dryRun: boolean) => {
    try {
      if (!dryRun && !featureEnabled) {
        toast({ title: 'Feature disabled', description: 'Enable serper_ingest to run live.', variant: 'destructive' });
        return;
      }
      setLoading(dryRun ? 'dry' : 'live');
      const { data, error } = await supabase.functions.invoke('serper-weekly-ingest', {
        body: { dryRun },
      });
      if (error) throw error;
      if (data?.summary) {
        toast({
          title: dryRun ? 'Dry run complete' : 'Ingest complete',
          description: `Attempted ${data.summary.attempted}, valid ${data.summary.valid}, inserted ${data.summary.inserted}, updated ${data.summary.updated}, rejected ${data.summary.rejected}.`
        });
        refetch();
      } else {
        toast({ title: 'Unexpected response', description: 'No summary returned', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Ingest failed', description: e.message || 'Unknown error', variant: 'destructive' });
      console.error('Ingest run error:', e);
    } finally {
      setLoading(null);
    }
  };

  const csv = useMemo(() => jsonToCsv(runs || []), [runs]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Serper Weekly Ingest
            <div className="space-x-2">
              <Button variant="secondary" onClick={() => onRun(true)} disabled={loading !== null}>
                {loading === 'dry' ? 'Running…' : 'Dry Run'}
              </Button>
              <Button onClick={() => onRun(false)} disabled={!featureEnabled || loading !== null} title={!featureEnabled ? 'Enable serper_ingest to allow live runs' : ''}>
                {loading === 'live' ? 'Running…' : 'Live Run'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Live writes are blocked server-side unless FEATURE_SERPER_INGEST=true.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempted</TableHead>
                  <TableHead>Valid</TableHead>
                  <TableHead>Inserted</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Rejected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(runs || []).map((r) => {
                  const valid = (r.notes as any)?.valid ?? undefined; // may not exist; we compute from inserted+updated+rejected if needed
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.started_at).toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{r.status}</TableCell>
                      <TableCell>{r.attempted}</TableCell>
                      <TableCell>{valid ?? (r.inserted + r.updated)}</TableCell>
                      <TableCell>{r.inserted}</TableCell>
                      <TableCell>{r.updated}</TableCell>
                      <TableCell>{r.rejected}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4">
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
              download={`ingest_runs_${Date.now()}.csv`}
              className="text-primary underline text-sm"
            >
              Download CSV
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSerperIngest;
