import React, { useState, useEffect, useRef } from 'react';
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
import { CATEGORY_TREE, getAllCategories, getSubcategoriesForCategory, getCategoryDisplayName, getSubcategoryDisplayName, GENDER_OPTIONS, getGenderDisplayName } from '@/lib/categories';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import type { TopCategory, SubCategory, Gender } from '@/lib/categories';
interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
  userType: 'brand' | 'retailer';
  brandId?: string;
  retailerId?: string;
}
export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onProductAdded,
  userType,
  brandId,
  retailerId
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update subcategories when category changes
  useEffect(() => {
    if (formData.category_slug) {
      const subcategories = getSubcategoriesForCategory(formData.category_slug as TopCategory);
      setAvailableSubcategories(subcategories);
      // Reset subcategory when category changes
      setFormData(prev => ({
        ...prev,
        subcategory_slug: ''
      }));
    } else {
      setAvailableSubcategories([]);
    }
  }, [formData.category_slug]);
  const uploadImageToStorage = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const {
      data,
      error
    } = await supabase.storage.from('product-images').upload(fileName, file);
    if (error) throw error;
    const {
      data: publicUrl
    } = supabase.storage.from('product-images').getPublicUrl(fileName);
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
    if (!user) return;
    setLoading(true);
    try {
      const productData = {
        title: formData.title,
        description: formData.description,
        price_cents: parseInt(formData.price_cents) * 100,
        // Convert to cents
        currency: formData.currency,
        category_slug: formData.category_slug as any,
        subcategory_slug: (formData.subcategory_slug || null) as any,
        sku: formData.sku || `SKU-${Date.now()}`,
        stock_qty: parseInt(formData.stock_qty) || 0,
        external_url: formData.external_url,
        gender: formData.gender as any || null,
        media_urls: images,
        brand_id: userType === 'brand' ? brandId : null,
        retailer_id: userType === 'retailer' ? retailerId : null,
        status: 'active' as const
      };
      const {
        error
      } = await supabase.from('products').insert(productData);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Product added successfully!"
      });

      // Reset form
      setFormData({
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
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
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

          <div>
            <Label>Product Images(Up to 3 images)</Label>
            <div className="mt-2">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif" multiple onChange={handleImageUpload} className="hidden" />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingImages} className="w-full h-32 border-2 border-dashed hover:bg-gray-50">
                <div className="text-center">
                  {uploadingImages ? <>
                      <Loader2 className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
                      <p className="text-sm text-gray-500 mt-2">Uploading images...</p>
                    </> : <>
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-500 mt-2">Click to upload images</p>
                      <p className="text-xs text-gray-400">JPG, PNG, GIF up to 8MB each</p>
                    </>}
                </div>
              </Button>
            </div>

            {images.length > 0 && <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {images.map((image, index) => <div key={index} className="relative group">
                    <img src={image} alt={`Product ${index + 1}`} className="w-full h-24 object-cover rounded-lg border" />
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeImage(index)} className="absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>)}
              </div>}
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploadingImages} className="w-full sm:w-auto">
              {loading ? <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </> : 'Add Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>;
};