import { supabase } from "@/integrations/supabase/client";

export async function updateProductCategories() {
  try {
    console.log('Starting product category update...');
    
    const { data, error } = await supabase.functions.invoke('update-product-categories', {
      body: {}
    });

    if (error) {
      console.error('Error calling update-product-categories function:', error);
      throw error;
    }

    console.log('Category update completed:', data);
    return data;
  } catch (error) {
    console.error('Failed to update product categories:', error);
    throw error;
  }
}