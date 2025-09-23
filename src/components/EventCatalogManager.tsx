import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Trash2, Star, StarOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  title: string;
  image_url?: string;
  price_cents: number;
  currency: string;
  brand?: { name: string };
}

interface CatalogProduct extends Product {
  featured: boolean;
  catalog_id: string;
}

interface EventCatalogManagerProps {
  eventId: string;
  eventName: string;
}

export const EventCatalogManager: React.FC<EventCatalogManagerProps> = ({ 
  eventId, 
  eventName 
}) => {
  const { toast } = useToast();
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCatalogProducts();
    fetchAvailableProducts();
  }, [eventId]);

  const fetchCatalogProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('event_catalog')
        .select(`
          id,
          featured,
          product:products(
            id,
            title,
            image_url,
            price_cents,
            currency,
            brand:brands(name)
          )
        `)
        .eq('event_id', eventId);

      if (error) throw error;

      const products = data?.map(item => ({
        ...item.product,
        featured: item.featured,
        catalog_id: item.id
      })) || [];

      setCatalogProducts(products);
    } catch (error) {
      console.error('Error fetching catalog products:', error);
    }
  };

  const fetchAvailableProducts = async () => {
    try {
      // Get the retailer ID from the event
      const { data: eventData } = await supabase
        .from('retail_events')
        .select('retailer_id')
        .eq('id', eventId)
        .single();

      if (!eventData) return;

      // Get products not already in the catalog
      const { data: catalogProductIds } = await supabase
        .from('event_catalog')
        .select('product_id')
        .eq('event_id', eventId);

      const excludeIds = catalogProductIds?.map(item => item.product_id) || [];

      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          image_url,
          price_cents,
          currency,
          brand:brands(name)
        `)
        .eq('retailer_id', eventData.retailer_id)
        .eq('status', 'active')
        .not('id', 'in', `(${excludeIds.join(',') || 'null'})`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableProducts(data || []);
    } catch (error) {
      console.error('Error fetching available products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addProductToCatalog = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('event_catalog')
        .insert({
          event_id: eventId,
          product_id: productId,
          featured: false
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product added to event catalog"
      });

      setIsAddModalOpen(false);
      fetchCatalogProducts();
      fetchAvailableProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add product",
        variant: "destructive"
      });
    }
  };

  const removeProductFromCatalog = async (catalogId: string) => {
    try {
      const { error } = await supabase
        .from('event_catalog')
        .delete()
        .eq('id', catalogId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product removed from catalog"
      });

      fetchCatalogProducts();
      fetchAvailableProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove product",
        variant: "destructive"
      });
    }
  };

  const toggleFeatured = async (catalogId: string, currentFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('event_catalog')
        .update({ featured: !currentFeatured })
        .eq('id', catalogId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Product ${!currentFeatured ? 'featured' : 'unfeatured'}`
      });

      fetchCatalogProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive"
      });
    }
  };

  const filteredProducts = availableProducts.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Event Catalog</h2>
          <p className="text-muted-foreground">Managing products for {eventName}</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Products
        </Button>
      </div>

      {catalogProducts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No products in the catalog yet. Add products to showcase them in this event.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {catalogProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <div className="relative">
                <img
                  src={product.image_url || '/placeholder.svg'}
                  alt={product.title}
                  className="w-full h-48 object-cover"
                />
                {product.featured && (
                  <Badge className="absolute top-2 left-2" variant="secondary">
                    Featured
                  </Badge>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toggleFeatured(product.catalog_id, product.featured)}
                  >
                    {product.featured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeProductFromCatalog(product.catalog_id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-medium mb-1 line-clamp-2">{product.title}</h3>
                {product.brand && (
                  <p className="text-sm text-muted-foreground mb-2">{product.brand.name}</p>
                )}
                <p className="text-lg font-semibold">
                  {product.currency} {(product.price_cents / 100).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Products Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Add Products to Catalog</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse">
                      <div className="h-32 bg-muted"></div>
                      <CardContent className="p-4">
                        <div className="h-4 bg-muted rounded mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {searchTerm ? 'No products found matching your search' : 'No available products to add'}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden">
                      <img
                        src={product.image_url || '/placeholder.svg'}
                        alt={product.title}
                        className="w-full h-32 object-cover"
                      />
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-1 line-clamp-2 text-sm">{product.title}</h3>
                        {product.brand && (
                          <p className="text-xs text-muted-foreground mb-2">{product.brand.name}</p>
                        )}
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-semibold">
                            {product.currency} {(product.price_cents / 100).toFixed(2)}
                          </p>
                          <Button 
                            size="sm" 
                            onClick={() => addProductToCatalog(product.id)}
                          >
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};