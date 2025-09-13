import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Link, Camera, Search, Heart, Plus, Check } from 'lucide-react';
import { useAddExternalProduct } from '@/hooks/useEnhancedClosets';
import { useDefaultCloset } from '@/hooks/useDefaultCloset';
import { useLikedProducts } from '@/hooks/useLikedProducts';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToExplore?: () => void;
}

const CATEGORIES = [
  'tops',
  'bottoms',
  'dresses',
  'outerwear',
  'shoes',
  'accessories',
  'bags',
  'jewelry',
  'activewear',
  'lingerie',
  'swimwear'
];

const COLORS = [
  'black',
  'white',
  'gray',
  'brown',
  'beige',
  'red',
  'pink',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'multicolor'
];

export const AddItemModal: React.FC<AddItemModalProps> = ({
  open,
  onOpenChange,
  onNavigateToExplore
}) => {
  const { defaultCloset } = useDefaultCloset();
  const addItemMutation = useAddExternalProduct();
  const { likedProducts, isLoading: likedLoading } = useLikedProducts();
  
  const [formData, setFormData] = useState({
    title: '',
    brand: '',
    category: '',
    color: '',
    price_cents: '',
    currency: 'USD',
    image_url: '',
    external_url: ''
  });

  const [activeTab, setActiveTab] = useState('liked');
  const [addingLikedItems, setAddingLikedItems] = useState<Set<string>>(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!defaultCloset?.id) {
      toast({
        title: "Error",
        description: "No default closet found"
      });
      return;
    }

    if (!formData.title) {
      toast({
        title: "Missing information",
        description: "Please provide at least a title for the item"
      });
      return;
    }

    try {
      await addItemMutation.mutateAsync({
        closetId: defaultCloset.id,
        productData: {
          title: formData.title,
          brand: formData.brand || undefined,
          category: formData.category || undefined,
          color: formData.color || undefined,
          price_cents: formData.price_cents ? parseInt(formData.price_cents) : undefined,
          currency: formData.currency,
          image_url: formData.image_url || undefined,
          attrs: formData.external_url ? { external_url: formData.external_url } : undefined
        }
      });

      // Reset form
      setFormData({
        title: '',
        brand: '',
        category: '',
        color: '',
        price_cents: '',
        currency: 'USD',
        image_url: '',
        external_url: ''
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to your closet"
      });
    }
  };

  const handleBrowseInspiration = () => {
    onOpenChange(false);
    if (onNavigateToExplore) {
      onNavigateToExplore();
    }
  };

  const handleAddLikedProduct = async (product: any) => {
    if (!defaultCloset?.id) {
      toast({
        title: "Error",
        description: "No default closet found"
      });
      return;
    }

    setAddingLikedItems(prev => new Set([...prev, product.id]));

    try {
      await addItemMutation.mutateAsync({
        closetId: defaultCloset.id,
        productData: {
          external_product_id: product.id,
          title: product.title,
          brand: product.brands?.name,
          price_cents: product.price_cents,
          currency: product.currency,
          image_url: product.media_urls?.[0] || undefined,
          attrs: { 
            external_url: product.external_url,
            source: 'liked_products'
          }
        }
      });

      toast({
        title: "Added to wardrobe",
        description: `${product.title} has been added to your wardrobe`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to your wardrobe"
      });
    } finally {
      setAddingLikedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(cents / 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Item to Wardrobe</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="liked" className="text-xs">Liked</TabsTrigger>
            <TabsTrigger value="upload" className="text-xs">Upload</TabsTrigger>
            <TabsTrigger value="browse" className="text-xs">Browse</TabsTrigger>
          </TabsList>

          <TabsContent value="liked" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Your Liked Items
                </CardTitle>
                <CardDescription>
                  Add products you've liked to your wardrobe
                </CardDescription>
              </CardHeader>
              <CardContent>
                {likedLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : likedProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-4">
                      You haven't liked any products yet
                    </p>
                    <Button onClick={handleBrowseInspiration} variant="outline" className="gap-2">
                      <Search className="h-4 w-4" />
                      Discover Products
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                    {likedProducts.map((product: any) => {
                      const isAdding = addingLikedItems.has(product.id);
                      return (
                        <div key={product.id} className="relative group">
                          <Card className="overflow-hidden hover:shadow-md transition-all">
                            <div className="aspect-[3/4] relative">
                              <img
                                src={product.media_urls?.[0] || '/placeholder.svg'}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <Button
                                size="sm"
                                className={cn(
                                  "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity gap-1",
                                  isAdding && "opacity-100"
                                )}
                                onClick={() => handleAddLikedProduct(product)}
                                disabled={isAdding}
                              >
                                {isAdding ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                                ) : (
                                  <Plus className="h-3 w-3" />
                                )}
                                Add
                              </Button>
                            </div>
                            <div className="p-3">
                              <h4 className="font-medium text-sm truncate">{product.title}</h4>
                              {product.brands?.name && (
                                <p className="text-xs text-muted-foreground">{product.brands.name}</p>
                              )}
                              {product.price_cents && (
                                <p className="text-sm font-semibold mt-1">
                                  {formatPrice(product.price_cents, product.currency)}
                                </p>
                              )}
                            </div>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Photo
                </CardTitle>
                <CardDescription>
                  Take or upload a photo of your item
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Photo upload feature coming soon!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    For now, you can add items from your liked products or browse for inspiration
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="browse" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Browse Products
                </CardTitle>
                <CardDescription>
                  Discover and add items from our product catalog
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-2">Explore Fashion Products</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Browse trending items and add them directly to your wardrobe
                </p>
                <Button onClick={handleBrowseInspiration} className="gap-2">
                  <Search className="h-4 w-4" />
                  Browse Products
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};