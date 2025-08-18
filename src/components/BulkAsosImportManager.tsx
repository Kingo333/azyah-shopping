
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

const DEFAULT_MARKETS = ['us', 'gb', 'ae', 'sa'];
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

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 10, 90));
      }, 1000);

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
        description: `Imported ${data.imported || 0} products successfully`,
      });

    } catch (error) {
      console.error('Bulk import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "An unexpected error occurred",
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
                placeholder="us, gb, ae, sa"
                disabled={isImporting}
              />
              <p className="text-sm text-muted-foreground">
                Available: us, gb, de, fr, ae, sa, au, ca
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
              onClick={handleBulkImport} 
              disabled={isImporting}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isImporting ? 'Importing...' : 'Start Bulk Import'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={resetForm}
              disabled={isImporting}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Import Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Searching markets and processing products...
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
                <div className="text-2xl font-bold text-green-600">{importResult.imported || 0}</div>
                <div className="text-sm text-muted-foreground">Imported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{importResult.rejected || 0}</div>
                <div className="text-sm text-muted-foreground">Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{importResult.duplicates || 0}</div>
                <div className="text-sm text-muted-foreground">Duplicates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{importResult.errors || 0}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Search Requests:</span> {importResult.metrics?.searchRequests || 0}
              </div>
              <div>
                <span className="font-medium">Detail Requests:</span> {importResult.metrics?.detailRequests || 0}
              </div>
              <div>
                <span className="font-medium">Products Found:</span> {importResult.metrics?.productsFound || 0}
              </div>
              <div>
                <span className="font-medium">Duration:</span> {Math.round((importResult.metrics?.duration || 0) / 1000)}s
              </div>
              <div>
                <span className="font-medium">Success Rate:</span> {(importResult.metrics?.successRate || 0).toFixed(1)}%
              </div>
            </div>

            {importResult.results && importResult.results.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">Detailed Results</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {importResult.results.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getStatusIcon(result.status)}
                          <span className="text-sm truncate">{result.url}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.score && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Score: {result.score}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkAsosImportManager;
