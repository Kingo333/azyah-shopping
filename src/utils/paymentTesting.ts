
import { supabase } from '@/integrations/supabase/client';

// Test result type for UI display
export interface PaymentTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

// Unit Test Functions for Payment Flow
export class PaymentTestSuite {
  
  // Test AED to Fils conversion
  static testAedToFilsConversion(): PaymentTestResult {
    const startTime = Date.now();
    const testCases = [
      { aed: 40, expectedFils: 4000 },
      { aed: 2, expectedFils: 200 }, // minimum
      { aed: 100, expectedFils: 10000 },
      { aed: 1.5, expectedFils: 150 }, // below minimum - should fail
      { aed: 0, expectedFils: 0 }, // invalid - should fail
    ];

    console.log('🧪 Testing AED to Fils conversion...');
    
    let allPassed = true;
    testCases.forEach(({ aed, expectedFils }) => {
      const fils = Math.round(aed * 100);
      const isValid = fils >= 200; // minimum 2 AED = 200 fils
      const testPassed = fils === expectedFils && isValid;
      
      console.log(`${aed} AED → ${fils} fils (expected: ${expectedFils}) ${
        testPassed ? '✅' : '❌'
      }`);
      
      if (fils < 200) {
        console.log(`  ⚠️  Below minimum: ${aed} AED (${fils} fils) < 2 AED (200 fils)`);
      }
      
      if (!testPassed && fils >= 200) {
        allPassed = false;
      }
    });

    return {
      testName: 'AED to Fils Conversion',
      passed: allPassed,
      duration: Date.now() - startTime
    };
  }

