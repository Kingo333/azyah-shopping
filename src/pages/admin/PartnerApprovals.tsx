import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type Partner = {
  id: string;
  name: string;
  slug: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  kind: 'brand' | 'retailer';
};

const STATUS_LABEL: Record<Partner['verification_status'], string> = {
  pending: 'Waiting',
  approved: 'Approved',
  rejected: 'Rejected',
};

/**
 * Admin: approve or reject brands and stores. Shoppers only see products from
 * approved partners (owner decision 2026-10-26). Uses the
 * admin_set_partner_verification database function (admins only).
 */
export default function PartnerApprovals() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Admin accounts also keep their shopper role, and the app's role lookup
  // shows them the shopper site, so check the admin role here. The database
  // function refuses non-admins either way.
  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()
      .then(({ data }: { data: { role: string } | null }) => setIsAdmin(!!data));
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    const [brands, retailers] = await Promise.all([
      (supabase as any).from('brands').select('id, name, slug, verification_status, created_at'),
      (supabase as any).from('retailers').select('id, name, slug, verification_status, created_at'),
    ]);
    const rows: Partner[] = [
      ...((brands.data ?? []) as Omit<Partner, 'kind'>[]).map((b) => ({ ...b, kind: 'brand' as const })),
      ...((retailers.data ?? []) as Omit<Partner, 'kind'>[]).map((r) => ({ ...r, kind: 'retailer' as const })),
    ].sort((a, b) => (a.verification_status === 'pending' ? -1 : 1) - (b.verification_status === 'pending' ? -1 : 1)
      || b.created_at.localeCompare(a.created_at));
    setPartners(rows);
    setLoading(false);
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const setStatus = async (p: Partner, status: Partner['verification_status']) => {
    setBusyId(p.id);
    const { error } = await (supabase as any).rpc('admin_set_partner_verification', {
      partner_kind: p.kind,
      partner_id: p.id,
      new_status: status,
    });
    setBusyId(null);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Set to waiting', description: p.name });
    load();
  };

  if (isAdmin === null) {
    return <main className="container mx-auto max-w-3xl px-4 py-6"><p className="text-sm text-muted-foreground">Checking access…</p></main>;
  }
  if (!isAdmin) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="text-sm text-muted-foreground">This page is for approving brands and stores.</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold">Partner approvals</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Shoppers only see products from approved brands and stores.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : partners.length === 0 ? (
        <p className="text-sm text-muted-foreground">No brands or stores yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {partners.map((p) => (
            <li key={`${p.kind}-${p.id}`} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.kind === 'brand' ? 'Brand' : 'Store'} · /{p.slug} · joined {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={p.verification_status === 'approved' ? 'default' : 'secondary'}>
                  {STATUS_LABEL[p.verification_status] ?? p.verification_status}
                </Badge>
                {p.verification_status !== 'approved' && (
                  <Button size="sm" disabled={busyId === p.id} onClick={() => setStatus(p, 'approved')}>Approve</Button>
                )}
                {p.verification_status !== 'rejected' && (
                  <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => setStatus(p, 'rejected')}>Reject</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
