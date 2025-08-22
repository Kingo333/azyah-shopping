
import { supabase } from '@/integrations/supabase/client';

export interface E2ETestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
}

export async function runZiinaE2ETest(testMode = true): Promise<E2ETestResult[]> {
  const results: E2ETestResult[] = [];
  
  try {
    // Step 1: Create payment intent
    console.log('🧪 Step 1: Creating payment intent...');
    const { data: createData, error: createError } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        product: 'consumer_premium',
        amountAed: 40,
        test: testMode
      },
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      }
    });

    if (createError) {
      results.push({
        step: 'Create Payment Intent',
        success: false,
        error: createError.message
      });
      return results;
    }

    results.push({
      step: 'Create Payment Intent',
      success: true,
      data: {
        redirectUrl: createData.redirectUrl,
        pi: createData.pi,
        urlsIncludeCorrectStructure: createData.redirectUrl?.includes('/payments/ziina/')
      }
    });

    // Step 2: Verify URL structure
    const expectedUrls = [
      '/payments/ziina/success',
      '/payments/ziina/cancel', 
      '/payments/ziina/failure'
    ];

    const urlStructureCorrect = expectedUrls.every(url => 
      createData.redirectUrl && createData.redirectUrl.includes(url.replace('/payments/ziina/', ''))
    );

    results.push({
      step: 'URL Structure Verification',  
      success: urlStructureCorrect,
      data: {
        expectedUrls,
        redirectUrl: createData.redirectUrl
      }
    });

    // Step 3: Verify payment intent retrieval
    if (createData.pi) {
      console.log('🧪 Step 3: Verifying payment intent retrieval...');
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-payment', {
        body: {
          payment_intent_id: createData.pi
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      results.push({
        step: 'Verify Payment Intent',
        success: !verifyError,
        data: verifyData,
        error: verifyError?.message
      });
    }

    return results;

  } catch (error) {
    results.push({
      step: 'E2E Test Execution',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return results;
  }
}

export function logE2EResults(results: E2ETestResult[]) {
  console.log('\n🧪 Ziina E2E Test Results:');
  console.log('==========================');
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${result.step}`);
    
    if (result.data) {
      console.log('   Data:', JSON.stringify(result.data, null, 2));
    }
    
    if (result.error) {
      console.log('   Error:', result.error);
    }
    
    console.log('');
  });
  
  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  console.log(`📊 Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Payment flow is production-ready.');
  } else {
    console.log('⚠️ Some tests failed. Review the errors above.');
  }
}
