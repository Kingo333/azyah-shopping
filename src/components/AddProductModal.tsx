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
import { Upload, X, Loader2, User } from 'lucide-react';
import { CATEGORY_TREE, getAllCategories, getSubcategoriesForCategory, getCategoryDisplayName, getSubcategoryDisplayName, GENDER_OPTIONS, getGenderDisplayName } from '@/lib/categories';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import type { TopCategory, SubCategory, Gender } from '@/lib/categories';
import { useProductOutfits } from '@/hooks/useProductOutfits';
import { imageUrlFrom, extractSupabasePath } from '@/lib/imageUrl';
import { isSupabaseAbsoluteUrl } from '@/lib/urlGuards';
import { useDropzone } from 'react-dropzone';
interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
  userType: 'brand' | 'retailer';
  brandId?: string;
  retailerId?: string;
  isEventContext?: boolean;
  onAddProductToEvent?: (productId: string) => Promise<void>;
  selectedEvent?: any;
  selectedBrandForProducts?: string;
}
export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onProductAdded,
  userType,
  brandId,
  retailerId,
  isEventContext = false,
  onAddProductToEvent,
  selectedEvent,
  selectedBrandForProducts
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
  const [outfitImageUrl, setOutfitImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkImages, setBulkImages] = useState<File[]>([]);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  
  // Try-on outfit functionality for brands
  const { 
    outfitAssets, 
    uploadOutfit, 
    deleteOutfit, 
    isUploading: isUploadingOutfit,
    remainingSlots 
  } = useProductOutfits(userType === 'brand' ? brandId : undefined);
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

  const { getRootProps: getBulkRootProps, getInputProps: getBulkInputProps } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 5,
    onDrop: (acceptedFiles) => {
      setBulkImages(acceptedFiles);
    }
  });

  const handleBulkUpload = async () => {
    if (bulkImages.length === 0) {
      toast({
        title: "No images selected",
        description: "Please select at least one image to upload",
        variant: "destructive"
      });
      return;
    }

    setIsBulkUploading(true);

    try {
      for (const [index, imageFile] of bulkImages.entries()) {
        // Upload product image
        const imageUrl = await uploadImageToStorage(imageFile);

        // Create product with minimal data
        const productData = {
          title: `Product ${index + 1}`,
          description: 'Event product - details to be added',
          price_cents: 0,
          currency: 'USD',
          category_slug: 'clothing' as any,
          subcategory_slug: 'tops' as any,
          brand_id: userType === 'brand' ? brandId : null,
          retailer_id: userType === 'retailer' ? retailerId : null,
          media_urls: [imageUrl],
          status: 'active' as const,
          external_url: null,
          sku: `EVENT-${Date.now()}-${index + 1}`,
          stock_qty: 0,
          is_event_only: isEventContext // Mark as event-only if this is for an event
        };

        const { data: productResult, error: productError } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();

        if (productError) throw productError;

        // Connect product to event if this is for an event
        if (isEventContext && onAddProductToEvent) {
          try {
            await onAddProductToEvent(productResult.id);
          } catch (eventError) {
            console.warn('Failed to connect product to event:', eventError);
          }
        }

        // Upload the same image as outfit for try-on
        if (userType === 'retailer' && retailerId) {
          try {
            await uploadOutfit({
              productId: productResult.id,
              brandId: retailerId, // Use retailer ID for outfit association
              file: imageFile
            });
          } catch (outfitError) {
            console.warn('Failed to upload outfit image:', outfitError);
          }
        }
      }

      toast({
        title: "Success",
        description: `${bulkImages.length} products created successfully`
      });

      setBulkImages([]);
      onProductAdded();
      onClose();
    } catch (error: any) {
      console.error('Bulk upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to create products",
        variant: "destructive"
      });
    } finally {
      setIsBulkUploading(false);
    }
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
        attributes: {
          size_chart: sizeChartUrl
        },
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
      setSizeChartUrl(null);
      setOutfitImageUrl(null);
      setBulkImages([]);
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
          <DialogTitle>
            {isEventContext ? 'Add Event Products' : 'Add New Product'}
          </DialogTitle>
        </DialogHeader>

        {isEventContext ? (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Upload up to 5 product images. Each image will create a product that can be edited later.
              </p>
              
              <div 
                {...getBulkRootProps()} 
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 cursor-pointer hover:border-muted-foreground/50 transition-colors"
              >
                <input {...getBulkInputProps()} />
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium">Drop images here or click to select</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Maximum 5 images • JPG, PNG, WEBP
                  </p>
                </div>
              </div>

              {bulkImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">{bulkImages.length} images selected:</p>
                  <div className="grid grid-cols-5 gap-2">
                    {bulkImages.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => setBulkImages(prev => prev.filter((_, i) => i !== index))}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleBulkUpload}
                disabled={bulkImages.length === 0 || isBulkUploading}
              >
                {isBulkUploading ? 'Creating Products...' : `Create ${bulkImages.length} Products`}
              </Button>
            </div>
          </div>
        ) : (
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

          {!isEventContext && (
            <div>
              <Label htmlFor="external_url">Shop Now URL</Label>
              <Input id="external_url" type="url" value={formData.external_url} onChange={e => handleInputChange('external_url', e.target.value)} placeholder="https://..." />
            </div>
          )}


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

          {/* Size Chart & Virtual Try-On Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Size Chart Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Size Chart</Label>
              </div>
              <p className="text-sm text-muted-foreground">Upload a size chart to help customers choose the right size.</p>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!file.type.startsWith('image/')) {
                        toast({
                          title: 'Invalid file type',
                          description: 'Please select an image file',
                          variant: 'destructive'
                        });
                        return;
                      }
                      if (file.size > 8 * 1024 * 1024) {
                        toast({
                          title: 'File too large',
                          description: 'Image size must be less than 8MB',
                          variant: 'destructive'
                        });
                        return;
                      }
                      setUploadingImages(true);
                      try {
                        const url = await uploadImageToStorage(file);
                        setSizeChartUrl(url);
                        toast({
                          title: 'Success',
                          description: 'Size chart uploaded successfully'
                        });
                      } catch (error) {
                        console.error('Error uploading size chart:', error);
                        toast({
                          title: 'Upload failed',
                          description: 'Failed to upload size chart',
                          variant: 'destructive'
                        });
                      } finally {
                        setUploadingImages(false);
                        e.target.value = '';
                      }
                    }
                  }}
                  className="hidden"
                  id="size-chart-upload"
                  disabled={uploadingImages}
                />
                <label htmlFor="size-chart-upload" className="cursor-pointer block">
                  <div className="text-center">
                    {uploadingImages ? (
                      <div className="flex flex-col items-center space-y-2">
                        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                        <p className="text-sm text-muted-foreground">Uploading size chart...</p>
                      </div>
                    ) : sizeChartUrl ? (
                      <div className="flex flex-col items-center space-y-2">
                        <img 
                          src={(() => {
                            if (!sizeChartUrl) return '';
                            if (isSupabaseAbsoluteUrl(sizeChartUrl)) {
                              const pathData = extractSupabasePath(sizeChartUrl);
                              return pathData ? imageUrlFrom(pathData.bucket, pathData.path) : sizeChartUrl;
                            }
                            return sizeChartUrl.includes('/') ? imageUrlFrom(sizeChartUrl.split('/')[0], sizeChartUrl.split('/').slice(1).join('/')) : sizeChartUrl;
                          })()} 
                          alt="Size Chart" 
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <p className="text-sm text-green-600">Size chart uploaded</p>
                        <p className="text-xs text-muted-foreground">Click to change</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Upload size chart</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG up to 8MB</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
            
            {/* Virtual Try-On Section */}
            {(userType === 'brand' || userType === 'retailer') && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">Virtual Try-On</Label>
                  <span className="text-xs text-muted-foreground">
                    ({5 - (outfitAssets?.length || 0)}/5)
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Upload an outfit image to enable virtual try-on for this product.</p>
                
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (!file.type.startsWith('image/')) {
                          toast({
                            title: 'Invalid file type',
                            description: 'Please select an image file',
                            variant: 'destructive'
                          });
                          return;
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          toast({
                            title: 'File too large',
                            description: 'Image size must be less than 10MB',
                            variant: 'destructive'
                          });
                          return;
                        }
                        try {
                          const url = await uploadImageToStorage(file);
                          setOutfitImageUrl(url);
                          toast({
                            title: 'Success',
                            description: 'Outfit image uploaded successfully'
                          });
                        } catch (error) {
                          console.error('Error uploading outfit image:', error);
                          toast({
                            title: 'Upload failed',
                            description: 'Failed to upload outfit image',
                            variant: 'destructive'
                          });
                        } finally {
                          e.target.value = '';
                        }
                      }
                    }}
                    className="hidden"
                    id="outfit-upload"
                    disabled={isUploadingOutfit}
                  />
                  <label htmlFor="outfit-upload" className="cursor-pointer block">
                    <div className="text-center">
                      {isUploadingOutfit ? (
                        <div className="flex flex-col items-center space-y-2">
                          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                          <p className="text-sm text-muted-foreground">Uploading outfit image...</p>
                        </div>
                      ) : outfitImageUrl ? (
                        <div className="flex flex-col items-center space-y-2">
                          <img 
                            src={outfitImageUrl} 
                            alt="Outfit" 
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <p className="text-sm text-green-600">Outfit image uploaded</p>
                          <p className="text-xs text-muted-foreground">Click to change</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-2">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Upload outfit image</p>
                          <p className="text-xs text-muted-foreground">JPG, PNG up to 10MB</p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
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
                    Adding...
                  </>
                ) : (
                  'Add Product'
                )}
              </Button>
            </div>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>;
};