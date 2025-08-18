import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';

interface ImportResult {
  imported: number;
  rejected_low_quality: number;
  duplicates: number;
  errors: number;
  details: Array<{
    url: string;
    status: 'imported' | 'rejected' | 'duplicate' | 'error';
    reason?: string;
    score?: number;
  }>;
}

export const AsosImportManager: React.FC = () => {
  const [urls, setUrls] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const { isEnabled } = useFeatureFlags();

  const handleImport = async () => {
    if (!urls.trim()) {
      toast({
        title: "Error",
        description: "Please enter at least one ASOS product URL",
        variant: "destructive",
      });
      return;
    }

    if (!isEnabled('axessoImport')) {
      toast({
        title: "Feature Disabled",
        description: "ASOS import is currently disabled. Please contact administrator.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setProgress(0);

    try {
      // Parse URLs from textarea
      const urlList = urls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url && url.includes('asos.com'));

      if (urlList.length === 0) {
        toast({
          title: "Error",
          description: "No valid ASOS URLs found. Please ensure URLs contain 'asos.com'",
          variant: "destructive",
        });
        return;
      }

      // Simulate progress during import
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      // Call the import edge function
      const { data, error } = await supabase.functions.invoke('import-asos', {
        body: { urls: urlList }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        throw error;
      }

      setImportResult(data);
      
      toast({
        title: "Import Completed",
        description: `Successfully imported ${data.imported} products`,
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  };

  const resetForm = () => {
    setUrls('');
    setImportResult(null);
    setProgress(0);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'imported':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'duplicate':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      imported: "default",
      rejected: "destructive", 
      duplicate: "secondary",
      error: "destructive"
    };
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {status}
      </Badge>
    );
  };

  if (!isEnabled('axessoImport')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ASOS Product Import</CardTitle>
          <CardDescription>
            Import external ASOS products into your catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              ASOS import feature is currently disabled. Please contact your administrator to enable this feature.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ASOS Product Import</CardTitle>
          <CardDescription>
            Import external ASOS products into your catalog. Enter one URL per line.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="urls" className="text-sm font-medium">
              ASOS Product URLs
            </label>
            <Textarea
              id="urls"
              placeholder="https://www.asos.com/product/...&#10;https://www.asos.com/product/...&#10;..."
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              disabled={isImporting}
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              Enter ASOS product page URLs, one per line. Quality check (≥60/100) and deduplication will be applied automatically.
            </p>
          </div>

          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Importing products...</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={isImporting || !urls.trim()}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import Products'
              )}
            </Button>
            
            {(importResult || urls) && (
              <Button variant="outline" onClick={resetForm} disabled={isImporting}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>
              Summary of the import operation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{importResult.imported}</div>
                <div className="text-sm text-muted-foreground">Imported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">{importResult.rejected_low_quality}</div>
                <div className="text-sm text-muted-foreground">Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-info">{importResult.duplicates}</div>
                <div className="text-sm text-muted-foreground">Duplicates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{importResult.errors}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>

            {importResult.details.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Detailed Results</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {importResult.details.map((detail, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getStatusIcon(detail.status)}
                        <span className="text-xs font-mono truncate">
                          {detail.url}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {detail.score && (
                          <span className="text-xs text-muted-foreground">
                            {detail.score}/100
                          </span>
                        )}
                        {getStatusBadge(detail.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};