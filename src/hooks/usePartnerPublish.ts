import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { productIssues, type PartnerProductLike } from '@/lib/partnerPortal';

/**
 * Publish from a product row: goes live at once when nothing is missing,
 * otherwise opens Edit (which lists what's missing). Same checks as Edit.
 */
export function usePartnerPublish<T extends PartnerProductLike & { id: string }>(
  refresh: () => void,
  openEdit: (product: T) => void,
) {
  const { toast } = useToast();
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const publish = useCallback(
    async (product: T) => {
      const issues = productIssues(product);
      if (issues.length > 0) {
        toast({ title: 'Finish this product first', description: `${issues.join('. ')}.` });
        openEdit(product);
        return;
      }
      setBusyIds((s) => new Set(s).add(product.id));
      try {
        const { error } = await supabase
          .from('products')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', product.id);
        if (error) throw error;
        toast({ title: 'Published', description: 'This product is now live for shoppers.' });
        refresh();
      } catch (error) {
        console.error('Publish failed:', error);
        toast({ title: "Couldn't publish", description: 'Please try again.', variant: 'destructive' });
      } finally {
        setBusyIds((s) => {
          const next = new Set(s);
          next.delete(product.id);
          return next;
        });
      }
    },
    [refresh, openEdit, toast],
  );

  return { publish, busyIds };
}
