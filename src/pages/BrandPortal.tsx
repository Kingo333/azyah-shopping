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
import { 
  Plus, Edit, Trash2, Upload, BarChart3, TrendingUp, Eye, Heart, 
  ShoppingBag, DollarSign, Settings, Download, Filter
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  price_cents: number;
  category_slug: string;
  status: 'active' | 'inactive' | 'archived' | 'out_of_stock' | 'draft' | 'sold_out';
  media_urls: string[] | null;
  stock_qty: number;
  created_at: string;
  brand: {
    name: string;
  };
}

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
  const [products, setProducts] = useState<Product[]>([]);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch brand on login
  useEffect(() => {
    if (user?.id) {
      fetchBrandData();
    }
  }, [user?.id]);

  // Fetch products only after brand is known
  useEffect(() => {
    if (brand?.id) {
      fetchProducts();
    }
  }, [brand?.id]);

  const fetchBrandData = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('owner_user_id', user?.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      setBrand(data);
    } catch (error) {
      console.error('Error fetching brand data:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, brand:brands(name)')
        .eq('brand_id', brand?.id || '')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch products',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number, currency: string = 'USD'): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

  const getStatusColor = (status: Product['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'archived': return 'secondary';
      case 'out_of_stock': return 'destructive';
      case 'draft': return 'secondary';
      case 'sold_out': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleSelectProduct = (productId: string) => {
    const updated = new Set(selectedProducts);
    updated.has(productId) ? updated.delete(productId) : updated.add(productId);
    setSelectedProducts(updated);
  };

  const handleBulkAction = async (action: string) => {
    try {
      if (action === 'Archive') {
        const { error } = await supabase
          .from('products')
          .update({ status: 'draft' })
          .in('id', Array.from(selectedProducts));
        if (error) throw error;
      } else if (action === 'Delete') {
        const { error } = await supabase
          .from('products')
          .delete()
          .in('id', Array.from(selectedProducts));
        if (error) throw error;
      }
      toast({ description: `${action} applied to ${selectedProducts.size} product(s)` });
      setSelectedProducts(new Set());
      fetchProducts();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast({
        title: 'Error',
        description: `Failed to ${action.toLowerCase()} products`,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      toast({ description: 'Product deleted successfully' });
      fetchProducts();
    } catch (error) {
      console.error('Delete product error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive'
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Please log in to access the brand portal.</p>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Brand Found</h2>
          <p className="text-muted-foreground">Please create a brand profile first.</p>
        </div>
      </div>
    );
  }

  const analytics = {
    totalProducts: products.length,
    totalViews: products.reduce((sum, p) => sum + ((p as any).views || 0), 0),
    totalLikes: products.reduce((sum, p) => sum + ((p as any).likes || 0), 0),
    totalSales: products.reduce((sum, p) => sum + ((p as any).sales || 0), 0),
    totalRevenue: products.reduce((sum, p) => sum + ((p as any).revenue || 0), 0)
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <BackButton />
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    {brand.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{brand.name}</h1>
                  <Badge variant="secondary" className="text-xs">Verified</Badge>
                </div>
                <p className="text-muted-foreground">{brand.bio || 'Brand description'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" /> Settings
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">Product Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Brand Settings</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" /> Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" /> Import CSV
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" /> Export
                  </Button>
                </div>
                {selectedProducts.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedProducts.size} selected</span>
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('Archive')}>Archive</Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('Delete')}>Delete</Button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="text-center py-8">Loading products...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No products yet. Create your first product!</div>
              ) : (
                <div className="grid gap-4">
                  {products.map(product => (
                    <Card key={product.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => handleSelectProduct(product.id)}
                            className="w-4 h-4"
                          />
                          <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden">
                            {product.media_urls && Array.isArray(product.media_urls) && product.media_urls[0] ? (
                              <img src={product.media_urls[0]} alt={product.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{product.title}</h3>
                              <Badge variant={getStatusColor(product.status) as any}>{product.status.replace('_', ' ')}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {product.category_slug} • {formatPrice(product.price_cents)}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Stock: {product.stock_qty}</span>
                              <span>Created: {new Date(product.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
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

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4">
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-primary" /></div>
                    <div><p className="text-sm text-muted-foreground">Total Products</p><p className="text-xl font-bold">{analytics.totalProducts}</p></div>
                  </div></CardContent></Card>
                <Card><CardContent className="p-4">
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Eye className="h-4 w-4 text-blue-500" /></div>
                    <div><p className="text-sm text-muted-foreground">Total Views</p><p className="text-xl font-bold">{analytics.totalViews}</p></div>
                  </div></CardContent></Card>
                <Card><CardContent className="p-4">
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <Heart className="h-4 w-4 text-red-500" /></div>
                    <div><p className="text-sm text-muted-foreground">Total Likes</p><p className="text-xl font-bold">{analytics.totalLikes}</p></div>
                  </div></CardContent></Card>
                <Card><CardContent className="p-4">
                  <div className="flex items-center gap-2"><div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-green-500" /></div>
                    <div><p className="text-sm text-muted-foreground">Revenue</p><p className="text-xl font-bold">${analytics.totalRevenue}</p></div>
                  </div></CardContent></Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card><CardHeader><CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Sales Trend</CardTitle></CardHeader>
                  <CardContent><div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Real analytics data will appear here</p></div></CardContent></Card>
                <Card><CardHeader><CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" /> Top Products</CardTitle></CardHeader>
                  <CardContent><div className="space-y-3">
                    {products.slice(0, 5).map((product, index) => (
                      <div key={product.id} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                        <div className="w-8 h-8 bg-muted rounded overflow-hidden">
                          {product.media_urls && Array.isArray(product.media_urls) && product.media_urls[0] ? (
                            <img src={product.media_urls[0]} alt={product.title} className="w-full h-full object-cover" />
                          ) : (<div className="w-full h-full bg-gray-200"></div>)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium truncate">{product.title}</p>
                          <p className="text-xs text-muted-foreground">{formatPrice(product.price_cents)}</p>
                        </div>
                      </div>
                    ))}
                  </div></CardContent></Card>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <Card><CardHeader><CardTitle>Brand Profile</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium mb-2 block">Brand Name</label>
                      <Input defaultValue={brand.name} /></div>
                    <div><label className="text-sm font-medium mb-2 block">Website</label>
                      <Input defaultValue={brand.website || ''} /></div>
                  </div>
                  <div><label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea defaultValue={brand.bio || ''} /></div>
                  <Button>Save Changes</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BrandPortal;
