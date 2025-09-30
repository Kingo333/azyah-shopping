import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Store, UserCircle, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import EventTryOnModal from '@/components/EventTryOnModal';
import { useToast } from '@/hooks/use-toast';
import { useBitStudio } from '@/hooks/useBitStudio';

interface RetailEvent {
  id: string;
  name: string;
  description: string;
  event_date: string;
  location: string;
  status: string;
  retailer: {
    name: string;
    logo_url?: string;
  };
}

interface EventBrand {
  id: string;
  brand_name: string;
  logo_url?: string;
  products: EventProduct[];
}

interface EventProduct {
  id: string;
  image_url: string;
  try_on_data: any;
  event_brand_id: string;
  brand_name: string;
  brand_logo_url?: string;
}

const Events = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadImage, loading: bitStudioLoading } = useBitStudio();
  const [events, setEvents] = useState<RetailEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<RetailEvent | null>(null);
  const [eventBrands, setEventBrands] = useState<EventBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [hasPersonImage, setHasPersonImage] = useState(false);
  const [isUploadingPersonImage, setIsUploadingPersonImage] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<EventProduct | null>(null);
  const [brandScrollPositions, setBrandScrollPositions] = useState<{[key: string]: number}>({});

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  const fetchUpcomingEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('retail_events')
        .select(`
          *,
          retailer:retailers(name, logo_url)
        `)
        .eq('status', 'active')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventBrands = async (eventId: string) => {
    setIsLoadingBrands(true);
    try {
      const { data: brandsData, error: brandsError } = await supabase
        .from('event_brands')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (brandsError) throw brandsError;

      // Fetch products for each brand
      const brandsWithProducts = await Promise.all(
        (brandsData || []).map(async (brand) => {
          const { data: productsData, error: productsError } = await supabase
            .from('event_brand_products')
            .select('*')
            .eq('event_brand_id', brand.id)
            .order('sort_order', { ascending: true });

          if (productsError) {
            console.error('Error fetching products for brand:', brand.id, productsError);
            return { ...brand, products: [] };
          }

          // Add brand info to products
          const productsWithBrandInfo = (productsData || []).map(product => ({
            ...product,
            brand_name: brand.brand_name,
            brand_logo_url: brand.logo_url
          }));

          return { ...brand, products: productsWithBrandInfo };
        })
      );

      setEventBrands(brandsWithProducts);
    } catch (error) {
      console.error('Error fetching event brands:', error);
    } finally {
      setIsLoadingBrands(false);
    }
  };

  const selectEvent = (event: RetailEvent) => {
    setSelectedEvent(event);
    fetchEventBrands(event.id);
    checkPersonImage(event.id);
  };

  const checkPersonImage = async (eventId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('event_user_photos')
        .select('photo_url')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single();

      setHasPersonImage(!!data && !error);
    } catch (err) {
      setHasPersonImage(false);
    }
  };

  const handlePersonImageUpload = async (file: File) => {
    if (!selectedEvent || !user) return;

    setIsUploadingPersonImage(true);
    try {
      // Upload using BitStudio API
      const uploadedImage = await uploadImage(file, 'person');
      
      if (!uploadedImage) {
        throw new Error('Failed to upload image to BitStudio');
      }

      // Store in event_user_photos
      await supabase
        .from('event_user_photos')
        .upsert({
          event_id: selectedEvent.id,
          user_id: user.id,
          photo_url: uploadedImage.path
        });

      setHasPersonImage(true);
      toast({
        title: "Photo uploaded successfully!",
        description: "You can now try on products from this event"
      });
    } catch (error) {
      console.error('Error uploading person image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload your photo",
        variant: "destructive"
      });
    } finally {
      setIsUploadingPersonImage(false);
    }
  };

  const scrollBrandProducts = (brandId: string, direction: 'left' | 'right') => {
    const container = document.getElementById(`brand-products-${brandId}`);
    if (!container) return;

    const scrollAmount = 280; // Width of one product card + gap
    const currentPosition = brandScrollPositions[brandId] || 0;
    const newPosition = direction === 'left' 
      ? Math.max(0, currentPosition - scrollAmount)
      : currentPosition + scrollAmount;

    container.scrollTo({ left: newPosition, behavior: 'smooth' });
    setBrandScrollPositions(prev => ({ ...prev, [brandId]: newPosition }));
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please sign in to view events
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (selectedEvent) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="outline" 
          onClick={() => {
            setSelectedEvent(null);
            setEventBrands([]);
          }}
          className="mb-6"
        >
          ← Back to Events
        </Button>

        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            {selectedEvent.retailer.logo_url && (
              <img 
                src={selectedEvent.retailer.logo_url} 
                alt={selectedEvent.retailer.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{selectedEvent.name}</h1>
                {/* Person Image Upload Button */}
                <div className="relative">
                  {hasPersonImage ? (
                    <Badge className="bg-green-500 text-white">
                      <UserCircle className="w-4 h-4 mr-1" />
                      Photo Ready
                    </Badge>
                  ) : (
                    <div>
                      <input
                        id="person-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePersonImageUpload(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploadingPersonImage || bitStudioLoading}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={isUploadingPersonImage || bitStudioLoading}
                        className="relative"
                      >
                        {(isUploadingPersonImage || bitStudioLoading) ? (
                          <>
                            <Upload className="w-4 h-4 mr-1 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <UserCircle className="w-4 h-4 mr-1" />
                            Upload Photo
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Store className="w-4 h-4" />
                  {selectedEvent.retailer.name}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(selectedEvent.event_date), 'MMMM d, yyyy')}
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {selectedEvent.location}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {selectedEvent.description && (
            <p className="text-muted-foreground">{selectedEvent.description}</p>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Featured Brands</h2>
          {isLoadingBrands ? (
            <div className="text-center py-8">Loading brands...</div>
          ) : eventBrands.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No brands available for this event yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {eventBrands.map((brand) => (
                <div key={brand.id} className="space-y-4">
                  <div className="flex items-center space-x-4">
                    {brand.logo_url && (
                      <img
                        src={brand.logo_url}
                        alt={`${brand.brand_name} logo`}
                        className="w-12 h-12 object-contain bg-white rounded-lg p-2 border"
                      />
                    )}
                    <h3 className="text-xl font-bold">{brand.brand_name}</h3>
                  </div>
                  
                  {brand.products.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No products available</p>
                  ) : (
                    <div className="relative">
                      {/* Scroll buttons */}
                      {brand.products.length > 4 && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm"
                            onClick={() => scrollBrandProducts(brand.id, 'left')}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm"
                            onClick={() => scrollBrandProducts(brand.id, 'right')}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      
                      {/* Products carousel */}
                      <div 
                        id={`brand-products-${brand.id}`}
                        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {brand.products.map((product) => (
                          <Card key={product.id} className="flex-shrink-0 w-64 group hover:shadow-lg transition-shadow">
                            <CardContent className="p-4">
                              <div className="relative mb-3">
                                <img
                                  src={product.image_url}
                                  alt="Product"
                                  className="w-full h-48 object-cover rounded"
                                />
                                {Object.keys(product.try_on_data || {}).length > 0 && hasPersonImage && (
                                  <Badge className="absolute top-2 right-2 bg-green-500">
                                    Try-On Ready
                                  </Badge>
                                )}
                              </div>
                              <Button 
                                className="w-full"
                                disabled={!hasPersonImage || Object.keys(product.try_on_data || {}).length === 0}
                                onClick={() => {
                                  if (hasPersonImage && Object.keys(product.try_on_data || {}).length > 0) {
                                    setSelectedProduct({
                                      ...product,
                                      event_brand_id: brand.id,
                                      brand_name: brand.brand_name,
                                      brand_logo_url: brand.logo_url
                                    });
                                  }
                                }}
                              >
                                {!hasPersonImage 
                                  ? 'Upload Photo First' 
                                  : Object.keys(product.try_on_data || {}).length > 0 
                                  ? 'Try On' 
                                  : 'Not Available'
                                }
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Try-On Modal */}
        {selectedProduct && selectedEvent && (
          <EventTryOnModal
            isOpen={!!selectedProduct}
            onClose={() => setSelectedProduct(null)}
            product={selectedProduct}
            eventId={selectedEvent.id}
            eventName={selectedEvent.name}
          />
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Upcoming Events</h1>
      
      {events.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No upcoming events at the moment. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {events.map((event) => (
            <Card key={event.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    {event.retailer.logo_url && (
                      <img 
                        src={event.retailer.logo_url} 
                        alt={event.retailer.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <CardTitle className="text-xl mb-2">{event.name}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Store className="w-4 h-4" />
                          {event.retailer.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(event.event_date), 'MMMM d, yyyy')}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">{event.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {event.description && (
                  <p className="text-muted-foreground mb-4">{event.description}</p>
                )}
                <Button onClick={() => selectEvent(event)}>
                  View Event Catalog
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events;