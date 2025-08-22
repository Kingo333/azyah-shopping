import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    console.log('🧪 Testing Axesso API connectivity');
    
    const primaryKey = Deno.env.get('AXESSO_PRIMARY_KEY');
    const secondaryKey = Deno.env.get('AXESSO_SECONDARY_KEY');
    
    if (!primaryKey && !secondaryKey) {
      throw new Error('No Axesso API keys configured');
    }
    
    console.log('✅ API keys found:', { 
      primary: primaryKey ? 'Yes' : 'No', 
      secondary: secondaryKey ? 'Yes' : 'No' 
    });
    
    // Test search endpoint with a simple query
    const testUrl = 'https://api.axesso.de/aso/search-by-keyword?domainCode=us&keyword=sneakers&page=1';
    
    console.log('🔍 Testing search endpoint:', testUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'axesso-api-key': primaryKey || secondaryKey || '',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      console.log('📝 Response status:', response.status);
      console.log('📝 Response preview:', responseText.slice(0, 500));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}\n${responseText.slice(0, 200)}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${parseError.message}\nResponse: ${responseText.slice(0, 200)}`);
      }
      
      const productCount = data?.searchProductDetails?.length || 0;
      console.log('✅ Search test successful! Found', productCount, 'products');
      
      // Test one product detail if available
      let detailsTest = null;
      if (productCount > 0 && data.searchProductDetails[0]?.dpUrl) {
        const productUrl = data.searchProductDetails[0].dpUrl;
        const detailsUrl = `https://api.axesso.de/aso/lookup-product-details?url=${encodeURIComponent(productUrl)}`;
        
        console.log('🔍 Testing details endpoint with:', productUrl);
        
        try {
          const detailsController = new AbortController();
          const detailsTimeoutId = setTimeout(() => detailsController.abort(), 20000); // 20s timeout
          
          const detailsResponse = await fetch(detailsUrl, {
            method: 'GET',
            headers: {
              'axesso-api-key': primaryKey || secondaryKey || '',
              'Cache-Control': 'no-cache',
            },
            signal: detailsController.signal
          });
          
          clearTimeout(detailsTimeoutId);
          
          const detailsText = await detailsResponse.text();
          console.log('📝 Details response status:', detailsResponse.status);
          
          if (detailsResponse.ok) {
            const detailsData = JSON.parse(detailsText);
            detailsTest = {
              status: 'success',
              title: detailsData?.productTitle?.slice(0, 50) || 'N/A',
              responseStatus: detailsData?.responseStatus || 'N/A'
            };
            console.log('✅ Details test successful:', detailsTest);
          } else {
            detailsTest = {
              status: 'error',
              error: `HTTP ${detailsResponse.status}: ${detailsText.slice(0, 100)}`
            };
          }
        } catch (detailsError) {
          detailsTest = {
            status: 'error',
            error: detailsError.message
          };
          console.warn('⚠️ Details test failed:', detailsError);
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        apiKeysConfigured: {
          primary: !!primaryKey,
          secondary: !!secondaryKey
        },
        searchTest: {
          status: 'success',
          productsFound: productCount,
          responseStatus: data?.responseStatus || 'N/A'
        },
        detailsTest,
        message: 'Axesso API connectivity test completed successfully'
      }), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        }
      });
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
    
  } catch (error) {
    console.error('💥 Axesso API test failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      apiKeysConfigured: {
        primary: !!Deno.env.get('AXESSO_PRIMARY_KEY'),
        secondary: !!Deno.env.get('AXESSO_SECONDARY_KEY')
      },
      message: 'Axesso API connectivity test failed'
    }), {
      status: 200, // Still return 200 so UI can handle the error gracefully
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json'
      }
    });
  }
});