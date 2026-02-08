import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SmartImage } from '@/components/SmartImage';
import { getPrimaryImageUrl } from '@/utils/imageHelpers';
import HorizontalCarousel from './HorizontalCarousel';
import FollowButton from './FollowButton';
import { useFollowBrands } from '@/hooks/useFollowBrands';

interface BrandWithProducts {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  products: {
    id: string;
    title: string;
    media_urls: any;
    price_cents: number;
    currency: string;
  }[];
}

export const BrandsTab: React.FC = () => {
  const navigate = useNavigate();
  const { isFollowingBrand, toggleFollowBrand, isToggling } = useFollowBrands();

  const { data: brands, isLoading } = useQuery({
    queryKey: ['explore-brands-with-products'],
    queryFn: async () => {
      // Get brands with their latest products
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('id, name, slug, logo_url')
        .limit(10);

      if (brandsError) throw brandsError;
      if (!brandsData?.length) return [];

      // Get products for each brand
      const brandsWithProducts = await Promise.all(
        brandsData.map(async (brand) => {
          const { data: products } = await supabase
            .from('products')
            .select('id, title, media_urls, price_cents, currency')
            .eq('brand_id', brand.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(8);

          return {
            ...brand,
            products: products || [],
          };
        })
      );

      // Only return brands with products
      return brandsWithProducts.filter(b => b.products.length > 0) as BrandWithProducts[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-48 w-36 flex-shrink-0 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!brands?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No brands to display yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {brands.map((brand) => (
        <HorizontalCarousel
          key={brand.id}
          title={brand.name}
          showViewMore={false}
          headerAction={
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={brand.logo_url || undefined} alt={brand.name} />
                <AvatarFallback className="text-xs font-semibold">
                  {brand.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <FollowButton
                isFollowing={isFollowingBrand(brand.id)}
                onToggle={() => toggleFollowBrand(brand.id)}
                isLoading={isToggling}
              />
            </div>
          }
        >
          {/* Product Cards Only - no brand card */}
          {brand.products.map((product) => (
            <Card
              key={product.id}
              className="flex-shrink-0 w-32 sm:w-36 flex flex-col overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 snap-start"
              onClick={() => navigate(`/p/${product.id}`)}
            >
              <div className="aspect-[3/4] relative overflow-hidden flex-shrink-0">
                <SmartImage
                  src={getPrimaryImageUrl(product)}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  sizes="(max-width: 640px) 128px, 144px"
                />
              </div>
              <CardContent className="p-2 bg-card space-y-1">
                <p className="text-xs line-clamp-1 font-medium">{product.title}</p>
                <p className="text-xs text-primary font-semibold">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: product.currency || 'USD',
                  }).format(product.price_cents / 100)}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-6 text-[10px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/brand/${brand.slug}`);
                  }}
                >
                  Shop
                </Button>
              </CardContent>
            </Card>
          ))}
        </HorizontalCarousel>
      ))}
    </div>
  );
};

export default BrandsTab;
