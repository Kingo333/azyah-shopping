import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Store, UserCircle, Upload, ChevronLeft, ChevronRight, Trash2, Eye, ChevronDown, Loader2, Home } from 'lucide-react';
import { format } from 'date-fns';
import EventTryOnModal from '@/components/EventTryOnModal';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { shouldShowNotification, markNotified } from '@/utils/tryonNotifications';
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
  try_on_config?: any;
  try_on_ready?: boolean;
  event_brand_id: string;
  brand_name: string;
  brand_logo_url?: string;
}
const Events = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [events, setEvents] = useState<RetailEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<RetailEvent | null>(null);
  const [eventBrands, setEventBrands] = useState<EventBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [hasPersonImage, setHasPersonImage] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<EventProduct | null>(null);
  const [brandScrollPositions, setBrandScrollPositions] = useState<{
    [key: string]: number;
  }>({});
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [tryOnResults, setTryOnResults] = useState<Record<string, any>>({});
  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  // Fetch try-on results for the selected event
  const fetchTryOnResults = async () => {
    if (!user?.id || !selectedEvent?.id) return;
    const {
      data
    } = await supabase.from('event_tryon_jobs').select('product_id, status, output_path, created_at, error, provider_job_id').eq('event_id', selectedEvent.id).eq('user_id', user.id).order('created_at', {
      ascending: false
    });
    if (data) {
      const resultsMap = data.reduce((acc: Record<string, any>, job) => {
        // Only store the most recent job for each product
        if (!acc[job.product_id] || new Date(job.created_at) > new Date(acc[job.product_id].created_at)) {
          acc[job.product_id] = job;
        }
        return acc;
      }, {});
      setTryOnResults(resultsMap);
    }
  };

  // Poll background jobs and subscribe to updates
  useEffect(() => {
    if (!user?.id || !selectedEvent?.id) return;

    // Initial fetch
    fetchTryOnResults();

    // Set up realtime subscription for job updates
    const channel = supabase.channel(`event-tryon-updates-${selectedEvent.id}`).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'event_tryon_jobs',
      filter: `user_id=eq.${user.id}`
    }, payload => {
      const job = payload.new as any;
      
      if (job.status === 'succeeded' && job.output_path) {
        fetchTryOnResults();
        if (shouldShowNotification(job.id)) {
          markNotified(job.id);
          toast({
            title: "Try-on complete! ✨",
            description: "Your virtual try-on result is ready"
          });
        }
      } else if (job.status === 'failed') {
        fetchTryOnResults();

        // Parse error for user-friendly message
        let errorMsg = job.error || "Generation failed";
        if (errorMsg.includes('not configured') || errorMsg.includes('Not Configured')) {
          errorMsg = "This product isn't set up for try-on yet. Please contact the retailer.";
        } else if (errorMsg.includes('person') || errorMsg.includes('Missing person')) {
          errorMsg = "Please upload your photo first";
        } else if (errorMsg.includes('API key') || errorMsg.includes('not configured')) {
          errorMsg = "Try-on service temporarily unavailable. Please try again later.";
        } else if (errorMsg.includes('Edge function')) {
          errorMsg = "Try-on service error. Please try again.";
        }
        toast({
          title: "Try-on failed",
          description: errorMsg,
          variant: "destructive"
        });
      }
    }).subscribe();

    // Poll processing jobs every 5 seconds with automatic edge function invocation
    const pollInterval = setInterval(async () => {
      const {
        data: pendingJobs
      } = await supabase.from('event_tryon_jobs').select('id, status, provider_job_id').eq('event_id', selectedEvent.id).eq('user_id', user.id).in('status', ['queued', 'processing']);
      if (pendingJobs && pendingJobs.length > 0) {
        console.log(`[Events] Found ${pendingJobs.length} pending jobs, polling...`);
        for (const job of pendingJobs) {
          // Only poll if job has a provider_job_id
          if (job.provider_job_id) {
            try {
              const {
                data,
                error
              } = await supabase.functions.invoke('bitstudio-poll-job', {
                body: {
                  jobId: job.id
                }
              });

              // Handle 404 gracefully (job was deleted)
              if (error?.message?.includes('404') || error?.message?.includes('not found')) {
                console.log(`[Events] Job ${job.id} no longer exists, skipping`);
                await fetchTryOnResults();
                continue;
              }
              if (error) {
                console.error(`[Events] Poll error for job ${job.id}:`, error);
              } else {
                console.log(`[Events] Poll result for job ${job.id}:`, data);

                // Refresh results on completion or failure
                if (data?.status === 'succeeded' || data?.status === 'failed') {
                  await fetchTryOnResults();
                }
              }
            } catch (err: any) {
              // Handle 404/406 errors (deleted jobs) gracefully
              if (err?.status === 404 || err?.status === 406) {
                console.log(`[Events] Job ${job.id} deleted, skipping poll`);
                await fetchTryOnResults();
              } else {
                console.error(`[Events] Poll exception for job ${job.id}:`, err);
              }
            }
          } else {
            console.warn(`[Events] Job ${job.id} has no provider_job_id yet (status: ${job.status})`);
          }
        }
      }
    }, 5000); // Poll every 5 seconds

    return () => {
      channel.unsubscribe();
      clearInterval(pollInterval);
    };
  }, [user?.id, selectedEvent?.id]);
  const fetchUpcomingEvents = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('retail_events').select(`
          *,
          retailer:retailers(name, logo_url)
        `).eq('status', 'active').gte('end_date', new Date().toISOString().split('T')[0]).order('event_date', {
        ascending: true
      });
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
      const {
        data: brandsData,
        error: brandsError
      } = await supabase.from('event_brands').select('*').eq('event_id', eventId).order('created_at', {
        ascending: true
      });
      if (brandsError) throw brandsError;

      // Fetch products for each brand
      const brandsWithProducts = await Promise.all((brandsData || []).map(async brand => {
        const {
          data: productsData,
          error: productsError
        } = await supabase.from('event_brand_products').select('*').eq('event_brand_id', brand.id).order('sort_order', {
          ascending: true
        });
        if (productsError) {
          console.error('Error fetching products for brand:', brand.id, productsError);
          return {
            ...brand,
            products: []
          };
        }

        // Add brand info to products
        const productsWithBrandInfo = (productsData || []).map(product => ({
          ...product,
          brand_name: brand.brand_name,
          brand_logo_url: brand.logo_url
        }));
        return {
          ...brand,
          products: productsWithBrandInfo
        };
      }));
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
      const {
        data,
        error
      } = await supabase.from('event_user_photos').select('photo_url').eq('event_id', eventId).eq('user_id', user.id).single();
      setHasPersonImage(!!data && !error);
    } catch (err) {
      setHasPersonImage(false);
    }
  };
  const handleDeletePhoto = async () => {
    if (!selectedEvent || !user) return;
    try {
      // Get the current photo data
      const {
        data: photoData
      } = await supabase.from('event_user_photos').select('photo_url').eq('event_id', selectedEvent.id).eq('user_id', user.id).single();
      if (photoData?.photo_url) {
        // Delete from Supabase Storage
        await supabase.storage.from('event-user-photos').remove([photoData.photo_url]);
      }

      // Delete from database
      const {
        error
      } = await supabase.from('event_user_photos').delete().eq('event_id', selectedEvent.id).eq('user_id', user.id);
      if (error) throw error;
      setHasPersonImage(false);
      toast({
        title: "Photo deleted",
        description: "You can upload a new photo anytime"
      });
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete photo",
        variant: "destructive"
      });
    }
  };
  const handleReplacePhoto = () => {
    // Trigger the file input
    document.getElementById('person-image-upload')?.click();
  };
  const handleViewPhoto = async () => {
    if (!selectedEvent || !user) return;
    try {
      const {
        data: photoData
      } = await supabase.from('event_user_photos').select('photo_url').eq('event_id', selectedEvent.id).eq('user_id', user.id).single();
      if (photoData?.photo_url) {
        const {
          data
        } = supabase.storage.from('event-user-photos').getPublicUrl(photoData.photo_url);
        setPreviewPhotoUrl(data.publicUrl);
      }
    } catch (error) {
      console.error('Error fetching photo:', error);
    }
  };
  const handleDeleteResult = async (productId: string) => {
    if (!user?.id || !selectedEvent?.id) return;
    
    const result = tryOnResults[productId];
    if (!result) return;
    
    try {
      // Delete from storage
      if (result.output_path) {
        const { error: storageError } = await supabase.storage
          .from('event-tryon-results')
          .remove([result.output_path]);
        
        if (storageError) {
          console.error('Storage delete error:', storageError);
        }
      }
      
      // Delete from database - find the job ID first
      const { data: jobs } = await supabase
        .from('event_tryon_jobs')
        .select('id')
        .eq('event_id', selectedEvent.id)
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (jobs && jobs.length > 0) {
        const { error } = await supabase
          .from('event_tryon_jobs')
          .delete()
          .eq('id', jobs[0].id);
        
        if (error) throw error;
      }
      
      // Immediately remove from state instead of refetching
      setTryOnResults(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
      
      toast({
        title: "Result deleted",
        description: "Try-on result has been removed"
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete result",
        variant: "destructive"
      });
    }
  };

  const scrollBrandProducts = (brandId: string, direction: 'left' | 'right') => {
    const container = document.getElementById(`brand-products-${brandId}`);
    if (!container) return;
    const scrollAmount = 280; // Width of one product card + gap
    const currentPosition = brandScrollPositions[brandId] || 0;
    const newPosition = direction === 'left' ? Math.max(0, currentPosition - scrollAmount) : currentPosition + scrollAmount;
    container.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    });
    setBrandScrollPositions(prev => ({
      ...prev,
      [brandId]: newPosition
    }));
  };
  if (!user) {
    return <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please sign in to view events
            </p>
          </CardContent>
        </Card>
      </div>;
  }
  if (loading) {
    return <div className="container mx-auto px-4 py-8">
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>)}
        </div>
      </div>;
  }
  if (selectedEvent) {
    return <div className="container mx-auto px-4 py-8">
        <Button variant="outline" onClick={() => {
        setSelectedEvent(null);
        setEventBrands([]);
      }} className="mb-6">
          ← Back to Events
        </Button>

        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            {selectedEvent.retailer.logo_url && <img src={selectedEvent.retailer.logo_url} alt={selectedEvent.retailer.name} className="w-16 h-16 rounded-lg object-cover" />}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{selectedEvent.name}</h1>
                  {/* Photo Status Badge */}
                  {hasPersonImage ? <Badge className="bg-green-500 text-white">
                      <UserCircle className="w-4 h-4 mr-1" />
                      Photo Ready ✓
                    </Badge> : <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-muted-foreground">
                        <UserCircle className="w-4 h-4 mr-1" />
                        No Photo Yet
                      </Badge>
                      <span className="text-xs text-muted-foreground">Upload in product try-on</span>
                    </div>}
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
                {selectedEvent.location && <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {selectedEvent.location}
                  </div>}
              </div>
            </div>
          </div>
          
          {selectedEvent.description && <p className="text-muted-foreground">{selectedEvent.description}</p>}
        </div>

        {/* Try-On Results Banner - Enhanced to show all states */}
        {Object.keys(tryOnResults).length > 0 && <div className="mb-8 space-y-4">
            <h2 className="text-xl font-semibold">Your Try-On Results</h2>
            
            {/* Succeeded Results */}
            {Object.entries(tryOnResults).filter(([_, result]) => result.status === 'succeeded' && result.output_path).length > 0 && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {Object.entries(tryOnResults).filter(([_, result]) => result.status === 'succeeded' && result.output_path).map(([productId, result]) => {
            const product = eventBrands.flatMap(b => b.products).find(p => p.id === productId);
            return <Card key={productId} className="overflow-hidden border border-green-500/50 hover:border-green-500 transition-colors cursor-pointer group">
                          <div className="relative aspect-square">
                            <Badge className="absolute top-1.5 left-1.5 z-10 bg-green-500 text-white text-xs px-1.5 py-0.5">
                              ✨
                            </Badge>
                            
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1.5 right-1.5 z-10 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this try-on result?')) {
                                  handleDeleteResult(productId);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            
                            <img src={supabase.storage.from('event-tryon-results').getPublicUrl(result.output_path).data.publicUrl} alt="Try-on result" className="w-full h-full object-cover" />
                          </div>
                          <CardContent className="p-2">
                            <p className="text-xs font-medium truncate">{product?.brand_name || 'Product'}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {new Date(result.created_at).toLocaleDateString()}
                            </p>
                          </CardContent>
                        </Card>;
          })}
                </div>}
            
            {/* Failed Jobs - Simple display only */}
            {Object.entries(tryOnResults).some(([_, r]) => r.status === 'failed')}
            
            {/* Debug Panel */}
            {user && selectedEvent && Object.keys(tryOnResults).length > 0}
          </div>}

        <div>
          <h2 className="text-xl font-semibold mb-4">Featured Brands</h2>
          {isLoadingBrands ? <div className="text-center py-8">Loading brands...</div> : eventBrands.length === 0 ? <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No brands available for this event yet.
                </p>
              </CardContent>
            </Card> : <div className="space-y-8">
              {eventBrands.map(brand => <div key={brand.id} className="space-y-4">
                  <div className="flex items-center space-x-4">
                    {brand.logo_url && <img src={brand.logo_url} alt={`${brand.brand_name} logo`} className="w-12 h-12 object-contain bg-white rounded-lg p-2 border" />}
                    <h3 className="text-xl font-bold">{brand.brand_name}</h3>
                  </div>
                  
                  {brand.products.length === 0 ? <p className="text-muted-foreground text-sm">No products available</p> : <div className="relative">
                      {/* Scroll buttons */}
                      {brand.products.length > 4 && <>
                          <Button variant="outline" size="sm" className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm" onClick={() => scrollBrandProducts(brand.id, 'left')}>
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm" onClick={() => scrollBrandProducts(brand.id, 'right')}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </>}
                      
                      {/* Products carousel */}
                      <div id={`brand-products-${brand.id}`} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2" style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}>
                        {brand.products.map(product => <Card key={product.id} className="flex-shrink-0 w-36 group hover:shadow-lg transition-shadow">
                            <CardContent className="p-2">
                              {/* Product image with status badge */}
                              <div className="relative mb-2">
                                <img src={product.image_url} alt="Product" className="w-full aspect-square object-cover rounded" />
                                {/* Try-On Ready badge */}
                                {product.try_on_ready && hasPersonImage && !tryOnResults[product.id] && <Badge className="absolute top-1 right-1 bg-green-500 text-xs px-1 py-0.5">
                                    Ready
                                  </Badge>}
                                {/* Processing badge */}
                                {tryOnResults[product.id]?.status === 'processing' && <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center">
                                    <Badge className="bg-blue-500 text-xs px-1.5 py-0.5">
                                      <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" />
                                      Processing
                                    </Badge>
                                  </div>}
                                {/* Completed badge */}
                                {tryOnResults[product.id]?.status === 'succeeded' && <Badge className="absolute top-1 right-1 bg-green-500 text-xs px-1 py-0.5">
                                    ✓
                                  </Badge>}
                                {/* Failed badge */}
                                {tryOnResults[product.id]?.status === 'failed' && <Badge className="absolute top-1 right-1 bg-red-500 text-xs px-1 py-0.5">
                                    ✗
                                  </Badge>}
                              </div>
                              
                              <Button size="sm" className="w-full text-xs h-7" disabled={!hasPersonImage || !product.try_on_ready || tryOnResults[product.id]?.status === 'processing'} onClick={() => {
                      if (hasPersonImage && product.try_on_ready) {
                        setSelectedProduct({
                          ...product,
                          event_brand_id: brand.id,
                          brand_name: brand.brand_name,
                          brand_logo_url: brand.logo_url
                        });
                      }
                    }}>
                                {!hasPersonImage ? 'Photo First' : tryOnResults[product.id]?.status === 'processing' ? 'Processing' : tryOnResults[product.id]?.status === 'succeeded' ? 'Try Again' : product.try_on_ready ? 'Try On' : 'Not Ready'}
                              </Button>
                            </CardContent>
                          </Card>)}
                      </div>
                    </div>}
                </div>)}
            </div>}
        </div>

        {/* Try-On Modal */}
        {selectedProduct && selectedEvent && <EventTryOnModal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} product={selectedProduct} eventId={selectedEvent.id} eventName={selectedEvent.name} />}

        {/* Photo Preview Dialog */}
        <Dialog open={!!previewPhotoUrl} onOpenChange={() => setPreviewPhotoUrl(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Your Photo</DialogTitle>
            </DialogHeader>
            {previewPhotoUrl && <img src={previewPhotoUrl} alt="Your photo" className="w-full rounded-lg" />}
          </DialogContent>
        </Dialog>
      </div>;
  }
  return <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard')}
          className="flex-shrink-0"
        >
          <Home className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Upcoming Events</h1>
      </div>
      
      {events.length === 0 ? <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No upcoming events at the moment. Check back soon!
            </p>
          </CardContent>
        </Card> : <div className="grid gap-6">
          {events.map(event => <Card key={event.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    {event.retailer.logo_url && <img src={event.retailer.logo_url} alt={event.retailer.name} className="w-12 h-12 rounded-lg object-cover" />}
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
                        {event.location && <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">{event.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {event.description && <p className="text-muted-foreground mb-4">{event.description}</p>}
                <Button onClick={() => selectEvent(event)}>
                  View Event Catalog
                </Button>
              </CardContent>
            </Card>)}
        </div>}
    </div>;
};
export default Events;