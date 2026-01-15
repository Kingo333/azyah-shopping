import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PostProduct {
  id: string;
  product_id: string | null;
  external_url: string | null;
  external_title: string | null;
  external_image_url: string | null;
  external_price_cents: number | null;
  external_currency: string | null;
  external_brand_name: string | null;
  external_brand_logo_url: string | null;
  position_x: number | null;
  position_y: number | null;
  label: string | null;
  product?: {
    id: string;
    title: string;
    image_url: string | null;
    price_cents: number;
    currency: string;
    brand?: {
      name: string;
      logo_url: string | null;
    } | null;
  } | null;
}

export interface StyleLinkPost {
  id: string;
  user_id: string;
  content: string | null;
  visibility: string;
  created_at: string;
  images: {
    id: string;
    image_url: string;
    sort_order: number;
  }[];
  products: PostProduct[];
  like_count: number;
  is_liked: boolean;
}

export const useStyleLinkPosts = (userId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.id === userId;

  const postsQuery = useQuery({
    queryKey: ['stylelink-posts', userId, isOwner],
    queryFn: async (): Promise<StyleLinkPost[]> => {
      if (!userId) return [];

      // Fetch posts with images
      let query = supabase
        .from('posts')
        .select(`
          id,
          user_id,
          content,
          visibility,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Owner can see all their posts, visitors only see public ones
      if (!isOwner) {
        query = query.in('visibility', ['public_explore', 'stylelink_only']);
      }

      const { data: posts, error: postsError } = await query;

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        throw postsError;
      }

      if (!posts || posts.length === 0) return [];

      const postIds = posts.map(p => p.id);

      // Fetch images for all posts
      const { data: images, error: imagesError } = await supabase
        .from('post_images')
        .select('id, post_id, image_url, sort_order')
        .in('post_id', postIds)
        .order('sort_order', { ascending: true });

      if (imagesError) {
        console.error('Error fetching post images:', imagesError);
      }

      // Fetch products for all posts with joined product data
      const { data: postProducts, error: productsError } = await supabase
        .from('post_products')
        .select(`
          id,
          post_id,
          product_id,
          external_url,
          external_title,
          external_image_url,
          external_price_cents,
          external_currency,
          external_brand_name,
          external_brand_logo_url,
          position_x,
          position_y,
          label,
          product:products(
            id,
            title,
            image_url,
            price_cents,
            currency,
            brand:brands(name, logo_url)
          )
        `)
        .in('post_id', postIds);

      if (productsError) {
        console.error('Error fetching post products:', productsError);
      }

      // Fetch likes for current user
      let userLikes: string[] = [];
      if (user) {
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);
        
        userLikes = (likes || []).map(l => l.post_id);
      }

      // Fetch like counts
      const { data: likeCounts } = await supabase
        .from('post_likes')
        .select('post_id')
        .in('post_id', postIds);

      const likeCountMap: Record<string, number> = {};
      (likeCounts || []).forEach(l => {
        likeCountMap[l.post_id] = (likeCountMap[l.post_id] || 0) + 1;
      });

      // Combine data
      return posts.map(post => ({
        ...post,
        images: (images || [])
          .filter(img => img.post_id === post.id)
          .map(img => ({
            id: img.id,
            image_url: img.image_url,
            sort_order: img.sort_order
          })),
        products: (postProducts || [])
          .filter(pp => pp.post_id === post.id)
          .map(pp => ({
            id: pp.id,
            product_id: pp.product_id,
            external_url: pp.external_url,
            external_title: pp.external_title,
            external_image_url: pp.external_image_url,
            external_price_cents: pp.external_price_cents,
            external_currency: pp.external_currency,
            external_brand_name: pp.external_brand_name,
            external_brand_logo_url: pp.external_brand_logo_url,
            position_x: pp.position_x,
            position_y: pp.position_y,
            label: pp.label,
            product: pp.product as PostProduct['product']
          })),
        like_count: likeCountMap[post.id] || 0,
        is_liked: userLikes.includes(post.id)
      }));
    },
    enabled: !!userId,
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      // Delete in order: images, products, likes, then post
      await supabase.from('post_images').delete().eq('post_id', postId);
      await supabase.from('post_products').delete().eq('post_id', postId);
      await supabase.from('post_likes').delete().eq('post_id', postId);
      
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylelink-posts', userId] });
    },
  });

  const toggleLike = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!user) throw new Error('Must be logged in to like posts');

      if (isLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stylelink-posts', userId] });
    },
  });

  return {
    posts: postsQuery.data || [],
    isLoading: postsQuery.isLoading,
    isError: postsQuery.isError,
    error: postsQuery.error,
    refetch: postsQuery.refetch,
    deletePost,
    toggleLike,
  };
};
