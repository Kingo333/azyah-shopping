
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
      // First get all brands owned by this retailer
      const { data: brands, error: brandsError } = await supabase
        .from('brands')
        .select(`
          id,
          name,
          slug,
          logo_url,
          bio
        `)
        .eq('owner_user_id', (await supabase.auth.getUser()).data.user?.id);

      if (brandsError) {
        console.error('Error fetching retailer brands:', brandsError);
        toast({
          title: "Error",
          description: "Failed to fetch brands",
          variant: "destructive"
        });
        throw brandsError;
      }

      // Then get product counts for each brand
      const brandsWithCounts = await Promise.all(
        (brands || []).map(async (brand) => {
          const { count, error: countError } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('brand_id', brand.id)
            .eq('status', 'active');

          if (countError) {
            console.error('Error counting products for brand:', countError);
          }

          return {
            ...brand,
            product_count: count || 0
          };
        })
      );

      return brandsWithCounts;
    },
    enabled: !!retailerId
  });
};
