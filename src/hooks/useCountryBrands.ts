import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CountryBrandCount {
  code: string;
  count: number;
}

/**
 * Fetches brand counts grouped by country for the globe visualization
 */
export const useCountryBrands = () => {
  return useQuery({
    queryKey: ['country-brand-counts'],
    queryFn: async (): Promise<CountryBrandCount[]> => {
      // Get all active brands with country codes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from('brands')
        .select('country_code')
        .eq('is_active', true)
        .not('country_code', 'is', null);

      const brands = result.data;
      const error = result.error;

      if (error) {
        console.error('Error fetching country brands:', error);
        return [];
      }

      // Group and count by country
      const countMap = new Map<string, number>();
      
      brands?.forEach((brand) => {
        const code = brand.country_code?.toUpperCase();
        if (code) {
          countMap.set(code, (countMap.get(code) || 0) + 1);
        }
      });

      // Convert to array
      return Array.from(countMap.entries()).map(([code, count]) => ({
        code,
        count,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export default useCountryBrands;
