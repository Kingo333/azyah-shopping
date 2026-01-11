import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TutorialTooltip } from '@/components/ui/tutorial-tooltip';
import { useSalonServices, useSalonServiceMutations } from '@/hooks/useSalonOwner';
import { Plus, Edit, Trash2, Clock, Sparkles, Scissors, Palette, Heart, Loader2 } from 'lucide-react';

interface SalonServicesManagerProps {
  salonId: string;
  currency?: string;
}

const SERVICE_CATEGORIES = [
  { value: 'nails', label: 'Nails', icon: Palette },
  { value: 'hair', label: 'Hair', icon: Scissors },
  { value: 'facial', label: 'Facial', icon: Sparkles },
  { value: 'massage', label: 'Massage', icon: Heart },
  { value: 'makeup', label: 'Makeup', icon: Palette },
  { value: 'other', label: 'Other', icon: Sparkles },
] as const;

type ServiceCategory = typeof SERVICE_CATEGORIES[number]['value'];

export const SalonServicesManager: React.FC<SalonServicesManagerProps> = ({ salonId, currency = 'AED' }) => {
  const { data: services = [], isLoading } = useSalonServices(salonId);
  const { createService, updateService, deleteService } = useSalonServiceMutations(salonId);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'nails' as ServiceCategory,
    price_aed: 0,
    duration_minutes: 30,
    is_active: true,
  });
  
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'nails',
      price_aed: 0,
      duration_minutes: 30,
      is_active: true,
    });
    setEditingService(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingService) {
      await updateService.mutateAsync({
        serviceId: editingService.id,
        updates: formData,
      });
    } else {
      await createService.mutateAsync({
        salon_id: salonId,
        ...formData,
      });
    }
    
    setIsAddModalOpen(false);
    resetForm();
  };
  
  const handleEdit = (service: any) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      category: service.category,
      price_aed: service.price_aed,
      duration_minutes: service.duration_minutes,
      is_active: service.is_active,
    });
    setIsAddModalOpen(true);
  };
  
  const handleDelete = async (serviceId: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      await deleteService.mutateAsync(serviceId);
    }
  };
  
  const getCategoryIcon = (category: string) => {
    const cat = SERVICE_CATEGORIES.find(c => c.value === category);
    if (cat) {
      const Icon = cat.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <Sparkles className="h-4 w-4" />;
  };
  
  const formatPrice = (aed: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(aed);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Services</CardTitle>
            <TutorialTooltip
              feature="salon-services-tutorial"
              content={
                <div className="space-y-2">
                  <p className="font-medium">Add your services here</p>
                  <p className="text-sm text-muted-foreground">
                    These will appear to customers when they browse your salon. Set accurate prices to help them plan their visit.
                  </p>
                </div>
              }
            >
              <span className="text-muted-foreground cursor-help">ⓘ</span>
            </TutorialTooltip>
          </div>
          
          <Dialog open={isAddModalOpen} onOpenChange={(open) => {
            setIsAddModalOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Gel Manicure"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your service..."
                    rows={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as ServiceCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (AED)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="1"
                      value={formData.price_aed}
                      onChange={(e) => setFormData({ ...formData, price_aed: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="5"
                      step="5"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createService.isPending || updateService.isPending}>
                    {createService.isPending || updateService.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {editingService ? 'Update' : 'Add'} Service
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {services.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No services yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first service to let customers know what you offer.
            </p>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Service
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {getCategoryIcon(service.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{service.name}</span>
                      {!service.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{formatPrice(service.price_aed)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {service.duration_minutes} min
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {service.category}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(service)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(service.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
