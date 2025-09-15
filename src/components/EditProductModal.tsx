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
import { Upload, X, Loader2, Trash2, User } from 'lucide-react';
import { CATEGORY_TREE, getAllCategories, getSubcategoriesForCategory, getCategoryDisplayName, getSubcategoryDisplayName, GENDER_OPTIONS, getGenderDisplayName } from '@/lib/categories';
import { SizeChartUpload } from '@/components/SizeChartUpload';
import type { TopCategory, SubCategory, Gender } from '@/lib/categories';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { useProductOutfits } from '@/hooks/useProductOutfits';
import type { Product } from '@/types';
import { imageUrlFrom, extractSupabasePath } from '@/lib/imageUrl';
import { isSupabaseAbsoluteUrl } from '@/lib/urlGuards';
interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: () => void;
}
export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onProductUpdated
}) => {
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [sizeChartUrl, setSizeChartUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Try-on outfit functionality
  const { 
    outfitAssets, 
    uploadOutfit, 
    deleteOutfit, 
    isUploading: isUploadingOutfit,
    remainingSlots 
  } = useProductOutfits(product?.brand_id);
  
  const productOutfit = outfitAssets.find(asset => asset.product_id === product?.id);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_cents: '',
    currency: 'USD',
    category_slug: '',
    subcategory_slug: '',
    gender: '',
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
        gender: (product as any).gender || '',
        sku: product.sku || '',
        stock_qty: product.stock_qty?.toString() || '0',
        external_url: product.external_url || ''
      });

      // Set existing images
      const mediaUrls = Array.isArray(product.media_urls) ? product.media_urls : typeof product.media_urls === 'string' ? [product.media_urls] : [];
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
        setFormData(prev => ({
          ...prev,
          subcategory_slug: ''
        }));
      }
    } else {
      setAvailableSubcategories([]);
    }
  }, [formData.category_slug]);
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const uploadImageToStorage = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const {
      data,
      error
    } = await supabase.storage.from('product-images').upload(fileName, file);
    if (error) throw error;
    
    // Store relative path format for mobile-friendly URLs
    return `product-images/${fileName}`;
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
        gender: formData.gender as any || null,
        media_urls: images,
        attributes: {
          ...currentAttributes,
          size_chart: sizeChartUrl
        },
        updated_at: new Date().toISOString()
      };
      const {
        error
      } = await supabase.from('products').update(updateData).eq('id', product.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Product updated successfully!"
      });
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
  const handleDelete = async () => {
    if (!product || !user) return;
    const confirmed = window.confirm('Are you sure you want to delete this product? This action cannot be undone.');
    if (!confirmed) return;
    setLoading(true);
    try {
      // First try to delete related records to avoid foreign key constraints
      const deletePromises = [supabase.from('cart_items').delete().eq('product_id', product.id), supabase.from('closet_items').delete().eq('product_id', product.id), supabase.from('likes').delete().eq('product_id', product.id), supabase.from('swipes').delete().eq('product_id', product.id), supabase.from('post_products').delete().eq('product_id', product.id)];

      // Execute all deletions
      await Promise.allSettled(deletePromises);

      // Now delete the product itself - use hard delete for better UX
      const {
        error
      } = await supabase.from('products').delete().eq('id', product.id);
      if (error) {
        // If hard delete fails due to enum validation, fallback to soft delete
        console.warn('Hard delete failed, trying soft delete:', error);
        const {
          error: softError
        } = await supabase.from('products').update({
          status: 'archived',
          updated_at: new Date().toISOString()
        }).eq('id', product.id);
        if (softError) throw softError;
      }
      toast({
        title: "Success",
        description: "Product deleted successfully!"
      });
      onProductUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  if (!product) return null;
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Product Name *</Label>
              <Input id="title" value={formData.title} onChange={e => handleInputChange('title', e.target.value)} required />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label htmlFor="price">Price *</Label>
                <Input id="price" type="number" step="0.01" value={formData.price_cents} onChange={e => handleInputChange('price_cents', e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="currency">Currency *</Label>
                <Select value={formData.currency} onValueChange={value => handleInputChange('currency', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map(currency => <SelectItem key={currency.code} value={currency.code}>
                        {currency.code}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={formData.description} onChange={e => handleInputChange('description', e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category_slug} onValueChange={value => handleInputChange('category_slug', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {getAllCategories().map(category => <SelectItem key={category} value={category}>
                      {getCategoryDisplayName(category)}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subcategory">Subcategory</Label>
              <Select value={formData.subcategory_slug} onValueChange={value => handleInputChange('subcategory_slug', value)} disabled={!formData.category_slug}>
                <SelectTrigger>
                  <SelectValue placeholder={formData.category_slug ? "Select subcategory" : "Select category first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSubcategories.map(subcategory => <SelectItem key={subcategory} value={subcategory}>
                      {getSubcategoryDisplayName(subcategory)}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={value => handleInputChange('gender', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map(gender => <SelectItem key={gender} value={gender}>
                      {getGenderDisplayName(gender)}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock">Stock Quantity</Label>
              <Input id="stock" type="number" value={formData.stock_qty} onChange={e => handleInputChange('stock_qty', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={formData.sku} onChange={e => handleInputChange('sku', e.target.value)} placeholder="Auto-generated if empty" />
            </div>
          </div>

          <div>
            <Label htmlFor="external_url">Shop Now URL</Label>
            <Input id="external_url" type="url" value={formData.external_url} onChange={e => handleInputChange('external_url', e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-4">
            <Label>Product Images (up to 4 images)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative aspect-square">
                  <img 
                    src={(() => {
                      if (isSupabaseAbsoluteUrl(image)) {
                        const pathData = extractSupabasePath(image);
                        return pathData ? imageUrlFrom(pathData.bucket, pathData.path) : image;
                      }
                      return image.includes('/') ? imageUrlFrom(image.split('/')[0], image.split('/').slice(1).join('/')) : image;
                    })()} 
                    alt={`Product ${index + 1}`} 
                    className="w-full h-full object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {images.length < 4 && (
                <label className="relative aspect-square border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/40 transition-colors flex flex-col items-center justify-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImages}
                  />
                  {uploadingImages ? (
                    <div className="flex flex-col items-center space-y-2">
                      <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                      <span className="text-xs text-muted-foreground">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground text-center px-2">Add Image</span>
                    </div>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* Size Chart & Virtual Try-On Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Size Chart Section */}
            <div className="space-y-2">
              <SizeChartUpload currentSizeChart={sizeChartUrl} onSizeChartUpdate={setSizeChartUrl} productId={product.id} />
            </div>

            {/* Virtual Try-On Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Virtual Try-On</Label>
                <span className="text-xs text-muted-foreground">
                  ({5 - (outfitAssets?.length || 0)}/5)
                </span>
              </div>
              
              {productOutfit ? (
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Outfit configured</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => deleteOutfit(product.id)}
                      className="text-destructive hover:text-destructive h-6 px-2 text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                  <img 
                    src={productOutfit.outfit_image_url} 
                    alt="Outfit preview" 
                    className="w-full h-20 object-cover rounded border"
                  />
                </div>
              ) : (
                <div className="border rounded-lg p-3 space-y-2">
                  {remainingSlots > 0 ? (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && product) {
                            uploadOutfit({ 
                              productId: product.id, 
                              brandId: product.brand_id!, 
                              file 
                            });
                          }
                        }}
                        className="hidden"
                        id="outfit-upload"
                      />
                      <label 
                        htmlFor="outfit-upload" 
                        className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-muted-foreground/25 rounded cursor-pointer hover:border-muted-foreground/50 transition-colors"
                      >
                        {isUploadingOutfit ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="text-xs text-muted-foreground mt-1">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground mt-1">Upload outfit</span>
                          </>
                        )}
                      </label>
                      <p className="text-xs text-muted-foreground text-center">
                        Front-facing outfit photo for virtual try-on
                      </p>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
                      <User className="h-4 w-4 mb-1 opacity-50" />
                      <span className="text-xs">Try-on limit reached (5/5 products)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

           <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Product
            </Button>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || uploadingImages}
                className="w-full sm:w-auto"
              >
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
          </div>
        </form>
      </DialogContent>
    </Dialog>;
};