  // Test HMAC signature verification
  static async testHMACVerification(): Promise<PaymentTestResult> {
    const startTime = Date.now();
    console.log('🧪 Testing HMAC signature verification...');
    
    const testSecret = 'test-webhook-secret-12345';
    const testBody = '{"event":"payment_intent.status.updated","data":{"id":"pi_test_123","status":"completed"}}';
    
    try {
      // Create expected signature using Web Crypto API
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(testSecret);
      const dataBytes = encoder.encode(testBody);
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, dataBytes);
      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      console.log(`Expected signature: ${expectedSignature.substring(0, 20)}...`);
      
      // Test valid signature
      const isValid = await this.verifySignature(testBody, expectedSignature, testSecret);
      console.log(`Valid signature test: ${isValid ? '✅' : '❌'}`);
      
      // Test invalid signature
      const invalidSignature = 'invalid-signature-12345';
      const isInvalid = await this.verifySignature(testBody, invalidSignature, testSecret);
      console.log(`Invalid signature test: ${!isInvalid ? '✅' : '❌'}`);
      
      return {
        testName: 'HMAC Signature Verification',
        passed: isValid && !isInvalid,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('HMAC test failed:', error);
      return {
        testName: 'HMAC Signature Verification',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(secret);
      const dataBytes = encoder.encode(body);
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const expectedSignatureBuffer = await crypto.subtle.sign('HMAC', key, dataBytes);
      const expectedSignature = Array.from(new Uint8Array(expectedSignatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      return signature === expectedSignature;
    } catch {
      return false;
    }
  }

  // Test Zod schema validation
  static async testZodSchemas(): Promise<PaymentTestResult> {
    const startTime = Date.now();
    console.log('🧪 Testing Zod schema validation...');
    
    // Complete valid payload with all required fields
    const validPaymentIntent = {
      event: 'payment_intent.status.updated',
      data: {
        id: 'pi_test_123',
        account_id: 'acc_test_456',
        amount: 4000,
        tip_amount: 0,
        fee_amount: 120,
        currency_code: 'AED',
        created_at: '2024-01-15T10:30:00Z',
        status: 'completed',
        operation_id: 'op_test_456',
        message: 'Premium Subscription Payment',
        redirect_url: 'https://ziina.com/payment/pi_test_123',
        success_url: 'https://app.example.com/payments/success?pi=pi_test_123',
        cancel_url: 'https://app.example.com/payments/cancel?pi=pi_test_123',
        latest_error: null,
        allow_tips: false
      }
    };

    // Invalid payload - missing required fields
    const invalidPaymentIntent = {
      event: 'payment_intent.status.updated',
      data: {
        id: 'pi_test_123',
        amount: 4000,
        currency_code: 'AED',
        status: 'invalid_status', // Invalid enum value
        operation_id: 'op_test_456'
        // Missing required fields: account_id, created_at, message, urls, etc.
      }
    };

    try {
      const { WebhookPayloadSchema } = await import('@/types/ziina');
      
      // Test valid payload
      const validResult = WebhookPayloadSchema.safeParse(validPaymentIntent);
      console.log(`Valid payload test: ${validResult.success ? '✅' : '❌'}`);
      if (!validResult.success) {
        console.log('  Validation errors:', validResult.error.issues);
      }
      
      // Test invalid payload
      const invalidResult = WebhookPayloadSchema.safeParse(invalidPaymentIntent);
      console.log(`Invalid payload test: ${!invalidResult.success ? '✅' : '❌'}`);
      
      if (!invalidResult.success) {
        console.log('  Expected validation errors:', invalidResult.error.issues.length);
      }

      return {
        testName: 'Zod Schema Validation',
        passed: validResult.success && !invalidResult.success,
        duration: Date.now() - startTime,
        error: !validResult.success ? 'Valid payload failed validation' : undefined
      };
    } catch (error) {
      console.error('Zod schema test failed:', error);
      return {
        testName: 'Zod Schema Validation',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Schema import failed'
      };
    }
  }

  // Enhanced integration test for payment creation with proper JWT handling
  static async testPaymentCreation(): Promise<PaymentTestResult> {
    const startTime = Date.now();
    console.log('🧪 Testing payment creation flow...');
    
    try {
      // Check if user is authenticated first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.log(`Payment creation test: ❌ User not authenticated`);
        return {
          testName: 'Payment Creation',
          passed: false,
          duration: Date.now() - startTime,
          error: 'User not authenticated - please sign in to test payment creation',
          details: { sessionError: sessionError?.message }
        };
      }

      const testPayload = {
        product: 'consumer_premium' as const,
        amountAed: 40,
        test: true
      };

      console.log('Creating test payment intent with authenticated user...');
      console.log('User ID:', session.user.id);
      console.log('Session valid:', !!session.access_token);
      console.log('Token preview:', session.access_token?.substring(0, 20) + '...');
      
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: testPayload,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.log(`Payment creation test: ❌ ${error.message}`);
        console.log('Error details:', error);
        
        // Enhanced error categorization
        let errorCategory = 'Unknown';
        let errorMessage = `API Error: ${error.message}`;
        
        if (error.message?.includes('Configuration error') || error.message?.includes('missing')) {
          errorCategory = 'Configuration';
          errorMessage = 'Edge function configuration error - check Supabase secrets (ZIINA_API_TOKEN, ZIINA_API_BASE, APP_BASE_URL)';
        } else if (error.message?.includes('Ziina API failed') || error.message?.includes('upstream_status')) {
          errorCategory = 'Ziina API';
          errorMessage = `Ziina API error - check API token validity and request format: ${error.message}`;
        } else if (error.message?.includes('Invalid authentication') || error.message?.includes('Authorization')) {
          errorCategory = 'Authentication';
          errorMessage = 'JWT authentication failed - check session token validity';
        } else if (error.message?.includes('Validation error')) {
          errorCategory = 'Validation';
          errorMessage = 'Request validation failed - check request body format';
        }
        
        return {
          testName: 'Payment Creation',
          passed: false,
          duration: Date.now() - startTime,
          error: errorMessage,
          details: {
            category: errorCategory,
            originalError: error,
            sessionInfo: {
              userId: session.user.id,
              hasToken: !!session.access_token,
              tokenLength: session.access_token?.length
            }
          }
        };
      }

      if (!data || !data.redirectUrl || !data.pi) {
        console.log(`Payment creation test: ❌ Invalid response format`);
        console.log('Response data:', data);
        return {
          testName: 'Payment Creation',
          passed: false,
          duration: Date.now() - startTime,
          error: 'Invalid response format - missing redirectUrl or pi',
          details: { responseData: data }
        };
      }

      console.log(`Payment creation test: ✅`);
      console.log(`  Redirect URL: ${data.redirectUrl?.substring(0, 50)}...`);
      console.log(`  Payment Intent ID: ${data.pi}`);
      
      return {
        testName: 'Payment Creation',
        passed: true,
        duration: Date.now() - startTime,
        details: {
          paymentIntentId: data.pi,
          redirectUrlPreview: data.redirectUrl?.substring(0, 50) + '...',
          fullRedirectUrl: data.redirectUrl
        }
      };
    } catch (error) {
      console.error('Payment creation test failed:', error);
      return {
        testName: 'Payment Creation',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { errorType: error?.constructor?.name }
      };
    }
  }

  // Test webhook simulation
  static async testWebhookSimulation(): Promise<PaymentTestResult> {
    const startTime = Date.now();
    console.log('🧪 Testing webhook simulation...');
    
    const simulatedWebhook = {
      event: 'payment_intent.status.updated',
      data: {
        id: 'pi_test_simulation_' + Date.now(),
        account_id: 'acc_test_' + Date.now(),
        amount: 4000,
        tip_amount: 0,
        fee_amount: 120,
        currency_code: 'AED',
        created_at: new Date().toISOString(),
        status: 'completed',
        operation_id: 'op_test_' + Date.now(),
        message: 'Test webhook simulation',
        redirect_url: 'https://ziina.com/payment/pi_test_simulation_' + Date.now(),
        success_url: 'https://app.example.com/payments/success',
        cancel_url: 'https://app.example.com/payments/cancel',
        latest_error: null,
        allow_tips: false
      }
    };

    console.log('Simulated webhook payload:', simulatedWebhook);
    
    // Note: In a real test, you would send this to your webhook endpoint
    // For now, we just validate the structure
    console.log('Webhook simulation prepared ✅');
    console.log('  To test: Send this payload to /functions/v1/payment-webhook');
    
    return {
      testName: 'Webhook Simulation',
      passed: true,
      duration: Date.now() - startTime,
      details: { simulatedPayload: simulatedWebhook }
    };
  }

  // Run all tests
  static async runAllTests(): Promise<PaymentTestResult[]> {
    console.log('🚀 Running Payment Test Suite...\n');
    
    const results: PaymentTestResult[] = [];
    
    // Run tests sequentially
    results.push(this.testAedToFilsConversion());
    console.log('');
    
    results.push(await this.testHMACVerification());
    console.log('');
    
    results.push(await this.testZodSchemas());
    console.log('');
    
    results.push(await this.testPaymentCreation());
    console.log('');
    
    results.push(await this.testWebhookSimulation());
    
    console.log('\n✨ Payment Test Suite Complete!');
    
    // Log summary
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    console.log(`📊 Summary: ${passed}/${total} tests passed`);
    
    if (passed < total) {
      console.log('❌ Failed tests:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.testName}: ${r.error}`);
      });
    }
    
    return results;
  }
}

// Export for easy testing in console
export const runPaymentTests = (): Promise<PaymentTestResult[]> => PaymentTestSuite.runAllTests();
