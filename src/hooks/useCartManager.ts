import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useProductAnalytics } from '@/hooks/useAnalytics';

export const useCartManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { trackAddToCart } = useProductAnalytics();

  const addToCart = useMutation({
    mutationFn: async ({ 
      productId, 
      quantity = 1, 
      sizeVariant, 
      colorVariant 
    }: {
      productId: string;
      quantity?: number;
      sizeVariant?: string;
      colorVariant?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Check if item already exists in cart
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .eq('size_variant', sizeVariant || '')
        .eq('color_variant', colorVariant || '')
        .single();

      if (existingItem) {
        // Update quantity
        const { data, error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new cart item
        const { data, error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity,
            size_variant: sizeVariant,
            color_variant: colorVariant
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data, variables) => {
      trackAddToCart(variables.productId, variables.sizeVariant, variables.colorVariant);
      queryClient.invalidateQueries({ queryKey: ['cart_items'] });
      
      toast({
        title: "Added to cart",
        description: "Item has been added to your shopping cart.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive"
      });
    }
  });

  return {
    addToCart: addToCart.mutate,
    isAdding: addToCart.isPending
  };
};