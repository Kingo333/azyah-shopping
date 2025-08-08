import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, X, Loader2 } from 'lucide-react';
import { CATEGORY_TREE, getAllCategories, getSubcategoriesForCategory, getCategoryDisplayName, getSubcategoryDisplayName } from '@/lib/categories';
import { SizeChartUpload } from '@/components/SizeChartUpload';
import type { TopCategory, SubCategory } from '@/lib/categories';
import type { Product } from '@/types';

interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: () => void;
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
  product,
  isOpen,
  onClose,
  onProductUpdated
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [sizeChartUrl, setSizeChartUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        title: product.title || '',
        description: product.description || '',
        price_cents: product.price_cents ? (product.price_cents / 100).toString() : '',
        currency: product.currency || 'USD',
        category_slug: product.category_slug || '',
        subcategory_slug: product.subcategory_slug || '',
        sku: product.sku || '',
        stock_qty: product.stock_qty?.toString() || '0',
        external_url: product.external_url || ''
      });
      
      // Set existing images
      const mediaUrls = Array.isArray(product.media_urls) ? product.media_urls : 
                       typeof product.media_urls === 'string' ? [product.media_urls] : [];
      setImages(mediaUrls);

      // Set existing size chart
      const attributes = product.attributes as any;
      setSizeChartUrl(attributes?.size_chart || null);
    }
  }, [product, isOpen]);

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const uploadImageToStorage = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return publicUrl.publicUrl;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setUploadingImages(true);
    const newImages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
          toast({
            title: 'Invalid file type',
            description: `${file.name} is not a valid image format. Please use JPG, PNG, or GIF.`,
            variant: 'destructive'
          });
          continue;
        }

        // Validate file size (8MB limit)
        if (file.size > 8 * 1024 * 1024) {
          toast({
            title: 'File too large',
            description: `${file.name} is larger than 8MB. Please choose a smaller image.`,
            variant: 'destructive'
          });
          continue;
        }

        const imageUrl = await uploadImageToStorage(file);
        newImages.push(imageUrl);
      }

      setImages(prev => [...prev, ...newImages]);
      
      if (newImages.length > 0) {
        toast({
          title: 'Images uploaded',
          description: `${newImages.length} image(s) uploaded successfully`
        });
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload images. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploadingImages(false);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) return;

    setLoading(true);

    try {
      const currentAttributes = product.attributes as any || {};
      
      const updateData = {
        title: formData.title,
        description: formData.description,
        price_cents: parseInt(formData.price_cents) * 100,
        currency: formData.currency,
        category_slug: formData.category_slug as any,
        subcategory_slug: (formData.subcategory_slug || null) as any,
        sku: formData.sku || `SKU-${Date.now()}`,
        stock_qty: parseInt(formData.stock_qty) || 0,
        external_url: formData.external_url,
        media_urls: images,
        attributes: {
          ...currentAttributes,
          size_chart: sizeChartUrl
        },
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

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock">Stock Quantity</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock_qty}
                onChange={(e) => handleInputChange('stock_qty', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                placeholder="Auto-generated if empty"
              />
            </div>
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

          <div>
            <Label>Product Images</Label>
            <div className="mt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImages}
                className="w-full h-32 border-2 border-dashed hover:bg-gray-50"
              >
                <div className="text-center">
                  {uploadingImages ? (
                    <>
                      <Loader2 className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
                      <p className="text-sm text-gray-500 mt-2">Uploading images...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-500 mt-2">Click to upload images</p>
                      <p className="text-xs text-gray-400">JPG, PNG, GIF up to 8MB each</p>
                    </>
                  )}
                </div>
              </Button>
            </div>

            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Product ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <SizeChartUpload
            currentSizeChart={sizeChartUrl}
            onSizeChartUpdate={setSizeChartUrl}
            productId={product.id}
          />

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploadingImages}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Product'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
