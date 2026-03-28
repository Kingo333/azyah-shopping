import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Store, UserCircle, Upload, ChevronLeft, ChevronRight, Trash2, Eye, ChevronDown, Loader2, Home, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import EventTryOnModal from '@/components/EventTryOnModal';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { shouldShowNotification, markNotified } from '@/utils/tryonNotifications';
import QRCode from 'qrcode';

interface RetailEvent {
  id: string;
  name: string;
  description: string;
  event_date: string;
  end_date?: string;
  location: string;
  status: string;
  banner_image_url?: string;
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
  ar_model_url?: string;
  ar_enabled?: boolean;
}

const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const Events = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<RetailEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<RetailEvent | null>(null);
  const [eventBrands, setEventBrands] = useState<EventBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [hasPersonImage, setHasPersonImage] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<EventProduct | null>(null);
  const [brandScrollPositions, setBrandScrollPositions] = useState<{ [key: string]: number }>({});
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [tryOnResults, setTryOnResults] = useState<Record<string, any>>({});

  // AR QR modal state
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrModalProduct, setQRModalProduct] = useState<EventProduct | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  // Generate QR code when modal opens
  useEffect(() => {
    if (showQRModal && qrModalProduct && qrCanvasRef.current && selectedEvent) {
      const arUrl = `${window.location.origin}/ar/${selectedEvent.id}/${qrModalProduct.event_brand_id}?productId=${qrModalProduct.id}`;
      QRCode.toCanvas(qrCanvasRef.current, arUrl, {
        width: 240,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
    }
  }, [showQRModal, qrModalProduct, selectedEvent]);

  // Fetch try-on results for the selected event
  const fetchTryOnResults = async () => {
    if (!user?.id || !selectedEvent?.id) return;
    const { data } = await supabase.from('event_tryon_jobs').select('product_id, status, output_path, created_at, error, provider_job_id').eq('event_id', selectedEvent.id).eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) {
      const resultsMap = data.reduce((acc: Record<string, any>, job) => {
        if (!acc[job.product_id] || new Date(job.created_at) > new Date(acc[job.product_id].created_at)) {
          acc[job.product_id] = job;
        }
        return acc;
      }, {});
      setTryOnResults(resultsMap);
    }
  };

  // Realtime subscription for job updates (no legacy polling)
  useEffect(() => {
    if (!user?.id || !selectedEvent?.id) return;

    fetchTryOnResults();

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

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, selectedEvent?.id]);

  const fetchUpcomingEvents = async () => {
    try {
      const { data, error } = await supabase.from('retail_events').select(`
          *,
          retailer:retailers(name, logo_url)
        `).eq('status', 'active').gte('end_date', new Date().toISOString().split('T')[0]).order('event_date', { ascending: true });
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
      const { data: brandsData, error: brandsError } = await supabase.from('event_brands').select('*').eq('event_id', eventId).order('created_at', { ascending: true });
      if (brandsError) throw brandsError;

      const brandsWithProducts = await Promise.all((brandsData || []).map(async brand => {
        const { data: productsData, error: productsError } = await supabase.from('event_brand_products').select('*').eq('event_brand_id', brand.id).order('sort_order', { ascending: true });
        if (productsError) {
          console.error('Error fetching products for brand:', brand.id, productsError);
          return { ...brand, products: [] };
        }
        const productsWithBrandInfo = (productsData || []).map(product => ({
          ...product,
          brand_name: brand.brand_name,
          brand_logo_url: brand.logo_url
        }));
        return { ...brand, products: productsWithBrandInfo };
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
      const { data, error } = await supabase.from('event_user_photos').select('photo_url').eq('event_id', eventId).eq('user_id', user.id).single();
      setHasPersonImage(!!data && !error);
    } catch (err) {
      setHasPersonImage(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!selectedEvent || !user) return;
    try {
      const { data: photoData } = await supabase.from('event_user_photos').select('photo_url').eq('event_id', selectedEvent.id).eq('user_id', user.id).single();
      if (photoData?.photo_url) {
        await supabase.storage.from('event-user-photos').remove([photoData.photo_url]);
      }
      const { error } = await supabase.from('event_user_photos').delete().eq('event_id', selectedEvent.id).eq('user_id', user.id);
      if (error) throw error;
      setHasPersonImage(false);
      toast({ title: "Photo deleted", description: "You can upload a new photo anytime" });
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Failed to delete photo", variant: "destructive" });
    }
  };

  const handleReplacePhoto = () => {
    document.getElementById('person-image-upload')?.click();
  };

  const handleViewPhoto = async () => {
    if (!selectedEvent || !user) return;
    try {
      const { data: photoData } = await supabase.from('event_user_photos').select('photo_url').eq('event_id', selectedEvent.id).eq('user_id', user.id).single();
      if (photoData?.photo_url) {
        const { data } = supabase.storage.from('event-user-photos').getPublicUrl(photoData.photo_url);
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
      if (result.output_path) {
        const { error: storageError } = await supabase.storage.from('event-tryon-results').remove([result.output_path]);
        if (storageError) console.error('Storage delete error:', storageError);
      }
      const { data: jobs } = await supabase.from('event_tryon_jobs').select('id').eq('event_id', selectedEvent.id).eq('user_id', user.id).eq('product_id', productId).order('created_at', { ascending: false }).limit(1);
      if (jobs && jobs.length > 0) {
        const { error } = await supabase.from('event_tryon_jobs').delete().eq('id', jobs[0].id);
        if (error) throw error;
      }
      setTryOnResults(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
      toast({ title: "Result deleted", description: "Try-on result has been removed" });
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Failed to delete result", variant: "destructive" });
    }
  };

  const handleOpenAR = (product: EventProduct) => {
    if (!selectedEvent) return;
    const arUrl = `/ar/${selectedEvent.id}/${product.event_brand_id}?productId=${product.id}`;
    if (isMobileDevice()) {
      navigate(arUrl);
    } else {
      setQRModalProduct(product);
      setShowQRModal(true);
    }
  };

  const scrollBrandProducts = (brandId: string, direction: 'left' | 'right') => {
    const container = document.getElementById(`brand-products-${brandId}`);
    if (!container) return;
    const scrollAmount = 280;
    const currentPosition = brandScrollPositions[brandId] || 0;
    const newPosition = direction === 'left' ? Math.max(0, currentPosition - scrollAmount) : currentPosition + scrollAmount;
    container.scrollTo({ left: newPosition, behavior: 'smooth' });
    setBrandScrollPositions(prev => ({ ...prev, [brandId]: newPosition }));
  };

  if (!user) {
    return <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please sign in to view events</p>
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
        <Button variant="outline" onClick={() => { setSelectedEvent(null); setEventBrands([]); }} className="mb-6">
          ← Back to Events
        </Button>

        <div className="mb-8">
          {selectedEvent.banner_image_url && (
            <div className="w-full h-48 sm:h-64 rounded-xl overflow-hidden mb-6">
              <img src={selectedEvent.banner_image_url} alt={selectedEvent.name} className="w-full h-full object-cover" />
            </div>
          )}
          
          <div className="flex items-start gap-4 mb-4">
            {selectedEvent.retailer.logo_url && <img src={selectedEvent.retailer.logo_url} alt={selectedEvent.retailer.name} className="w-16 h-16 rounded-lg object-cover" />}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{selectedEvent.name}</h1>
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
                  {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date && (
                    <span> – {format(new Date(selectedEvent.end_date), 'MMMM d, yyyy')}</span>
                  )}
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

        {/* Try-On Results Banner */}
        {Object.keys(tryOnResults).length > 0 && <div className="mb-8 space-y-3">
            <h2 className="text-lg font-semibold">Your Try-On Results</h2>
            
            {Object.entries(tryOnResults).filter(([_, result]) => result.status === 'succeeded' && result.output_path).length > 0 && <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {Object.entries(tryOnResults).filter(([_, result]) => result.status === 'succeeded' && result.output_path).map(([productId, result]) => {
            return <div key={productId} className="relative flex-shrink-0 w-[120px] rounded-lg overflow-hidden border border-green-500/30 hover:border-green-500 transition-colors cursor-pointer group">
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 z-10 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); if (confirm('Delete this try-on result?')) handleDeleteResult(productId); }}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                            <img src={supabase.storage.from('event-tryon-results').getPublicUrl(result.output_path).data.publicUrl} alt="Try-on result" className="w-full aspect-[3/4] object-cover" />
                        </div>;
          })}
                </div>}
          </div>}

        <div>
          <h2 className="text-xl font-semibold mb-4">Featured Brands</h2>
          {isLoadingBrands ? <div className="text-center py-8">Loading brands...</div> : eventBrands.length === 0 ? <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No brands available for this event yet.</p>
              </CardContent>
            </Card> : <div className="space-y-8">
              {eventBrands.map(brand => {
                return <div key={brand.id} className="space-y-4">
                  <div className="flex items-center space-x-4">
                    {brand.logo_url && <img src={brand.logo_url} alt={`${brand.brand_name} logo`} className="w-12 h-12 object-contain bg-white rounded-lg p-2 border" />}
                    <h3 className="text-xl font-bold">{brand.brand_name}</h3>
                  </div>
                  
                  {brand.products.length === 0 ? <p className="text-muted-foreground text-sm">No products available</p> : <div className="relative">
                      {brand.products.length > 4 && <>
                          <Button variant="outline" size="sm" className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm" onClick={() => scrollBrandProducts(brand.id, 'left')}>
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm" onClick={() => scrollBrandProducts(brand.id, 'right')}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </>}
                      
                      <div id={`brand-products-${brand.id}`} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {brand.products.map(product => <Card key={product.id} className="flex-shrink-0 w-36 group hover:shadow-lg transition-shadow">
                            <CardContent className="p-2">
                              <div className="relative mb-2">
                                <img src={product.image_url} alt="Product" className="w-full aspect-square object-cover rounded" />
                                {product.try_on_ready && hasPersonImage && !tryOnResults[product.id] && <Badge className="absolute top-1 right-1 bg-green-500 text-xs px-1 py-0.5">Ready</Badge>}
                                {tryOnResults[product.id]?.status === 'processing' && <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center">
                                    <Badge className="bg-blue-500 text-xs px-1.5 py-0.5">
                                      <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" />
                                      Processing
                                    </Badge>
                                  </div>}
                                {tryOnResults[product.id]?.status === 'succeeded' && <Badge className="absolute top-1 right-1 bg-green-500 text-xs px-1 py-0.5">✓</Badge>}
                                {tryOnResults[product.id]?.status === 'failed' && <Badge className="absolute top-1 right-1 bg-red-500 text-xs px-1 py-0.5">✗</Badge>}
                              </div>
                              
                              {/* Action buttons row */}
                              <div className="flex gap-1 w-full">
                                <Button size="sm" className="flex-1 min-w-0 text-xs h-6 truncate" disabled={!hasPersonImage || !product.try_on_ready || tryOnResults[product.id]?.status === 'processing'} onClick={() => {
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
                                
                                {/* Per-product AR button — icon only */}
                                {product.ar_enabled && product.ar_model_url && (
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="w-7 h-7 p-0 flex-shrink-0 border-purple-500/50 hover:border-purple-500 hover:bg-purple-500/10"
                                    onClick={() => handleOpenAR({
                                      ...product,
                                      event_brand_id: brand.id,
                                      brand_name: brand.brand_name,
                                      brand_logo_url: brand.logo_url
                                    })}
                                  >
                                    <Smartphone className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>)}
                      </div>
                    </div>}
                </div>})}
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

        {/* AR QR Code Modal (desktop) */}
        <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>AR Try-On: {qrModalProduct?.brand_name}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="bg-white p-4 rounded-xl shadow-inner">
                <canvas ref={qrCanvasRef} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Scan with your phone camera to try on this item in AR
                </p>
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Works on iOS Safari & Android Chrome
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    if (selectedEvent && qrModalProduct) {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/ar/${selectedEvent.id}/${qrModalProduct.event_brand_id}?productId=${qrModalProduct.id}`
                      );
                      toast({ title: "Link copied!" });
                    }
                  }}
                >
                  Copy Link
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (selectedEvent && qrModalProduct) {
                      window.open(`/ar/${selectedEvent.id}/${qrModalProduct.event_brand_id}?productId=${qrModalProduct.id}`, '_blank');
                    }
                  }}
                >
                  Open AR
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>;
  }

  return <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="flex-shrink-0">
          <Home className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Upcoming Events</h1>
      </div>
      
      {events.length === 0 ? <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No upcoming events at the moment. Check back soon!</p>
          </CardContent>
        </Card> : <div className="grid gap-4">
          {events.map(event => <Card key={event.id} className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden" onClick={() => selectEvent(event)}>
              <div className="flex flex-row">
                {event.banner_image_url && (
                  <div className="w-28 sm:w-40 flex-shrink-0">
                    <img src={event.banner_image_url} alt={event.name} className="w-full h-full object-cover rounded-l-lg" />
                  </div>
                )}
                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {event.retailer.logo_url && <img src={event.retailer.logo_url} alt={event.retailer.name} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />}
                        <h3 className="text-lg font-bold truncate">{event.name}</h3>
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0 text-[10px]">{event.status}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Store className="w-3 h-3" />
                        {event.retailer.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(event.event_date), 'MMM d, yyyy')}
                        {event.end_date && event.end_date !== event.event_date && (
                          <span> – {format(new Date(event.end_date), 'MMM d, yyyy')}</span>
                        )}
                      </span>
                      {event.location && <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>}
                    </div>
                    {event.description && <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>}
                  </div>
                  <div className="mt-3">
                    <Button size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); selectEvent(event); }}>View Event Catalog</Button>
                  </div>
                </div>
              </div>
            </Card>)}
        </div>}
    </div>;
};
export default Events;
