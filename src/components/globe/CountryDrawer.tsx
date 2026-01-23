import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronRight, Users, ChevronUp, ChevronDown, Play } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCountryNameFromCode } from '@/lib/countryCurrency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SmartImage } from '@/components/SmartImage';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ExploreTab = 'brands' | 'following' | 'shoppers' | 'your-fit';

interface CountryBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface CountryProduct {
  id: string;
  title: string;
  media_urls: any;
  image_url?: string | null;
  price_cents: number;
  currency: string;
  brand_id: string;
}

interface CountryShopper {
  id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface ShopperFit {
  id: string;
  user_id: string;
  title: string | null;
  image_preview: string | null;
  render_path: string | null;
}

interface CountryDrawerProps {
  countryCode: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab?: ExploreTab;
}

export function CountryDrawer({ countryCode, open, onOpenChange, activeTab = 'brands' }: CountryDrawerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const countryName = countryCode === 'GLOBAL' ? 'Global Community' : (countryCode ? getCountryNameFromCode(countryCode) : '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'brands' | 'products'>('brands');

  // Fetch brands in this country
  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ['country-brands', countryCode],
    queryFn: async (): Promise<CountryBrand[]> => {
      if (!countryCode || countryCode === 'GLOBAL') return [];
      const result = await supabase
        .from('brands')
        .select('id, name, slug, logo_url')
        .eq('country_code', countryCode)
        .limit(10);
      return (result.data ?? []) as CountryBrand[];
    },
    enabled: !!countryCode && open && (activeTab === 'brands' || activeTab === 'following'),
  });

