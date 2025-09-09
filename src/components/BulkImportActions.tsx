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

export const BulkImportActions = ({ brandId, retailerId, onProductsDeleted }: BulkImportActionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [importSources, setImportSources] = useState<ImportSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingSource, setDeletingSource] = useState<string | null>(null);

  const fetchImportSources = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get import sources for this brand/retailer
      const { data: sources, error: sourcesError } = await supabase
        .from('import_sources')
        .select('id, domain, name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (sourcesError) throw sourcesError;

      // For each source, count how many products were imported
      const sourcesWithCounts = await Promise.all(
        (sources || []).map(async (source) => {
          const { count, error: countError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .or(brandId ? `brand_id.eq.${brandId}` : `retailer_id.eq.${retailerId}`)
            .contains('attributes', { import_source_url: `https://${source.domain}` });

          if (countError) {
            console.error('Error counting products:', countError);
            return { ...source, product_count: 0 };
          }

          return { ...source, product_count: count || 0 };
        })
      );

      // Filter out sources with no imported products
      setImportSources(sourcesWithCounts.filter(source => source.product_count > 0));
    } catch (error: any) {
      console.error('Error fetching import sources:', error);
      toast({
        title: "Error",
        description: "Failed to load import history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImport = async (sourceId: string, sourceDomain: string) => {
    setDeletingSource(sourceId);
    try {
      // Delete all products imported from this source
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .or(brandId ? `brand_id.eq.${brandId}` : `retailer_id.eq.${retailerId}`)
        .contains('attributes', { import_source_url: `https://${sourceDomain}` });

      if (deleteError) throw deleteError;

      toast({
        title: "Import Reverted",
        description: `All products imported from ${sourceDomain} have been deleted`,
      });

      // Refresh the sources list
      await fetchImportSources();
      onProductsDeleted?.();
    } catch (error: any) {
      console.error('Error deleting imported products:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete imported products",
        variant: "destructive",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Import History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Manage products imported from websites
          </p>
          <Button onClick={fetchImportSources} disabled={loading} variant="outline" size="sm">
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {importSources.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No imported products found</p>
            <p className="text-xs">Products imported from websites will appear here</p>
          </div>
        )}

        <div className="space-y-3">
          {importSources.map((source) => (
            <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{source.name}</span>
                  <Badge variant="secondary">
                    {source.product_count} product{source.product_count !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Imported {formatDate(source.created_at)}</span>
                  <span>•</span>
                  <span>{source.domain}</span>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={deletingSource === source.id}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {deletingSource === source.id ? 'Deleting...' : 'Revert Import'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revert Import from {source.domain}</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {source.product_count} products imported from {source.domain}. 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteImport(source.id, source.domain)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete {source.product_count} Products
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};