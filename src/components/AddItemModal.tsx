import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Link, Camera, Search } from 'lucide-react';
import { useAddExternalProduct } from '@/hooks/useEnhancedClosets';
import { useDefaultCloset } from '@/hooks/useDefaultCloset';
import { toast } from '@/hooks/use-toast';

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

  const [activeTab, setActiveTab] = useState('manual');

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Item to Wardrobe</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="manual" className="text-xs">Manual</TabsTrigger>
            <TabsTrigger value="upload" className="text-xs">Upload</TabsTrigger>
            <TabsTrigger value="url" className="text-xs">From URL</TabsTrigger>
            <TabsTrigger value="browse" className="text-xs">Browse</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Add Item Manually
                </CardTitle>
                <CardDescription>
                  Enter the details of your clothing item
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Item Name *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Blue Denim Jacket"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                        placeholder="e.g., Levi's"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Select value={formData.color} onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                        <SelectContent>
                          {COLORS.map((color) => (
                            <SelectItem key={color} value={color}>
                              {color.charAt(0).toUpperCase() + color.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price_cents}
                        onChange={(e) => setFormData(prev => ({ ...prev, price_cents: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="AED">AED</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image_url">Image URL</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={addItemMutation.isPending}>
                    {addItemMutation.isPending ? 'Adding...' : 'Add to Wardrobe'}
                  </Button>
                </form>
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
                    For now, you can add items manually or use the URL option
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Import from URL
                </CardTitle>
                <CardDescription>
                  Add an item from a website link
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">Product URL</Label>
                    <Input
                      id="url"
                      value={formData.external_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, external_url: e.target.value }))}
                      placeholder="https://store.com/product-page"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title-url">Item Name *</Label>
                      <Input
                        id="title-url"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Black Sneakers"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brand-url">Brand</Label>
                      <Input
                        id="brand-url"
                        value={formData.brand}
                        onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                        placeholder="e.g., Nike"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={addItemMutation.isPending}>
                    {addItemMutation.isPending ? 'Adding...' : 'Add from URL'}
                  </Button>
                </form>
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