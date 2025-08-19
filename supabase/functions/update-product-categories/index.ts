import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Import the categorization logic
function inferGenderFromText(text: string): 'women' | 'men' | 'unisex' | 'kids' | undefined {
  const lowerText = text.toLowerCase();
  
  // Kids indicators
  if (lowerText.match(/\b(kids?|child|children|baby|toddler|infant|junior|youth|boys?|girls?)\b/)) {
    return 'kids';
  }
  
  // Women indicators
  if (lowerText.match(/\b(women|woman|ladies?|lady|female|abaya|dress|skirt|heel|maternity)\b/)) {
    return 'women';
  }
  
  // Men indicators  
  if (lowerText.match(/\b(men|man|male|masculine|gentleman|gents?)\b/)) {
    return 'men';
  }
  
  // Unisex indicators
  if (lowerText.match(/\b(unisex|universal|everyone|all)\b/)) {
    return 'unisex';
  }
  
  return undefined;
}

function inferCategoryFromText(text: string): { category_slug: string; subcategory_slug?: string } {
  const lowerText = text.toLowerCase();
  
  // First check for gender-specific indicators
  const gender = inferGenderFromText(text);
  
  // Modestwear
  if (lowerText.match(/\b(abaya|hijab|niqab|jilbab|kaftan|modest)\b/)) {
    if (lowerText.includes('abaya')) return { category_slug: 'modestwear', subcategory_slug: 'abayas' };
    if (lowerText.includes('hijab')) return { category_slug: 'modestwear', subcategory_slug: 'hijabs' };
    return { category_slug: 'modestwear' };
  }
  
  // Footwear
  if (lowerText.match(/\b(shoe|boot|sneaker|trainer|sandal|heel|flat|loafer|slipper)\b/)) {
    // Check gender first
    if (gender === 'men') {
      return { category_slug: 'men', subcategory_slug: 'mens footwear' };
    } else if (gender === 'women') {
      return { category_slug: 'women', subcategory_slug: 'womens footwear' };
    }
    
    // Fall back to specific footwear types
    if (lowerText.match(/\b(heel|pump)\b/)) return { category_slug: 'footwear', subcategory_slug: 'heels' };
    if (lowerText.match(/\b(flat|ballet)\b/)) return { category_slug: 'footwear', subcategory_slug: 'flats' };
    if (lowerText.match(/\b(sandal)\b/)) return { category_slug: 'footwear', subcategory_slug: 'sandals' };
    if (lowerText.match(/\b(sneaker|trainer)\b/)) return { category_slug: 'footwear', subcategory_slug: 'sneakers' };
    if (lowerText.match(/\b(boot)\b/)) return { category_slug: 'footwear', subcategory_slug: 'boots' };
    return { category_slug: 'footwear' };
  }
  
  // Jewelry
  if (lowerText.match(/\b(jewelry|jewellery|necklace|earring|bracelet|ring|anklet|brooch)\b/)) {
    if (lowerText.includes('necklace')) return { category_slug: 'jewelry', subcategory_slug: 'necklaces' };
    if (lowerText.includes('earring')) return { category_slug: 'jewelry', subcategory_slug: 'earrings' };
    if (lowerText.includes('bracelet')) return { category_slug: 'jewelry', subcategory_slug: 'bracelets' };
    if (lowerText.includes('ring')) return { category_slug: 'jewelry', subcategory_slug: 'rings' };
    return { category_slug: 'jewelry' };
  }
  
  // Accessories
  if (lowerText.match(/\b(bag|handbag|purse|clutch|tote|backpack|wallet|belt|scarf|hat|sunglasses|watch)\b/)) {
    // Check gender first for accessories
    if (gender === 'men') {
      return { category_slug: 'men', subcategory_slug: 'mens accessories' };
    } else if (gender === 'women') {
      return { category_slug: 'women', subcategory_slug: 'womens accessories' };
    }
    
    // Fall back to specific accessory types
    if (lowerText.match(/\b(handbag|purse)\b/)) return { category_slug: 'bags', subcategory_slug: 'handbags' };
    if (lowerText.includes('clutch')) return { category_slug: 'bags', subcategory_slug: 'clutches' };
    if (lowerText.includes('tote')) return { category_slug: 'bags', subcategory_slug: 'totes' };
    if (lowerText.includes('backpack')) return { category_slug: 'bags', subcategory_slug: 'backpacks' };
    if (lowerText.includes('wallet')) return { category_slug: 'bags', subcategory_slug: 'wallets' };
    if (lowerText.includes('belt')) return { category_slug: 'accessories', subcategory_slug: 'belts' };
    if (lowerText.includes('scarf')) return { category_slug: 'accessories', subcategory_slug: 'scarves' };
    if (lowerText.includes('hat')) return { category_slug: 'accessories', subcategory_slug: 'hats' };
    if (lowerText.includes('sunglasses')) return { category_slug: 'accessories', subcategory_slug: 'sunglasses' };
    if (lowerText.includes('watch')) return { category_slug: 'accessories', subcategory_slug: 'watches' };
    return { category_slug: 'accessories' };
  }
  
  // Beauty
  if (lowerText.match(/\b(perfume|fragrance|cologne|makeup|cosmetic|skincare|beauty|lipstick|foundation)\b/)) {
    if (lowerText.match(/\b(perfume|fragrance|cologne)\b/)) return { category_slug: 'fragrance', subcategory_slug: 'oriental' };
    return { category_slug: 'beauty' };
  }
  
  // Clothing - prioritize gender-based categorization
  if (gender === 'men') {
    return { category_slug: 'men', subcategory_slug: 'mens clothing' };
  } else if (gender === 'women') {
    return { category_slug: 'women', subcategory_slug: 'womens clothing' };
  }
  
  // Fall back to specific clothing types for general clothing category
  if (lowerText.match(/\b(dress)\b/)) return { category_slug: 'clothing', subcategory_slug: 'dresses' };
  if (lowerText.match(/\b(top|blouse)\b/)) return { category_slug: 'clothing', subcategory_slug: 'tops' };
  if (lowerText.match(/\b(shirt)\b/)) return { category_slug: 'clothing', subcategory_slug: 'shirts' };
  if (lowerText.match(/\b(t[- ]?shirt|tee)\b/)) return { category_slug: 'clothing', subcategory_slug: 't-shirts' };
  if (lowerText.match(/\b(sweater|jumper|pullover)\b/)) return { category_slug: 'clothing', subcategory_slug: 'sweaters' };
  if (lowerText.match(/\b(jacket|coat)\b/)) return { category_slug: 'clothing', subcategory_slug: 'jackets' };
  if (lowerText.match(/\b(trouser|pant)\b/)) return { category_slug: 'clothing', subcategory_slug: 'trousers' };
  if (lowerText.match(/\b(jean)\b/)) return { category_slug: 'clothing', subcategory_slug: 'jeans' };
  if (lowerText.match(/\b(skirt)\b/)) return { category_slug: 'clothing', subcategory_slug: 'skirts' };
  if (lowerText.match(/\b(short)\b/)) return { category_slug: 'clothing', subcategory_slug: 'shorts' };
  
  // Default to women's clothing if no specific indicators found (since most fashion items default to women's)
  return { category_slug: 'women', subcategory_slug: 'womens clothing' };
}