  // Fetch products from brands in this country
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['country-products', countryCode, brands?.map(b => b.id).join(',')],
    queryFn: async (): Promise<CountryProduct[]> => {
      if (!brands || brands.length === 0) return [];
      const brandIds = brands.map(b => b.id);
      const result = await supabase
        .from('products')
        .select('id, title, media_urls, image_url, price_cents, currency, brand_id')
        .in('brand_id', brandIds)
        .eq('status', 'active')
        .limit(12);
      return (result.data ?? []) as CountryProduct[];
    },
    enabled: !!brands && brands.length > 0 && open && (activeTab === 'brands' || activeTab === 'following'),
  });

  // Fetch shoppers in this country or globally
  const { data: shoppers, isLoading: shoppersLoading } = useQuery({
    queryKey: ['country-shoppers', countryCode, activeTab],
    queryFn: async (): Promise<CountryShopper[]> => {
      if (!countryCode) return [];
      
      let query = supabase
        .from('users_public')
        .select('id, name, username, avatar_url')
        .limit(20);
      
      // For GLOBAL, get users without a country set
      if (countryCode === 'GLOBAL') {
        // Get all users - we can't filter by null country in public view
        // Just return all users for now
      } else {
        // Get users from this specific country
        const usersResult = await supabase
          .from('users')
          .select('id')
          .eq('country', countryCode);
        
        if (usersResult.data && usersResult.data.length > 0) {
          const userIds = usersResult.data.map(u => u.id);
          query = query.in('id', userIds);
        } else {
          return [];
        }
      }
      
      const result = await query;
      return (result.data ?? []) as CountryShopper[];
    },
    enabled: !!countryCode && open && (activeTab === 'shoppers' || activeTab === 'your-fit'),
  });

  // Fetch shopper public fits
  const shopperIds = shoppers?.map(s => s.id) || [];
  const { data: shopperFits } = useQuery({
    queryKey: ['shopper-fits', shopperIds.join(',')],
    queryFn: async (): Promise<ShopperFit[]> => {
      if (shopperIds.length === 0) return [];
      const { data } = await supabase
        .from('fits')
        .select('id, user_id, title, image_preview, render_path')
        .in('user_id', shopperIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);
      return (data || []) as ShopperFit[];
    },
    enabled: shopperIds.length > 0 && open && (activeTab === 'shoppers' || activeTab === 'your-fit'),
  });

  const handleBrandClick = (slug: string) => {
    onOpenChange(false);
    navigate(`/brand/${slug}`);
  };

  const handleProductClick = (productId: string) => {
    onOpenChange(false);
    navigate(`/p/${productId}`);
  };

  const handleSwipeToCountry = () => {
    onOpenChange(false);
    navigate(`/swipe?country=${countryCode}`);
  };

  const handleShopperClick = (shopperId: string) => {
    onOpenChange(false);
    navigate(`/profile/${shopperId}`);
  };

  const handleFitClick = (fitId: string) => {
    // Check if user is guest
    if (!user) {
      toast({
        title: "Create an account",
        description: "Log in to view full outfit details and save your favorites",
      });
    }
    onOpenChange(false);
    navigate(`/explore/outfit/${fitId}`);
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const getBrandName = (brandId: string) => {
    return brands?.find(b => b.id === brandId)?.name || '';
  };

  // Determine what to show based on activeTab
  const showBrandsContent = activeTab === 'brands' || activeTab === 'following';
  const showShoppersContent = activeTab === 'shoppers' || activeTab === 'your-fit';

  // Check loading states per content type
  const isLoadingBrands = brandsLoading;
  const isLoadingProducts = productsLoading;
  const isLoadingShoppers = shoppersLoading;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent 
        className={cn(
          "bg-background/95 backdrop-blur-xl border-t border-border/50 transition-all duration-300",
          isExpanded ? "h-[95vh]" : "max-h-[55vh]"
        )}
      >
        <DrawerHeader className="pb-2 relative">
          {/* Expand/Collapse Button */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute top-2 right-4 p-2 rounded-full hover:bg-accent/50 transition-colors"
            aria-label={isExpanded ? "Collapse drawer" : "Expand drawer"}
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          <div className="flex items-center justify-between pr-10">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <DrawerTitle className="text-xl font-serif">{countryName}</DrawerTitle>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-1">
            {showBrandsContent 
              ? `${brands?.length || 0} brands • ${products?.length || 0} products`
              : `${shoppers?.length || 0} shoppers`
            }
          </p>

          {/* Swipe CTA with micro-note */}
          <div className="flex items-center gap-3 mt-3">
            <Button
              onClick={handleSwipeToCountry}
              size="sm"
              className="gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              Swipe
            </Button>
            <p className="text-xs text-muted-foreground">
              Swipe to discover products from {countryName}
            </p>
          </div>

          {/* Tabs for Brands/Products - only in brands content mode */}
          {showBrandsContent && (
            <Tabs value={drawerTab} onValueChange={(v) => setDrawerTab(v as 'brands' | 'products')} className="mt-3">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="brands">Brands</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          {showBrandsContent ? (
            // Brands & Products Content with Tabs
            <div className="space-y-4">
              {drawerTab === 'brands' ? (
                // Brands Tab Content
                isLoadingBrands ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
                  </div>
                ) : brands && brands.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {brands.map((brand) => (
                      <button 
                        key={brand.id} 
                        onClick={() => handleBrandClick(brand.slug)} 
                        className="flex flex-col items-center p-3 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm hover:bg-accent/50 transition-colors"
                      >
                        <Avatar className="w-12 h-12 mb-2">
                          <AvatarImage src={brand.logo_url || undefined} alt={brand.name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">{brand.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-center line-clamp-2">{brand.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No brands in this country yet</p>
                  </div>
                )
              ) : (
                // Products Tab Content
                isLoadingProducts ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
                  </div>
                ) : products && products.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {products.slice(0, isExpanded ? 12 : 6).map((product) => (
                      <Card
                        key={product.id}
                        className="overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 bg-card/80 backdrop-blur-sm border-border/50"
                        onClick={() => handleProductClick(product.id)}
                      >
                        <div className="aspect-[3/4] relative overflow-hidden bg-muted">
                          <SmartImage
                            src={getPrimaryImageUrl(product)}
                            alt={product.title}
                            className="w-full h-full object-cover"
                            sizes="(max-width: 640px) 100px, 120px"
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-[10px] text-muted-foreground truncate">{getBrandName(product.brand_id)}</p>
                          <p className="text-xs font-medium truncate">{product.title}</p>
                          <p className="text-xs text-primary font-semibold">{formatPrice(product.price_cents, product.currency)}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No products in this country yet</p>
                  </div>
                )
              )}
            </div>
          ) : (
            // Shoppers Content with their public fits
            <div className="space-y-4">
              {isLoadingShoppers ? (
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
                </div>
              ) : shoppers && shoppers.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-foreground">
                    {activeTab === 'your-fit' ? 'People with Similar Fit' : 'Shoppers'}
                  </h3>
                  
                  {/* Shoppers Grid with their fits */}
                  {shoppers.map((shopper) => {
                    const userFits = shopperFits?.filter(f => f.user_id === shopper.id) || [];
                    
                    return (
                      <div key={shopper.id} className="space-y-2">
                        {/* Shopper Header */}
                        <button 
                          onClick={() => handleShopperClick(shopper.id)} 
                          className="flex items-center gap-3 w-full text-left hover:bg-accent/30 rounded-lg p-2 transition-colors"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={shopper.avatar_url || undefined} alt={shopper.name || shopper.username || 'User'} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {(shopper.name || shopper.username || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium block truncate">
                              {shopper.name || shopper.username || 'Anonymous'}
                            </span>
                            {shopper.username && shopper.name && (
                              <span className="text-xs text-muted-foreground">@{shopper.username}</span>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </button>
                        
                        {/* Shopper's Public Fits */}
                        {userFits.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 ml-12">
                            {userFits.slice(0, 3).map((fit) => (
                              <Card 
                                key={fit.id} 
                                className="overflow-hidden cursor-pointer hover:shadow-md transition-all bg-card/80 border-border/50"
                                onClick={() => handleFitClick(fit.id)}
                              >
                                <div className="aspect-[3/4] relative overflow-hidden bg-muted">
                                  <SmartImage 
                                    src={fit.render_path || fit.image_preview || '/placeholder.svg'} 
                                    alt={fit.title || 'Outfit'} 
                                    className="w-full h-full object-cover"
                                    sizes="80px"
                                  />
                                </div>
                                {fit.title && (
                                  <p className="text-[10px] p-1 truncate text-muted-foreground">{fit.title}</p>
                                )}
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {activeTab === 'your-fit' 
                      ? 'No people with similar fit in this area yet' 
                      : 'No shoppers in this country yet'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

export default CountryDrawer;