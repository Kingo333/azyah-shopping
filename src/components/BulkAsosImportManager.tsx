import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { features } from '@/lib/features';
import { Package, Play, RotateCcw, TrendingUp, AlertCircle, CheckCircle, XCircle, Copy } from 'lucide-react';

interface BulkImportResult {
  imported: number;
  rejected: number;
  duplicates: number;
  errors: number;
  metrics: {
    searchRequests: number;
    detailRequests: number;
    productsFound: number;
    duration: number;
    successRate: number;
  };
  results: Array<{
    url: string;
    status: 'imported' | 'rejected' | 'duplicate' | 'error';
    score?: number;
    reason?: string;
  }>;
}

const DEFAULT_MARKETS = ['us', 'co.uk', 'de'];
const DEFAULT_KEYWORDS = [
  'women dresses',
  'abayas',
  'sneakers',
  'handbags',
  'modest wear',
  'casual wear',
  'formal wear',
  'accessories'
];

const BulkAsosImportManager: React.FC = () => {
  const [markets, setMarkets] = useState(DEFAULT_MARKETS.join(', '));
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS.join('\n'));
  const [pagesPerKeyword, setPagesPerKeyword] = useState(3);
  const [isImporting, setIsImporting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const { toast } = useToast();

  if (!features.axessoImportBulk) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bulk ASOS Import
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Bulk ASOS import is currently disabled. Please contact your administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  const testApiConnection = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-axesso-api');
      
      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "API Test Successful",
          description: `Found ${data.searchTest?.productsFound || 0} products in test search`,
        });
      } else {
        toast({
          title: "API Test Failed",
          description: data.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "API Test Failed",
        description: error.message || "Failed to test API connection",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleBulkImport = async () => {
    if (!markets.trim() || !keywords.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide both markets and keywords",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setImportResult(null);

    try {
      const marketsList = markets.split(',').map(m => m.trim()).filter(Boolean);
      const keywordsList = keywords.split('\n').map(k => k.trim()).filter(Boolean);

      // Calculate total work for progress tracking
      const totalWork = marketsList.length * keywordsList.length * pagesPerKeyword;
      
      // Limit to reasonable batch sizes to avoid timeouts
      if (totalWork > 50) {
        toast({
          title: "Batch Too Large",
          description: `Reduce your search scope. Current: ${totalWork} searches (max recommended: 50)`,
          variant: "destructive",
        });
        setIsImporting(false);
        return;
      }

      // Show real progress estimation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 85));
      }, 2000);

      const { data, error } = await supabase.functions.invoke('import-asos-bulk', {
        body: {
          markets: marketsList,
          keywords: keywordsList,
          pagesPerKeyword
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        throw error;
      }

      setImportResult(data);
      
      toast({
        title: "Bulk Import Completed",
        description: `Imported ${data.imported} products successfully`,
      });

    } catch (error) {
      console.error('Bulk import error:', error);
      
      let errorMessage = error.message || "An unexpected error occurred";
      
      // Handle specific timeout errors
      if (errorMessage.includes('504') || errorMessage.includes('timeout') || errorMessage.includes('Gateway')) {
        errorMessage = "Import timed out. Try reducing the number of markets, keywords, or pages per keyword.";
      }
      
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setMarkets(DEFAULT_MARKETS.join(', '));
    setKeywords(DEFAULT_KEYWORDS.join('\n'));
    setPagesPerKeyword(3);
    setProgress(0);
    setImportResult(null);
  };

  // Safe number extraction with fallback
  const num = (v: unknown, d = 0) =>
    typeof v === 'number' && isFinite(v) ? v : d;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'imported': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'duplicate': return <Copy className="h-4 w-4 text-yellow-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      imported: 'default',
      rejected: 'destructive',
      duplicate: 'secondary',
      error: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bulk ASOS Import Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="markets">Markets (comma separated)</Label>
              <Input
                id="markets"
                value={markets}
                onChange={(e) => setMarkets(e.target.value)}
                placeholder="us, co.uk, de"
                disabled={isImporting}
              />
              <p className="text-sm text-muted-foreground">
                Supported for search: us, co.uk, de (others filtered out)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pages">Pages per keyword</Label>
              <Select value={pagesPerKeyword.toString()} onValueChange={(value) => setPagesPerKeyword(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 page</SelectItem>
                  <SelectItem value="3">3 pages</SelectItem>
                  <SelectItem value="5">5 pages</SelectItem>
                  <SelectItem value="10">10 pages</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (one per line)</Label>
            <Textarea
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="women dresses&#10;abayas&#10;sneakers&#10;handbags"
              rows={6}
              disabled={isImporting}
            />
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={testApiConnection} 
              disabled={isImporting || isTesting}
              variant="outline"
              className="flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              {isTesting ? 'Testing...' : 'Test API'}
            </Button>
            
            <Button 
              onClick={handleBulkImport} 
              disabled={isImporting || isTesting}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isImporting ? 'Importing...' : 'Start Bulk Import'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={resetForm}
              disabled={isImporting || isTesting}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          {(isImporting || isTesting) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{isTesting ? 'Testing API' : 'Import Progress'}</span>
                <span>{isTesting ? 'Running...' : `${Math.round(progress)}%`}</span>
              </div>
              {!isTesting && <Progress value={progress} className="h-2" />}
              <p className="text-sm text-muted-foreground">
                {isTesting 
                  ? 'Verifying Axesso API connectivity...' 
                  : 'Searching markets and processing products... This may take a few minutes.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                <div className="text-sm text-muted-foreground">Imported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{importResult.rejected}</div>
                <div className="text-sm text-muted-foreground">Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{importResult.duplicates}</div>
                <div className="text-sm text-muted-foreground">Duplicates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{importResult.errors}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Search Requests:</span> {num(importResult.metrics?.searchRequests)}
              </div>
              <div>
                <span className="font-medium">Detail Requests:</span> {num(importResult.metrics?.detailRequests)}
              </div>
              <div>
                <span className="font-medium">Products Found:</span> {num(importResult.metrics?.productsFound)}
              </div>
              <div>
                <span className="font-medium">Duration:</span> {Math.round(num(importResult.metrics?.duration) / 1000)}s
              </div>
              <div>
                <span className="font-medium">Success Rate:</span> {num(importResult.metrics?.successRate).toFixed(1)}%
              </div>
            </div>

            {importResult.results.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">Detailed Results</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {importResult.results.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getStatusIcon(result.status)}
                          <span className="text-sm truncate">
                            {result.url || (result as any).sku || (result as any).title || 'Unknown'}
                          </span>
                          {result.reason && (
                            <span className="text-xs text-muted-foreground">
                              - {result.reason}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {(result.score != null || (result as any).qualityScore != null) && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Score: {num(result.score ?? (result as any).qualityScore).toFixed(2)}
                            </span>
                          )}
                          {getStatusBadge(result.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {num(importResult.metrics?.productsFound) === 0 && (
              <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  No products found. Check that markets are supported (us, co.uk, de) and keywords are broad enough.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkAsosImportManager;