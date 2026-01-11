import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PortfolioItem {
  id: string;
  brand_id: string;
  title: string;
  description: string | null;
  image_urls: string[];
  created_at: string;
  updated_at: string;
}

export interface CreatePortfolioInput {
  brand_id: string;
  title: string;
  description?: string;
  image_urls: string[];
}

export interface UpdatePortfolioInput {
  id: string;
  title?: string;
  description?: string;
  image_urls?: string[];
}

const MAX_PORTFOLIO_ITEMS = 12;
const MAX_IMAGES_PER_ITEM = 6;

/**
 * Hook to fetch portfolio items for a brand
 */
export const usePortfolio = (brandId: string | undefined) => {
  return useQuery({
    queryKey: ['portfolio', brandId],
    queryFn: async () => {
      if (!brandId) return [];
      
      const { data, error } = await supabase
        .from('brand_portfolios')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PortfolioItem[];
    },
    enabled: !!brandId
  });
};

/**
 * Hook for portfolio mutations (create, update, delete)
 */
export const usePortfolioMutations = (brandId: string) => {
  const queryClient = useQueryClient();
  
  const createMutation = useMutation({
    mutationFn: async (input: Omit<CreatePortfolioInput, 'brand_id'>) => {
      // Check limit
      const { count } = await supabase
        .from('brand_portfolios')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', brandId);
      
      if ((count || 0) >= MAX_PORTFOLIO_ITEMS) {
        throw new Error(`Maximum of ${MAX_PORTFOLIO_ITEMS} portfolio items allowed`);
      }
      
      // Limit images
      const imageUrls = input.image_urls.slice(0, MAX_IMAGES_PER_ITEM);
      
      const { data, error } = await supabase
        .from('brand_portfolios')
        .insert({
          brand_id: brandId,
          title: input.title,
          description: input.description || null,
          image_urls: imageUrls
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', brandId] });
      toast.success('Portfolio item added');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add portfolio item');
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: async (input: UpdatePortfolioInput) => {
      const updates: Partial<PortfolioItem> = {};
      
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;
      if (input.image_urls !== undefined) {
        updates.image_urls = input.image_urls.slice(0, MAX_IMAGES_PER_ITEM);
      }
      
      const { data, error } = await supabase
        .from('brand_portfolios')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', brandId] });
      toast.success('Portfolio item updated');
    },
    onError: () => {
      toast.error('Failed to update portfolio item');
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('brand_portfolios')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', brandId] });
      toast.success('Portfolio item deleted');
    },
    onError: () => {
      toast.error('Failed to delete portfolio item');
    }
  });
  
  return {
    createItem: createMutation.mutate,
    updateItem: updateMutation.mutate,
    deleteItem: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
};

/**
 * Upload portfolio images to Supabase Storage
 */
export const uploadPortfolioImages = async (
  brandId: string,
  files: File[]
): Promise<string[]> => {
  const uploadedUrls: string[] = [];
  
  for (const file of files.slice(0, MAX_IMAGES_PER_ITEM)) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${brandId}/portfolio/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('brand-assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Upload error:', error);
      continue;
    }
    
    const { data: urlData } = supabase.storage
      .from('brand-assets')
      .getPublicUrl(fileName);
    
    uploadedUrls.push(urlData.publicUrl);
  }
  
  return uploadedUrls;
};

export { MAX_PORTFOLIO_ITEMS, MAX_IMAGES_PER_ITEM };
