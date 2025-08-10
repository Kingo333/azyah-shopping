import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getTopCategories, getSubcategories, getCatLabel, getSubcatLabel, type CatId, type SubcatId, isValidCatSubPair } from '@/lib/taxonomy';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded?: () => void;
  userType?: string;
  brandId?: string;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onProductAdded, userType, brandId }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_cents: '',
    currency: 'USD',
    category_slug: '',
    subcategory_slug: '',
    brand_id: brandId || '',
    sku: '',
    external_url: '',
    media_urls: ['']
  });

  const [availableSubcategories, setAvailableSubcategories] = useState<SubcatId[]>([]);

  // Update subcategories when category changes
  useEffect(() => {
    if (formData.category_slug) {
      const subcategories = getSubcategories(formData.category_slug as CatId).map(s => s.id as SubcatId);
      setAvailableSubcategories(subcategories);
      // Reset subcategory when category changes
      setFormData(prev => ({ ...prev, subcategory_slug: '' }));
    } else {
      setAvailableSubcategories([]);
    }
  }, [formData.category_slug]);

  // Update brand_id when brandId prop changes
  useEffect(() => {
    if (brandId) {
      setFormData(prev => ({ ...prev, brand_id: brandId }));
    }
  }, [brandId]);

  const addProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      // Guard: if subcategory provided, ensure valid for selected category
      if (formData.subcategory_slug && !isValidCatSubPair(formData.category_slug as CatId, formData.subcategory_slug)) {
        throw new Error('Invalid category/subcategory combination');
      }

      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Product added successfully!" });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onProductAdded?.();
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add product",
        variant: "destructive" 
      });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price_cents: '',
      currency: 'USD',
      category_slug: '',
      subcategory_slug: '',
      brand_id: brandId || '',
      sku: '',
      external_url: '',
      media_urls: ['']
    });
    setAvailableSubcategories([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({ title: "Error", description: "You must be logged in to add products", variant: "destructive" });
      return;
    }

    const productData = {
      title: formData.title,
      description: formData.description || null,
      price_cents: parseInt(formData.price_cents),
      currency: formData.currency,
      category_slug: formData.category_slug,
      subcategory_slug: formData.subcategory_slug || null,
      brand_id: formData.brand_id || null,
      sku: formData.sku,
      external_url: formData.external_url || null,
      media_urls: formData.media_urls.filter(url => url.trim() !== ''),
      status: 'active',
      created_by: user.id
    };

    addProductMutation.mutate(productData);
  };

  const updateMediaUrl = (index: number, value: string) => {
    const newUrls = [...formData.media_urls];
    newUrls[index] = value;
    setFormData(prev => ({ ...prev, media_urls: newUrls }));
  };

  const addMediaUrl = () => {
    setFormData(prev => ({ ...prev, media_urls: [...prev.media_urls, ''] }));
  };

  const removeMediaUrl = (index: number) => {
    const newUrls = formData.media_urls.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, media_urls: newUrls.length ? newUrls : [''] }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Product Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="price">Price (cents) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price_cents}
                onChange={(e) => setFormData(prev => ({ ...prev, price_cents: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category_slug} onValueChange={(value) => setFormData(prev => ({ ...prev, category_slug: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {getTopCategories().map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {getCatLabel(cat.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {availableSubcategories.length > 0 && (
              <div>
                <Label htmlFor="subcategory">Subcategory</Label>
                <Select value={formData.subcategory_slug} onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory_slug: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {availableSubcategories.map(subcategory => (
                      <SelectItem key={subcategory} value={subcategory}>
                        {getSubcatLabel(subcategory)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="external_url">External URL</Label>
            <Input
              id="external_url"
              type="url"
              value={formData.external_url}
              onChange={(e) => setFormData(prev => ({ ...prev, external_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label>Product Images</Label>
            {formData.media_urls.map((url, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => updateMediaUrl(index, e.target.value)}
                  placeholder="https://..."
                />
                {formData.media_urls.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeMediaUrl(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMediaUrl}
            >
              Add Image URL
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={addProductMutation.isPending}>
              {addProductMutation.isPending ? 'Adding...' : 'Add Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductModal;
