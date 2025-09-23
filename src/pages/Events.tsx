import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Store } from 'lucide-react';
import { format } from 'date-fns';

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

interface EventProduct {
  id: string;
  title: string;
  image_url?: string;
  price_cents: number;
  currency: string;
  featured: boolean;
}

const Events = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<RetailEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<RetailEvent | null>(null);
  const [eventProducts, setEventProducts] = useState<EventProduct[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchEventProducts = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_catalog')
        .select(`
          featured,
          product:products(
            id,
            title,
            image_url,
            price_cents,
            currency
          )
        `)
        .eq('event_id', eventId)
        .order('featured', { ascending: false });

      if (error) throw error;
      
      const products = data?.map(item => ({
        ...item.product,
        featured: item.featured
      })) || [];
      
      setEventProducts(products);
    } catch (error) {
      console.error('Error fetching event products:', error);
    }
  };

  const selectEvent = (event: RetailEvent) => {
    setSelectedEvent(event);
    fetchEventProducts(event.id);
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
          onClick={() => setSelectedEvent(null)}
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
            <div>
              <h1 className="text-3xl font-bold mb-2">{selectedEvent.name}</h1>
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
          <h2 className="text-xl font-semibold mb-4">Event Catalog</h2>
          {eventProducts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No products available for this event yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {eventProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="relative">
                    <img
                      src={product.image_url || '/placeholder.svg'}
                      alt={product.title}
                      className="w-full h-48 object-cover"
                    />
                    {product.featured && (
                      <Badge className="absolute top-2 left-2" variant="secondary">
                        Featured
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-2 line-clamp-2">{product.title}</h3>
                    <p className="text-lg font-semibold">
                      {product.currency} {(product.price_cents / 100).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
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