import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Globe, Package, CheckCircle, AlertCircle } from 'lucide-react';

interface ImportWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId?: string;
  retailerId?: string;
}

interface DiscoveredProduct {
  external_url: string;
  title?: string;
  price_cents?: number;
  currency?: string;
  images?: string[];
  suggested_category?: string;
  suggested_subcategory?: string;
}

export const ImportWizardModal = ({ open, onOpenChange, brandId, retailerId }: ImportWizardModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [discoveredUrls, setDiscoveredUrls] = useState<string[]>([]);
  const [extractedProducts, setExtractedProducts] = useState<DiscoveredProduct[]>([]);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);

  const resetWizard = () => {
    setStep(1);
    setWebsiteUrl('');
    setWebsiteName('');
    setDiscoveredUrls([]);
    setExtractedProducts([]);
    setProgress(0);
    setJobId(null);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) {
      resetWizard();
    }
  }, [open]);

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  const handleDiscoverProducts = async () => {
    if (!validateUrl(websiteUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid website URL starting with http:// or https://",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setProgress(10);

    try {
      // Create import source
      const domain = new URL(websiteUrl).hostname;
      const { data: source, error: sourceError } = await supabase
        .from('import_sources')
        .insert({
          user_id: user?.id,
          domain,
          name: websiteName || domain,
          status: 'active',
        })
        .select()
        .single();

      if (sourceError) throw sourceError;

      setProgress(30);

      // Call discovery function
      const { data: discoveryResult, error: discoveryError } = await supabase.functions.invoke('website-discovery', {
        body: { url: websiteUrl, maxUrls: 20 }
      });

      if (discoveryError) throw discoveryError;

      if (!discoveryResult.success) {
        throw new Error(discoveryResult.error || 'Discovery failed');
      }

      setProgress(60);

      if (discoveryResult.productUrls.length === 0) {
        toast({
          title: "No Products Found",
          description: "Could not find any product pages on this website. Try a different URL or collection page.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setDiscoveredUrls(discoveryResult.productUrls);
      setProgress(100);
      setStep(2);

      // Start background processing
      const { data: processResult } = await supabase.functions.invoke('process-import', {
        body: {
          domain,
          userId: user?.id,
          sourceId: source.id,
          productUrls: discoveryResult.productUrls
        }
      });

      if (processResult?.success) {
        setJobId(processResult.jobId);
        pollJobProgress(processResult.jobId);
      }

    } catch (error: any) {
      console.error('Discovery error:', error);
      toast({
        title: "Discovery Failed",
        description: error.message || "Failed to discover products from the website",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pollJobProgress = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const { data: job } = await supabase
          .from('import_jobs')
          .select('*, import_products_staging(*)')
          .eq('id', jobId)
          .single();

        if (job) {
          const extractedCount = job.import_products_staging?.length || 0;
          const progressPercent = Math.min((extractedCount / discoveredUrls.length) * 100, 100);
          setProgress(progressPercent);

          if (job.status === 'completed') {
            clearInterval(interval);
            const mappedProducts = (job.import_products_staging || []).map((p: any) => ({
              external_url: p.external_url,
              title: p.title,
              price_cents: p.price_cents,
              currency: p.currency,
              images: p.images,
              suggested_category: p.suggested_category,
              suggested_subcategory: p.suggested_subcategory,
            }));
            setExtractedProducts(mappedProducts);
            setStep(3);
            toast({
              title: "Import Complete",
              description: `Successfully extracted ${extractedCount} products`,
            });
          } else if (job.status === 'failed') {
            clearInterval(interval);
            toast({
              title: "Import Failed",
              description: job.error_log || "Import process failed",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);

    // Clean up after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  const handleApproveProducts = async () => {
    if (!jobId) return;

    setLoading(true);
    let successCount = 0;

    try {
      for (const product of extractedProducts) {
        try {
          // Create actual product
          const productData: any = {
            title: product.title,
            description: product.title, // Use title as description fallback
            price_cents: product.price_cents || 0,
            currency: product.currency || 'USD',
            category_slug: product.suggested_category || 'clothing',
            media_urls: product.images || [],
            external_url: product.external_url,
            status: 'active',
            sku: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            attributes: {
              imported: true,
              import_date: new Date().toISOString(),
            }
          };

          if (brandId) productData.brand_id = brandId;
          if (retailerId) productData.retailer_id = retailerId;
          if (product.suggested_subcategory) productData.subcategory_slug = product.suggested_subcategory;

          const { error: productError } = await supabase
            .from('products')
            .insert(productData);

          if (!productError) {
            successCount++;
            
            // Mark as imported in staging
            await supabase
              .from('import_products_staging')
              .update({ status: 'imported' })
              .eq('external_url', product.external_url);
          }
        } catch (error) {
          console.error('Error importing product:', product.external_url, error);
        }
      }

      toast({
        title: "Products Imported",
        description: `Successfully imported ${successCount} out of ${extractedProducts.length} products`,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number | undefined, currency: string = 'USD') => {
    if (!cents) return 'Price not found';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Import Products from Website
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Step 1: Enter Website URL */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    placeholder="https://example.com or https://example.com/collections/dresses"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter your website homepage or a collection/category page
                  </p>
                </div>
                <div>
                  <Label htmlFor="websiteName">Store Name (Optional)</Label>
                  <Input
                    id="websiteName"
                    placeholder="My Fashion Store"
                    value={websiteName}
                    onChange={(e) => setWebsiteName(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  How it works:
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• We'll scan your website for product pages</li>
                  <li>• Extract product information (title, price, images)</li>
                  <li>• Let you review and approve before importing</li>
                  <li>• Products will appear in your Azyah swipe feed</li>
                </ul>
              </div>

              <Button 
                onClick={handleDiscoverProducts} 
                disabled={loading || !websiteUrl}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Discovering Products...
                  </>
                ) : (
                  'Discover Products'
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Processing */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-medium">Processing Products</h3>
                <p className="text-muted-foreground">
                  Found {discoveredUrls.length} product pages. Extracting product information...
                </p>
              </div>
              
              <Progress value={progress} className="w-full" />
              
              <div className="text-center text-sm text-muted-foreground">
                {progress < 100 ? 'This may take a few minutes...' : 'Almost done!'}
              </div>
            </div>
          )}

          {/* Step 3: Review Products */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium">Review Extracted Products</h3>
                <p className="text-muted-foreground">
                  {extractedProducts.length} products extracted. Review and approve to import.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {extractedProducts.map((product, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {product.images?.[0] && (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{product.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatPrice(product.price_cents, product.currency)}
                          </p>
                          <div className="flex gap-1 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {product.suggested_category}
                            </Badge>
                            {product.suggested_subcategory && (
                              <Badge variant="outline" className="text-xs">
                                {product.suggested_subcategory}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Start Over
                </Button>
                <Button 
                  onClick={handleApproveProducts}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    `Import ${extractedProducts.length} Products`
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};