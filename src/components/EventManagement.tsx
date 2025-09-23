import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Edit2, X, Users, Package, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRetailerBrands } from '@/hooks/useRetailerBrands';
import { AddProductModal } from '@/components/AddProductModal';
import { ProductTryOnManager } from '@/components/ProductTryOnManager';
import { useAuth } from '@/contexts/AuthContext';

interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
  duration_days: number;
  location_text: string;
  city: string;
  country: string;
  cover_photo_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EventBrand {
  id: string;
  event_id?: string;
  brand_id?: string;
  brand_name?: string;
  brand_logo_url?: string;
  brand_description?: string;
  brand_website?: string;
  added_at?: string;
  brand?: {
    id: string;
    name: string;
    logo_url?: string;
  };
}

interface EventProduct {
  id: string;
  event_id: string;
  brand_id: string;
  product_id: string;
  added_at: string;
  product: {
    id: string;
    title: string;
    price_cents: number;
    currency: string;
    media_urls: string[];
  };
}

const EventManagement: React.FC<{ retailerId: string }> = ({ retailerId }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventBrands, setEventBrands] = useState<EventBrand[]>([]);
  const [eventProducts, setEventProducts] = useState<EventProduct[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isAddCustomBrandModalOpen, setIsAddCustomBrandModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [selectedBrandForProducts, setSelectedBrandForProducts] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { data: availableBrands } = useRetailerBrands(retailerId);
  const { toast } = useToast();

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [retailerId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events_retail')
        .select('*')
        .eq('retailer_id', retailerId)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch events",
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
          event_id,
          brand_id,
          brand_name,
          brand_logo_url,
          brand_description,
          brand_website,
          added_at,
          brands!left(id, name, logo_url)
        `)
        .eq('event_id', selectedEvent.id)
        .order('added_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData: EventBrand[] = (data || []).map(item => ({
        id: item.id,
        event_id: item.event_id,
        brand_id: item.brand_id,
        brand_name: item.brand_name,
        brand_logo_url: item.brand_logo_url,
        brand_description: item.brand_description,
        brand_website: item.brand_website,
        added_at: item.added_at,
        brand: item.brands && typeof item.brands === 'object' && !Array.isArray(item.brands) && 'id' in item.brands ? {
          id: (item.brands as any).id,
          name: (item.brands as any).name,
          logo_url: (item.brands as any).logo_url || undefined
        } : undefined
      }));
      
      setEventBrands(transformedData);
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
          event_id,
          brand_id,
          product_id,
          added_at,
          products!inner(id, title, price_cents, currency, media_urls)
        `)
        .eq('event_id', selectedEvent.id)
        .order('added_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData: EventProduct[] = (data || []).map(item => ({
        id: item.id,
        event_id: item.event_id,
        brand_id: item.brand_id,
        product_id: item.product_id,
        added_at: item.added_at,
        product: {
          id: item.products.id,
          title: item.products.title,
          price_cents: item.products.price_cents,
          currency: item.products.currency,
          media_urls: Array.isArray(item.products.media_urls) 
            ? item.products.media_urls as string[]
            : []
        }
      }));
      
      setEventProducts(transformedData);
    } catch (error) {
      console.error('Error fetching event products:', error);
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      fetchEventBrands();
      fetchEventProducts();
    }
  }, [selectedEvent]);

  const addBrandToEvent = async (brandData: {
    brand_id?: string;
    brand_name?: string;
    brand_logo_url?: string;
    brand_description?: string;
    brand_website?: string;
  }) => {
    if (!selectedEvent) return;

    try {
      let finalBrandId = brandData.brand_id;

      // If this is a custom brand (no brand_id), create a proper brand entry first
      if (!brandData.brand_id && brandData.brand_name) {
        console.log('Creating proper brand entry for custom brand:', brandData.brand_name);
        
        // Create the brand in the brands table
        const { data: newBrand, error: brandError } = await supabase
          .from('brands')
          .insert({
            name: brandData.brand_name,
            slug: brandData.brand_name.toLowerCase().replace(/\s+/g, '-'),
            logo_url: brandData.brand_logo_url,
            bio: brandData.brand_description,
            website: brandData.brand_website,
            owner_user_id: currentUserId // Set the current user as the owner
          })
          .select()
          .single();

        if (brandError) {
          console.error('Error creating brand:', brandError);
          throw new Error(`Failed to create brand: ${brandError.message}`);
        }

        finalBrandId = newBrand.id;
        console.log('Created brand with ID:', finalBrandId);
      }

      // Now create the event_brands entry with the proper brand_id
      const { error } = await supabase
        .from('event_brands')
        .insert({
          event_id: selectedEvent.id,
          brand_id: finalBrandId,
          brand_name: brandData.brand_name,
          brand_logo_url: brandData.brand_logo_url,
          brand_description: brandData.brand_description,
          brand_website: brandData.brand_website
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Brand added to event"
      });

      fetchEventBrands();
    } catch (error) {
      console.error('Error adding brand to event:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add brand to event",
        variant: "destructive"
      });
    }
  };

  const removeBrandFromEvent = async (eventBrandId: string) => {
    if (!selectedEvent) return;

    try {
      // First get the event_brand info to check if we should clean up the brand completely
      const { data: eventBrand, error: eventBrandError } = await supabase
        .from('event_brands')
        .select('*, brand_id')
        .eq('id', eventBrandId)
        .single();

      if (eventBrandError) throw eventBrandError;

      // Remove the brand from the event
      const { error: removeError } = await supabase
        .from('event_brands')
        .delete()
        .eq('id', eventBrandId);

      if (removeError) throw removeError;

      // If this brand was created specifically for this event (has brand_id and current user is owner),
      // check if it should be completely removed
      if (eventBrand.brand_id && currentUserId) {
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('owner_user_id, name')
          .eq('id', eventBrand.brand_id)
          .eq('owner_user_id', currentUserId)
          .single();

        if (!brandError && brandData) {
          // Check if this brand is used in other events
          const { data: otherEventBrands, error: otherEventsError } = await supabase
            .from('event_brands')
            .select('id')
            .eq('brand_id', eventBrand.brand_id);

          if (!otherEventsError && otherEventBrands.length === 0) {
            // This brand is only used by current user and not in other events
            // Remove all products associated with this brand
            const { error: productsError } = await supabase
              .from('products')
              .delete()
              .eq('brand_id', eventBrand.brand_id);

            if (!productsError) {
              // Remove the brand itself
              const { error: brandDeleteError } = await supabase
                .from('brands')
                .delete()
                .eq('id', eventBrand.brand_id);

              if (!brandDeleteError) {
                console.log(`Completely removed brand ${brandData.name} and its products`);
              }
            }
          }
        }
      }

      toast({
        title: "Success",
        description: "Brand and associated products removed completely"
      });

      fetchEventBrands();
      fetchEventProducts();
    } catch (error) {
      console.error('Error removing brand from event:', error);
      toast({
        title: "Error",
        description: "Failed to remove brand from event",
        variant: "destructive"
      });
    }
  };

  const addProductToEvent = async (productId: string) => {
    if (!selectedEvent || !selectedBrandForProducts) return;

    try {
      // Check if product is already in this event
      const { data: existingProduct, error: checkError } = await supabase
        .from('event_products')
        .select('id')
        .eq('event_id', selectedEvent.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingProduct) {
        toast({
          title: "Info",
          description: "Product is already in this event"
        });
        return;
      }

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
        description: "Product added to event"
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

  const removeProductFromEvent = async (productId: string) => {
    if (!selectedEvent) return;

    try {
      // First remove from event_products
      const { error: eventProductError } = await supabase
        .from('event_products')
        .delete()
        .eq('event_id', selectedEvent.id)
        .eq('product_id', productId);

      if (eventProductError) throw eventProductError;

      // Check if this product was created for this event and should be completely removed
      // Get product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('brand_id, title')
        .eq('id', productId)
        .single();

      if (!productError && productData && currentUserId) {
        // Check if the brand is owned by current user (indicating it was created for event)
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('owner_user_id')
          .eq('id', productData.brand_id)
          .eq('owner_user_id', currentUserId)
          .single();

        if (!brandError && brandData) {
          // Check if this product is used in other events
          const { data: otherEventProducts, error: otherEventsError } = await supabase
            .from('event_products')
            .select('id')
            .eq('product_id', productId);

          if (!otherEventsError && otherEventProducts.length === 0) {
            // Product is not in other events, remove it completely
            const { error: deleteProductError } = await supabase
              .from('products')
              .delete()
              .eq('id', productId);

            if (!deleteProductError) {
              console.log(`Completely removed product ${productData.title}`);
            }
          }
        }
      }

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
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Events List */}
      <div className="grid gap-4">
        {events.map((event) => (
          <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{event.name}</CardTitle>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{format(new Date(event.event_date), 'PPP')} • {event.duration_days} day(s)</p>
                    <p>{event.city}, {event.country}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={event.status === 'active' ? 'default' : 'secondary'}>
                    {event.status}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </div>
              </div>
            </CardHeader>
            {event.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Event Detail Management */}
      {selectedEvent && (
        <EventDetailManagement
          event={selectedEvent}
          eventBrands={eventBrands}
          eventProducts={eventProducts}
          availableBrands={availableBrands || []}
          retailerId={retailerId}
          onAddBrand={addBrandToEvent}
          onRemoveBrand={removeBrandFromEvent}
          onAddProduct={addProductToEvent}
          onRemoveProduct={removeProductFromEvent}
          onClose={() => setSelectedEvent(null)}
          addProductToEvent={addProductToEvent}
          fetchEventProducts={fetchEventProducts}
        />
      )}
    </div>
  );
};

const EventDetailManagement: React.FC<{
  event: Event;
  eventBrands: EventBrand[];
  eventProducts: EventProduct[];
  availableBrands: any[];
  retailerId: string;
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
  addProductToEvent: (productId: string) => Promise<void>;
  fetchEventProducts: () => void;
}> = ({ 
  event, 
  eventBrands, 
  eventProducts, 
  availableBrands, 
  retailerId,
  onAddBrand, 
  onRemoveBrand, 
  onAddProduct, 
  onRemoveProduct, 
  onClose,
  addProductToEvent,
  fetchEventProducts
}) => {
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [selectedBrandForProducts, setSelectedBrandForProducts] = useState<string | null>(null);
  const [isAddCustomBrandModalOpen, setIsAddCustomBrandModalOpen] = useState(false);

  // Group products by brand
  const productsByBrand = eventProducts.reduce((acc, eventProduct) => {
    const brandId = eventProduct.brand_id;
    if (!acc[brandId]) acc[brandId] = [];
    acc[brandId].push(eventProduct);
    return acc;
  }, {} as Record<string, EventProduct[]>);

  // Filter available brands to exclude those already in the event
  const availableBrandsForEvent = availableBrands.filter(brand => 
    !eventBrands.some(eventBrand => eventBrand.brand_id === brand.id)
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Managing: {event.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Brands Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
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
                          {productsByBrand[brandId]?.length || 0}/5 products
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {(productsByBrand[brandId]?.length || 0) < 5 && (
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
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {(eventProduct.product.price_cents / 100).toFixed(2)} {eventProduct.product.currency}
                              </span>
                              <ProductTryOnManager 
                                product={{
                                  id: eventProduct.product.id,
                                  title: eventProduct.product.title,
                                  brand_id: eventProduct.brand_id
                                }}
                                variant="edit"
                                className="ml-1"
                              />
                            </div>
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
                fetchEventProducts(); // Refresh the event products
                setIsAddProductModalOpen(false);
                setSelectedBrandForProducts(null);
              }}
              brandId={selectedBrandForProducts}
              retailerId={retailerId}
              userType="retailer"
              isEventContext={true}
              onAddProductToEvent={addProductToEvent}
              selectedEvent={event}
              selectedBrandForProducts={selectedBrandForProducts}
            />
          )}

          {/* Add Custom Brand Modal */}
          <Dialog open={isAddCustomBrandModalOpen} onOpenChange={setIsAddCustomBrandModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Brand</DialogTitle>
              </DialogHeader>
              <AddCustomBrandForm
                onSubmit={onAddBrand}
                onClose={() => setIsAddCustomBrandModalOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </DialogContent>
    </Dialog>
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand_name.trim()) return;

    setUploading(true);
    try {
      let logoUrl = formData.brand_logo_url;

      // Upload logo if file is selected
      if (logoFile) {
        const fileName = `brand-logo-${Date.now()}.${logoFile.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('brand-logos')
          .upload(`brand-logos/${fileName}`, logoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('brand-logos')
          .getPublicUrl(`brand-logos/${fileName}`);

        logoUrl = urlData.publicUrl;
      }

      onSubmit({
        brand_name: formData.brand_name,
        brand_logo_url: logoUrl,
        brand_description: formData.brand_description,
        brand_website: formData.brand_website
      });

      onClose();
    } catch (error) {
      console.error('Error creating custom brand:', error);
      toast({
        title: "Error",
        description: "Failed to create custom brand",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
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
        <Label htmlFor="brand_logo">Brand Logo</Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              id="brand_logo"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setLogoFile(file);
                }
              }}
              className="flex-1"
            />
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
          {logoFile && (
            <div className="text-sm text-muted-foreground">
              Selected: {logoFile.name}
            </div>
          )}
        </div>
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
        <Button type="submit" disabled={!formData.brand_name.trim() || uploading}>
          {uploading ? "Adding Brand..." : "Add Brand"}
        </Button>
      </div>
    </form>
  );
};

export default EventManagement;