export default async function handler(req: Request) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting product category update...');

    // Get all products that are currently categorized as 'clothing' and need to be updated
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, title, description, category_slug')
      .eq('category_slug', 'clothing')
      .eq('status', 'active');

    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${products.length} products to potentially update`);

    let updatedCount = 0;
    const updateResults = [];

    // Process products in batches
    for (const product of products) {
      try {
        // Combine title and description for better categorization
        const textToAnalyze = `${product.title} ${product.description || ''}`;
        
        // Get new categorization
        const newCategories = inferCategoryFromText(textToAnalyze);
        
        // Only update if the category actually changed
        if (newCategories.category_slug !== product.category_slug) {
          const { error: updateError } = await supabase
            .from('products')
            .update({
              category_slug: newCategories.category_slug,
              subcategory_slug: newCategories.subcategory_slug,
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id);

          if (updateError) {
            console.error(`Error updating product ${product.id}:`, updateError);
            updateResults.push({
              id: product.id,
              title: product.title,
              success: false,
              error: updateError.message
            });
          } else {
            updatedCount++;
            updateResults.push({
              id: product.id,
              title: product.title,
              success: true,
              oldCategory: product.category_slug,
              newCategory: newCategories.category_slug,
              newSubcategory: newCategories.subcategory_slug
            });
            console.log(`Updated product ${product.id}: ${product.category_slug} -> ${newCategories.category_slug}`);
          }
        } else {
          updateResults.push({
            id: product.id,
            title: product.title,
            success: true,
            message: 'No category change needed'
          });
        }
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);
        updateResults.push({
          id: product.id,
          title: product.title,
          success: false,
          error: error.message
        });
      }
    }

    console.log(`Successfully updated ${updatedCount} products`);

    return new Response(JSON.stringify({
      success: true,
      message: `Product categorization update completed`,
      totalProcessed: products.length,
      totalUpdated: updatedCount,
      results: updateResults
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-product-categories function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}