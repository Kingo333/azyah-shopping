import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIcon, Plus, MapPin, Camera, X, Users, Package, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRetailerBrands } from '@/hooks/useRetailerBrands';
import { AddProductModal } from '@/components/AddProductModal';

interface Event {
  id: string;
  name: string;
  description?: string;
  location_text?: string;
  city?: string;
  country?: string;
  event_date: Date;
  duration_days: number;
  cover_photo_url?: string;
  status: 'active' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
}

interface EventBrand {
  id: string;
  brand_id?: string;
  brand_name?: string;
  brand_logo_url?: string;
  brand_description?: string;
  brand_website?: string;
  brand?: {
    id: string;
    name: string;
    logo_url?: string;
  };
}

interface EventProduct {
  id: string;
  brand_id: string;
  product_id: string;
  product: {
    id: string;
    title: string;
    price_cents: number;
    currency: string;
    media_urls: string[];
    category_slug: string;
  };
}

interface EventManagementProps {
  retailerId: string;
}

export const EventManagement: React.FC<EventManagementProps> = ({ retailerId }) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventBrands, setEventBrands] = useState<EventBrand[]>([]);
  const [eventProducts, setEventProducts] = useState<EventProduct[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddBrandModalOpen, setIsAddBrandModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [selectedBrandForProducts, setSelectedBrandForProducts] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: availableBrands } = useRetailerBrands(retailerId);

  useEffect(() => {
    fetchEvents();
  }, [retailerId]);

  useEffect(() => {
    if (selectedEvent) {
      fetchEventBrands();
      fetchEventProducts();
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events_retail')
        .select('*')
        .eq('retailer_id', retailerId)
        .order('event_date', { ascending: true });

      if (error) throw error;
      
      setEvents(data?.map(event => ({
        ...event,
        event_date: new Date(event.event_date),
        status: event.status as 'active' | 'cancelled' | 'completed'
      })) || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEventBrands = async () => {
    if (!selectedEvent) return;

    try {
      const { data, error } = await supabase
        .from('event_brands')
        .select(`
          id,
          brand_id,
          brand_name,
          brand_logo_url,
          brand_description,
          brand_website
        `)
        .eq('event_id', selectedEvent.id);

      if (error) throw error;
      setEventBrands(data || []);
    } catch (error) {
      console.error('Error fetching event brands:', error);
    }
  };

  const fetchEventProducts = async () => {
    if (!selectedEvent) return;

    try {
      const { data, error } = await supabase
        .from('event_products')
        .select(`
          id,
          brand_id,
          product_id,
          product:products(
            id,
            title,
            price_cents,
            currency,
            media_urls,
            category_slug
          )
        `)
        .eq('event_id', selectedEvent.id);

      if (error) throw error;
      
      setEventProducts(data?.map(ep => ({
        ...ep,
        product: {
          ...ep.product,
          media_urls: Array.isArray(ep.product.media_urls) 
            ? ep.product.media_urls as string[]
            : typeof ep.product.media_urls === 'string'
              ? JSON.parse(ep.product.media_urls)
              : []
        }
      })) || []);
    } catch (error) {
      console.error('Error fetching event products:', error);
    }
  };

  const createEvent = async (eventData: {
    name: string;
    description?: string;
    location_text?: string;
    city?: string;
    country?: string;
    event_date: Date;
    duration_days: number;
    cover_photo_url?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('events_retail')
        .insert({
          ...eventData,
          retailer_id: retailerId,
          event_date: eventData.event_date.toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event created successfully!"
      });

      fetchEvents();
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive"
      });
    }
  };

  const addBrandToEvent = async (brandData: {
    brand_id?: string;
    brand_name?: string;
    brand_logo_url?: string;
    brand_description?: string;
    brand_website?: string;
  }) => {
    if (!selectedEvent) return;

    try {
      const { error } = await supabase
        .from('event_brands')
        .insert({
          event_id: selectedEvent.id,
          ...brandData
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Brand added to event!"
      });

      fetchEventBrands();
      setIsAddBrandModalOpen(false);
    } catch (error) {
      console.error('Error adding brand to event:', error);
      toast({
        title: "Error",
        description: "Failed to add brand to event",
        variant: "destructive"
      });
    }
  };

  const addProductToEvent = async (productId: string) => {
    if (!selectedEvent || !selectedBrandForProducts) return;

    try {
      const { error } = await supabase
        .from('event_products')
        .insert({
          event_id: selectedEvent.id,
          brand_id: selectedBrandForProducts,
          product_id: productId
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product added to event!"
      });

      fetchEventProducts();
    } catch (error) {
      console.error('Error adding product to event:', error);
      toast({
        title: "Error",
        description: "Failed to add product to event",
        variant: "destructive"
      });
    }
  };

  const removeBrandFromEvent = async (eventBrandId: string) => {
    if (!selectedEvent) return;

    try {
      const { error } = await supabase
        .from('event_brands')
        .delete()
        .eq('id', eventBrandId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Brand removed from event"
      });

      fetchEventBrands();
      fetchEventProducts(); // Refresh products as they may be affected
    } catch (error) {
      console.error('Error removing brand from event:', error);
      toast({
        title: "Error",
        description: "Failed to remove brand from event",
        variant: "destructive"
      });
    }
  };

  const removeProductFromEvent = async (productId: string) => {
    if (!selectedEvent) return;

    try {
      const { error } = await supabase
        .from('event_products')
        .delete()
        .eq('event_id', selectedEvent.id)
        .eq('product_id', productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product removed from event"
      });

      fetchEventProducts();
    } catch (error) {
      console.error('Error removing product from event:', error);
      toast({
        title: "Error",
        description: "Failed to remove product from event",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Event Management</h2>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <CreateEventForm onSubmit={createEvent} />
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No events created yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedEvent(event)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4" />
                      {event.city && event.country ? `${event.city}, ${event.country}` : event.location_text || 'Location TBD'}
                    </div>
                  </div>
                  <Badge variant={event.status === 'active' ? 'default' : 'secondary'}>
                    {event.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {format(event.event_date, 'PPP')} • {event.duration_days} day{event.duration_days > 1 ? 's' : ''}
                    </p>
                    {event.description && (
                      <p className="text-sm mt-1 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                  {event.cover_photo_url && (
                    <img src={event.cover_photo_url} alt={event.name} 
                         className="w-16 h-16 object-cover rounded" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedEvent && (
        <EventDetailManagement
          event={selectedEvent}
          eventBrands={eventBrands}
          eventProducts={eventProducts}
          availableBrands={availableBrands || []}
          onAddBrand={addBrandToEvent}
          onRemoveBrand={removeBrandFromEvent}
          onAddProduct={addProductToEvent}
          onRemoveProduct={removeProductFromEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
};

const CreateEventForm: React.FC<{ onSubmit: (data: any) => void }> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location_text: '',
    city: '',
    country: '',
    event_date: new Date(),
    duration_days: 1,
    cover_photo_url: ''
  });
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadCoverPhoto = async (): Promise<string | null> => {
    if (!coverPhotoFile) return null;

    try {
      setUploading(true);
      const fileExt = coverPhotoFile.name.split('.').pop();
      const fileName = `event-cover-${Date.now()}.${fileExt}`;
      const filePath = `event-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-covers')
        .upload(filePath, coverPhotoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-covers')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload cover photo",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let coverPhotoUrl = formData.cover_photo_url;
    
    if (coverPhotoFile) {
      coverPhotoUrl = await uploadCoverPhoto();
      if (!coverPhotoUrl) return; // Upload failed
    }
    
    onSubmit({
      ...formData,
      cover_photo_url: coverPhotoUrl
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Event Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          placeholder="Fashion Week Dubai"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Describe your event..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="location">Location (Google Maps Link)</Label>
        <Input
          id="location"
          value={formData.location_text}
          onChange={(e) => setFormData({...formData, location_text: e.target.value})}
          placeholder="https://maps.google.com/..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({...formData, city: e.target.value})}
            placeholder="Dubai"
          />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={formData.country}
            onChange={(e) => setFormData({...formData, country: e.target.value})}
            placeholder="UAE"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Event Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.event_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.event_date ? format(formData.event_date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.event_date}
                onSelect={(date) => date && setFormData({...formData, event_date: date})}
                disabled={(date) => date < new Date()}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="duration">Duration (Days)</Label>
          <Input
            id="duration"
            type="number"
            min="1"
            value={formData.duration_days || 1}
            onChange={(e) => setFormData({...formData, duration_days: parseInt(e.target.value) || 1})}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="cover_photo">Cover Photo</Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              id="cover_photo"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setCoverPhotoFile(file);
                  setFormData({...formData, cover_photo_url: ''});
                }
              }}
              className="flex-1"
            />
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
          {coverPhotoFile && (
            <div className="text-sm text-muted-foreground">
              Selected: {coverPhotoFile.name}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Or enter URL below if you prefer
          </div>
          <Input
            value={formData.cover_photo_url}
            onChange={(e) => {
              setFormData({...formData, cover_photo_url: e.target.value});
              setCoverPhotoFile(null);
            }}
            placeholder="https://example.com/event-cover.jpg"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={uploading}>
        {uploading ? "Uploading..." : "Create Event"}
      </Button>
    </form>
  );
};

const EventDetailManagement: React.FC<{
  event: Event;
  eventBrands: EventBrand[];
  eventProducts: EventProduct[];
  availableBrands: any[];
  onAddBrand: (brandData: {
    brand_id?: string;
    brand_name?: string;
    brand_logo_url?: string;
    brand_description?: string;
    brand_website?: string;
  }) => void;
  onRemoveBrand: (eventBrandId: string) => void;
  onAddProduct: (productId: string) => void;
  onRemoveProduct: (productId: string) => void;
  onClose: () => void;
}> = ({ 
  event, 
  eventBrands, 
  eventProducts, 
  availableBrands, 
  onAddBrand, 
  onRemoveBrand, 
  onAddProduct, 
  onRemoveProduct, 
  onClose 
}) => {
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [selectedBrandForProducts, setSelectedBrandForProducts] = useState<string | null>(null);
  const [isAddCustomBrandModalOpen, setIsAddCustomBrandModalOpen] = useState(false);

  // Group products by brand
  const productsByBrand = eventProducts.reduce((acc, ep) => {
    if (!acc[ep.brand_id]) {
      acc[ep.brand_id] = [];
    }
    acc[ep.brand_id].push(ep);
    return acc;
  }, {} as Record<string, EventProduct[]>);

  const availableBrandsForEvent = availableBrands.filter(
    brand => !eventBrands.some(eb => eb.brand_id === brand.id)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Managing: {event.name}</CardTitle>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brands Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Brands ({eventBrands.length}/10)
            </h3>
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsAddCustomBrandModalOpen(true)}
                variant="outline"
                disabled={eventBrands.length >= 10}
              >
                Add Custom Brand
              </Button>
              {eventBrands.length < 10 && availableBrandsForEvent.length > 0 && (
                <>
                  <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select existing brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBrandsForEvent.map(brand => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => {
                      if (selectedBrandId) {
                        onAddBrand({ brand_id: selectedBrandId });
                        setSelectedBrandId('');
                      }
                    }}
                    disabled={!selectedBrandId}
                  >
                    Add Existing Brand
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            {eventBrands.map((eventBrand) => {
              const brandName = eventBrand.brand_name || eventBrand.brand?.name || 'Unknown Brand';
              const brandLogo = eventBrand.brand_logo_url || eventBrand.brand?.logo_url;
              const brandId = eventBrand.brand_id || eventBrand.id;
              
              return (
                <div key={eventBrand.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      {brandLogo && (
                        <img src={brandLogo} alt={brandName} 
                             className="w-8 h-8 object-cover rounded" />
                      )}
                      <div>
                        <h4 className="font-medium">{brandName}</h4>
                        {eventBrand.brand_description && (
                          <p className="text-sm text-muted-foreground">{eventBrand.brand_description}</p>
                        )}
                        {eventBrand.brand_website && (
                          <a href={eventBrand.brand_website} target="_blank" rel="noopener noreferrer" 
                             className="text-xs text-blue-500 hover:underline">
                            {eventBrand.brand_website}
                          </a>
                        )}
                      </div>
                      <Badge variant="outline">
                        {productsByBrand[brandId]?.length || 0}/10 products
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      {(productsByBrand[brandId]?.length || 0) < 10 && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedBrandForProducts(brandId);
                            setIsAddProductModalOpen(true);
                          }}
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Add Products
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRemoveBrand(eventBrand.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Products for this brand */}
                  {productsByBrand[brandId] && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {productsByBrand[brandId].map((eventProduct) => (
                      <div key={eventProduct.id} className="border rounded-lg p-2 relative">
                        <button
                          onClick={() => onRemoveProduct(eventProduct.product_id)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <img
                          src={eventProduct.product.media_urls[0] || '/placeholder.svg'}
                          alt={eventProduct.product.title}
                          className="w-full aspect-square object-cover rounded mb-2"
                        />
                        <p className="text-xs font-medium line-clamp-2">{eventProduct.product.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {(eventProduct.product.price_cents / 100).toFixed(2)} {eventProduct.product.currency}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        </div>

        {/* Add Product Modal */}
        {isAddProductModalOpen && selectedBrandForProducts && (
          <AddProductModal
            isOpen={isAddProductModalOpen}
            onClose={() => {
              setIsAddProductModalOpen(false);
              setSelectedBrandForProducts(null);
            }}
            onProductAdded={() => {
              setIsAddProductModalOpen(false);
              setSelectedBrandForProducts(null);
            }}
            brandId={selectedBrandForProducts}
            userType="retailer"
          />
        )}

        {/* Add Custom Brand Modal */}
        <Dialog open={isAddCustomBrandModalOpen} onOpenChange={setIsAddCustomBrandModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Brand to Event</DialogTitle>
            </DialogHeader>
            <AddCustomBrandForm onSubmit={onAddBrand} onClose={() => setIsAddCustomBrandModalOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

const AddCustomBrandForm: React.FC<{
  onSubmit: (brandData: {
    brand_name: string;
    brand_logo_url?: string;
    brand_description?: string;
    brand_website?: string;
  }) => void;
  onClose: () => void;
}> = ({ onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    brand_name: '',
    brand_logo_url: '',
    brand_description: '',
    brand_website: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand_name.trim()) return;
    
    onSubmit({
      brand_name: formData.brand_name.trim(),
      brand_logo_url: formData.brand_logo_url.trim() || undefined,
      brand_description: formData.brand_description.trim() || undefined,
      brand_website: formData.brand_website.trim() || undefined
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="brand_name">Brand Name *</Label>
        <Input
          id="brand_name"
          value={formData.brand_name}
          onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
          placeholder="Enter brand name"
          required
        />
      </div>

      <div>
        <Label htmlFor="brand_logo_url">Logo URL</Label>
        <Input
          id="brand_logo_url"
          value={formData.brand_logo_url}
          onChange={(e) => setFormData({ ...formData, brand_logo_url: e.target.value })}
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div>
        <Label htmlFor="brand_description">Description</Label>
        <Textarea
          id="brand_description"
          value={formData.brand_description}
          onChange={(e) => setFormData({ ...formData, brand_description: e.target.value })}
          placeholder="Brief brand description"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="brand_website">Website</Label>
        <Input
          id="brand_website"
          value={formData.brand_website}
          onChange={(e) => setFormData({ ...formData, brand_website: e.target.value })}
          placeholder="https://brand-website.com"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!formData.brand_name.trim()}>
          Add Brand
        </Button>
      </div>
    </form>
  );
};

export default EventManagement;