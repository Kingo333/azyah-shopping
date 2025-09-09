import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2, Globe, Package, Calendar } from 'lucide-react';
interface ImportSource {
  id: string;
  domain: string;
  name: string;
  created_at: string;
  product_count: number;
}
interface BulkImportActionsProps {
  brandId?: string;
  retailerId?: string;
  onProductsDeleted?: () => void;
}
export const BulkImportActions = ({
  brandId,
  retailerId,
  onProductsDeleted
}: BulkImportActionsProps) => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [importSources, setImportSources] = useState<ImportSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingSource, setDeletingSource] = useState<string | null>(null);
  const fetchImportSources = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get import sources for this brand/retailer
      const {
        data: sources,
        error: sourcesError
      } = await supabase.from('import_sources').select('id, domain, name, created_at').eq('user_id', user.id).order('created_at', {
        ascending: false
      });
      if (sourcesError) throw sourcesError;

      // For each source, count how many products were imported
      const sourcesWithCounts = await Promise.all((sources || []).map(async source => {
        const {
          count,
          error: countError
        } = await supabase.from('products').select('*', {
          count: 'exact',
          head: true
        }).or(brandId ? `brand_id.eq.${brandId}` : `retailer_id.eq.${retailerId}`).contains('attributes', {
          import_source_url: `https://${source.domain}`
        });
        if (countError) {
          console.error('Error counting products:', countError);
          return {
            ...source,
            product_count: 0
          };
        }
        return {
          ...source,
          product_count: count || 0
        };
      }));

      // Filter out sources with no imported products
      setImportSources(sourcesWithCounts.filter(source => source.product_count > 0));
    } catch (error: any) {
      console.error('Error fetching import sources:', error);
      toast({
        title: "Error",
        description: "Failed to load import history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteImport = async (sourceId: string, sourceDomain: string) => {
    setDeletingSource(sourceId);
    try {
      // Delete all products imported from this source
      const {
        error: deleteError
      } = await supabase.from('products').delete().or(brandId ? `brand_id.eq.${brandId}` : `retailer_id.eq.${retailerId}`).contains('attributes', {
        import_source_url: `https://${sourceDomain}`
      });
      if (deleteError) throw deleteError;
      toast({
        title: "Import Reverted",
        description: `All products imported from ${sourceDomain} have been deleted`
      });

      // Refresh the sources list
      await fetchImportSources();
      onProductsDeleted?.();
    } catch (error: any) {
      console.error('Error deleting imported products:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete imported products",
        variant: "destructive"
      });
    } finally {
      setDeletingSource(null);
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return;
};