import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TutorialTooltip } from '@/components/ui/tutorial-tooltip';
import { Plus, Edit, Trash2, Briefcase, Loader2, DollarSign, Percent, HelpCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface BrandService {
  id: string;
  brand_id: string;
  title: string;
  description: string | null;
  service_type: string;
  min_price: number | null;
  max_price: number | null;
  discount_percent: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BrandServicesManagerProps {
  brandId: string;
  brandCategory: 'agency' | 'studio';
  currency?: string;
}

const SERVICE_TYPES = [
  { value: 'ugc', label: 'UGC Content' },
  { value: 'paid_ads', label: 'Paid Ads / Performance' },
  { value: 'strategy', label: 'Marketing Strategy' },
  { value: 'influencer', label: 'Influencer Marketing' },
  { value: 'social_media', label: 'Social Media Management' },
  { value: 'studio_rental', label: 'Studio Rental' },
  { value: 'photo_shoot', label: 'Photo Shoot' },
  { value: 'video_production', label: 'Video Production' },
  { value: 'post_production', label: 'Post Production / Editing' },
  { value: 'other', label: 'Other' }
];

const DEFAULT_FORM_DATA = {
  title: '',
  description: '',
  service_type: 'other',
  min_price: '',
  max_price: '',
  discount_percent: '',
  is_active: true
};

export const BrandServicesManager: React.FC<BrandServicesManagerProps> = ({
  brandId,
  brandCategory,
  currency = 'AED'
}) => {
  const [services, setServices] = useState<BrandService[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingService, setEditingService] = useState<BrandService | null>(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const { toast } = useToast();

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('brand_services')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: 'Error',
        description: 'Failed to load services',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [brandId, toast]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleOpenModal = (service?: BrandService) => {
    if (service) {
      setEditingService(service);
      setFormData({
        title: service.title,
        description: service.description || '',
        service_type: service.service_type,
        min_price: service.min_price?.toString() || '',
        max_price: service.max_price?.toString() || '',
        discount_percent: service.discount_percent?.toString() || '',
        is_active: service.is_active
      });
    } else {
      setEditingService(null);
      setFormData(DEFAULT_FORM_DATA);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
    setFormData(DEFAULT_FORM_DATA);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a service title',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      const serviceData = {
        brand_id: brandId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        service_type: formData.service_type,
        min_price: formData.min_price ? parseFloat(formData.min_price) : null,
        max_price: formData.max_price ? parseFloat(formData.max_price) : null,
        discount_percent: formData.discount_percent ? parseInt(formData.discount_percent) : null,
        is_active: formData.is_active
      };

      if (editingService) {
        const { error } = await supabase
          .from('brand_services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;
        toast({ title: 'Service updated successfully' });
      } else {
        const { error } = await supabase
          .from('brand_services')
          .insert(serviceData);

        if (error) throw error;
        toast({ title: 'Service created successfully' });
      }

      handleCloseModal();
      fetchServices();
    } catch (error) {
      console.error('Error saving service:', error);
      toast({
        title: 'Error',
        description: 'Failed to save service',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('brand_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;
      toast({ title: 'Service deleted' });
      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete service',
        variant: 'destructive'
      });
    }
  };

  const getServiceTypeLabel = (type: string) => {
    return SERVICE_TYPES.find(t => t.value === type)?.label || type;
  };

  const formatPrice = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
    if (min) return `From ${formatter.format(min)}`;
    if (max) return `Up to ${formatter.format(max)}`;
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Your Services</CardTitle>
              <TutorialTooltip
                feature="agency-services-tutorial"
                content={
                  <div className="space-y-2">
                    <p className="font-medium">List your marketing services</p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Add services with pricing ranges</li>
                      <li>• Offer Azyah partner discounts</li>
                      <li>• Fashion brands can discover and contact you</li>
                      <li>• Your services appear on your public profile</li>
                    </ul>
                  </div>
                }
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TutorialTooltip>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              List the services you offer to fashion brands on Azyah
            </p>
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Service
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Loading services...</p>
          </div>
        ) : services.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {services.map(service => (
              <Card key={service.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{service.title}</h3>
                        {!service.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs mb-2">
                        {getServiceTypeLabel(service.service_type)}
                      </Badge>
                      {service.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                          {service.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-sm">
                        {formatPrice(service.min_price, service.max_price) && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            {formatPrice(service.min_price, service.max_price)}
                          </span>
                        )}
                        {service.discount_percent && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <Percent className="h-3 w-3 mr-1" />
                            {service.discount_percent}% off for Azyah brands
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenModal(service)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete service?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{service.title}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(service.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Briefcase className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No services yet</h3>
            <p className="text-muted-foreground mb-6">
              Start listing your {brandCategory === 'agency' ? 'marketing' : 'production'} services for fashion brands to discover.
            </p>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Service
            </Button>
          </div>
        )}
      </CardContent>

      {/* Add/Edit Service Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Service Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., UGC Content Package, Studio Day Rental"
              />
            </div>

            <div>
              <Label htmlFor="service_type">Service Type</Label>
              <Select
                value={formData.service_type}
                onValueChange={(value) => handleInputChange('service_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what's included in this service..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_price">Min Price ($)</Label>
                <Input
                  id="min_price"
                  type="number"
                  value={formData.min_price}
                  onChange={(e) => handleInputChange('min_price', e.target.value)}
                  placeholder="500"
                />
              </div>
              <div>
                <Label htmlFor="max_price">Max Price ($)</Label>
                <Input
                  id="max_price"
                  type="number"
                  value={formData.max_price}
                  onChange={(e) => handleInputChange('max_price', e.target.value)}
                  placeholder="2000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="discount_percent">Azyah Partner Discount (%)</Label>
              <Input
                id="discount_percent"
                type="number"
                min="0"
                max="100"
                value={formData.discount_percent}
                onChange={(e) => handleInputChange('discount_percent', e.target.value)}
                placeholder="e.g., 15"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional discount for brands on Azyah (shows as a badge)
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Only active services are visible to brands
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingService ? (
                'Save Changes'
              ) : (
                'Add Service'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
