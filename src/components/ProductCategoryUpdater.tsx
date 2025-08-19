import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UpdateResult {
  totalProcessed: number;
  totalUpdated: number;
  success: boolean;
  message: string;
  results?: Array<{
    id: string;
    title: string;
    success: boolean;
    oldCategory?: string;
    newCategory?: string;
    newSubcategory?: string;
    message?: string;
    error?: string;
  }>;
}

const ProductCategoryUpdater: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const { toast } = useToast();

  const handleUpdateCategories = async () => {
    setIsUpdating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('update-product-categories', {
        body: {}
      });

      if (error) {
        throw error;
      }

      setResult(data);
      toast({
        title: "Categories Updated",
        description: `Successfully updated ${data.totalUpdated} out of ${data.totalProcessed} products`,
      });
    } catch (error: any) {
      console.error('Error updating categories:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update product categories",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Update Product Categories
        </CardTitle>
        <CardDescription>
          Update existing products to use the new Men/Women category system. This will analyze product titles and descriptions to properly categorize items.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleUpdateCategories}
          disabled={isUpdating}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating Categories...
            </>
          ) : (
            'Update Product Categories'
          )}
        </Button>

        {result && (
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{result.message}</p>
                <p>
                  Processed: {result.totalProcessed} products, Updated: {result.totalUpdated} products
                </p>
                {result.results && result.results.length > 0 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer font-medium">View Details</summary>
                    <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                      {result.results.slice(0, 10).map((item) => (
                        <div key={item.id} className="text-sm p-2 bg-muted rounded">
                          <p className="font-medium truncate">{item.title}</p>
                          {item.success ? (
                            item.newCategory ? (
                              <p className="text-green-600">
                                {item.oldCategory} → {item.newCategory}
                                {item.newSubcategory && ` (${item.newSubcategory})`}
                              </p>
                            ) : (
                              <p className="text-blue-600">{item.message}</p>
                            )
                          ) : (
                            <p className="text-red-600">Error: {item.error}</p>
                          )}
                        </div>
                      ))}
                      {result.results.length > 10 && (
                        <p className="text-sm text-muted-foreground">
                          ... and {result.results.length - 10} more items
                        </p>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductCategoryUpdater;