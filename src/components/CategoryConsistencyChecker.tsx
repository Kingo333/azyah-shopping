
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { getTopCategories } from '@/lib/taxonomy';

const CategoryConsistencyChecker: React.FC = () => {
  const { data: dbCategories, isLoading } = useQuery({
    queryKey: ['db-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category_slug')
        .eq('status', 'active');

      if (error) throw error;
      
      const categories = [...new Set(data.map(p => p.category_slug).filter(Boolean))];
      return categories.sort();
    }
  });

  const staticCategories = getTopCategories().map(c => c.id).sort();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Consistency Check</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const dbCategoriesSet = new Set(dbCategories || []);
  const staticCategoriesSet = new Set(staticCategories);

  const missingFromStatic = (dbCategories || []).filter(cat => !staticCategoriesSet.has(cat));
  const missingFromDb = staticCategories.filter(cat => !dbCategoriesSet.has(cat));

  const hasIssues = missingFromStatic.length > 0 || missingFromDb.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasIssues ? (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          Category Consistency Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasIssues ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All categories are consistent between database and taxonomy definition.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {missingFromStatic.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Categories in database but not in taxonomy:</strong>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {missingFromStatic.map(cat => (
                      <Badge key={cat} variant="destructive">{cat}</Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {missingFromDb.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Categories in taxonomy but not used in database:</strong>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {missingFromDb.map(cat => (
                      <Badge key={cat} variant="secondary">{cat}</Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-2">All Taxonomy Categories:</h4>
          <div className="flex flex-wrap gap-1">
            {staticCategories.map(cat => (
              <Badge 
                key={cat} 
                variant={dbCategoriesSet.has(cat) ? "default" : "outline"}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryConsistencyChecker;
