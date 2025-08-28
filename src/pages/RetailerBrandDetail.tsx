import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Package, Settings, Users, BarChart3 } from 'lucide-react';
import { AddProductModal } from '@/components/AddProductModal';
import { EditProductModal } from '@/components/EditProductModal';
import { RetailerProductDetailModal } from '@/components/RetailerProductDetailModal';
import { SEOHead } from '@/components/SEOHead';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/types';

const RetailerBrandDetail = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Fetch brand details
  const { data: brand, isLoading: brandLoading } = useQuery({
    queryKey: ['retailer-brand', brandId],
    queryFn: async () => {
      if (!brandId) throw new Error('Brand ID is required');
      
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!brandId,
  });

  // Fetch products for this brand in the retailer's inventory
  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['retailer-brand-products', brandId, user?.id],
    queryFn: async () => {
      if (!brandId || !user?.id) return [];
      
      // First get the retailer ID for the current user
      const { data: retailerData } = await supabase
        .from('retailers')
        .select('id')
        .eq('owner_user_id', user.id)
        .single();
      
      if (!retailerData) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          brands!inner(name, logo_url)
        `)
        .eq('brand_id', brandId)
        .eq('retailer_id', retailerData.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!brandId && !!user?.id,
  });

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const handleProductUpdated = () => {
    refetchProducts();
    setIsEditModalOpen(false);
    setIsDetailModalOpen(false);
    setSelectedProduct(null);
  };

  if (brandLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Brand Not Found</h2>
          <p className="text-muted-foreground mb-4">The brand you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/retailer-portal')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title={`${brand.name} - Brand Management | Azyah Retailer Portal`}
        description={`Manage ${brand.name} products and inventory in your retail portal`}
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="container max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/retailer-portal')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Portal
                </Button>
                
                <div className="flex items-center gap-3">
                  {brand.logo_url && (
                    <img 
                      src={brand.logo_url} 
                      alt={brand.name}
                      className="w-10 h-10 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h1 className="text-2xl font-bold">{brand.name}</h1>
                    <p className="text-sm text-muted-foreground">Brand Management</p>
                  </div>
                </div>
              </div>
              
              <Button onClick={() => setIsAddProductModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>
        </div>

        <div className="container max-w-7xl mx-auto px-4 py-8">
          <Tabs defaultValue="products" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Products
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold">Products</h2>
                  <p className="text-muted-foreground">
                    Manage your {brand.name} product inventory
                  </p>
                </div>
                <Badge variant="secondary">
                  {products?.length || 0} Products
                </Badge>
              </div>

              {productsLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="aspect-square bg-muted rounded-lg mb-4"></div>
                        <div className="h-4 bg-muted rounded mb-2"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : products && products.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => (
                    <Card key={product.id} className="group hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="aspect-square bg-muted rounded-lg mb-4 overflow-hidden">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        
                        <h3 className="font-medium line-clamp-2 mb-2">{product.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: product.currency || 'USD'
                          }).format((product.price_cents || 0) / 100)}
                        </p>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleViewProduct(product as any)}
                          >
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleEditProduct(product as any)}
                          >
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Products Yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Start building your {brand.name} inventory by adding your first product.
                    </p>
                    <Button onClick={() => setIsAddProductModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Product
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {brand.name} Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Analytics dashboard coming soon. Track your {brand.name} product performance, 
                    sales metrics, and customer engagement.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Brand Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Brand Name</label>
                      <p className="text-muted-foreground">{brand.name}</p>
                    </div>
                    {brand.bio && (
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <p className="text-muted-foreground">{brand.bio}</p>
                      </div>
                    )}
                    {brand.website && (
                      <div>
                        <label className="text-sm font-medium">Website</label>
                        <p className="text-muted-foreground">{brand.website}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modals */}
        <AddProductModal
          isOpen={isAddProductModalOpen}
          onClose={() => setIsAddProductModalOpen(false)}
          onProductAdded={handleProductUpdated}
          brandId={brandId}
          userType="retailer"
        />

        {selectedProduct && (
          <>
            <EditProductModal
              product={selectedProduct}
              isOpen={isEditModalOpen}
              onClose={() => {
                setIsEditModalOpen(false);
                setSelectedProduct(null);
              }}
              onProductUpdated={handleProductUpdated}
            />

            <RetailerProductDetailModal
              product={selectedProduct}
              isOpen={isDetailModalOpen}
              onClose={() => {
                setIsDetailModalOpen(false);
                setSelectedProduct(null);
              }}
              onEdit={() => {
                setIsDetailModalOpen(false);
                setIsEditModalOpen(true);
              }}
              onProductUpdated={handleProductUpdated}
            />
          </>
        )}
      </div>
    </>
  );
};

export default RetailerBrandDetail;