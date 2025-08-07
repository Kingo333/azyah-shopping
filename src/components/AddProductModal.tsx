
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, X, Plus } from 'lucide-react';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
  userType: 'brand' | 'retailer';
  brandId?: string;
  retailerId?: string;
}

const categories = [
  'clothing', 'footwear', 'accessories', 'jewelry', 'beauty', 
  'modestwear', 'kids', 'fragrance', 'home', 'giftcards'
];

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onProductAdded,
  userType,
  brandId,
  retailerId
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_cents: '',
    category_slug: '',
    sku: '',
    stock_qty: '0',
    external_url: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
        continue;
      }

      // For now, create object URLs for preview
      const imageUrl = URL.createObjectURL(file);
      newImages.push(imageUrl);
    }

    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const productData = {
        title: formData.title,
        description: formData.description,
        price_cents: parseInt(formData.price_cents) * 100, // Convert to cents
        category_slug: formData.category_slug as any,
        sku: formData.sku || `SKU-${Date.now()}`,
        stock_qty: parseInt(formData.stock_qty) || 0,
        external_url: formData.external_url,
        media_urls: images, // Using object URLs for now
        brand_id: userType === 'brand' ? brandId : null,
        retailer_id: userType === 'retailer' ? retailerId : null,
        status: 'active' as const
      };

      const { error } = await supabase
        .from('products')
        .insert(productData);

      if (error) throw error;

      toast({ title: "Success", description: "Product added successfully!" });
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        price_cents: '',
        category_slug: '',
        sku: '',
        stock_qty: '0',
        external_url: ''
      });
      setImages([]);
      
      onProductAdded();
      onClose();
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add product", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Product Name *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="price">Price (USD) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price_cents}
                onChange={(e) => handleInputChange('price_cents', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category_slug} onValueChange={(value) => handleInputChange('category_slug', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stock">Stock Quantity</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock_qty}
                onChange={(e) => handleInputChange('stock_qty', e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                placeholder="Auto-generated if empty"
              />
            </div>

            <div>
              <Label htmlFor="external_url">Shop Now URL</Label>
              <Input
                id="external_url"
                type="url"
                value={formData.external_url}
                onChange={(e) => handleInputChange('external_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <Label>Product Images</Label>
            <div className="mt-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500">Click to upload images</p>
                </div>
              </label>
            </div>

            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt={`Product ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
