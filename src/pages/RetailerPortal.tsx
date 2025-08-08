import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackButton } from '@/components/ui/back-button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from '@/hooks/useCategories';
import { useAnalytics, useConversionFunnel } from '@/hooks/useAnalytics';
import AnalyticsFunnel from '@/components/analytics/AnalyticsFunnel';
import AnalyticsTable from '@/components/analytics/AnalyticsTable';
import { AddProductModal } from '@/components/AddProductModal';
import { EditProductModal } from '@/components/EditProductModal';
import { RetailerProductDetailModal } from '@/components/RetailerProductDetailModal';
import { LogoUpload } from '@/components/LogoUpload';
import { Plus, Edit, Trash2, Upload, BarChart3, TrendingUp, Eye, Heart, ShoppingBag, DollarSign, Download, Filter, ExternalLink } from 'lucide-react';

interface Retailer {
  id: string;
  name: string;
  logo_url: string | null;
  bio: string | null;
  website: string | null;
}

const RetailerPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<any[]>([]);
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { categories } = useCategories();
  const { data: analyticsData, isLoading: analyticsLoading } = useAnalytics(retailer?.id, 'retailer');
  const { data: funnelData, isLoading: funnelLoading } = useConversionFunnel({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (user) {
      fetchRetailerData();
    }
  }, [user]);

  useEffect(() => {
    if (retailer?.id) {
      fetchProducts();
    }
  }, [retailer?.id]);

  const fetchRetailerData = async () => {
    try {
      const { data, error } = await supabase
        .from('retailers')
        .select('*')
        .eq('owner_user_id', user?.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setRetailer(data);
    } catch (error) { 
      console.error('Error fetching retailer data:', error); 
    }
  };

  const fetchProducts = async () => {
    if (!retailer?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          brand:brands(name)
        `)
        .eq('retailer_id', retailer.id)
        .order('created_at', { ascending: false });
      
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
      
      setProducts(formatted);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({ title: "Error", description: "Failed to fetch products", variant: "destructive" });
    } finally { 
      setLoading(false); 
    }
  };

  const handleLogoUpdate = (logoUrl: string | null) => {
    if (retailer) {
      setRetailer({ ...retailer, logo_url: logoUrl });
    }
  };

  const formatPrice = (cents: number, currency: string = 'USD'): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'archived': return 'secondary';
      case 'out_of_stock': return 'destructive';
      default: return 'secondary';
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
        const { error } = await supabase.from('products').update({ status: 'archived' }).in('id', Array.from(selectedProducts));
        if (error) throw error;
      } else if (action === 'Delete') {
        const { error } = await supabase.from('products').delete().in('id', Array.from(selectedProducts));
        if (error) throw error;
      }
      toast({ description: `${action} applied to ${selectedProducts.size} product(s)` });
      setSelectedProducts(new Set());
      fetchProducts();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast({ title: "Error", description: `Failed to ${action.toLowerCase()} products`, variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) {
        if (error.code === '23503') {
          toast({ 
            title: "Cannot Delete Product", 
            description: "This product has related data and cannot be deleted.", 
            variant: "destructive" 
          });
        } else {
          throw error;
        }
      } else {
        toast({ description: "Product deleted successfully" });
        fetchProducts();
      }
    } catch (error) {
      console.error('Delete product error:', error);
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    }
  };

  const handleViewProduct = (product: any) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setIsEditProductModalOpen(true);
  };

  const handleEditFromDetail = (product: any) => {
    setIsDetailModalOpen(false);
    setSelectedProduct(product);
    setIsEditProductModalOpen(true);
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">Please log in to access the retailer portal.</p>
      </div>
    </div>
  );

  if (!retailer) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">No Retailer Profile Found</h2>
        <p className="text-muted-foreground">Please create a retailer profile first.</p>
      </div>
    </div>
  );

  const analytics = {
    totalProducts: products.length,
    totalViews: analyticsData?.totalViews || 0,
    totalLikes: analyticsData?.totalLikes || 0,
    totalSales: products.reduce((sum, p: any) => sum + (p.sales || 0), 0),
    totalRevenue: analyticsData?.totalViews ? analyticsData.totalViews * 45.99 : 0
  };

  const topProductsData = products.slice(0, 5).map((product, index) => ({
    rank: index + 1,
    name: product.title,
    views: Math.floor(Math.random() * 1000) + 100,
    likes: Math.floor(Math.random() * 200) + 20,
    revenue: `$${(Math.random() * 500 + 100).toFixed(2)}`
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto max-w-7xl p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <BackButton 
              fallbackPath="/dashboard"
              onBack={() => {
                console.log('Retailer portal back button clicked, navigating to dashboard');
                window.location.href = '/dashboard';
              }}
            />
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-muted rounded-xl overflow-hidden">
                {retailer?.logo_url ? 
                  <img src={retailer.logo_url} alt={retailer.name} className="w-full h-full object-cover" /> : 
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground font-playfair">
                    {retailer?.name?.charAt(0).toUpperCase()}
                  </div>
                }
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold font-playfair">{retailer?.name}</h1>
                  <Badge variant="secondary" className="text-xs rounded-full">Verified</Badge>
                </div>
                <p className="text-muted-foreground">{retailer?.bio || 'Retailer description'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              onClick={() => setIsAddProductModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-white/50 backdrop-blur-sm">
            <TabsTrigger value="products" className="rounded-lg">Product Management</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg">Analytics</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg">Retailer Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-6">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" />Filter</Button>
                  <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-2" />Import CSV</Button>
                  <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
                </div>
                {selectedProducts.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedProducts.size} selected</span>
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('Archive')}>Archive</Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('Delete')}>Delete</Button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="text-center py-8">Loading products...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No products yet. Start by adding your first product!</div>
              ) : (
                <div className="grid gap-4">
                  {products.map((product) => (
                    <Card key={product.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <input type="checkbox" checked={selectedProducts.has(product.id)} onChange={() => handleSelectProduct(product.id)} className="w-4 h-4" />
                          <div 
                            className="w-20 h-20 bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleViewProduct(product)}
                          >
                            {product.media_urls && product.media_urls[0] ? (
                              <img src={product.media_urls[0]} alt={product.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 
                                className="font-medium cursor-pointer hover:text-primary transition-colors" 
                                onClick={() => handleViewProduct(product)}
                              >
                                {product.title}
                              </h3>
                              <Badge variant={getStatusColor(product.status) as any}>{product.status.replace('_', ' ')}</Badge>
                              {product.external_url && (
                                <Badge variant="outline" className="text-xs">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  External
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{product.category_slug} • {formatPrice(product.price_cents)}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Stock: {product.stock_qty}</span>
                              <span>Created: {new Date(product.created_at).toLocaleDateString()}</span>
                              {product.brand && <span>Brand: {product.brand.name}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewProduct(product)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                        <ShoppingBag className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Products</p>
                        <p className="text-xl font-bold font-playfair">{analytics.totalProducts}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Eye className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Views</p>
                        <p className="text-xl font-bold font-playfair">{analytics.totalViews}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                        <Heart className="h-4 w-4 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Likes</p>
                        <p className="text-xl font-bold font-playfair">{analytics.totalLikes}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="text-xl font-bold font-playfair">${analytics.totalRevenue.toFixed(0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <AnalyticsFunnel data={funnelData || []} loading={funnelLoading} />
                
                <AnalyticsTable
                  title="Top Products"
                  data={topProductsData}
                  columns={[
                    { key: 'rank', label: '#', sortable: false },
                    { key: 'name', label: 'Product', sortable: true },
                    { key: 'views', label: 'Views', sortable: true },
                    { key: 'likes', label: 'Likes', sortable: true },
                    { key: 'revenue', label: 'Revenue', sortable: true }
                  ]}
                  loading={analyticsLoading}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Retailer Profile</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <LogoUpload
                    currentLogoUrl={retailer?.logo_url}
                    onLogoUpdate={handleLogoUpdate}
                    entityType="retailer"
                    entityId={retailer?.id}
                  />
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium mb-2 block">Retailer Name</label><Input defaultValue={retailer?.name} /></div>
                    <div><label className="text-sm font-medium mb-2 block">Website</label><Input defaultValue={retailer?.website || ''} /></div>
                  </div>
                  <div><label className="text-sm font-medium mb-2 block">Description</label><Textarea defaultValue={retailer?.bio || ''} /></div>
                  <Button>Save Changes</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onProductAdded={fetchProducts}
        userType="retailer"
        retailerId={retailer?.id}
      />

      {selectedProduct && (
        <>
          <RetailerProductDetailModal
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedProduct(null);
            }}
            product={selectedProduct}
            onEdit={handleEditFromDetail}
          />

          <EditProductModal
            isOpen={isEditProductModalOpen}
            onClose={() => {
              setIsEditProductModalOpen(false);
              setSelectedProduct(null);
            }}
            onProductUpdated={fetchProducts}
            product={selectedProduct}
          />
        </>
      )}
    </div>
  );
};

export default RetailerPortal;
