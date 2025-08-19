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

function inferCategoryFromText(text: string): { category_slug: string; subcategory_slug?: string; gender?: string } {
  const lowerText = text.toLowerCase();
  
  // First check for gender-specific indicators
  const gender = inferGenderFromText(text);
  
  // Kids category
  if (lowerText.match(/\b(kids?|child|children|baby|toddler|infant|junior|youth|boys?|girls?)\b/)) {
    if (lowerText.match(/\b(shoe|boot|sneaker|trainer|sandal|slipper)\b/)) {
      return { category_slug: 'kids', subcategory_slug: 'kids footwear', gender: 'kids' };
    }
    if (lowerText.match(/\b(bag|handbag|backpack|accessory|belt|hat)\b/)) {
      return { category_slug: 'kids', subcategory_slug: 'kids accessories', gender: 'kids' };
    }
    if (lowerText.match(/\b(dress|shirt|top|trouser|jean|short)\b/)) {
      if (lowerText.match(/\b(girl|girls?)\b/)) {
        return { category_slug: 'kids', subcategory_slug: 'girls clothing', gender: 'kids' };
      } else if (lowerText.match(/\b(boy|boys?)\b/)) {
        return { category_slug: 'kids', subcategory_slug: 'boys clothing', gender: 'kids' };
      }
      return { category_slug: 'kids', subcategory_slug: 'baby clothing', gender: 'kids' };
    }
    return { category_slug: 'kids', subcategory_slug: 'baby clothing', gender: 'kids' };
  }
  
  // Modestwear
  if (lowerText.match(/\b(abaya|hijab|niqab|jilbab|kaftan|modest)\b/)) {
    if (lowerText.includes('abaya')) return { category_slug: 'modestwear', subcategory_slug: 'abayas', gender: gender || 'women' };
    if (lowerText.includes('hijab')) return { category_slug: 'modestwear', subcategory_slug: 'hijabs', gender: gender || 'women' };
    if (lowerText.includes('jilbab')) return { category_slug: 'modestwear', subcategory_slug: 'jilbabs', gender: gender || 'women' };
    if (lowerText.includes('kaftan')) return { category_slug: 'modestwear', subcategory_slug: 'kaftans', gender: gender || 'women' };
    return { category_slug: 'modestwear', subcategory_slug: 'abayas', gender: gender || 'women' };
  }
  
  // Footwear - prioritize specific shoe types
  if (lowerText.match(/\b(shoe|boot|sneaker|trainer|sandal|heel|flat|loafer|slipper|pump|oxford|derby)\b/)) {
    if (lowerText.match(/\b(heel|pump|stiletto)\b/)) return { category_slug: 'footwear', subcategory_slug: 'heels', gender: gender || 'women' };
    if (lowerText.match(/\b(flat|ballet|ballerina)\b/)) return { category_slug: 'footwear', subcategory_slug: 'flats', gender: gender || 'women' };
    if (lowerText.match(/\b(sandal)\b/)) return { category_slug: 'footwear', subcategory_slug: 'sandals', gender: gender || 'unisex' };
    if (lowerText.match(/\b(sneaker|trainer|running|athletic)\b/)) return { category_slug: 'footwear', subcategory_slug: 'sneakers', gender: gender || 'unisex' };
    if (lowerText.match(/\b(boot|ankle|knee|thigh)\b/)) return { category_slug: 'footwear', subcategory_slug: 'boots', gender: gender || 'unisex' };
    if (lowerText.match(/\b(loafer|oxford|derby|formal)\b/)) return { category_slug: 'footwear', subcategory_slug: 'loafers', gender: gender || 'unisex' };
    if (lowerText.match(/\b(slipper|house|indoor)\b/)) return { category_slug: 'footwear', subcategory_slug: 'slippers', gender: gender || 'unisex' };
    return { category_slug: 'footwear', subcategory_slug: 'sneakers', gender: gender || 'unisex' };
  }
  
  // Jewelry
  if (lowerText.match(/\b(jewelry|jewellery|necklace|earring|bracelet|ring|anklet|brooch|pendant|charm)\b/)) {
    if (lowerText.match(/\b(necklace|pendant|chain)\b/)) return { category_slug: 'jewelry', subcategory_slug: 'necklaces', gender: gender || 'unisex' };
    if (lowerText.match(/\b(earring|stud|hoop|drop)\b/)) return { category_slug: 'jewelry', subcategory_slug: 'earrings', gender: gender || 'unisex' };
    if (lowerText.match(/\b(bracelet|bangle|cuff)\b/)) return { category_slug: 'jewelry', subcategory_slug: 'bracelets', gender: gender || 'unisex' };
    if (lowerText.match(/\b(ring|wedding|engagement)\b/)) return { category_slug: 'jewelry', subcategory_slug: 'rings', gender: gender || 'unisex' };
    if (lowerText.match(/\b(anklet|ankle)\b/)) return { category_slug: 'jewelry', subcategory_slug: 'anklets', gender: gender || 'unisex' };
    if (lowerText.match(/\b(brooch|pin)\b/)) return { category_slug: 'jewelry', subcategory_slug: 'brooches', gender: gender || 'unisex' };
    return { category_slug: 'jewelry', subcategory_slug: 'necklaces', gender: gender || 'unisex' };
  }
  
  // Bags - prioritize bag types
  if (lowerText.match(/\b(bag|handbag|purse|clutch|tote|backpack|wallet|shoulder|crossbody|satchel|briefcase)\b/)) {
    if (lowerText.match(/\b(handbag|purse|shoulder|crossbody|satchel)\b/)) return { category_slug: 'bags', subcategory_slug: 'handbags', gender: gender || 'women' };
    if (lowerText.match(/\b(clutch|evening|party)\b/)) return { category_slug: 'bags', subcategory_slug: 'clutches', gender: gender || 'women' };
    if (lowerText.match(/\b(tote|shopping|large)\b/)) return { category_slug: 'bags', subcategory_slug: 'totes', gender: gender || 'unisex' };
    if (lowerText.match(/\b(backpack|rucksack|travel)\b/)) return { category_slug: 'bags', subcategory_slug: 'backpacks', gender: gender || 'unisex' };
    if (lowerText.match(/\b(wallet|purse|money)\b/)) return { category_slug: 'bags', subcategory_slug: 'wallets', gender: gender || 'unisex' };
    return { category_slug: 'bags', subcategory_slug: 'handbags', gender: gender || 'unisex' };
  }
  
  // Accessories
  if (lowerText.match(/\b(belt|scarf|hat|cap|sunglasses|watch|hair|headband|clip|tie|bow)\b/)) {
    if (lowerText.match(/\b(belt|waist|leather)\b/)) return { category_slug: 'accessories', subcategory_slug: 'belts', gender: gender || 'unisex' };
    if (lowerText.match(/\b(scarf|wrap|shawl|pashmina)\b/)) return { category_slug: 'accessories', subcategory_slug: 'scarves', gender: gender || 'unisex' };
    if (lowerText.match(/\b(hat|cap|beanie|beret|fedora)\b/)) return { category_slug: 'accessories', subcategory_slug: 'hats', gender: gender || 'unisex' };
    if (lowerText.match(/\b(sunglasses|glasses|shades)\b/)) return { category_slug: 'accessories', subcategory_slug: 'sunglasses', gender: gender || 'unisex' };
    if (lowerText.match(/\b(watch|timepiece|wrist)\b/)) return { category_slug: 'accessories', subcategory_slug: 'watches', gender: gender || 'unisex' };
    return { category_slug: 'accessories', subcategory_slug: 'hats', gender: gender || 'unisex' };
  }
  
  // Beauty & Fragrance
  if (lowerText.match(/\b(perfume|fragrance|cologne|eau|scent|oud)\b/)) {
    if (lowerText.match(/\b(oud|arabic|oriental)\b/)) return { category_slug: 'fragrance', subcategory_slug: 'oud', gender: gender || 'unisex' };
    if (lowerText.match(/\b(floral|rose|jasmine|lily)\b/)) return { category_slug: 'fragrance', subcategory_slug: 'floral', gender: gender || 'women' };
    if (lowerText.match(/\b(woody|wood|cedar|sandalwood)\b/)) return { category_slug: 'fragrance', subcategory_slug: 'woody', gender: gender || 'men' };
    if (lowerText.match(/\b(citrus|lemon|orange|bergamot)\b/)) return { category_slug: 'fragrance', subcategory_slug: 'citrus', gender: gender || 'unisex' };
    if (lowerText.match(/\b(vanilla|sweet|dessert|gourmand)\b/)) return { category_slug: 'fragrance', subcategory_slug: 'gourmand', gender: gender || 'unisex' };
    return { category_slug: 'fragrance', subcategory_slug: 'oriental', gender: gender || 'unisex' };
  }
  
  if (lowerText.match(/\b(makeup|cosmetic|skincare|beauty|lipstick|foundation|cream|serum)\b/)) {
    if (lowerText.match(/\b(skincare|cream|serum|cleanser|moisturizer)\b/)) return { category_slug: 'beauty', subcategory_slug: 'skincare', gender: gender || 'unisex' };
    if (lowerText.match(/\b(hair|shampoo|conditioner|styling)\b/)) return { category_slug: 'beauty', subcategory_slug: 'haircare', gender: gender || 'unisex' };
    if (lowerText.match(/\b(makeup|lipstick|foundation|mascara|eyeshadow)\b/)) return { category_slug: 'beauty', subcategory_slug: 'makeup', gender: gender || 'women' };
    return { category_slug: 'beauty', subcategory_slug: 'skincare', gender: gender || 'unisex' };
  }
  
  // Clothing - detailed categorization
  if (lowerText.match(/\b(dress|gown|frock|midi|maxi|mini)\b/)) return { category_slug: 'clothing', subcategory_slug: 'dresses', gender: gender || 'women' };
  if (lowerText.match(/\b(abaya)\b/)) return { category_slug: 'clothing', subcategory_slug: 'abayas', gender: gender || 'women' };
  if (lowerText.match(/\b(top|blouse|camisole|tank|vest)\b/)) return { category_slug: 'clothing', subcategory_slug: 'tops', gender: gender || 'women' };
  if (lowerText.match(/\b(blouse|button|work|office)\b/)) return { category_slug: 'clothing', subcategory_slug: 'blouses', gender: gender || 'women' };
  if (lowerText.match(/\b(shirt|button-up|dress shirt)\b/)) return { category_slug: 'clothing', subcategory_slug: 'shirts', gender: gender || 'unisex' };
  if (lowerText.match(/\b(t[- ]?shirt|tee|graphic|basic)\b/)) return { category_slug: 'clothing', subcategory_slug: 't-shirts', gender: gender || 'unisex' };
  if (lowerText.match(/\b(sweater|jumper|pullover|knit|cashmere)\b/)) return { category_slug: 'clothing', subcategory_slug: 'sweaters', gender: gender || 'unisex' };
  if (lowerText.match(/\b(jacket|blazer|coat|outerwear)\b/)) {
    if (lowerText.match(/\b(blazer|work|office|formal)\b/)) return { category_slug: 'clothing', subcategory_slug: 'blazers', gender: gender || 'unisex' };
    if (lowerText.match(/\b(coat|winter|long|wool)\b/)) return { category_slug: 'clothing', subcategory_slug: 'coats', gender: gender || 'unisex' };
    return { category_slug: 'clothing', subcategory_slug: 'jackets', gender: gender || 'unisex' };
  }
  if (lowerText.match(/\b(cardigan|open|button|knit)\b/)) return { category_slug: 'clothing', subcategory_slug: 'cardigans', gender: gender || 'unisex' };
  if (lowerText.match(/\b(trouser|pant|formal|work)\b/)) return { category_slug: 'clothing', subcategory_slug: 'trousers', gender: gender || 'unisex' };
  if (lowerText.match(/\b(jean|denim|skinny|straight|wide)\b/)) return { category_slug: 'clothing', subcategory_slug: 'jeans', gender: gender || 'unisex' };
  if (lowerText.match(/\b(skirt|mini|midi|maxi|pencil|pleated)\b/)) return { category_slug: 'clothing', subcategory_slug: 'skirts', gender: gender || 'women' };
  if (lowerText.match(/\b(short|bermuda|chino|summer)\b/)) return { category_slug: 'clothing', subcategory_slug: 'shorts', gender: gender || 'unisex' };
  if (lowerText.match(/\b(active|sport|gym|yoga|fitness|workout)\b/)) return { category_slug: 'clothing', subcategory_slug: 'activewear', gender: gender || 'unisex' };
  if (lowerText.match(/\b(lounge|comfort|casual|relax)\b/)) return { category_slug: 'clothing', subcategory_slug: 'loungewear', gender: gender || 'unisex' };
  if (lowerText.match(/\b(sleep|pajama|nightwear|pjs)\b/)) return { category_slug: 'clothing', subcategory_slug: 'sleepwear', gender: gender || 'unisex' };
  if (lowerText.match(/\b(swim|bikini|swimsuit|beach|pool)\b/)) return { category_slug: 'clothing', subcategory_slug: 'swimwear', gender: gender || 'unisex' };
  if (lowerText.match(/\b(linger|underwear|bra|panty|intimate)\b/)) return { category_slug: 'clothing', subcategory_slug: 'lingerie', gender: gender || 'women' };
  
  // Home & Gift Cards
  if (lowerText.match(/\b(candle|diffuser|room spray|home fragrance)\b/)) {
    if (lowerText.includes('candle')) return { category_slug: 'home', subcategory_slug: 'scented candles', gender: 'unisex' };
    if (lowerText.includes('diffuser')) return { category_slug: 'home', subcategory_slug: 'diffusers', gender: 'unisex' };
    if (lowerText.includes('spray')) return { category_slug: 'home', subcategory_slug: 'room sprays', gender: 'unisex' };
    return { category_slug: 'home', subcategory_slug: 'scented candles', gender: 'unisex' };
  }
  
  if (lowerText.match(/\b(gift card|voucher|credit)\b/)) {
    if (lowerText.includes('digital')) return { category_slug: 'giftcards', subcategory_slug: 'digital gift card', gender: 'unisex' };
    return { category_slug: 'giftcards', subcategory_slug: 'physical voucher', gender: 'unisex' };
  }
  
  // Default fallback to clothing/tops with appropriate gender
  return { category_slug: 'clothing', subcategory_slug: 'tops', gender: gender || 'unisex' };
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
          const updateData: any = {
            category_slug: newCategories.category_slug,
            subcategory_slug: newCategories.subcategory_slug,
            updated_at: new Date().toISOString()
          };
          
          // Add gender if provided
          if (newCategories.gender) {
            updateData.gender = newCategories.gender;
          }
          
          const { error: updateError } = await supabase
            .from('products')
            .update(updateData)
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