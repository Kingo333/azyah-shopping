import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TaggedProduct {
  // For internal Azyah products
  product_id: string;
  // Tap-to-tag position (0-1 normalized)
  position_x?: number;
  position_y?: number;
  label?: string;
  // For external URL-pasted products
  external_url?: string;
  external_title?: string;
  external_image_url?: string;
  external_brand_name?: string;
}

export interface CreatePostInput {
  image: File;
  caption?: string;
  visibility?: 'public_explore' | 'stylelink_only' | 'private' | 'followers_only';
  taggedProducts?: TaggedProduct[];
}

interface CreatePostResult {
  postId: string;
  success: boolean;
}

export const useCreateStyleLinkPost = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  const createPost = useMutation({
    mutationFn: async (input: CreatePostInput): Promise<CreatePostResult> => {
      if (!user) throw new Error('Must be logged in to create posts');

      setUploadProgress(10);

      // Step 1: Upload image to storage
      const fileExt = input.image.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `stylelink-posts/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, input.image, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        throw new Error('Failed to upload image');
      }

      setUploadProgress(40);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // Step 2: Create post record
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: input.caption?.trim() || null,
          visibility: input.visibility || 'public_explore',
        })
        .select('id')
        .single();

      if (postError) {
        console.error('Post creation error:', postError);
        // Attempt to clean up uploaded image
        await supabase.storage.from('product-images').remove([filePath]);
        throw new Error('Failed to create post');
      }

      setUploadProgress(60);

      // Step 3: Create post_images record
      const { error: imageError } = await supabase
        .from('post_images')
        .insert({
          post_id: post.id,
          image_url: publicUrl,
          sort_order: 0,
        });

      if (imageError) {
        console.error('Post image record error:', imageError);
        // Don't throw - post was created successfully
      }

      setUploadProgress(80);

      // Step 4: Create post_products records if any products are tagged
      if (input.taggedProducts && input.taggedProducts.length > 0) {
        const productRecords = input.taggedProducts.map(product => ({
          post_id: post.id,
          product_id: product.product_id || null,
          position_x: product.position_x ?? null,
          position_y: product.position_y ?? null,
          label: product.label || null,
          external_url: product.external_url || null,
          external_title: product.external_title || null,
          external_image_url: product.external_image_url || null,
          external_brand_name: product.external_brand_name || null,
        }));

        const { error: productsError } = await supabase
          .from('post_products')
          .insert(productRecords);

        if (productsError) {
          console.error('Post products record error:', productsError);
          // Don't throw - post was created successfully
        }
      }

      setUploadProgress(100);

      return { postId: post.id, success: true };
    },
    onSuccess: () => {
      // Invalidate posts queries to refetch
      queryClient.invalidateQueries({ queryKey: ['stylelink-posts'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts-count'] });
      setUploadProgress(0);
    },
    onError: () => {
      setUploadProgress(0);
    },
  });

  return {
    createPost: createPost.mutate,
    createPostAsync: createPost.mutateAsync,
    isLoading: createPost.isPending,
    isSuccess: createPost.isSuccess,
    isError: createPost.isError,
    error: createPost.error,
    uploadProgress,
  };
};
