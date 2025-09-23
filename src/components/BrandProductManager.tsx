import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Upload, Edit, Trash2, Image, Shirt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EventBrandProduct {
  id: string;
  image_url: string;
  try_on_data: any;
  sort_order: number;
  created_at: string;
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
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Try-on data updated successfully"
      });

      setIsEditModalOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error: any) {
      console.error('Error updating try-on data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update try-on data",
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
            <Card key={product.id}>
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
                <div className="space-y-3">
                  <img
                    src={product.image_url}
                    alt="Product"
                    className="w-full h-48 object-cover rounded"
                  />
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
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Virtual Try-On</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div className="flex space-x-4">
                <div className="w-1/2">
                  <img
                    src={editingProduct.image_url}
                    alt="Product"
                    className="w-full h-64 object-cover rounded"
                  />
                </div>
                <div className="w-1/2 space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Try-On Configuration</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure how this product should appear in virtual try-on
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Upload Outfit Image</label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Upload the product outfit image for virtual try-on
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          try {
                            // Upload outfit image to storage
                            const fileName = `outfit_${editingProduct.id}_${Date.now()}.${file.name.split('.').pop()}`;
                            const { data: uploadData, error: uploadError } = await supabase.storage
                              .from('ai-assets')
                              .upload(fileName, file);

                            if (uploadError) throw uploadError;

                            // Get public URL
                            const { data: urlData } = supabase.storage
                              .from('ai-assets')
                              .getPublicUrl(fileName);

                            // Update editing product with outfit URL
                            setEditingProduct(prev => prev ? {
                              ...prev,
                              try_on_data: { ...prev.try_on_data, outfit_image_url: urlData.publicUrl }
                            } : prev);

                            toast({
                              title: "Outfit image uploaded",
                              description: "Outfit image uploaded successfully"
                            });
                          } catch (error) {
                            console.error('Error uploading outfit image:', error);
                            toast({
                              title: "Upload failed",
                              description: "Failed to upload outfit image",
                              variant: "destructive"
                            });
                          }
                        }}
                        className="w-full p-2 border rounded"
                      />
                      {editingProduct.try_on_data?.outfit_image_url && (
                        <div className="mt-2">
                          <img
                            src={editingProduct.try_on_data.outfit_image_url}
                            alt="Outfit preview"
                            className="w-20 h-20 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleUpdateTryOnData(editingProduct.try_on_data)}
                >
                  Save Try-On Data
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};