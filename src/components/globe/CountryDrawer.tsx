import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Sparkles, ChevronRight } from 'lucide-react';
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
import { getCountryNameFromCode } from '@/lib/countryCurrency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SmartImage } from '@/components/SmartImage';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';

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
  price_cents: number;
  currency: string;
  brand_id: string;
}

interface CountryDrawerProps {
  countryCode: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CountryDrawer({ countryCode, open, onOpenChange }: CountryDrawerProps) {
  const navigate = useNavigate();
  const countryName = countryCode ? getCountryNameFromCode(countryCode) : '';

  // Fetch brands in this country
  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ['country-brands', countryCode],
    queryFn: async (): Promise<CountryBrand[]> => {
      if (!countryCode) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from('brands')
        .select('id, name, slug, logo_url')
        .eq('country_code', countryCode)
        .eq('is_active', true)
        .limit(10);
      return (result.data ?? []) as CountryBrand[];
    },
    enabled: !!countryCode && open,
  });

  // Fetch products from brands in this country
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['country-products', countryCode, brands?.map(b => b.id).join(',')],
    queryFn: async (): Promise<CountryProduct[]> => {
      if (!brands || brands.length === 0) return [];
      const brandIds = brands.map(b => b.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from('products')
        .select('id, title, media_urls, price_cents, currency, brand_id')
        .in('brand_id', brandIds)
        .eq('status', 'active')
        .limit(12);
      return (result.data ?? []) as CountryProduct[];
    },
    enabled: !!brands && brands.length > 0 && open,
  });

  const handleStartSwiping = () => {
    onOpenChange(false);
    navigate(`/swipe?country=${countryCode}`);
  };

  const handleBrandClick = (slug: string) => {
    onOpenChange(false);
    navigate(`/brand/${slug}`);
  };

  const handleProductClick = (productId: string) => {
    onOpenChange(false);
    navigate(`/p/${productId}`);
  };

  const handleViewAllProducts = () => {
    onOpenChange(false);
    navigate(`/explore?tab=brands&country=${countryCode}`);
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

  const isLoading = brandsLoading || productsLoading;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] bg-background/95 backdrop-blur-xl border-t border-border/50">
        <DrawerHeader className="pb-2 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <DrawerTitle className="text-xl font-serif">{countryName}</DrawerTitle>
            </div>
            
            {/* Floating Start Swiping Button */}
            <Button
              size="sm"
              onClick={handleStartSwiping}
              className="h-9 w-9 rounded-full p-0 bg-primary hover:bg-primary/90 shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-1">
            {brands?.length || 0} brands • {products?.length || 0} products
          </p>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
              </div>
            </div>
          ) : products && products.length > 0 ? (
            <div className="space-y-4">
              {/* Products Grid - Card View */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-foreground">Products</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleViewAllProducts}
                    className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                  >
                    View All <ChevronRight className="w-3 h-3 ml-0.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {products.slice(0, 6).map((product) => (
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
              </div>

              {/* Brands Section */}
              {brands && brands.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Brands in {countryName}</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {brands.map((brand) => (
                      <button 
                        key={brand.id} 
                        onClick={() => handleBrandClick(brand.slug)} 
                        className="flex flex-col items-center gap-1.5 flex-shrink-0"
                      >
                        <Avatar className="w-14 h-14 border-2 border-border/50 hover:border-primary/50 transition-colors">
                          <AvatarImage src={brand.logo_url || undefined} alt={brand.name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">{brand.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] font-medium text-center line-clamp-1 max-w-14">{brand.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : brands && brands.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Brands in {countryName}</h3>
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
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No brands in this country yet</p>
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

export default CountryDrawer;
