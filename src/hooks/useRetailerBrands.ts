
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RetailerBrand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  bio?: string;
  product_count: number;
}

export const useRetailerBrands = (retailerId: string) => {
  return useQuery({
    queryKey: ['retailer-brands', retailerId],
    queryFn: async (): Promise<RetailerBrand[]> => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          brand:brands!inner(
            id,
            name,
            slug,
            logo_url,
            bio
          )
        `)
        .eq('retailer_id', retailerId)
        .eq('status', 'active');

      if (error) throw error;

      // Group by brand and count products
      const brandMap = new Map<string, RetailerBrand>();
      
      data?.forEach(item => {
        if (item.brand) {
          const brandId = item.brand.id;
          if (brandMap.has(brandId)) {
            brandMap.get(brandId)!.product_count += 1;
          } else {
            brandMap.set(brandId, {
              id: item.brand.id,
              name: item.brand.name,
              slug: item.brand.slug,
              logo_url: item.brand.logo_url,
              bio: item.brand.bio,
              product_count: 1
            });
          }
        }
      });

      return Array.from(brandMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!retailerId,
  });
};
