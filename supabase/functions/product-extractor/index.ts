import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Extracting product data from:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Azyah Product Importer (+support@azyah.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    let product: any = {};

    // Helper function to clean text
    const cleanText = (text: string): string => {
      return text?.replace(/\s+/g, ' ').trim() || '';
    };

    // Helper function to extract price in cents
    const extractPrice = (priceStr: string): number | null => {
      if (!priceStr) return null;
      const cleaned = priceStr.replace(/[^\d.,]/g, '');
      const number = parseFloat(cleaned.replace(',', '.'));
      return isNaN(number) ? null : Math.round(number * 100);
    };

    // Helper function to extract currency
    const extractCurrency = (priceStr: string): string => {
      const currencySymbols: { [key: string]: string } = {
        '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY',
        'USD': 'USD', 'EUR': 'EUR', 'GBP': 'GBP', 'JPY': 'JPY',
        'AED': 'AED', 'SAR': 'SAR', 'QAR': 'QAR', 'KWD': 'KWD'
      };
      
      for (const [symbol, code] of Object.entries(currencySymbols)) {
        if (priceStr.includes(symbol)) {
          return code;
        }
      }
      return 'USD'; // default
    };

    // 1. Try JSON-LD structured data first
    try {
      const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
      if (jsonLdMatches) {
        for (const match of jsonLdMatches) {
          const jsonMatch = match.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is);
          if (jsonMatch && jsonMatch[1]) {
            try {
              const jsonData = JSON.parse(jsonMatch[1]);
              const products = Array.isArray(jsonData) ? jsonData : [jsonData];
              
              for (const item of products) {
                if (item['@type'] === 'Product' || (Array.isArray(item['@type']) && item['@type'].includes('Product'))) {
                  product.title = cleanText(item.name);
                  product.description = cleanText(item.description);
                  
                  // Handle offers
                  if (item.offers) {
                    const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                    if (offers.price) {
                      product.price_cents = extractPrice(offers.price.toString());
                      product.currency = extractCurrency(offers.priceCurrency || offers.price.toString());
                    }
                  }
                  
                  // Handle images
                  if (item.image) {
                    const images = Array.isArray(item.image) ? item.image : [item.image];
                    product.images = images.map((img: any) => 
                      typeof img === 'string' ? img : img.url || img.contentUrl
                    ).filter(Boolean);
                  }
                  
                  // Brand
                  if (item.brand) {
                    product.brand = typeof item.brand === 'string' ? item.brand : item.brand.name;
                  }
                  
                  // SKU
                  if (item.sku) {
                    product.sku = item.sku;
                  }
                  
                  console.log('Found product via JSON-LD');
                  break;
                }
              }
            } catch (jsonError) {
              console.log('Error parsing JSON-LD:', jsonError);
            }
          }
        }
      }
    } catch (error) {
      console.log('JSON-LD extraction error:', error);
    }

    // 2. If no JSON-LD product found, try Open Graph
    if (!product.title) {
      console.log('Trying Open Graph extraction...');
      
      const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["'](.*?)["']/i);
      const ogDescription = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/i);
      const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["'](.*?)["']/i);
      const productPrice = html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["'](.*?)["']/i);
      const productCurrency = html.match(/<meta[^>]*property=["']product:price:currency["'][^>]*content=["'](.*?)["']/i);
      
      if (ogTitle) {
        product.title = cleanText(ogTitle[1]);
        product.description = ogDescription ? cleanText(ogDescription[1]) : '';
        
        if (ogImage) {
          product.images = [ogImage[1]];
        }
        
        if (productPrice) {
          product.price_cents = extractPrice(productPrice[1]);
          product.currency = productCurrency ? productCurrency[1] : extractCurrency(productPrice[1]);
        }
        
        console.log('Found product via Open Graph');
      }
    }

    // 3. If still no product, try DOM heuristics
    if (!product.title) {
      console.log('Trying DOM heuristics...');
      
      // Title - try h1, title tag, or common selectors
      const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/is);
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
      
      if (h1Match) {
        product.title = cleanText(h1Match[1].replace(/<[^>]*>/g, ''));
      } else if (titleMatch) {
        product.title = cleanText(titleMatch[1].replace(/<[^>]*>/g, ''));
      }
      
      // Price - look for common price patterns
      const pricePatterns = [
        /class=["'][^"']*price[^"']*["'][^>]*>([^<]+)</gi,
        /\$\s*(\d+(?:[.,]\d{2})?)/g,
        /€\s*(\d+(?:[.,]\d{2})?)/g,
        /£\s*(\d+(?:[.,]\d{2})?)/g
      ];
      
      for (const pattern of pricePatterns) {
        const matches = [...html.matchAll(pattern)];
        if (matches.length > 0) {
          const priceText = matches[0][1] || matches[0][0];
          product.price_cents = extractPrice(priceText);
          product.currency = extractCurrency(priceText);
          break;
        }
      }
      
      // Images - look for product images
      const imgMatches = html.match(/<img[^>]+src=["'](.*?)["'][^>]*>/gi);
      if (imgMatches) {
        const images = [];
        for (const imgMatch of imgMatches.slice(0, 10)) { // Limit to 10 images
          const srcMatch = imgMatch.match(/src=["'](.*?)["']/i);
          if (srcMatch && srcMatch[1] && !srcMatch[1].includes('data:')) {
            const fullUrl = new URL(srcMatch[1], url).toString();
            images.push(fullUrl);
          }
        }
        product.images = images;
      }
      
      if (product.title) {
        console.log('Found product via DOM heuristics');
      }
    }

    // Quality check
    if (!product.title || !product.images?.length) {
      return new Response(JSON.stringify({ 
        error: 'Could not extract required product data (title and images)',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate SKU if not found
    if (!product.sku) {
      const urlPath = new URL(url).pathname;
      product.sku = urlPath.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '') || `imported-${Date.now()}`;
    }

    // Set defaults
    product.external_url = url;
    product.currency = product.currency || 'USD';
    product.extracted_data = {
      extraction_method: product.title ? 'json-ld' : 'open-graph',
      original_html_title: html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.replace(/<[^>]*>/g, '').trim(),
      extraction_timestamp: new Date().toISOString()
    };

    console.log('Product extraction complete:', {
      title: product.title,
      price_cents: product.price_cents,
      currency: product.currency,
      images_count: product.images?.length,
      sku: product.sku
    });

    return new Response(JSON.stringify({ 
      success: true,
      product 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in product extraction:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});