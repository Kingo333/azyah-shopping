import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedMetadata {
  url: string;
  title: string | null;
  image_url: string | null;
  price_cents: number | null;
  currency: string | null;
  brand_name: string | null;
  brand_logo_url: string | null;
}

function extractMetaContent(html: string, property: string): string | null {
  // Try og: properties first
  const ogPattern = new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`, 'i');
  const ogMatch = html.match(ogPattern);
  if (ogMatch) return ogMatch[1];
  
  // Try content first pattern
  const ogContentFirstPattern = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`, 'i');
  const ogContentFirstMatch = html.match(ogContentFirstPattern);
  if (ogContentFirstMatch) return ogContentFirstMatch[1];
  
  // Try name attribute
  const namePattern = new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i');
  const nameMatch = html.match(namePattern);
  if (nameMatch) return nameMatch[1];
  
  return null;
}

function extractTitle(html: string): string | null {
  // Try og:title first
  const ogTitle = extractMetaContent(html, 'title');
  if (ogTitle) return ogTitle;
  
  // Try product:title
  const productTitlePattern = /<meta[^>]*property=["']product:title["'][^>]*content=["']([^"']+)["']/i;
  const productMatch = html.match(productTitlePattern);
  if (productMatch) return productMatch[1];
  
  // Fall back to <title> tag
  const titlePattern = /<title[^>]*>([^<]+)<\/title>/i;
  const titleMatch = html.match(titlePattern);
  if (titleMatch) return titleMatch[1].trim();
  
  return null;
}

function extractImage(html: string): string | null {
  // Try og:image first
  const ogImage = extractMetaContent(html, 'image');
  if (ogImage) return ogImage;
  
  // Try product:image
  const productImagePattern = /<meta[^>]*property=["']product:image["'][^>]*content=["']([^"']+)["']/i;
  const productMatch = html.match(productImagePattern);
  if (productMatch) return productMatch[1];
  
  // Try twitter:image
  const twitterImage = extractMetaContent(html, 'twitter:image');
  if (twitterImage) return twitterImage;
  
  return null;
}

function extractPrice(html: string): { price_cents: number | null; currency: string | null } {
  // Try og:price:amount
  const pricePattern = /<meta[^>]*property=["'](?:og:price:amount|product:price:amount)["'][^>]*content=["']([^"']+)["']/i;
  const priceMatch = html.match(pricePattern);
  
  // Try og:price:currency
  const currencyPattern = /<meta[^>]*property=["'](?:og:price:currency|product:price:currency)["'][^>]*content=["']([^"']+)["']/i;
  const currencyMatch = html.match(currencyPattern);
  
  // Try JSON-LD structured data
  const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdPattern.exec(html)) !== null) {
    try {
      const jsonData = JSON.parse(jsonLdMatch[1]);
      const offers = jsonData.offers || jsonData['@graph']?.find((item: any) => item.offers)?.offers;
      if (offers) {
        const offer = Array.isArray(offers) ? offers[0] : offers;
        if (offer.price) {
          const price = parseFloat(offer.price);
          if (!isNaN(price)) {
            return {
              price_cents: Math.round(price * 100),
              currency: offer.priceCurrency || currencyMatch?.[1] || 'USD'
            };
          }
        }
      }
    } catch (e) {
      // Continue to next JSON-LD block
    }
  }
  
  if (priceMatch) {
    const price = parseFloat(priceMatch[1]);
    if (!isNaN(price)) {
      return {
        price_cents: Math.round(price * 100),
        currency: currencyMatch?.[1] || 'USD'
      };
    }
  }
  
  return { price_cents: null, currency: null };
}

function extractBrandInfo(html: string, url: string): { brand_name: string | null; brand_logo_url: string | null } {
  // Try og:site_name
  const siteName = extractMetaContent(html, 'site_name');
  
  // Try to extract from domain
  let domainBrand: string | null = null;
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      domainBrand = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
  } catch (e) {
    // Invalid URL
  }
  
  // Try to find favicon or logo
  let logoUrl: string | null = null;
  
  // Try apple-touch-icon (usually higher quality)
  const appleTouchPattern = /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i;
  const appleMatch = html.match(appleTouchPattern);
  if (appleMatch) {
    logoUrl = appleMatch[1];
  }
  
  // Fallback to regular favicon
  if (!logoUrl) {
    const faviconPattern = /<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i;
    const faviconMatch = html.match(faviconPattern);
    if (faviconMatch) {
      logoUrl = faviconMatch[1];
    }
  }
  
  // Make relative URLs absolute
  if (logoUrl && !logoUrl.startsWith('http')) {
    try {
      const urlObj = new URL(url);
      logoUrl = new URL(logoUrl, urlObj.origin).href;
    } catch (e) {
      logoUrl = null;
    }
  }
  
  return {
    brand_name: siteName || domainBrand,
    brand_logo_url: logoUrl
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracting metadata from:', url);

    // Fetch the page with a reasonable timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    let html: string;
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AzyahBot/1.0; +https://azyah.com)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log('Failed to fetch URL, status:', response.status);
        // Return minimal data on fetch failure
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              url,
              title: null,
              image_url: null,
              price_cents: null,
              currency: null,
              brand_name: null,
              brand_logo_url: null
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      html = await response.text();
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.log('Fetch error:', fetchError);
      // Return minimal data on fetch error
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            url,
            title: null,
            image_url: null,
            price_cents: null,
            currency: null,
            brand_name: null,
            brand_logo_url: null
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract metadata
    const title = extractTitle(html);
    const image_url = extractImage(html);
    const { price_cents, currency } = extractPrice(html);
    const { brand_name, brand_logo_url } = extractBrandInfo(html, url);

    const metadata: ExtractedMetadata = {
      url,
      title,
      image_url,
      price_cents,
      currency,
      brand_name,
      brand_logo_url
    };

    console.log('Extracted metadata:', metadata);

    return new Response(
      JSON.stringify({ success: true, data: metadata }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error extracting metadata:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
