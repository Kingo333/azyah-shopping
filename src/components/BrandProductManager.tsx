import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Upload, Edit, Trash2, Image, Shirt, Loader2, CheckCircle, Box, ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateGLBModel } from '@/ar/utils/modelValidator';
import { AlertTriangle as AlertTriangleIcon } from 'lucide-react';

const GARMENT_TYPES = [
  { value: 'shirt', label: 'Shirt / Top' },
  { value: 'abaya', label: 'Abaya / Dress' },
  { value: 'pants', label: 'Pants / Bottoms' },
  { value: 'jacket', label: 'Jacket / Outerwear' },
  { value: 'headwear', label: 'Headwear' },
  { value: 'accessory', label: 'Accessory' },
] as const;

interface EventBrandProduct {
  id: string;
  image_url: string;
  try_on_data: any;
  sort_order: number;
  created_at: string;
  product_id?: string;
  ar_model_url?: string;
  ar_overlay_url?: string;
  ar_enabled?: boolean;
  ar_scale?: number;
  garment_type?: string;
  ar_preferred_mode?: string;
}

interface EventBrand {
  id: string;
  brand_name: string;
  logo_url?: string;
}

interface BrandProductManagerProps {
  brand: EventBrand;
  onBack: () => void;
}

export const BrandProductManager = ({ brand, onBack }: BrandProductManagerProps) => {
  const [products, setProducts] = useState<EventBrandProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EventBrandProduct | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [uploadingOutfit, setUploadingOutfit] = useState(false);
  const [uploadingARModel, setUploadingARModel] = useState(false);
  const [uploadingOverlay, setUploadingOverlay] = useState(false);
  // forceReupload removed — legacy BitStudio UI
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, [brand.id]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('event_brand_products')
        .select('*')
        .eq('event_brand_id', brand.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB per file
    onDrop: async (acceptedFiles) => {
      if (products.length + acceptedFiles.length > 5) {
        toast({
          title: "Error", 
          description: `Cannot upload ${acceptedFiles.length} files. Maximum 5 products per brand (${products.length} already uploaded)`,
          variant: "destructive"
        });
        return;
      }

      setIsUploading(true);
      try {
        for (const file of acceptedFiles) {
          await uploadProductImage(file);
        }
        fetchProducts();
      } catch (error) {
        console.error('Error uploading files:', error);
      } finally {
        setIsUploading(false);
      }
    }
  });

  const uploadProductImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${brand.id}/products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('event-assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('event-assets')
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase
      .from('event_brand_products')
      .insert({
        event_brand_id: brand.id,
        image_url: data.publicUrl,
        try_on_data: {},
        sort_order: products.length
      });

    if (insertError) throw insertError;
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('event_brand_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully"
      });

      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive"
      });
    }
  };

  const openEditModal = (product: EventBrandProduct) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleUpdateTryOnData = async (tryOnData: any) => {
    if (!editingProduct) return;

    try {
      const { error } = await supabase
        .from('event_brand_products')
        .update({
          try_on_data: tryOnData,
          try_on_provider: 'bitstudio',
          try_on_ready: !!tryOnData.outfit_image_path,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Try-on data configured (Gemini provider)"
      });

      setIsEditModalOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error: any) {
      console.error('Error updating try-on data:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Brands
        </Button>
        <div className="flex items-center space-x-3">
          {brand.logo_url && (
            <img
              src={brand.logo_url}
              alt={`${brand.brand_name} logo`}
              className="w-8 h-8 object-contain"
            />
          )}
          <div>
            <h2 className="text-2xl font-bold">{brand.brand_name} Products</h2>
            <p className="text-muted-foreground">
              Manage product images for virtual try-on (max 5 products)
            </p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      {products.length < 5 && (
        <Card>
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Upload Product Images
              </h3>
              <p className="text-muted-foreground mb-2">
                Drag & drop up to {5 - products.length} product images or click to select
              </p>
              <p className="text-sm text-muted-foreground">
                {products.length}/5 products uploaded
              </p>
              {isUploading && (
                <p className="text-sm text-primary mt-2">Uploading...</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Image className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No products uploaded yet</p>
            <p className="text-sm text-muted-foreground">
              Upload product images to enable virtual try-on for shoppers
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Product Image</CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(product)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 relative">
                  <img
                    src={product.image_url}
                    alt="Product"
                    className="w-full h-48 object-cover rounded"
                  />
                    {product.try_on_data?.outfit_bitstudio_id && (
                      <Badge variant="outline" className="absolute top-2 right-2 bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Try-On Ready
                      </Badge>
                    )}
                    {product.ar_enabled && product.ar_model_url && !product.ar_overlay_url && (
                      <Badge variant="outline" className="absolute top-2 left-2 bg-purple-50 text-purple-700 border-purple-200">
                        3D AR
                      </Badge>
                    )}
                    {product.ar_overlay_url && !product.ar_model_url && (
                      <Badge variant="outline" className="absolute top-2 left-2 bg-blue-50 text-blue-700 border-blue-200">
                        2D AR
                      </Badge>
                    )}
                    {product.ar_overlay_url && product.ar_model_url && (
                      <Badge variant="outline" className="absolute top-2 left-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                        {product.ar_preferred_mode === '3d' ? '3D AR' : product.ar_preferred_mode === '2d' ? '2D AR' : '2D+3D AR'}
                      </Badge>
                    )}
                    {product.ar_enabled && product.garment_type && product.garment_type !== 'shirt' && (
                      <Badge variant="outline" className="absolute top-8 left-2 bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                        {GARMENT_TYPES.find(t => t.value === product.garment_type)?.label || product.garment_type}
                      </Badge>
                    )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shirt className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {Object.keys(product.try_on_data || {}).length > 0 ? 'Try-on ready' : 'No try-on data'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(product)}
                    >
                      {Object.keys(product.try_on_data || {}).length > 0 ? 'Edit' : 'Add'} Try-on
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Try-on Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        setIsEditModalOpen(open);
        if (!open) {
          setValidationErrors([]);
          setValidationWarnings([]);
        }
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Configure Virtual Try-On</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              {/* Compact product header */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <img
                  src={editingProduct.image_url}
                  alt="Product"
                  className="w-14 h-14 object-cover rounded-md border"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Product Image</p>
                  <div className="flex items-center gap-2 mt-1">
                    {editingProduct.try_on_data?.outfit_image_url && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Try-On Ready
                      </Badge>
                    )}
                    {editingProduct.ar_enabled && editingProduct.ar_model_url && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                        AR
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* AR Mode Selector */}
              {(editingProduct.ar_overlay_url || editingProduct.ar_model_url) && (
                <div className="p-3 rounded-lg border bg-muted/30">
                  <label className="text-sm font-medium">AR Display Mode</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Choose which AR experience shoppers see for this product.
                  </p>
                  <Select
                    value={editingProduct.ar_preferred_mode || 'auto'}
                    onValueChange={async (value) => {
                      try {
                        await supabase
                          .from('event_brand_products')
                          .update({ ar_preferred_mode: value, updated_at: new Date().toISOString() })
                          .eq('id', editingProduct.id);
                        setEditingProduct(prev => prev ? { ...prev, ar_preferred_mode: value } : prev);
                        toast({ title: "AR mode updated", description: `Set to ${value === 'auto' ? 'Auto' : value === '2d' ? '2D Overlay' : '3D Model'}` });
                        fetchProducts();
                      } catch (error: any) {
                        toast({ title: "Error", description: error.message, variant: "destructive" });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (system picks best)</SelectItem>
                      <SelectItem value="2d" disabled={!editingProduct.ar_overlay_url}>2D Overlay{!editingProduct.ar_overlay_url ? ' (no overlay uploaded)' : ''}</SelectItem>
                      <SelectItem value="3d" disabled={!editingProduct.ar_model_url}>3D Model{!editingProduct.ar_model_url ? ' (no model uploaded)' : ''}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Tabbed content */}
              <Tabs defaultValue="image" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="image" className="flex-1 gap-1.5">
                    <Shirt className="w-4 h-4" />
                    Image Try-On
                  </TabsTrigger>
                  <TabsTrigger value="overlay" className="flex-1 gap-1.5">
                    <ImageIcon className="w-4 h-4" />
                    2D AR Overlay
                  </TabsTrigger>
                  <TabsTrigger value="ar" className="flex-1 gap-1.5">
                    <Box className="w-4 h-4" />
                    3D AR Model
                  </TabsTrigger>
                </TabsList>

                {/* ── Tab 1: Image Try-On ── */}
                <TabsContent value="image" className="space-y-4 pt-2">
                  <div>
                    <label className="text-sm font-medium">Upload Outfit Image</label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Upload the product outfit image for virtual try-on
                    </p>

                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          if (!file.type.startsWith('image/')) {
                            toast({ title: "Invalid file type", description: "Please select an image file", variant: "destructive" });
                            return;
                          }
                          if (file.size > 10 * 1024 * 1024) {
                            toast({ title: "File too large", description: "Please select an image under 10MB", variant: "destructive" });
                            return;
                          }

                          try {
                            setUploadingOutfit(true);
                            const { data: brandData } = await supabase
                              .from('event_brands')
                              .select('event_id')
                              .eq('id', brand.id)
                              .single();
                            if (!brandData) throw new Error('Failed to get event_id');

                            const fileExt = file.name.split('.').pop();
                            const fileName = `outfit_${editingProduct.id}_${Date.now()}.${fileExt}`;
                            const filePath = `${brandData.event_id}/${brand.id}/${fileName}`;

                            const { error: uploadError } = await supabase.storage
                              .from('event-assets')
                              .upload(filePath, file, { contentType: file.type, upsert: true });
                            if (uploadError) throw uploadError;

                            const { data: urlData } = supabase.storage
                              .from('event-assets')
                              .getPublicUrl(filePath);

                            const updatedTryOnData = {
                              ...editingProduct.try_on_data,
                              outfit_image_path: filePath,
                              outfit_image_url: urlData.publicUrl,
                            };

                            setEditingProduct(prev => prev ? { ...prev, try_on_data: updatedTryOnData } : prev);

                            await supabase
                              .from('event_brand_products')
                              .update({
                                try_on_data: updatedTryOnData,
                                try_on_config: { outfit_image_url: urlData.publicUrl, outfitImagePath: filePath },
                                try_on_provider: 'thenewblack',
                                try_on_ready: true,
                                updated_at: new Date().toISOString()
                              })
                              .eq('id', editingProduct.id);

                            toast({ title: "Configuration saved", description: "Outfit uploaded and ready for virtual try-on" });
                            await fetchProducts();
                            setIsEditModalOpen(false);
                            setEditingProduct(null);
                          } catch (error: any) {
                            console.error('[BrandProductManager] Upload error:', error);
                            toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                          } finally {
                            setUploadingOutfit(false);
                            e.target.value = '';
                          }
                        }}
                        className="w-full p-2 border rounded"
                        disabled={uploadingOutfit}
                      />
                      {uploadingOutfit && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded">
                          <div className="flex items-center gap-2 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading…
                          </div>
                        </div>
                      )}
                    </div>

                    {editingProduct.try_on_data?.outfit_image_url && (
                      <div className="mt-3 flex items-center gap-3">
                        <img
                          src={editingProduct.try_on_data.outfit_image_url}
                          alt="Outfit preview"
                          className="w-16 h-16 object-cover rounded border"
                        />
                        <p className="text-xs text-green-600">Outfit configured for try-on</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                      Close
                    </Button>
                  </div>
                </TabsContent>

                {/* ── Tab 2: 2D AR Overlay ── */}
                <TabsContent value="overlay" className="space-y-4 pt-2">
                  <div>
                    <label className="text-sm font-medium">Upload 2D Garment Image</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Upload a front-view garment image with <strong>transparent background</strong> (PNG or WebP).
                      This enables fast 2D AR overlay on the shopper's body.
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      <strong>Tips:</strong> Use <a href="https://www.remove.bg" target="_blank" rel="noopener noreferrer" className="underline text-primary">remove.bg</a> to cut out the background. Image should be centered, upright, 800-2000px wide, under 2MB.
                    </p>

                    <input
                      type="file"
                      accept=".png,.webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        if (!['image/png', 'image/webp'].includes(file.type)) {
                          toast({ title: "Invalid file type", description: "Please upload a PNG or WebP with transparent background", variant: "destructive" });
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          toast({ title: "File too large", description: "Please select an image under 5MB", variant: "destructive" });
                          return;
                        }

                        // Alpha/transparency validation
                        try {
                          const hasAlpha = await new Promise<boolean>((resolve) => {
                            const img = new window.Image();
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              const size = Math.min(img.width, img.height, 100);
                              canvas.width = img.width;
                              canvas.height = img.height;
                              const ctx = canvas.getContext('2d')!;
                              ctx.drawImage(img, 0, 0);
                              // Sample edges
                              let transparentPixels = 0;
                              const samples = [
                                ctx.getImageData(0, 0, img.width, 1), // top row
                                ctx.getImageData(0, img.height - 1, img.width, 1), // bottom row
                                ctx.getImageData(0, 0, 1, img.height), // left col
                                ctx.getImageData(img.width - 1, 0, 1, img.height), // right col
                              ];
                              let totalPixels = 0;
                              for (const s of samples) {
                                for (let i = 3; i < s.data.length; i += 4) {
                                  totalPixels++;
                                  if (s.data[i] < 250) transparentPixels++;
                                }
                              }
                              resolve(transparentPixels > 0);
                            };
                            img.onerror = () => resolve(true); // assume OK on error
                            img.src = URL.createObjectURL(file);
                          });
                          if (!hasAlpha) {
                            toast({ title: "Transparency warning", description: "This image may not have a transparent background. AR overlay works best with transparent PNG/WebP.", variant: "default" });
                          }
                        } catch { /* non-blocking */ }

                        try {
                          setUploadingOverlay(true);
                          const { data: brandData } = await supabase
                            .from('event_brands')
                            .select('event_id')
                            .eq('id', brand.id)
                            .single();
                          if (!brandData) throw new Error('Failed to get event_id');

                          const fileExt = file.name.split('.').pop();
                          const fileName = `${brandData.event_id}/${brand.id}/${editingProduct.id}/overlay_${Date.now()}.${fileExt}`;

                          const { error: uploadError } = await supabase.storage
                            .from('event-ar-overlays')
                            .upload(fileName, file, { contentType: file.type });
                          if (uploadError) throw uploadError;

                          const { data: urlData } = supabase.storage
                            .from('event-ar-overlays')
                            .getPublicUrl(fileName);

                          await supabase
                            .from('event_brand_products')
                            .update({
                              ar_overlay_url: urlData.publicUrl,
                              ar_enabled: true,
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', editingProduct.id);

                          setEditingProduct(prev => prev ? { ...prev, ar_overlay_url: urlData.publicUrl, ar_enabled: true } : prev);
                          toast({ title: "2D overlay uploaded!", description: "2D AR try-on is now enabled for this product" });
                          await fetchProducts();
                        } catch (error: any) {
                          console.error('AR overlay upload error:', error);
                          toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                        } finally {
                          setUploadingOverlay(false);
                          e.target.value = '';
                        }
                      }}
                      className="w-full p-2 border rounded"
                      disabled={uploadingOverlay}
                    />

                    {uploadingOverlay && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading overlay…
                      </div>
                    )}

                    {editingProduct.ar_overlay_url && (
                      <div className="mt-3 flex items-center gap-3 p-2 rounded-md bg-muted/50">
                        <img
                          src={editingProduct.ar_overlay_url}
                          alt="2D overlay preview"
                          className="w-16 h-16 object-contain rounded border bg-[repeating-conic-gradient(#80808015_0%_25%,transparent_0%_50%)_0_0/20px_20px]"
                        />
                        <div>
                          <p className="text-xs text-green-600 font-medium">2D overlay configured</p>
                          <p className="text-xs text-muted-foreground">Set preferred mode above to control which AR path shoppers see</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                      Close
                    </Button>
                  </div>
                </TabsContent>

                {/* ── Tab 3: 3D AR Model ── */}
                <TabsContent value="ar" className="space-y-4 pt-2">
                  {/* Garment type */}
                  <div>
                    <label className="text-sm font-medium">Garment Type</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Select the type of garment to optimize AR placement.
                    </p>
                    <Select
                      value={editingProduct.garment_type || 'shirt'}
                      onValueChange={async (value) => {
                        try {
                          await supabase
                            .from('event_brand_products')
                            .update({ garment_type: value, updated_at: new Date().toISOString() })
                            .eq('id', editingProduct.id);
                          setEditingProduct(prev => prev ? { ...prev, garment_type: value } : prev);
                          toast({ title: "Garment type updated", description: `Set to ${GARMENT_TYPES.find(t => t.value === value)?.label || value}` });
                          fetchProducts();
                        } catch (error: any) {
                          toast({ title: "Error", description: error.message || "Failed to update garment type", variant: "destructive" });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select garment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {GARMENT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  {editingProduct.ar_model_url && editingProduct.ar_enabled && (
                    <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-md">
                      <CheckCircle className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-purple-700">AR model uploaded — AR enabled</span>
                    </div>
                  )}

                  {/* GLB upload */}
                  <div>
                    <label className="text-sm font-medium">Upload 3D Model (.glb)</label>
                    <p className="text-xs text-muted-foreground mb-1">
                      Max 50 MB. For best AR performance, keep models under 10 MB.
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong>Tip:</strong> Use <a href="https://gltf-transform.dev/cli" target="_blank" rel="noopener noreferrer" className="underline text-primary">gltf-transform</a> to apply Draco compression (60-90% smaller).
                      Generate from images with{' '}
                      <a href="https://meshy.ai" target="_blank" rel="noopener noreferrer" className="underline text-primary">Meshy.ai</a>{' '}or{' '}
                      <a href="https://tripo3d.ai" target="_blank" rel="noopener noreferrer" className="underline text-primary">Tripo3D</a>.
                    </p>

                    <input
                      type="file"
                      accept=".glb,.gltf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
                        if (!['.glb', '.gltf'].includes(ext)) {
                          toast({ title: "Invalid file type", description: "Please upload a .glb or .gltf file", variant: "destructive" });
                          return;
                        }

                        if (file.size > 50 * 1024 * 1024) {
                          toast({ title: "File too large", description: "Please select a 3D model under 50 MB", variant: "destructive" });
                          return;
                        }

                        try {
                          setUploadingARModel(true);

                          const validation = await validateGLBModel(file);
                          setValidationErrors(validation.errors);
                          setValidationWarnings(validation.warnings);

                          if (!validation.valid) {
                            toast({ title: "Model validation failed", description: validation.errors[0] || "The 3D model has structural issues", variant: "destructive" });
                            setUploadingARModel(false);
                            e.target.value = '';
                            return;
                          }

                          if (validation.warnings.length > 0) {
                            toast({ title: "Model uploaded with warnings", description: `${validation.warnings.length} warning(s) detected. Check details below.` });
                          }

                          const { data: brandData } = await supabase
                            .from('event_brands')
                            .select('event_id')
                            .eq('id', brand.id)
                            .single();
                          if (!brandData) throw new Error('Failed to get event_id');

                          const fileName = `${brandData.event_id}/${brand.id}/${editingProduct.id}/${Date.now()}${ext}`;

                          const { error: uploadError } = await supabase.storage
                            .from('event-ar-models')
                            .upload(fileName, file, {
                              contentType: ext === '.glb' ? 'model/gltf-binary' : 'model/gltf+json'
                            });
                          if (uploadError) throw uploadError;

                          const { data: urlData } = supabase.storage
                            .from('event-ar-models')
                            .getPublicUrl(fileName);

                          await supabase
                            .from('event_brand_products')
                            .update({ ar_model_url: urlData.publicUrl, ar_enabled: true, updated_at: new Date().toISOString() })
                            .eq('id', editingProduct.id);

                          setEditingProduct(prev => prev ? { ...prev, ar_model_url: urlData.publicUrl, ar_enabled: true } : prev);
                          toast({ title: "3D model uploaded!", description: "AR try-on is now enabled for this product" });
                          setValidationErrors([]);
                          setValidationWarnings([]);
                          await fetchProducts();
                        } catch (error: any) {
                          console.error('AR model upload error:', error);
                          toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                        } finally {
                          setUploadingARModel(false);
                          e.target.value = '';
                        }
                      }}
                      className="w-full p-2 border rounded"
                      disabled={uploadingARModel}
                    />

                    {uploadingARModel && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Validating & uploading…
                      </div>
                    )}

                    {validationErrors.length > 0 && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm font-medium text-red-800 flex items-center gap-1">
                          <AlertTriangleIcon className="w-4 h-4" />
                          Model validation failed:
                        </p>
                        <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                          {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                      </div>
                    )}
                    {validationWarnings.length > 0 && validationErrors.length === 0 && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm font-medium text-yellow-800 flex items-center gap-1">
                          <AlertTriangleIcon className="w-4 h-4" />
                          Model warnings:
                        </p>
                        <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                          {validationWarnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                      Close
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};