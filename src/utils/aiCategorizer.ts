import { supabase } from "@/integrations/supabase/client";

export async function runAICategorization(limit: number = 50) {
  try {
    console.log('Starting AI categorization...', { limit });
    
    const { data, error } = await supabase.functions.invoke('ai-categorize-products', {
      body: { limit, batchSize: 5 } // Smaller batch size for better performance
    });

    if (error) {
      console.error('Error calling ai-categorize-products function:', error);
      throw new Error(`AI categorization failed: ${error.message || error.toString()}`);
    }

    if (!data) {
      throw new Error('No data returned from AI categorization function');
    }

    console.log('AI categorization completed:', data);
    return data;
  } catch (error) {
    console.error('Failed to run AI categorization:', error);
    throw error;
  }
}