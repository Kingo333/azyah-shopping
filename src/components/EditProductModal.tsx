import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X } from 'lucide-react';
import { CATEGORY_TREE, getAllCategories, getSubcategoriesForCategory, getCategoryDisplayName, getSubcategoryDisplayName } from '@/lib/categories';
import type { TopCategory, SubCategory } from '@/lib/categories';
import type { Product } from '@/types';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: () => void;
  product: Product;
}

const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar' },
  { code: 'OMR', symbol: 'ر.ع.', name: 'Omani Rial' }
];

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  onProductUpdated,
  product
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_cents: '',
    currency: 'USD',
    category_slug: '',
    subcategory_slug: '',
    sku: '',
    stock_qty: '0',
    external_url: ''
  });
  const [availableSubcategories, setAvailableSubcategories] = useState<readonly SubCategory[]>([]);

  // Initialize form data when product changes
  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        title: product.title || '',
        description: product.description || '',
        price_cents: (product.price_cents / 100).toString(),
        currency: product.currency || 'USD',
        category_slug: product.category_slug || '',
        subcategory_slug: product.subcategory_slug || '',
        sku: product.sku || '',
        stock_qty: (product.stock_qty || 0).toString(),
        external_url: product.external_url || ''
      });
      
      // Set images from media_urls
      if (product.media_urls && Array.isArray(product.media_urls)) {
        setImages(product.media_urls);
      } else {
        setImages([]);
      }
    }
  }, [product, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Update subcategories when category changes
  useEffect(() => {
    if (formData.category_slug) {
      const subcategories = getSubcategoriesForCategory(formData.category_slug as TopCategory);
      setAvailableSubcategories(subcategories);
      // Reset subcategory if it's not valid for the new category
      if (formData.subcategory_slug && !subcategories.includes(formData.subcategory_slug as SubCategory)) {
        setFormData(prev => ({ ...prev, subcategory_slug: '' }));
      }
    } else {
      setAvailableSubcategories([]);
    }
  }, [formData.category_slug]);

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
    if (!product) return;

    setLoading(true);

    try {
      const updateData = {
        title: formData.title,
        description: formData.description,
        price_cents: parseInt(formData.price_cents) * 100, // Convert to cents
        currency: formData.currency,
        category_slug: formData.category_slug as any,
        subcategory_slug: (formData.subcategory_slug || null) as any,
        sku: formData.sku || product.sku,
        stock_qty: parseInt(formData.stock_qty) || 0,
        external_url: formData.external_url,
        media_urls: images,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', product.id);

      if (error) throw error;

      toast({ title: "Success", description: "Product updated successfully!" });
      
      onProductUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update product", 
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
          <DialogTitle>Edit Product</DialogTitle>
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
            
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price_cents}
                  onChange={(e) => handleInputChange('price_cents', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency *</Label>
                <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  {getAllCategories().map(category => (
                    <SelectItem key={category} value={category}>
                      {getCategoryDisplayName(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subcategory">Subcategory</Label>
              <Select 
                value={formData.subcategory_slug} 
                onValueChange={(value) => handleInputChange('subcategory_slug', value)}
                disabled={!formData.category_slug}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.category_slug ? "Select subcategory" : "Select category first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSubcategories.map(subcategory => (
                    <SelectItem key={subcategory} value={subcategory}>
                      {getSubcategoryDisplayName(subcategory)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
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
              <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                placeholder="Unique product identifier"
              />
              <p className="text-xs text-muted-foreground mt-1">A unique identifier for your product used for tracking</p>
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
              <p className="text-xs text-muted-foreground mt-1">Direct link to purchase this product</p>
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
                id="image-upload-edit"
              />
              <label
                htmlFor="image-upload-edit"
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
              {loading ? 'Updating...' : 'Update Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};