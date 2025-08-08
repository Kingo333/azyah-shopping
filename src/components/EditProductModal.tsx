import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Plus, Save } from 'lucide-react';
import { Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SizeChartUpload } from '@/components/SizeChartUpload';

// Define valid categories based on the database enum
const categories = [
  'accessories',
  'beauty',
  'clothing',
  'footwear',
  'fragrance',
  'giftcards',
  'home',
  'jewelry',
  'kids',
  'modestwear'
] as const;

type CategoryType = typeof categories[number];

interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated?: () => void;
}

interface FormData {
  title: string;
  description: string;
  price: number | string;
  comparePrice: number | string;
  category: CategoryType;
  subcategory: string;
  stock: number | string;
  sku: string;
  externalUrl: string;
  weight: number | string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  attributes: {
    gender_target: string;
    size_system: string;
    size: string;
    color_primary: string;
    pattern: string;
    material: string;
    occasion: string;
    season: string;
    style_tags: string;
  };
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onProductUpdated
}) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    price: '',
    comparePrice: '',
    category: 'clothing',
    subcategory: '',
    stock: '',
    sku: '',
    externalUrl: '',
    weight: '',
    tags: '',
    seoTitle: '',
    seoDescription: '',
    attributes: {
      gender_target: '',
      size_system: '',
      size: '',
      color_primary: '',
      pattern: '',
      material: '',
      occasion: '',
      season: '',
      style_tags: ''
    }
  });
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sizeChart, setSizeChart] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title,
        description: product.description || '',
        price: product.price_cents / 100,
        comparePrice: product.compare_at_price_cents ? product.compare_at_price_cents / 100 : '',
        category: product.category_slug as CategoryType,
        subcategory: product.subcategory_slug || '',
        stock: product.stock_qty,
        sku: product.sku,
        externalUrl: product.external_url || '',
        weight: product.weight_grams || '',
        tags: product.tags?.join(', ') || '',
        seoTitle: product.seo_title || '',
        seoDescription: product.seo_description || '',
        attributes: {
          gender_target: product.attributes?.gender_target || '',
          size_system: product.attributes?.size_system || '',
          size: product.attributes?.size || '',
          color_primary: product.attributes?.color_primary || '',
          pattern: product.attributes?.pattern || '',
          material: product.attributes?.material || '',
          occasion: product.attributes?.occasion || '',
          season: product.attributes?.season || '',
          style_tags: product.attributes?.style_tags?.join(', ') || ''
        }
      });
      setImages(Array.isArray(product.media_urls) ? product.media_urls : []);
      setSizeChart(product.attributes?.size_chart || null);
    }
  }, [product]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles = Array.from(files).filter(file => {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a supported image format. Please upload JPG, PNG, or GIF images.`,
          variant: 'destructive'
        });
        return false;
      }

      // Validate file size (max 8MB)
      if (file.size > 8 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 8MB. Please choose a smaller image.`,
          variant: 'destructive'
        });
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    setUploadingImages(true);

    try {
      const newImages: string[] = [];
      
      for (const file of validFiles) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = (e) => {
            const result = e.target?.result as string;
            resolve(result);
          };
          reader.onerror = reject;
        });
        
        reader.readAsDataURL(file);
        const base64String = await base64Promise;
        newImages.push(base64String);
      }

      setImages(prev => [...prev, ...newImages]);
      toast({
        title: 'Images uploaded',
        description: `${validFiles.length} image(s) have been uploaded successfully`
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload images. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAttributeChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [key]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setIsSaving(true);

    try {
      const updateData = {
        title: formData.title,
        description: formData.description,
        price_cents: Math.round(parseFloat(formData.price.toString()) * 100),
        compare_at_price_cents: formData.comparePrice ? Math.round(parseFloat(formData.comparePrice.toString()) * 100) : null,
        category_slug: formData.category,
        subcategory_slug: formData.subcategory || null,
        stock_qty: parseInt(formData.stock.toString()),
        sku: formData.sku,
        external_url: formData.externalUrl || null,
        weight_grams: formData.weight ? parseInt(formData.weight.toString()) : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        seo_title: formData.seoTitle || null,
        seo_description: formData.seoDescription || null,
        media_urls: images,
        attributes: {
          ...formData.attributes,
          style_tags: formData.attributes.style_tags ? formData.attributes.style_tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
          size_chart: sizeChart
        }
      };

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', product.id);

      if (error) throw error;

      toast({
        title: 'Product updated',
        description: 'Product has been updated successfully'
      });

      onProductUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Product Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="price">Price ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="comparePrice">Compare Price ($)</Label>
                  <Input
                    id="comparePrice"
                    type="number"
                    step="0.01"
                    value={formData.comparePrice}
                    onChange={(e) => handleInputChange('comparePrice', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => handleInputChange('stock', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="externalUrl">External URL</Label>
                <Input
                  id="externalUrl"
                  type="url"
                  value={formData.externalUrl}
                  onChange={(e) => handleInputChange('externalUrl', e.target.value)}
                  placeholder="https://your-store.com/product"
                />
              </div>
            </div>

            {/* Categories and Attributes */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat.replace('-', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subcategory</Label>
                  <Select value={formData.subcategory} onValueChange={(value) => handleInputChange('subcategory', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize">
                          {cat.replace('-', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Product Attributes */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Product Attributes</Label>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Gender Target</Label>
                    <Select value={formData.attributes.gender_target} onValueChange={(value) => handleAttributeChange('gender_target', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="women">Women</SelectItem>
                        <SelectItem value="men">Men</SelectItem>
                        <SelectItem value="unisex">Unisex</SelectItem>
                        <SelectItem value="kids">Kids</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Size System</Label>
                    <Select value={formData.attributes.size_system} onValueChange={(value) => handleAttributeChange('size_system', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">US</SelectItem>
                        <SelectItem value="UK">UK</SelectItem>
                        <SelectItem value="EU">EU</SelectItem>
                        <SelectItem value="CM">CM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Material</Label>
                  <Input
                    value={formData.attributes.material}
                    onChange={(e) => handleAttributeChange('material', e.target.value)}
                    placeholder="Cotton, Polyester, etc."
                  />
                </div>

                <div>
                  <Label className="text-xs">Style Tags (comma-separated)</Label>
                  <Input
                    value={formData.attributes.style_tags}
                    onChange={(e) => handleAttributeChange('style_tags', e.target.value)}
                    placeholder="trendy, casual, elegant"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Images Section */}
          <div>
            <Label>Product Images</Label>
            <div className="space-y-4">
              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Product image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <Label htmlFor="images" className="cursor-pointer">
                    <Button type="button" variant="outline" disabled={uploadingImages}>
                      <Plus className="h-4 w-4 mr-2" />
                      {uploadingImages ? 'Uploading...' : 'Add Images'}
                    </Button>
                  </Label>
                  <Input
                    id="images"
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Supports JPG, PNG, GIF up to 8MB each
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Size Chart Upload */}
          <SizeChartUpload
            currentSizeChart={sizeChart}
            onSizeChartUpdate={setSizeChart}
            productId={product.id}
          />

          {/* SEO Section */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">SEO & Additional Info</Label>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input
                  id="seoTitle"
                  value={formData.seoTitle}
                  onChange={(e) => handleInputChange('seoTitle', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="seoDescription">SEO Description</Label>
                <Textarea
                  id="seoDescription"
                  value={formData.seoDescription}
                  onChange={(e) => handleInputChange('seoDescription', e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  placeholder="trendy, summer, casual"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
