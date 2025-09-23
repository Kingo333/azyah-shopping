import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, MapPin, Users, Package, ArrowRight, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  retailer: {
    name: string;
    logo_url?: string;
  };
}

interface EventBrand {
  id: string;
  brand_id?: string;
  brand_name?: string;
  brand_logo_url?: string;
  brand_description?: string;
  brand_website?: string;
}

interface EventProduct {
  product: {
    id: string;
    title: string;
    price_cents: number;
    currency: string;
    media_urls: string[];
    category_slug: string;
  };
  brand_id: string;
}

const Events: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventBrands, setEventBrands] = useState<EventBrand[]>([]);
  const [eventProducts, setEventProducts] = useState<EventProduct[]>([]);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string>('');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent && user) {
      fetchEventDetails();
      checkUserEventPhoto();
    }
  }, [selectedEvent, user]);

  const fetchUpcomingEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events_retail')
        .select(`
          id,
          name,
          description,
          location_text,
          city,
          country,
          event_date,
          duration_days,
          cover_photo_url,
          retailer:retailers(
            name,
            logo_url
          )
        `)
        .eq('status', 'active')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      if (error) throw error;

      setEvents(data?.map(event => ({
        ...event,
        event_date: new Date(event.event_date)
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

  const fetchEventDetails = async () => {
    if (!selectedEvent) return;

    try {
      // Fetch event brands
      const { data: brandsData, error: brandsError } = await supabase
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

      if (brandsError) throw brandsError;

      // Fetch event products
      const { data: productsData, error: productsError } = await supabase
        .from('event_products')
        .select(`
          brand_id,
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

      if (productsError) throw productsError;

      setEventBrands(brandsData || []);
      setEventProducts(productsData?.map(ep => ({
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
      console.error('Error fetching event details:', error);
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive"
      });
    }
  };

  const checkUserEventPhoto = async () => {
    if (!selectedEvent || !user) return;

    try {
      const { data, error } = await supabase
        .from('event_tryon_sessions')
        .select('person_image_url')
        .eq('event_id', selectedEvent.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setUserPhotoUrl(data.person_image_url);
      } else {
        setUserPhotoUrl('');
      }
    } catch (error) {
      console.error('Error checking user event photo:', error);
    }
  };

  const saveUserEventPhoto = async (photoUrl: string) => {
    if (!selectedEvent || !user) return;

    try {
      const { error } = await supabase
        .from('event_tryon_sessions')
        .upsert({
          event_id: selectedEvent.id,
          user_id: user.id,
          person_image_url: photoUrl
        });

      if (error) throw error;

      setUserPhotoUrl(photoUrl);
      setIsPhotoModalOpen(false);
      
      toast({
        title: "Success",
        description: "Photo saved! You can now try on items from this event."
      });
    } catch (error) {
      console.error('Error saving user event photo:', error);
      toast({
        title: "Error",
        description: "Failed to save photo",
        variant: "destructive"
      });
    }
  };

  // Group products by brand
  const productsByBrand = eventProducts.reduce((acc, ep) => {
    if (!acc[ep.brand_id]) {
      acc[ep.brand_id] = [];
    }
    acc[ep.brand_id].push(ep);
    return acc;
  }, {} as Record<string, EventProduct[]>);

  const handleTryOnProduct = (productId: string) => {
    if (!userPhotoUrl) {
      setIsPhotoModalOpen(true);
      return;
    }
    
    // Navigate to try-on with event context
    navigate(`/ar-tryon?product=${productId}&event=${selectedEvent?.id}&photo=${encodeURIComponent(userPhotoUrl)}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-4">Please sign in to view events</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  if (selectedEvent) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto p-4">
          <div className="mb-6">
            <Button variant="outline" onClick={() => setSelectedEvent(null)} className="mb-4">
              ← Back to Events
            </Button>
            
            <Card>
              <CardHeader>
                <div className="flex gap-4">
                  {selectedEvent.cover_photo_url && (
                    <img src={selectedEvent.cover_photo_url} alt={selectedEvent.name}
                         className="w-24 h-24 object-cover rounded-lg" />
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-2xl">{selectedEvent.name}</CardTitle>
                    <div className="flex items-center gap-4 text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        {format(selectedEvent.event_date, 'PPP')} • {selectedEvent.duration_days} day{selectedEvent.duration_days > 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {selectedEvent.city && selectedEvent.country ? 
                          `${selectedEvent.city}, ${selectedEvent.country}` : 
                          selectedEvent.location_text || 'Location TBD'
                        }
                      </div>
                    </div>
                    {selectedEvent.description && (
                      <p className="mt-2 text-muted-foreground">{selectedEvent.description}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Button
                    onClick={() => selectedEvent.location_text && window.open(selectedEvent.location_text, '_blank')}
                    disabled={!selectedEvent.location_text}
                    variant="outline"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    View Location
                  </Button>
                  
                  {!userPhotoUrl ? (
                    <Button onClick={() => setIsPhotoModalOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo for Try-On
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <img src={userPhotoUrl} alt="Your photo" className="w-8 h-8 object-cover rounded-full" />
                      <span className="text-sm text-muted-foreground">Ready for try-on</span>
                      <Button size="sm" variant="outline" onClick={() => setIsPhotoModalOpen(true)}>
                        Change Photo
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Event Catalogue */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Event Catalogue</h2>
            
            {eventBrands.map((eventBrand) => {
              const brandId = eventBrand.brand_id || eventBrand.id;
              const brandName = eventBrand.brand_name || 'Unknown Brand';
              const brandLogo = eventBrand.brand_logo_url;
              const brandProducts = productsByBrand[brandId] || [];
              
              return (
                <Card key={eventBrand.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {brandLogo && (
                        <img src={brandLogo} alt={brandName}
                             className="w-10 h-10 object-cover rounded" />
                      )}
                      <CardTitle className="text-lg">{brandName}</CardTitle>
                      <Badge variant="outline">{brandProducts.length} products</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {brandProducts.map((eventProduct) => (
                        <Card key={eventProduct.product.id} className="overflow-hidden">
                          <div className="aspect-square relative">
                            <img
                              src={eventProduct.product.media_urls[0] || '/placeholder.svg'}
                              alt={eventProduct.product.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <CardContent className="p-3">
                            <h4 className="font-medium text-sm line-clamp-2 mb-1">
                              {eventProduct.product.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {(eventProduct.product.price_cents / 100).toFixed(2)} {eventProduct.product.currency}
                            </p>
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => handleTryOnProduct(eventProduct.product.id)}
                            >
                              Try On
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Photo Upload Modal */}
          <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Your Photo for Virtual Try-On</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload a clear photo of yourself to try on items from this event. 
                  This photo will be saved and reused for all products in this event.
                </p>
                <div className="space-y-4">
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
                            const fileName = `event-person-${Date.now()}-${file.name}`;
                            const filePath = `event-photos/${fileName}`;

                            const { error: uploadError } = await supabase.storage
                              .from('event-photos')
                              .upload(filePath, file);

                            if (uploadError) throw uploadError;

                            const { data: { publicUrl } } = supabase.storage
                              .from('event-photos')
                              .getPublicUrl(filePath);

                            setUserPhotoUrl(publicUrl);
                            toast({
                              title: 'Success',
                              description: 'Photo uploaded successfully'
                            });
                          } catch (error) {
                            console.error('Error uploading photo:', error);
                            toast({
                              title: 'Upload failed',
                              description: 'Failed to upload photo',
                              variant: 'destructive'
                            });
                          } finally {
                            e.target.value = '';
                          }
                        }
                      }}
                      className="hidden"
                      id="person-photo-upload"
                    />
                    <label htmlFor="person-photo-upload" className="cursor-pointer block">
                      <div className="text-center">
                        {userPhotoUrl ? (
                          <div className="flex flex-col items-center space-y-2">
                            <img 
                              src={userPhotoUrl} 
                              alt="Your photo" 
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                            <p className="text-sm text-green-600">Photo uploaded</p>
                            <p className="text-xs text-muted-foreground">Click to change</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center space-y-2">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Upload your photo</p>
                            <p className="text-xs text-muted-foreground">JPG, PNG up to 10MB</p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => saveUserEventPhoto(userPhotoUrl)} disabled={!userPhotoUrl}>
                    Save Photo
                  </Button>
                  <Button variant="outline" onClick={() => setIsPhotoModalOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Fashion Events</h1>
          <p className="text-muted-foreground">
            Discover upcoming fashion events and try on the latest collections virtually
          </p>
        </div>

        {events.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No Upcoming Events</p>
              <p className="text-muted-foreground">Check back soon for exciting fashion events!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {events.map((event) => (
              <Card key={event.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedEvent(event)}>
                <CardHeader>
                  <div className="flex gap-4">
                    {event.cover_photo_url && (
                      <img src={event.cover_photo_url} alt={event.name}
                           className="w-20 h-20 object-cover rounded-lg" />
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{event.name}</CardTitle>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          {format(event.event_date, 'PPP')}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {event.city && event.country ? 
                            `${event.city}, ${event.country}` : 
                            event.location_text || 'Location TBD'
                          }
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {event.retailer.logo_url && (
                        <img src={event.retailer.logo_url} alt={event.retailer.name}
                             className="w-6 h-6 object-cover rounded" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        Hosted by {event.retailer.name}
                      </span>
                    </div>
                    <Badge>
                      {event.duration_days} day{event.duration_days > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;