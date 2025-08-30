import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrandPortalHeader } from '@/components/BrandPortalHeader';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from '@/hooks/useCategories';
import { useAnalytics } from '@/hooks/useAnalytics';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { AddProductModal } from '@/components/AddProductModal';
import { EditProductModal } from '@/components/EditProductModal';
import { BrandProductDetailModal } from '@/components/BrandProductDetailModal';
import { LogoUpload } from '@/components/LogoUpload';
import { ImportWizardModal } from '@/components/ImportWizardModal';
import { BulkImportActions } from '@/components/BulkImportActions';
import { CollabDashboard } from '@/components/ugc/CollabDashboard';
import { Plus, Edit, Trash2, Upload, BarChart3, TrendingUp, Eye, Heart, ShoppingBag, DollarSign, Download, Filter, Globe } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { FeedbackModal } from '@/components/FeedbackModal';
import type { Product } from '@/types';
interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  bio: string | null;
  website: string | null;
}
const BrandPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<any[]>([]);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [brandLoading, setBrandLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const {
    categories
  } = useCategories();
  const {
    data: analyticsData,
    isLoading: analyticsLoading
  } = useAnalytics(brand?.id, 'brand');
  const mountedRef = useRef(true);
  const fetchBrandData = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID available');
      setBrandLoading(false);
      return;
    }
    try {
      console.log('Fetching brand for user:', user.id);
      setBrandLoading(true);
      const {
        data,
        error
      } = await supabase.from('brands').select('*').eq('owner_user_id', user.id).maybeSingle();
      console.log('Brand query completed - data:', data, 'error:', error);
      if (error) {
        console.error('Supabase error fetching brand:', error);
        if (mountedRef.current) {
          setBrand(null);
          setBrandLoading(false);
        }
        return;
      }
      if (!data) {
        console.log('No brand found for user');
        if (mountedRef.current) {
          setBrand(null);
          setBrandLoading(false);
        }
        return;
      }
      console.log('Successfully setting brand data:', data);
      if (mountedRef.current) {
        setBrand(data);
        setBrandLoading(false);
      }
    } catch (error) {
      console.error('Exception in fetchBrandData:', error);
      if (mountedRef.current) {
        setBrand(null);
        setBrandLoading(false);
      }
    }
  }, [user?.id]);
  const fetchProducts = useCallback(async () => {
    if (!brand?.id) return;
    try {
      setProductsLoading(true);
      const {
        data,
        error
      } = await supabase.from('products').select(`
          *,
          brand:brands(name)
        `).eq('brand_id', brand.id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      const formatted = (data || []).map((p: any) => ({
        ...p,
        media_urls: Array.isArray(p.media_urls) ? p.media_urls : [],
        ar_mesh_url: p.ar_mesh_url || null,
        currency: p.currency || 'USD',
        sku: p.sku || `SKU-${p.id}`,
        external_url: p.external_url || '',
        description: p.description || ''
      }));
      if (mountedRef.current) {
        setProducts(formatted);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive"
      });
    } finally {
      if (mountedRef.current) {
        setProductsLoading(false);
      }
    }
  }, [brand?.id, toast]);
  useEffect(() => {
    if (user) {
      fetchBrandData();
    }
  }, [user, fetchBrandData]);
  useEffect(() => {
    if (brand?.id) {
      fetchProducts();
      console.log('Brand ID for analytics:', brand.id);
    }
  }, [brand?.id, fetchProducts]);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const handleLogoUpdate = (logoUrl: string | null) => {
    if (brand) {
      setBrand({
        ...brand,
        logo_url: logoUrl
      });
    }
  };
  const formatPrice = (cents: number, currency: string = 'USD'): string => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(cents / 100);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'archived':
        return 'secondary';
      case 'out_of_stock':
        return 'destructive';
      default:
        return 'secondary';
    }
  };
  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    newSelected.has(productId) ? newSelected.delete(productId) : newSelected.add(productId);
    setSelectedProducts(newSelected);
  };
  const handleBulkAction = async (action: string) => {
    try {
      if (action === 'Archive') {
        const {
          error
        } = await supabase.from('products').update({
          status: 'archived'
        }).in('id', Array.from(selectedProducts));
        if (error) throw error;
      } else if (action === 'Delete') {
        // First try to delete related data
        const productIds = Array.from(selectedProducts);

        // Delete related records first
        await supabase.from('likes').delete().in('product_id', productIds);
        await supabase.from('wishlist_items').delete().in('product_id', productIds);
        await supabase.from('cart_items').delete().in('product_id', productIds);

        // Then delete products
        const {
          error
        } = await supabase.from('products').delete().in('id', productIds);
        if (error) throw error;
      }
      toast({
        description: `${action} applied to ${selectedProducts.size} product(s)`
      });
      setSelectedProducts(new Set());
      fetchProducts();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast({
        title: "Error",
        description: `Failed to ${action.toLowerCase()} products`,
        variant: "destructive"
      });
    }
  };
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }
    try {
      // Delete related records first
      await supabase.from('likes').delete().eq('product_id', productId);
      await supabase.from('wishlist_items').delete().eq('product_id', productId);
      await supabase.from('cart_items').delete().eq('product_id', productId);

      // Then delete the product
      const {
        error
      } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      toast({
        description: "Product deleted successfully"
      });
      fetchProducts();
    } catch (error) {
      console.error('Delete product error:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
    }
  };
  const handleViewProduct = (product: any) => {
    console.log('View product clicked:', product);
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };
  const handleEditProduct = (product: any) => {
    console.log('Edit product clicked:', product);
    setSelectedProduct(product);
    setIsEditProductModalOpen(true);
  };
  const handleEditFromDetail = (product: any) => {
    setIsDetailModalOpen(false);
    setSelectedProduct(product);
    setIsEditProductModalOpen(true);
  };
  if (!user) return <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">Please log in to access the brand portal.</p>
      </div>
    </div>;
  if (brandLoading) return <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Loading Brand Portal...</h2>
        <p className="text-muted-foreground">Please wait while we fetch your brand information.</p>
      </div>
    </div>;
  if (!brand) return <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">No Brand Found</h2>
        <p className="text-muted-foreground">Please create a brand profile first.</p>
      </div>
    </div>;
  const analytics = {
    totalProducts: products.length,
    totalViews: analyticsData?.totalViews || 0,
    totalLikes: analyticsData?.totalLikes || 0,
    totalWishlistAdds: analyticsData?.totalWishlistAdds || 0,
    totalRevenue: (analyticsData?.totalViews || 0) * 45.99
  };
  const topProductsData = products.slice(0, 5).map((product, index) => ({
    rank: index + 1,
    name: product.title,
    views: Math.floor(Math.random() * 1000) + 100,
    likes: Math.floor(Math.random() * 200) + 20,
    revenue: `$${(Math.random() * 500 + 100).toFixed(2)}`
  }));
  return <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto max-w-7xl p-3 md:p-6">
        <BrandPortalHeader brand={brand} onAddProduct={() => setIsAddProductModalOpen(true)} onImportFromWebsite={() => setIsImportModalOpen(true)} />

        {/* Feedback Section */}
        <div className="mb-4 md:mb-6 flex justify-end">
          <FeedbackModal userType="brand" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700/50">
            <TabsTrigger value="products" className="rounded-lg text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">Products</TabsTrigger>
            <TabsTrigger value="collabs" className="rounded-lg text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">Collabs</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">Analytics</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-3 md:mt-6">
            <div className="space-y-3 md:space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4">
                <div className="flex flex-wrap items-center gap-1 md:gap-2">
                  <Button variant="outline" size="sm" className="text-xs md:text-sm border-border/50 hover:bg-accent/50 dark:hover:bg-accent/20 h-8 md:h-9">
                    <Filter className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Filter</span>
                  </Button>
                  
                  
                </div>
                {selectedProducts.size > 0 && <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs md:text-sm text-muted-foreground">{selectedProducts.size} selected</span>
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('Archive')} className="border-border/50 hover:bg-accent/50 dark:hover:bg-accent/20 h-8 md:h-9 text-xs md:text-sm">Archive</Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('Delete')} className="border-border/50 hover:bg-destructive/10 dark:hover:bg-destructive/20 hover:text-destructive h-8 md:h-9 text-xs md:text-sm">Delete</Button>
                  </div>}
              </div>

              {productsLoading ? <div className="text-center py-8">Loading products...</div> : products.length === 0 ? <div className="text-center py-8 text-muted-foreground">No products yet. Create your first product!</div> : <div className="grid gap-2 sm:gap-4">
                  {products.map(product => <Card key={product.id} className="overflow-hidden border-border/50 hover:border-border transition-colors">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <input type="checkbox" checked={selectedProducts.has(product.id)} onChange={() => handleSelectProduct(product.id)} className="w-4 h-4" />
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted/70 dark:bg-muted/30 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-border/30" onClick={() => handleViewProduct(product)}>
                            {product.media_urls && product.media_urls[0] ? <img src={product.media_urls[0]} alt={product.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                              <h3 className="font-medium cursor-pointer hover:text-primary transition-colors truncate" onClick={() => handleViewProduct(product)}>
                                {product.title}
                              </h3>
                              <Badge variant={getStatusColor(product.status) as any} className="w-fit text-xs">
                                {product.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {product.category_slug} • {formatPrice(product.price_cents)}
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                              <span>Stock: {product.stock_qty}</span>
                              <span>Created: {new Date(product.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex sm:flex-row flex-col items-center gap-1 sm:gap-2">
                            
                            <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)} className="border-border/50 hover:bg-accent/50 dark:hover:bg-accent/20">
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteProduct(product.id)} className="border-border/50 hover:bg-destructive/10 dark:hover:bg-destructive/20 hover:text-destructive">
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>)}
                </div>}
            </div>
          </TabsContent>

          <TabsContent value="collabs" className="mt-3 md:mt-6">
            <div className="space-y-3 md:space-y-4">
              <div className="bg-muted/50 dark:bg-slate-800/50 rounded-lg p-3 md:p-4 border border-border/50">
                <h3 className="font-medium mb-2 text-sm md:text-base">What are Collaborations?</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Partner with content creators and influencers to showcase your brand. Create collaboration campaigns 
                  with specific requirements, set compensation terms, and define deliverables. Review applications from 
                  creators and manage your brand partnerships efficiently.
                </p>
              </div>
              <CollabDashboard ownerOrgId={brand.id} orgType="brand" />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-3 md:mt-6">
            <AnalyticsDashboard brandId={brand?.id} />
          </TabsContent>

          <TabsContent value="settings" className="mt-3 md:mt-6">
            <div className="space-y-3 md:space-y-6">
              <Card>
                <CardHeader><CardTitle>Brand Profile</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <LogoUpload currentLogoUrl={brand.logo_url} onLogoUpdate={handleLogoUpdate} entityType="brand" entityId={brand.id} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium mb-2 block">Brand Name</label><Input defaultValue={brand.name} /></div>
                    <div><label className="text-sm font-medium mb-2 block">Website</label><Input defaultValue={brand.website || ''} /></div>
                  </div>
                  <div><label className="text-sm font-medium mb-2 block">Description</label><Textarea defaultValue={brand.bio || ''} /></div>
                  <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/80">Save Changes</Button>
                </CardContent>
              </Card>
              <BulkImportActions brandId={brand.id} onProductsDeleted={fetchProducts} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AddProductModal isOpen={isAddProductModalOpen} onClose={() => setIsAddProductModalOpen(false)} onProductAdded={fetchProducts} userType="brand" brandId={brand.id} />

      {selectedProduct && <>
          <BrandProductDetailModal isOpen={isDetailModalOpen} onClose={() => {
        setIsDetailModalOpen(false);
        setSelectedProduct(null);
      }} product={selectedProduct} onEdit={handleEditFromDetail} onProductUpdated={fetchProducts} />

          <EditProductModal isOpen={isEditProductModalOpen} onClose={() => {
        setIsEditProductModalOpen(false);
        setSelectedProduct(null);
      }} onProductUpdated={fetchProducts} product={selectedProduct} />
        </>}

      <ImportWizardModal open={isImportModalOpen} onOpenChange={setIsImportModalOpen} brandId={brand?.id} />
    </div>;
};
export default BrandPortal;