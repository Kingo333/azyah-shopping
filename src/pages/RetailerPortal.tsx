
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

import { 
  Package,
  Store,
  BarChart3,
  Plus,
  Settings,
  Users,
  ShoppingBag,
  LogOut,
  Trash2,
  Edit,
  Upload
} from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { AddProductModal } from '@/components/AddProductModal';
import { EditProductModal } from '@/components/EditProductModal';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import RetailerBrandsList from '@/components/RetailerBrandsList';
import { BulkImportActions } from '@/components/BulkImportActions';
import { RetailerPortalHeader } from '@/components/RetailerPortalHeader';
import { RetailerSettingsForm } from '@/components/RetailerSettingsForm';
import { CollabDashboard } from '@/components/ugc/CollabDashboard';
import { AsosImportManager } from '@/components/AsosImportManager';
import BulkAsosImportManager from '@/components/BulkAsosImportManager';
import { RetailerEvents } from '@/components/RetailerEvents';
import { useRetailerBrands } from '@/hooks/useRetailerBrands';
import { Product } from '@/types';
import { convertJsonToProductAttributes } from '@/lib/type-utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { FeedbackModal } from '@/components/FeedbackModal';
import { ProfileCompletionBanner } from '@/components/ProfileCompletionBanner';

const RetailerPortal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'products');
  const [retailer, setRetailer] = useState<any>(null);
  
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
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);

  const { data: brands, isLoading: brandsLoading } = useRetailerBrands(retailer?.id || '');

  useEffect(() => {
    if (user) {
      fetchRetailer();
    }
  }, [user, retryCount]);

  useEffect(() => {
    if (retailer) {
      fetchProducts();
    }
  }, [retailer]);

  const fetchRetailer = async () => {
    try {
      const { data, error } = await supabase
        .from('retailers')
        .select('*')
        .eq('owner_user_id', user?.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data && user) {
        // Auto-create retailer record for new retailer users
        let defaultName = user.user_metadata?.name || user.email?.split('@')[0] || 'My Store';
        
        // Check if display name is unique, if not, add a unique suffix
        const checkNameUnique = async (name: string): Promise<boolean> => {
          const { data } = await supabase
            .from('retailers')
            .select('id')
            .ilike('name', name.trim())
            .maybeSingle();
          return !data;
        };
        
        let isUnique = await checkNameUnique(defaultName);
        if (!isUnique) {
          // Add timestamp suffix to make it unique
          defaultName = `${defaultName}-${Date.now().toString(36)}`;
        }
        
        const baseSlug = defaultName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        let slug = baseSlug;
        
        // Ensure unique slug
        const { data: existingSlugs } = await supabase
          .from('retailers')
          .select('slug')
          .like('slug', `${baseSlug}%`);
        
        if (existingSlugs && existingSlugs.length > 0) {
          slug = `${baseSlug}-${Date.now()}`;
        }

        const { data: newRetailer, error: createError } = await supabase
          .from('retailers')
          .insert({
            owner_user_id: user.id,
            name: defaultName,
            slug: slug,
            contact_email: user.email,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating retailer:', createError);
          toast({
            title: "Setup Error",
            description: "Failed to create your retailer portal. Please try again.",
            variant: "destructive",
          });
          return;
        }

        setRetailer(newRetailer);
        toast({
          title: "Welcome!",
          description: "Your retailer portal has been set up successfully.",
        });
      } else {
        setRetailer(data);
      }
    } catch (error: any) {
      console.error('Error fetching retailer:', error);
      toast({
        title: "Error",
        description: "Failed to load your retailer portal.",
        variant: "destructive",
      });
      setLoading(false);
      setSetupError(error.message || 'Failed to load retailer portal');
    }
  };

  const fetchProducts = async () => {
    if (!retailer) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          price_cents,
          currency,
          media_urls,
          external_url,
          brand_id,
          retailer_id,
          sku,
          category_slug,
          subcategory_slug,
          status,
          stock_qty,
          min_stock_alert,
          created_at,
          updated_at,
          description,
          compare_at_price_cents,
          weight_grams,
          dimensions,
          tags,
          seo_title,
          seo_description,
          attributes,
          ar_mesh_url,
          brand:brands(
            id,
            name,
            logo_url
          )
        `)
        .eq('retailer_id', retailer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedProducts: Product[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        price_cents: item.price_cents,
        compare_at_price_cents: item.compare_at_price_cents,
        currency: item.currency || 'USD',
        media_urls: Array.isArray(item.media_urls) 
          ? item.media_urls as string[] 
          : typeof item.media_urls === 'string' 
            ? JSON.parse(item.media_urls) 
            : [],
        external_url: item.external_url,
        brand_id: item.brand_id || '',
        retailer_id: item.retailer_id,
        sku: item.sku,
        category_slug: item.category_slug,
        subcategory_slug: item.subcategory_slug,
        status: item.status,
        stock_qty: item.stock_qty || 0,
        min_stock_alert: item.min_stock_alert || 0,
        created_at: item.created_at,
        updated_at: item.updated_at,
        weight_grams: item.weight_grams,
        dimensions: item.dimensions && typeof item.dimensions === 'object' && item.dimensions !== null 
          ? item.dimensions as Record<string, number> 
          : undefined,
        tags: item.tags,
        seo_title: item.seo_title,
        seo_description: item.seo_description,
        ar_mesh_url: item.ar_mesh_url,
        brand: item.brand ? {
          id: item.brand.id,
          name: item.brand.name,
          slug: '',
          logo_url: item.brand.logo_url,
          bio: '',
          socials: {},
          website: '',
          contact_email: '',
          shipping_regions: [],
          owner_user_id: '',
          created_at: '',
          updated_at: ''
        } : undefined,
        attributes: convertJsonToProductAttributes(item.attributes)
      }));

      setProducts(transformedProducts);
    } catch (error: any) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    setIsAddModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
  };

  const handleDeleteProduct = async (product: Product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.title}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      // Use soft delete by setting status to 'archived' instead of hard delete
      const { error } = await supabase
        .from('products')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully!"
      });
      
      fetchProducts(); // Refresh the product list
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive"
      });
    }
  };

  const handleCloseEditModal = () => {
    setEditingProduct(null);
  };

  const handleProductUpdate = () => {
    fetchProducts();
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        description: "Successfully signed out"
      });
      navigate('/');
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Check user role - only retailer users and admins can access retailer portal
  const userRole = user?.user_metadata?.role;
  if (user && userRole && userRole !== 'retailer' && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only retailer users can access the retailer portal.</p>
          <Button 
            onClick={() => navigate('/')} 
            variant="outline"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Please log in to access the retailer portal.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Setting up your Retailer Portal...</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">
                {retryCount === 0 ? 'Initializing your retailer portal...' :
                 retryCount <= 2 ? `Retrying setup (${retryCount}/3)...` :
                 'Finalizing setup...'}
              </p>
            </div>
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                This may take a moment for new accounts.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (setupError && !retailer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-semibold">Setup Error</h2>
          <p className="text-muted-foreground">
            We're having trouble setting up your retailer portal.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => {
                setRetryCount(0);
                setSetupError(null);
                fetchRetailer();
              }} 
              className="w-full"
            >
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Refresh Page
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950">
      <div className="container max-w-7xl mx-auto p-3 md:p-6">
        {/* Header */}
        <RetailerPortalHeader retailer={retailer} />

        {/* Feedback Section */}
        <div className="mb-4 md:mb-8 flex justify-end">
          <FeedbackModal userType="retailer" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Total Products</CardTitle>
              <Package className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Brands</CardTitle>
              <Store className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">{brands?.length || 0}</div>
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Low Stock</CardTitle>
              <Package className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">
                {products.filter(p => (p.stock_qty || 0) <= 5).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Completion Banner */}
        <ProfileCompletionBanner />
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">
          <TabsList className="bg-muted/50 dark:bg-slate-800/50 grid w-full grid-cols-6 md:flex md:w-auto">
            <TabsTrigger value="products" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 text-xs md:text-sm">Products</TabsTrigger>
            <TabsTrigger value="collabs" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 text-xs md:text-sm">Collabs</TabsTrigger>
            <TabsTrigger value="brands" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 text-xs md:text-sm">Brands</TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 text-xs md:text-sm">Events</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 text-xs md:text-sm">Analytics</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-background dark:data-[state=active]:bg-slate-700 text-xs md:text-sm">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Product Catalog</CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => setIsAddModalOpen(true)} 
                    className="gap-2 bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                    Add Product
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setIsBulkAddModalOpen(true)} 
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Add Multiple
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading products...</div>
                ) : products.length > 0 ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                    {products.map((product) => (
                       <Card key={product.id} className="overflow-hidden border-border/50 hover:border-border transition-colors">
                         <div className="aspect-square relative">
                           <img
                             src={product.media_urls?.[0] || '/placeholder.svg'}
                             alt={product.title}
                             className="w-full h-full object-cover"
                           />
                           {product.status === 'archived' && (
                             <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                               <Badge 
                                 variant="secondary"
                                 className="text-white bg-destructive/90 border-destructive px-1 md:px-4 py-1 md:py-2 text-xs md:text-sm font-semibold"
                               >
                                 ARCHIVED
                               </Badge>
                             </div>
                           )}
                           {product.status !== 'archived' && (
                             <Badge 
                               variant={product.status === 'active' ? 'default' : 'secondary'}
                               className="absolute top-1 right-1 md:top-2 md:right-2 text-xs"
                             >
                               {product.status}
                             </Badge>
                           )}
                         </div>
                        <CardContent className="p-2 md:p-4">
                          <div className="space-y-1 md:space-y-2">
                            <h3 className="font-semibold line-clamp-2 text-xs md:text-sm">{product.title}</h3>
                            {product.brand && (
                              <div className="flex items-center gap-1 md:gap-2">
                                {product.brand.logo_url && (
                                  <img 
                                    src={product.brand.logo_url} 
                                    alt={product.brand.name}
                                    className="w-3 h-3 md:w-4 md:h-4 rounded"
                                  />
                                )}
                                <span className="text-xs md:text-sm text-muted-foreground truncate">
                                  {product.brand.name}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs md:text-sm">
                              <span className="font-bold">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: product.currency || 'USD',
                                }).format((product.price_cents || 0) / 100)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Stock: {product.stock_qty || 0}
                              </span>
                            </div>
                            <div className="flex gap-1 md:gap-2 mt-1 md:mt-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 border-border/50 hover:bg-accent/50 dark:hover:bg-accent/20 h-7 md:h-9 text-xs md:text-sm px-1 md:px-3"
                                onClick={() => setEditingProduct(product)}
                              >
                                <Edit className="h-3 w-3 md:mr-1" />
                                <span className="hidden md:inline">Edit</span>
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="flex-shrink-0 h-7 md:h-9 w-7 md:w-9 p-0"
                                onClick={() => handleDeleteProduct(product)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No products yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start building your catalog by adding your first product.
                    </p>
                    <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/80">
                      <Plus className="h-4 w-4" />
                      Add Product
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collabs">
            <div className="space-y-3 md:space-y-4">
              <div className="bg-muted/50 dark:bg-slate-800/50 rounded-lg p-3 md:p-4 border border-border/50">
                <h3 className="font-medium mb-2 text-sm md:text-base">What are Collaborations?</h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Create collaboration campaigns to work with content creators and influencers. Set your requirements, 
                  compensation, and deliverables. Creators can apply to your campaigns, and you can manage applications 
                  and track campaign performance all in one place.
                </p>
              </div>
              <CollabDashboard ownerOrgId={retailer?.id || ''} orgType="retailer" />
            </div>
          </TabsContent>

          <TabsContent value="brands">
            <RetailerBrandsList retailerId={retailer?.id || ''} />
          </TabsContent>

          <TabsContent value="events">
            <RetailerEvents retailerId={retailer?.id || ''} />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard retailerId={retailer?.id} />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              {/* ASOS Import - Only for retailer@test.com */}
              {user?.email === 'retailer@test.com' && (
                <>
                  <AsosImportManager />
                  <BulkAsosImportManager />
                </>
              )}
              
              {retailer && (
                <RetailerSettingsForm 
                  retailer={retailer}
                  onRetailerUpdate={setRetailer}
                />
              )}
              
              <BulkImportActions 
                retailerId={retailer?.id}
                onProductsDeleted={fetchProducts}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <AddProductModal 
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onProductAdded={() => {
            setIsAddModalOpen(false);
            fetchProducts();
          }}
          userType="retailer"
          retailerId={retailer?.id}
        />
        
        <AddProductModal 
          isOpen={isBulkAddModalOpen}
          onClose={() => setIsBulkAddModalOpen(false)}
          onProductAdded={() => {
            setIsBulkAddModalOpen(false);
            fetchProducts();
          }}
          userType="retailer"
          retailerId={retailer?.id}
          initialBulkMode={true}
        />
        {editingProduct && (
          <EditProductModal
            product={editingProduct}
            isOpen={!!editingProduct}
            onClose={() => setEditingProduct(null)}
            onProductUpdated={() => {
              setEditingProduct(null);
              fetchProducts();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default RetailerPortal;
