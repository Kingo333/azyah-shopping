import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Store, Grid3X3, Sparkles } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { getCountryNameFromCode } from '@/lib/countryCurrency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CountryBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface CountryDrawerProps {
  countryCode: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CountryDrawer({ countryCode, open, onOpenChange }: CountryDrawerProps) {
  const navigate = useNavigate();
  const countryName = countryCode ? getCountryNameFromCode(countryCode) : '';

  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ['country-brands', countryCode],
    queryFn: async () => {
      if (!countryCode) return [] as CountryBrand[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from('brands')
        .select('id, name, slug, logo_url')
        .eq('country_code', countryCode)
        .eq('is_active', true)
        .limit(6);
      return (result.data ?? []) as CountryBrand[];
    },
    enabled: !!countryCode && open,
  });

  const { data: productCount } = useQuery({
    queryKey: ['country-product-count', countryCode],
    queryFn: async () => {
      if (!countryCode) return 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const brandResult = await (supabase as any)
        .from('brands')
        .select('id')
        .eq('country_code', countryCode);
      const brandIds = brandResult.data ?? [];
      if (brandIds.length === 0) return 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from('products')
        .select('id', { count: 'exact', head: true })
        .in('brand_id', brandIds.map((b: { id: string }) => b.id))
        .eq('status', 'active');
      return count ?? 0;
    },
    enabled: !!countryCode && open,
  });

  const handleStartSwiping = () => {
    onOpenChange(false);
    navigate(`/swipe?country=${countryCode}`);
  };

  const handleBrowseList = () => {
    onOpenChange(false);
    navigate(`/explore?tab=brands&country=${countryCode}`);
  };

  const handleBrandClick = (slug: string) => {
    onOpenChange(false);
    navigate(`/brand/${slug}`);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <MapPin className="w-5 h-5 text-primary" />
            <DrawerTitle className="text-2xl font-playfair">{countryName}</DrawerTitle>
          </div>
          <DrawerDescription className="flex items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Store className="w-4 h-4" />
              {brands?.length || 0} brands
            </span>
            <span className="flex items-center gap-1">
              <Grid3X3 className="w-4 h-4" />
              {productCount || 0} products
            </span>
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button onClick={handleStartSwiping} className="h-auto py-4 flex flex-col items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">Start Swiping</span>
              <span className="text-xs opacity-80">Discover your style</span>
            </Button>
            <Button variant="outline" onClick={handleBrowseList} className="h-auto py-4 flex flex-col items-center gap-2">
              <Grid3X3 className="w-5 h-5" />
              <span className="font-medium">Browse List</span>
              <span className="text-xs opacity-80">View all products</span>
            </Button>
          </div>

          {brandsLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : brands && brands.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Top Brands in {countryName}</h3>
              <div className="grid grid-cols-3 gap-3">
                {brands.map((brand) => (
                  <button key={brand.id} onClick={() => handleBrandClick(brand.slug)} className="flex flex-col items-center p-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors">
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
              <Store className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No brands in this country yet</p>
            </div>
          )}
        </ScrollArea>

        <DrawerFooter className="pt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default CountryDrawer;
