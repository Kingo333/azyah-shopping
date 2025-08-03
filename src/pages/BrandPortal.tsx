import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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
  Filter
} from 'lucide-react';

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  status: 'active' | 'draft' | 'sold_out';
  image: string;
  views: number;
  likes: number;
  sales: number;
  revenue: number;
  arEnabled: boolean;
  createdAt: string;
}

interface Analytics {
  totalProducts: number;
  totalViews: number;
  totalLikes: number;
  totalSales: number;
  totalRevenue: number;
  conversionRate: number;
  topProduct: string;
}

const BrandPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Mock brand data
  const brandInfo = {
    name: 'Elegant Abayas',
    logo: '/placeholder.svg',
    description: 'Premium modest wear for the modern woman',
    verified: true,
    followers: 12400,
    following: 89,
    website: 'https://elegantabayas.com'
  };

  // Mock products data
  const products: Product[] = [
    {
      id: '1',
      title: 'Embroidered Black Abaya',
      price: 15900,
      category: 'Abayas',
      status: 'active',
      image: '/placeholder.svg',
      views: 1250,
      likes: 89,
      sales: 12,
      revenue: 190800,
      arEnabled: true,
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      title: 'Silk Evening Kaftan',
      price: 22900,
      category: 'Kaftans',
      status: 'active',
      image: '/placeholder.svg',
      views: 890,
      likes: 156,
      sales: 8,
      revenue: 183200,
      arEnabled: false,
      createdAt: '2024-01-10'
    },
    {
      id: '3',
      title: 'Classic Navy Abaya',
      price: 12900,
      category: 'Abayas',
      status: 'draft',
      image: '/placeholder.svg',
      views: 0,
      likes: 0,
      sales: 0,
      revenue: 0,
      arEnabled: true,
      createdAt: '2024-01-20'
    }
  ];

  // Mock analytics data
  const analytics: Analytics = {
    totalProducts: products.length,
    totalViews: products.reduce((sum, p) => sum + p.views, 0),
    totalLikes: products.reduce((sum, p) => sum + p.likes, 0),
    totalSales: products.reduce((sum, p) => sum + p.sales, 0),
    totalRevenue: products.reduce((sum, p) => sum + p.revenue, 0),
    conversionRate: 3.2,
    topProduct: 'Embroidered Black Abaya'
  };

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
      case 'draft': return 'secondary';
      case 'sold_out': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (selectedProducts.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleBulkAction = (action: string) => {
    toast({
      description: `${action} applied to ${selectedProducts.size} product(s)`
    });
    setSelectedProducts(new Set());
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
              <img src={brandInfo.logo} alt={brandInfo.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{brandInfo.name}</h1>
                {brandInfo.verified && (
                  <Badge variant="secondary" className="text-xs">Verified</Badge>
                )}
              </div>
              <p className="text-muted-foreground">{brandInfo.description}</p>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span>{formatNumber(brandInfo.followers)} followers</span>
                <span>{brandInfo.following} following</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
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
              {/* Filters and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                {selectedProducts.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedProducts.size} selected
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleBulkAction('Archive')}
                    >
                      Archive
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleBulkAction('Delete')}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              {/* Products Grid */}
              <div className="grid gap-4">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Selection Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                          className="w-4 h-4"
                        />

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
                            {product.arEnabled && (
                              <Badge variant="outline" className="text-xs">AR</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {product.category} • {formatPrice(product.price)}
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
                        <p className="text-xl font-bold">{formatNumber(analytics.totalViews)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <Heart className="h-4 w-4 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Likes</p>
                        <p className="text-xl font-bold">{formatNumber(analytics.totalLikes)}</p>
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
                        <p className="text-xl font-bold">{analytics.totalSales}</p>
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
                        <p className="text-xl font-bold">{formatPrice(analytics.totalRevenue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Placeholder */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Sales Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Chart visualization coming soon</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Top Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {products.slice(0, 3).map((product, index) => (
                        <div key={product.id} className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                          <div className="w-8 h-8 bg-muted rounded overflow-hidden">
                            <img 
                              src={product.image} 
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{product.title}</p>
                            <p className="text-xs text-muted-foreground">{product.sales} sales</p>
                          </div>
                          <p className="text-sm font-medium">{formatPrice(product.revenue)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Brand Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Brand Name</label>
                      <Input defaultValue={brandInfo.name} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Website</label>
                      <Input defaultValue={brandInfo.website} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea defaultValue={brandInfo.description} />
                  </div>
                  <Button>Save Changes</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Social Media</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Instagram</label>
                      <Input placeholder="@brandname" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">TikTok</label>
                      <Input placeholder="@brandname" />
                    </div>
                  </div>
                  <Button>Update Social Links</Button>
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