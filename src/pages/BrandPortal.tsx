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
import { BrandSettingsForm } from '@/components/BrandSettingsForm';
import { Plus, Edit, Trash2, Upload, BarChart3, TrendingUp, Eye, Heart, ShoppingBag, DollarSign, Download, Filter, Globe, Package, Archive, Store } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { FeedbackModal } from '@/components/FeedbackModal';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Product } from '@/types';
interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  bio: string | null;
  website: string | null;
  contact_email: string | null;
  socials: any;
  shipping_regions: string[];
}
const BrandPortal: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'products');
  
  // Sync activeTab when URL changes (e.g., from ProfileCompletionBanner navigation)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<any[]>([]);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [brandLoading, setBrandLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);
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
  const navigate = useNavigate();
  const {
    categories
  } = useCategories();
  const {
    data: analyticsData,
    isLoading: analyticsLoading
  } = useAnalytics(brand?.id, 'brand');
  const mountedRef = useRef(true);
  const generateUniqueSlug = async (baseName: string): Promise<string> => {
    const baseSlug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const {
        data
      } = await supabase.from('brands').select('id').eq('slug', slug).maybeSingle();
      if (!data) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    return slug;
  };
  const createBrandForUser = async (): Promise<Brand | null> => {
    if (!user) return null;
    try {
      const brandName = user.user_metadata?.name || user.email?.split('@')[0] || 'My Brand';
      const slug = await generateUniqueSlug(brandName);
      const {
        data,
        error
      } = await supabase.from('brands').insert({
        name: brandName,
        slug: slug,
        owner_user_id: user.id,
        contact_email: user.email,
        bio: null,
        website: null,
        logo_url: null,
        socials: {},
        shipping_regions: []
      }).select().single();
      if (error) {
        console.error('Error creating brand:', error);
        throw error;
      }
      console.log('Successfully created brand:', data);
      return data;
    } catch (error) {
      console.error('Exception creating brand:', error);
      return null;
    }
  };
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
        console.log('No brand found for user, creating new brand...');

        // Check if user has brand role before auto-creating
        const userRole = user.user_metadata?.role;
        if (userRole === 'brand' || userRole === 'admin') {
          const newBrand = await createBrandForUser();
          if (newBrand && mountedRef.current) {
            setBrand(newBrand);
            toast({
              title: "Welcome to Azyah!",
              description: "Your brand portal has been created. Complete your profile in Settings to get started."
            });
          }
        }
        if (mountedRef.current) {
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
  }, [user?.id, user?.user_metadata?.name, user?.email, user?.user_metadata?.role, toast, retryCount]);
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

  // Check user role - only brand users and admins can access brand portal
  const userRole = user.user_metadata?.role;
  if (userRole && userRole !== 'brand' && userRole !== 'admin') {
    return <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">Only brand users can access the brand portal.</p>
        <Button onClick={() => navigate('/')} variant="outline">
          Go to Dashboard
        </Button>
      </div>
    </div>;
  }
  if (brandLoading) return <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Loading Brand Portal...</h2>
        <p className="text-muted-foreground">Please wait while we fetch your brand information.</p>
      </div>
    </div>;
  if (!brand) return <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold mb-2">Setting up your Brand Portal...</h2>
        <p className="text-muted-foreground">Please wait while we create your brand profile.</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh Page
        </Button>
      </div>
    </div>;
  const analytics = {
    totalProducts: products.length,
    totalSwipeAppearances: analyticsData?.totalSwipeAppearances || 0,
    totalLikes: analyticsData?.totalLikes || 0,
    totalWishlistAdds: analyticsData?.totalWishlistAdds || 0,
    engagementRate: analyticsData?.engagementRate || 0
  };
  const topProductsData = products.slice(0, 5).map((product, index) => ({
    rank: index + 1,
    name: product.title,
    views: Math.floor(Math.random() * 1000) + 100,
    likes: Math.floor(Math.random() * 200) + 20,
    revenue: `$${(Math.random() * 500 + 100).toFixed(2)}`
  }));
  return <div className="min-h-screen bg-background dark:bg-slate-950">
      <div className="container max-w-7xl mx-auto p-3 md:p-6">
        {/* Header */}
        <BrandPortalHeader brand={brand} />

        {/* Feedback Section */}
        <div className="mb-4 md:mb-8 flex justify-end">
          <FeedbackModal userType="brand" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Total Products</CardTitle>
              <Package className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{analytics.totalProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Swipe Appearances</CardTitle>
              <BarChart3 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{analytics.totalSwipeAppearances}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Total Likes</CardTitle>
              <Heart className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{analytics.totalLikes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Active Products</CardTitle>
              <ShoppingBag className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">
                {products.filter(p => p.status === 'active').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Completion Banner */}
        <ProfileCompletionBanner />
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">
          <TabsList className="bg-muted/50 dark:bg-slate-800/50 grid w-full grid-cols-4 md:flex md:w-auto">
            <TabsTrigger value="products" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 text-xs md:text-sm">Products</TabsTrigger>
            <TabsTrigger value="collabs" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 text-xs md:text-sm">Collabs</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 text-xs md:text-sm">Analytics</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 text-xs md:text-sm">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <CardTitle>Product Catalog</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedProducts.size > 0 && (
                      <>
                        <span className="text-sm text-muted-foreground">
                          {selectedProducts.size} selected
                        </span>
                        <Button variant="outline" size="sm" onClick={() => handleBulkAction('Archive')} className="text-orange-600 border-orange-200 hover:bg-orange-50">
                          <Archive className="h-4 w-4 mr-1" />
                          Archive
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleBulkAction('Delete')} className="text-red-600 border-red-200 hover:bg-red-50">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </>
                    )}
                    <Button 
                      onClick={() => {
                        if (products.length >= 10) {
                          toast({
                            title: "Product Limit Reached",
                            description: "You've reached the 10 product limit. Use the Feedback & Support button to request more.",
                            variant: "destructive"
                          });
                          return;
                        }
                        setIsAddProductModalOpen(true);
                      }} 
                      className="gap-2 bg-primary hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4" />
                      Add Product
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {productsLoading ? <div className="text-center py-8">Loading products...</div> : products.length > 0 ? <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                    {products.map(product => <Card key={product.id} className="overflow-hidden border-border/50 hover:border-border transition-colors">
                         <div className="aspect-square relative">
                           <input type="checkbox" checked={selectedProducts.has(product.id)} onChange={() => handleSelectProduct(product.id)} className="absolute top-2 left-2 z-10 rounded border-gray-300" />
                           <img src={product.media_urls?.[0] || '/placeholder.svg'} alt={product.title} className="w-full h-full object-cover cursor-pointer" onClick={() => handleViewProduct(product)} />
                           {product.status === 'archived' && <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                               <Badge variant="secondary" className="text-white bg-destructive/90 border-destructive px-1 md:px-4 py-1 md:py-2 text-xs md:text-sm font-semibold">
                                 ARCHIVED
                               </Badge>
                             </div>}
                         </div>
                         <CardContent className="p-2 md:p-4">
                           <h3 className="font-medium text-xs md:text-sm mb-1 md:mb-2 line-clamp-2 leading-tight cursor-pointer hover:text-primary transition-colors" onClick={() => handleViewProduct(product)}>
                             {product.title}
                           </h3>
                           <div className="flex items-center justify-between mb-1 md:mb-2">
                             <span className="text-xs md:text-sm font-semibold text-primary">
                               {formatPrice(product.price_cents)}
                             </span>
                             <Badge variant={getStatusColor(product.status) as any} className="text-xs px-1 md:px-2 py-0.5">
                               {product.status.replace('_', ' ')}
                             </Badge>
                           </div>
                           <div className="flex justify-between gap-1">
                             
                             <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)} className="h-6 md:h-8 px-1 md:px-2 hover:bg-accent/50">
                               <Edit className="h-3 w-3 md:h-4 md:w-4" />
                             </Button>
                             <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product.id)} className="h-6 md:h-8 px-1 md:px-2 hover:bg-destructive/10 text-destructive">
                               <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                             </Button>
                           </div>
                         </CardContent>
                       </Card>)}
                  </div> : <div className="text-center py-12">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No products yet</h3>
                    <p className="text-muted-foreground mb-6">Start building your brand catalog by adding your first product.</p>
                    <Button onClick={() => {
                  if (products.length >= 10) {
                    toast({
                      title: "Product Limit Reached",
                      description: "You've reached the 10 product limit. Use the Feedback & Support button to request more.",
                      variant: "destructive"
                    });
                    return;
                  }
                  setIsAddProductModalOpen(true);
                }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Product
                    </Button>
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collabs">
            <CollabDashboard ownerOrgId={brand.id} orgType="brand" />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard brandId={brand?.id} />
          </TabsContent>

          <TabsContent value="settings">
            <BrandSettingsForm brand={brand} onBrandUpdate={setBrand} />
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