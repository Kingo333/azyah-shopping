import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeProductWithAI(imageUrl: string, title: string, description: string) {
  try {
    console.log('Analyzing product with AI...', { title, imageUrl });
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are an expert fashion categorization AI. Analyze the product image and text to determine:
1. Gender target: women, men, unisex, or kids
2. Category: clothing, footwear, bags, accessories, jewelry, beauty, modestwear, fragrance, home, giftcards
3. Subcategory based on the category

For clothing subcategories: dresses, abayas, tops, blouses, shirts, t-shirts, sweaters, jackets, coats, blazers, cardigans, trousers, jeans, skirts, shorts, activewear, loungewear, sleepwear, swimwear, lingerie

For footwear subcategories: heels, flats, sandals, sneakers, boots, loafers, slippers

For bags subcategories: handbags, clutches, totes, backpacks, wallets

For accessories subcategories: belts, scarves, hats, sunglasses, watches

For jewelry subcategories: necklaces, earrings, bracelets, rings, anklets, brooches

For beauty subcategories: skincare, haircare, makeup, fragrances, home fragrances, tools & accessories

For modestwear subcategories: abayas, hijabs, niqabs, jilbabs, kaftans

For kids subcategories: baby clothing, girls clothing, boys clothing, kids footwear, kids accessories

For fragrance subcategories: oriental, floral, woody, citrus, gourmand, oud

For home subcategories: scented candles, diffusers, room sprays, fashion books

For giftcards subcategories: digital gift card, physical voucher

Return ONLY a JSON object with: {"gender": "...", "category": "...", "subcategory": "..."}

Analyze both the image and text carefully. The image will show styling, gender target, and product type. The text provides additional context.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Product Title: ${title}\nDescription: ${description || 'No description provided'}`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('AI response:', content);
    
    // Parse the JSON response
    const result = JSON.parse(content.trim());
    return result;
    
  } catch (error) {
    console.error('Error in AI analysis:', error);
    // Fallback to text-only analysis
    return analyzeTextOnly(title, description);
  }
}

function analyzeTextOnly(title: string, description: string): any {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  // Determine gender
  let gender = 'unisex';
  if (text.match(/\b(women|woman|ladies?|lady|female|girls?)\b/)) {
    gender = 'women';
  } else if (text.match(/\b(men|man|male|boys?|masculine)\b/)) {
    gender = 'men';
  } else if (text.match(/\b(kids?|child|children|baby|toddler)\b/)) {
    gender = 'kids';
  }
  
  // Determine category and subcategory
  let category = 'clothing';
  let subcategory = 'tops';
  
  if (text.match(/\b(shoe|boot|sneaker|trainer|sandal|heel|flat|loafer|slipper)\b/)) {
    category = 'footwear';
    if (text.match(/\b(sneaker|trainer)\b/)) subcategory = 'sneakers';
    else if (text.match(/\b(heel|pump)\b/)) subcategory = 'heels';
    else if (text.match(/\b(boot)\b/)) subcategory = 'boots';
    else if (text.match(/\b(sandal)\b/)) subcategory = 'sandals';
    else if (text.match(/\b(flat)\b/)) subcategory = 'flats';
    else subcategory = 'sneakers';
  } else if (text.match(/\b(bag|handbag|purse|clutch|tote|backpack|wallet)\b/)) {
    category = 'bags';
    if (text.match(/\b(clutch)\b/)) subcategory = 'clutches';
    else if (text.match(/\b(tote)\b/)) subcategory = 'totes';
    else if (text.match(/\b(backpack)\b/)) subcategory = 'backpacks';
    else if (text.match(/\b(wallet)\b/)) subcategory = 'wallets';
    else subcategory = 'handbags';
  } else if (text.match(/\b(jewelry|necklace|earring|bracelet|ring)\b/)) {
    category = 'jewelry';
    if (text.match(/\b(necklace)\b/)) subcategory = 'necklaces';
    else if (text.match(/\b(earring)\b/)) subcategory = 'earrings';
    else if (text.match(/\b(bracelet)\b/)) subcategory = 'bracelets';
    else if (text.match(/\b(ring)\b/)) subcategory = 'rings';
    else subcategory = 'necklaces';
  } else if (text.match(/\b(belt|scarf|hat|sunglasses|watch)\b/)) {
    category = 'accessories';
    if (text.match(/\b(belt)\b/)) subcategory = 'belts';
    else if (text.match(/\b(scarf)\b/)) subcategory = 'scarves';
    else if (text.match(/\b(hat|cap)\b/)) subcategory = 'hats';
    else if (text.match(/\b(sunglasses)\b/)) subcategory = 'sunglasses';
    else if (text.match(/\b(watch)\b/)) subcategory = 'watches';
    else subcategory = 'hats';
  } else if (text.match(/\b(dress)\b/)) {
    subcategory = 'dresses';
  } else if (text.match(/\b(jean)\b/)) {
    subcategory = 'jeans';
  } else if (text.match(/\b(jacket|blazer)\b/)) {
    subcategory = 'jackets';
  }
  
  return { gender, category, subcategory };
}

export default async function handler(req: Request) {
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
    const { limit = 50, batchSize = 10 } = await req.json();
    
    console.log(`Starting AI categorization for ${limit} products...`);

    // Get products that need categorization (currently miscategorized as clothing/tops)
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, title, description, image_url, media_urls, category_slug, subcategory_slug')
      .eq('category_slug', 'clothing')
      .eq('subcategory_slug', 'tops')
      .eq('status', 'active')
      .limit(limit);

    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${products.length} products to categorize`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process products in batches to avoid overwhelming the API
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(products.length / batchSize)}`);

      const batchPromises = batch.map(async (product) => {
        try {
          // Get the first available image URL
          let imageUrl = product.image_url;
          if (!imageUrl && product.media_urls && Array.isArray(product.media_urls) && product.media_urls.length > 0) {
            imageUrl = product.media_urls[0];
          }

          if (!imageUrl) {
            console.log(`Skipping product ${product.id} - no image available`);
            return { id: product.id, success: false, error: 'No image available' };
          }

          // Analyze with AI
          const analysis = await analyzeProductWithAI(imageUrl, product.title, product.description);
          
          // Update the product in database
          const { error: updateError } = await supabase
            .from('products')
            .update({
              category_slug: analysis.category,
              subcategory_slug: analysis.subcategory,
              gender: analysis.gender,
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id);

          if (updateError) {
            console.error(`Error updating product ${product.id}:`, updateError);
            return { 
              id: product.id, 
              success: false, 
              error: updateError.message,
              analysis
            };
          }

          console.log(`Successfully categorized product ${product.id}:`, analysis);
          return {
            id: product.id,
            success: true,
            oldCategory: `${product.category_slug}/${product.subcategory_slug}`,
            newCategory: `${analysis.category}/${analysis.subcategory}`,
            gender: analysis.gender,
            title: product.title
          };

        } catch (error) {
          console.error(`Error processing product ${product.id}:`, error);
          return { 
            id: product.id, 
            success: false, 
            error: error.message 
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Count successes and errors
      batchResults.forEach(result => {
        if (result.success) successCount++;
        else errorCount++;
      });

      // Add a small delay between batches to be respectful to the API
      if (i + batchSize < products.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Categorization complete: ${successCount} successful, ${errorCount} errors`);

    return new Response(JSON.stringify({
      success: true,
      message: `AI categorization completed`,
      totalProcessed: products.length,
      totalUpdated: successCount,
      totalErrors: errorCount,
      results: results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-categorize-products function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}