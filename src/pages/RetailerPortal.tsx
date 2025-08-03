import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
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
  Settings,
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

const RetailerPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const { toast } = useToast();

  // Mock retailer data
  const retailerInfo = {
    name: 'Fashion Collective',
    logo: '/placeholder.svg',
    description: 'Curated fashion from the best brands',
    website: 'https://fashioncollective.com',
    totalBrands: 12,
    totalProducts: 156,
    totalRevenue: 890000
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

  // Mock products data
  const products: Product[] = [
    {
      id: '1',
      title: 'Embroidered Black Abaya',
      price: 15900,
      category: 'Abayas',
      brand: 'Elegant Abayas',
      brandId: '1',
      status: 'active',
      image: '/placeholder.svg',
      views: 1250,
      likes: 89,
      sales: 12,
      revenue: 190800,
      margin: 30,
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      title: 'Silk Chiffon Hijab',
      price: 4900,
      category: 'Hijabs',
      brand: 'Modern Hijab',
      brandId: '2',
      status: 'active',
      image: '/placeholder.svg',
      views: 890,
      likes: 156,
      sales: 28,
      revenue: 137200,
      margin: 25,
      createdAt: '2024-01-10'
    },
    {
      id: '3',
      title: 'Gold Thread Kaftan',
      price: 32900,
      category: 'Kaftans',
      brand: 'Luxury Kaftans',
      brandId: '3',
      status: 'draft',
      image: '/placeholder.svg',
      views: 0,
      likes: 0,
      sales: 0,
      revenue: 0,
      margin: 35,
      createdAt: '2024-01-20'
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
    avgMargin: products.reduce((sum, p) => sum + p.margin, 0) / products.length
  };

  const handleLinkBrand = () => {
    toast({ description: "Brand partnership request sent!" });
  };

  const handleUpdateMargin = (brandId: string, newMargin: number) => {
    toast({ description: `Margin updated to ${newMargin}% for brand` });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
              <img src={retailerInfo.logo} alt={retailerInfo.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{retailerInfo.name}</h1>
              <p className="text-muted-foreground">{retailerInfo.description}</p>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span>{retailerInfo.totalBrands} brands</span>
                <span>{retailerInfo.totalProducts} products</span>
                <span>{formatPrice(retailerInfo.totalRevenue)} revenue</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button>
              <LinkIcon className="h-4 w-4 mr-2" />
              Link Brand
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="brands">Brands</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="mt-6">
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex items-center gap-4">
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
              <div className="grid gap-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Product Image */}
                        <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden">
                          <img 
                            src={product.image} 
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Product Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{product.title}</h3>
                            <Badge variant={getStatusColor(product.status) as any}>
                              {product.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {product.brand} • {product.category} • {formatPrice(product.price)}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                              {formatPrice(product.revenue)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {product.margin}% margin
                            </Badge>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Eye className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Views</p>
                        <p className="text-xl font-bold">{formatNumber(totalAnalytics.totalViews)}</p>
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
                      <div>
                        <p className="text-sm text-muted-foreground">Total Sales</p>
                        <p className="text-xl font-bold">{totalAnalytics.totalSales}</p>
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
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="text-xl font-bold">{formatPrice(totalAnalytics.totalRevenue)}</p>
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
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Margin</p>
                        <p className="text-xl font-bold">{totalAnalytics.avgMargin.toFixed(1)}%</p>
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
                      <div key={brand.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded overflow-hidden">
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
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Store Name</label>
                      <Input defaultValue={retailerInfo.name} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Website</label>
                      <Input defaultValue={retailerInfo.website} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea defaultValue={retailerInfo.description} />
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
    </div>
  );
};

export default RetailerPortal;