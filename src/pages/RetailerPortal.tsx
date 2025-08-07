import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackButton } from '@/components/ui/back-button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AddProductModal } from '@/components/AddProductModal';
import { LogoUpload } from '@/components/LogoUpload';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  BarChart3, 
  TrendingUp, 
  Eye, 
  Heart, 
  ShoppingBag,
  Users,
  DollarSign,
  Download,
  Filter,
  Store,
  Link as LinkIcon,
  Package
} from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  logo: string;
  products: number;
  revenue: number;
  margin: number;
  status: 'active' | 'pending' | 'inactive';
}

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  brand: string;
  brandId: string;
  status: 'active' | 'draft' | 'sold_out';
  image: string;
  views: number;
  likes: number;
  sales: number;
  revenue: number;
  margin: number;
  createdAt: string;
}

interface Retailer {
  id: string;
  name: string;
  logo_url: string | null;
  bio: string | null;
  website: string | null;
}

const RetailerPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

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
          id,
          title,
          price_cents,
          category_slug,
          status,
          media_urls,
          stock_qty,
          created_at
        `)
        .eq('retailer_id', retailer.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform data to match interface
      const formatted = (data || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        price: p.price_cents / 100,
        category: p.category_slug,
        brand: 'Retailer Product',
        brandId: 'retailer',
        status: p.status === 'active' ? 'active' as const : 'draft' as const,
        image: Array.isArray(p.media_urls) && p.media_urls.length > 0 ? p.media_urls[0] : '/placeholder.svg',
        views: Math.floor(Math.random() * 1000),
        likes: Math.floor(Math.random() * 200),
        sales: Math.floor(Math.random() * 50),
        revenue: Math.floor(Math.random() * 5000),
        margin: 30,
        createdAt: p.created_at
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

  // Mock brands data
  const brands: Brand[] = [
    {
      id: '1',
      name: 'Elegant Abayas',
      logo: '/placeholder.svg',
      products: 24,
      revenue: 125000,
      margin: 30,
      status: 'active'
    },
    {
      id: '2',
      name: 'Modern Hijab',
      logo: '/placeholder.svg',
      products: 18,
      revenue: 89000,
      margin: 25,
      status: 'active'
    },
    {
      id: '3',
      name: 'Luxury Kaftans',
      logo: '/placeholder.svg',
      products: 12,
      revenue: 156000,
      margin: 35,
      status: 'pending'
    }
  ];

  const formatPrice = (cents: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'inactive': return 'destructive';
      case 'draft': return 'secondary';
      case 'sold_out': return 'destructive';
      default: return 'secondary';
    }
  };

  const filteredProducts = selectedBrand === 'all' 
    ? products 
    : products.filter(p => p.brandId === selectedBrand);

  const totalAnalytics = {
    totalRevenue: products.reduce((sum, p) => sum + p.revenue, 0),
    totalSales: products.reduce((sum, p) => sum + p.sales, 0),
    totalViews: products.reduce((sum, p) => sum + p.views, 0),
    totalLikes: products.reduce((sum, p) => sum + p.likes, 0),
    avgMargin: products.length > 0 ? products.reduce((sum, p) => sum + p.margin, 0) / products.length : 0
  };

  const handleLinkBrand = () => {
    toast({ description: "Brand partnership request sent!" });
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
        <h2 className="text-xl font-semibold mb-2">No Retailer Found</h2>
        <p className="text-muted-foreground">Please create a retailer profile first.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <BackButton />
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
                {retailer.logo_url ? (
                  <img src={retailer.logo_url} alt={retailer.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    {retailer.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{retailer.name}</h1>
                <p className="text-muted-foreground">{retailer.bio || 'Retailer description'}</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-sm text-muted-foreground">
                  <span>{brands.length} brands</span>
                  <span>{products.length} products</span>
                  <span>{formatPrice(totalAnalytics.totalRevenue * 100)} revenue</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline">
              <LinkIcon className="h-4 w-4 mr-2" />
              Link Brand
            </Button>
            <Button onClick={() => setIsAddProductModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="brands">Brands</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="mt-6">
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4">
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              {/* Products Grid */}
              {loading ? (
                <div className="text-center py-8">Loading products...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No products yet. Create your first product!
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          {/* Product Image */}
                          <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                            <img 
                              src={product.image} 
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="font-medium truncate">{product.title}</h3>
                              <Badge variant={getStatusColor(product.status) as any}>
                                {product.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {product.brand} • {product.category} • ${product.price.toFixed(2)}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {formatNumber(product.views)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {formatNumber(product.likes)}
                              </span>
                              <span className="flex items-center gap-1">
                                <ShoppingBag className="h-3 w-3" />
                                {product.sales} sales
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                ${product.revenue.toFixed(2)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {product.margin}% margin
                              </Badge>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
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

          {/* Brands Tab */}
          <TabsContent value="brands" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Partner Brands</h2>
                <Button onClick={handleLinkBrand}>
                  <Plus className="h-4 w-4 mr-2" />
                  Link New Brand
                </Button>
              </div>

              <div className="grid gap-4">
                {brands.map((brand) => (
                  <Card key={brand.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
                          <img src={brand.logo} alt={brand.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{brand.name}</h3>
                            <Badge variant={getStatusColor(brand.status) as any}>
                              {brand.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {brand.products} products
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatPrice(brand.revenue)} revenue
                            </span>
                            <span>Margin: {brand.margin}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select defaultValue={brand.margin.toString()}>
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="20">20%</SelectItem>
                              <SelectItem value="25">25%</SelectItem>
                              <SelectItem value="30">30%</SelectItem>
                              <SelectItem value="35">35%</SelectItem>
                              <SelectItem value="40">40%</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Eye className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">Total Views</p>
                        <p className="text-lg sm:text-xl font-bold truncate">{formatNumber(totalAnalytics.totalViews)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <ShoppingBag className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">Total Sales</p>
                        <p className="text-lg sm:text-xl font-bold">{totalAnalytics.totalSales}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="text-lg sm:text-xl font-bold truncate">${totalAnalytics.totalRevenue.toFixed(0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">Avg Margin</p>
                        <p className="text-lg sm:text-xl font-bold">{totalAnalytics.avgMargin.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Brand Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Brand Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {brands.map((brand) => (
                      <div key={brand.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded overflow-hidden flex-shrink-0">
                            <img src={brand.logo} alt={brand.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-medium">{brand.name}</p>
                            <p className="text-sm text-muted-foreground">{brand.products} products</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPrice(brand.revenue)}</p>
                          <p className="text-sm text-muted-foreground">{brand.margin}% margin</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Store Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <LogoUpload
                    currentLogoUrl={retailer.logo_url}
                    onLogoUpdate={handleLogoUpdate}
                    entityType="retailer"
                    entityId={retailer.id}
                  />
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Store Name</label>
                      <Input defaultValue={retailer.name} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Website</label>
                      <Input defaultValue={retailer.website || ''} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea defaultValue={retailer.bio || ''} />
                  </div>
                  <Button>Save Changes</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Business Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Default Margin (%)</label>
                      <Input type="number" defaultValue="30" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Commission Structure</label>
                      <Select defaultValue="tiered">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Flat Rate</SelectItem>
                          <SelectItem value="tiered">Tiered</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button>Update Settings</Button>
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
        retailerId={retailer.id}
      />
    </div>
  );
};

export default RetailerPortal;
