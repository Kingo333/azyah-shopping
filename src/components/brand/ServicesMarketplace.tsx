import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Megaphone, Camera, DollarSign, Percent, MessageSquare, Building2, ExternalLink } from 'lucide-react';

interface ServiceWithBrand {
  id: string;
  title: string;
  description: string | null;
  service_type: string;
  min_price: number | null;
  max_price: number | null;
  discount_percent: number | null;
  brand: {
    id: string;
    name: string;
    logo_url: string | null;
    category: string;
    website: string | null;
    bio: string | null;
  };
}

interface ServicesMarketplaceProps {
  currentBrandId: string;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  'ugc': 'UGC Content',
  'paid_ads': 'Paid Ads / Performance',
  'strategy': 'Marketing Strategy',
  'influencer': 'Influencer Marketing',
  'social_media': 'Social Media Management',
  'studio_rental': 'Studio Rental',
  'photo_shoot': 'Photo Shoot',
  'video_production': 'Video Production',
  'post_production': 'Post Production / Editing',
  'other': 'Other'
};

export const ServicesMarketplace: React.FC<ServicesMarketplaceProps> = ({
  currentBrandId
}) => {
  const [services, setServices] = useState<ServiceWithBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<ServiceWithBrand | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch active services from agencies and studios
      const { data, error } = await supabase
        .from('brand_services')
        .select(`
          id,
          title,
          description,
          service_type,
          min_price,
          max_price,
          discount_percent,
          brand:brands!inner (
            id,
            name,
            logo_url,
            category,
            website,
            bio
          )
        `)
        .eq('is_active', true)
        .in('brand.category', ['agency', 'studio'])
        .neq('brand_id', currentBrandId);

      if (error) throw error;

      // Transform the data
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        brand: item.brand
      }));

      setServices(transformedData);
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
  }, [currentBrandId, toast]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleRequestIntro = (service: ServiceWithBrand) => {
    setSelectedService(service);
    setMessage('');
    setIsRequestModalOpen(true);
  };

  const handleSendRequest = async () => {
    if (!selectedService) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('service_leads')
        .insert({
          service_id: selectedService.id,
          requesting_brand_id: currentBrandId,
          message: message.trim() || null
        });

      if (error) throw error;

      toast({
        title: 'Request sent!',
        description: 'The partner will contact you soon.'
      });

      setIsRequestModalOpen(false);
      setSelectedService(null);
      setMessage('');
    } catch (error) {
      console.error('Error sending request:', error);
      toast({
        title: 'Error',
        description: 'Failed to send request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatPrice = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    if (max) return `Up to $${max.toLocaleString()}`;
    return null;
  };

  const getCategoryIcon = (category: string) => {
    return category === 'agency' 
      ? <Megaphone className="h-4 w-4" />
      : <Camera className="h-4 w-4" />;
  };

  const getCategoryLabel = (category: string) => {
    return category === 'agency' ? 'Marketing Agency' : 'Studio / Production';
  };

  // Group services by brand
  const servicesByBrand = services.reduce((acc, service) => {
    const brandId = service.brand.id;
    if (!acc[brandId]) {
      acc[brandId] = {
        brand: service.brand,
        services: []
      };
    }
    acc[brandId].services.push(service);
    return acc;
  }, {} as Record<string, { brand: ServiceWithBrand['brand']; services: ServiceWithBrand[] }>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Partner Services
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Discover marketing agencies and production studios to help grow your brand
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Loading services...</p>
          </div>
        ) : Object.keys(servicesByBrand).length > 0 ? (
          <div className="space-y-6">
            {Object.values(servicesByBrand).map(({ brand, services: brandServices }) => (
              <Card key={brand.id} className="border-border/50 overflow-hidden">
                {/* Brand Header */}
                <div className="bg-muted/30 p-4 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={brand.logo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {brand.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{brand.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {getCategoryIcon(brand.category)}
                        <span>{getCategoryLabel(brand.category)}</span>
                      </div>
                    </div>
                    {brand.website && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="hidden sm:flex"
                      >
                        <a href={brand.website} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Website
                        </a>
                      </Button>
                    )}
                  </div>
                  {brand.bio && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {brand.bio}
                    </p>
                  )}
                </div>

                {/* Services List */}
                <div className="divide-y">
                  {brandServices.map(service => (
                    <div key={service.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium">{service.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {SERVICE_TYPE_LABELS[service.service_type] || service.service_type}
                            </Badge>
                          </div>
                          {service.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 flex-wrap">
                            {formatPrice(service.min_price, service.max_price) && (
                              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                <DollarSign className="h-3 w-3" />
                                {formatPrice(service.min_price, service.max_price)}
                              </span>
                            )}
                            {service.discount_percent && (
                              <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                                <Percent className="h-3 w-3 mr-1" />
                                {service.discount_percent}% Azyah Partner Discount
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleRequestIntro(service)}
                          className="flex-shrink-0"
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Request Intro
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No partner services available yet</h3>
            <p className="text-muted-foreground">
              Marketing agencies and production studios will appear here once they list their services.
            </p>
          </div>
        )}
      </CardContent>

      {/* Request Intro Modal */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Introduction</DialogTitle>
            <DialogDescription>
              Send a message to {selectedService?.brand.name} about "{selectedService?.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="message">What do you need help with?</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Briefly describe your project or what you're looking for..."
              rows={4}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendRequest} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
