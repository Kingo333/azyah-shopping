import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Upload, Edit, Trash2, Image, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BrandProductManager } from './BrandProductManager';

interface EventBrand {
  id: string;
  brand_name: string;
  logo_url?: string;
  created_at: string;
  product_count?: number;
}

interface EventBrandManagerProps {
  eventId: string;
  eventName: string;
}

export const EventBrandManager = ({ eventId, eventName }: EventBrandManagerProps) => {
  const [brands, setBrands] = useState<EventBrand[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<EventBrand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<EventBrand | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    brand_name: '',
    logo_file: null as File | null,
    logo_preview: ''
  });

  useEffect(() => {
    fetchBrands();
  }, [eventId]);

  const fetchBrands = async () => {
    try {
      // Fetch brands with product counts
      const { data, error } = await supabase
        .from('event_brands')
        .select(`
          *,
          event_brand_products(count)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Transform data to include product count
      const brandsWithCounts = (data || []).map(brand => ({
        ...brand,
        product_count: brand.event_brand_products?.[0]?.count || 0
      }));
      
      setBrands(brandsWithCounts);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: "Error",
        description: "Failed to load brands",
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
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setFormData(prev => ({
          ...prev,
          logo_file: file,
          logo_preview: URL.createObjectURL(file)
        }));
      }
    }
  });

  const uploadLogo = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${eventId}/brands/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('event-assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('event-assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleCreateBrand = async () => {
    if (!formData.brand_name.trim()) {
      toast({
        title: "Error",
        description: "Brand name is required",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let logo_url = '';
      
      if (formData.logo_file) {
        logo_url = await uploadLogo(formData.logo_file);
      }

      const { error } = await supabase
        .from('event_brands')
        .insert({
          event_id: eventId,
          brand_name: formData.brand_name.trim(),
          logo_url: logo_url || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Brand added successfully"
      });

      setFormData({ brand_name: '', logo_file: null, logo_preview: '' });
      setIsCreateModalOpen(false);
      fetchBrands();
    } catch (error: any) {
      console.error('Error creating brand:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add brand",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBrand = async () => {
    if (!editingBrand || !formData.brand_name.trim()) return;

    setIsSubmitting(true);
    try {
      let logo_url = editingBrand.logo_url;
      
      if (formData.logo_file) {
        logo_url = await uploadLogo(formData.logo_file);
      }

      const { error } = await supabase
        .from('event_brands')
        .update({
          brand_name: formData.brand_name.trim(),
          logo_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingBrand.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Brand updated successfully"
      });

      setIsEditModalOpen(false);
      setEditingBrand(null);
      resetForm();
      fetchBrands();
    } catch (error: any) {
      console.error('Error updating brand:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update brand",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm('Are you sure you want to delete this brand? This will also delete all associated products.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('event_brands')
        .delete()
        .eq('id', brandId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Brand deleted successfully"
      });

      fetchBrands();
    } catch (error: any) {
      console.error('Error deleting brand:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete brand",
        variant: "destructive"
      });
    }
  };

  const openEditModal = (brand: EventBrand) => {
    setEditingBrand(brand);
    setFormData({
      brand_name: brand.brand_name,
      logo_file: null,
      logo_preview: brand.logo_url || ''
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ brand_name: '', logo_file: null, logo_preview: '' });
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    resetForm();
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingBrand(null);
    resetForm();
  };

  if (isLoading) {
    return <div className="p-6">Loading brands...</div>;
  }

  // Show product manager if a brand is selected
  if (selectedBrand) {
    return (
      <BrandProductManager
        brand={selectedBrand}
        onBack={() => setSelectedBrand(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Brand Management</h2>
          <p className="text-muted-foreground">
            Manage brands for {eventName} (max 10 brands)
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button 
              disabled={brands.length >= 10}
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Brand ({brands.length}/10)
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Brand</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="brand_name">Brand Name</Label>
                <Input
                  id="brand_name"
                  value={formData.brand_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand_name: e.target.value }))}
                  placeholder="Enter brand name"
                />
              </div>
              
              <div>
                <Label>Brand Logo (Optional)</Label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  {formData.logo_preview ? (
                    <div className="space-y-2">
                      <img
                        src={formData.logo_preview}
                        alt="Logo preview"
                        className="w-16 h-16 object-cover rounded mx-auto"
                      />
                      <p className="text-sm text-muted-foreground">
                        Click or drag to replace
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Drag & drop logo or click to select
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={closeCreateModal}>
                  Cancel
                </Button>
                <Button onClick={handleCreateBrand} disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Brand'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {brands.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Image className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No brands added yet</p>
            <p className="text-sm text-muted-foreground">
              Start by adding your first brand to this event
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <Card key={brand.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{brand.brand_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {brand.product_count || 0}/5 products
                    </p>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(brand)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBrand(brand.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {brand.logo_url ? (
                  <img
                    src={brand.logo_url}
                    alt={`${brand.brand_name} logo`}
                    className="w-full h-24 object-contain bg-gray-50 rounded mb-3"
                  />
                ) : (
                  <div className="w-full h-24 bg-gray-100 rounded flex items-center justify-center mb-3">
                    <span className="text-sm text-gray-500">No logo</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedBrand(brand)}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Manage Products
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_brand_name">Brand Name</Label>
              <Input
                id="edit_brand_name"
                value={formData.brand_name}
                onChange={(e) => setFormData(prev => ({ ...prev, brand_name: e.target.value }))}
                placeholder="Enter brand name"
              />
            </div>
            
            <div>
              <Label>Brand Logo</Label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                {formData.logo_preview ? (
                  <div className="space-y-2">
                    <img
                      src={formData.logo_preview}
                      alt="Logo preview"
                      className="w-16 h-16 object-cover rounded mx-auto"
                    />
                    <p className="text-sm text-muted-foreground">
                      Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop logo or click to select
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button onClick={handleEditBrand} disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Brand'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};