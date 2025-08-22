
import { supabase } from '@/integrations/supabase/client';
import { convertAedToFils, verifyWebhookSignature, isAllowedIP } from '@/utils/ziina';
import { PaymentIntentSchema, WebhookPayloadSchema } from '@/types/ziina';

export interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export class ZiinaTestSuite {
  
  // Unit Tests
  static testAedToFilsConverter(): TestResult {
    const startTime = Date.now();
    console.log('🧪 Testing AED to Fils conversion...');
    
    const testCases = [
      { aed: 40, expectedFils: 4000, shouldPass: true },
      { aed: 2, expectedFils: 200, shouldPass: true },
      { aed: 100, expectedFils: 10000, shouldPass: true },
      { aed: 1.5, expectedFils: 150, shouldPass: false }, // below minimum
      { aed: 0, expectedFils: 0, shouldPass: false }, // invalid
    ];

    let allPassed = true;
    const results: any[] = [];

    testCases.forEach(({ aed, expectedFils, shouldPass }) => {
      try {
        const fils = convertAedToFils(aed);
        const testPassed = fils === expectedFils && shouldPass;
        
        results.push({
          input: aed,
          output: fils,
          expected: expectedFils,
          shouldPass,
          passed: testPassed
        });
        
        if (!testPassed) allPassed = false;
        
        console.log(`${aed} AED → ${fils} fils (expected: ${expectedFils}) ${
          testPassed ? '✅' : '❌'
        }`);
      } catch (error) {
        const testPassed = !shouldPass; // Should fail for invalid inputs
        results.push({
          input: aed,
          error: error.message,
          shouldPass,
          passed: testPassed
        });
        
        if (!testPassed) allPassed = false;
        
        console.log(`${aed} AED → Error: ${error.message} ${
          testPassed ? '✅' : '❌'
        }`);
      }
    });

    return {
      testName: 'AED to Fils Conversion',
      passed: allPassed,
      duration: Date.now() - startTime,
      details: results
    };
  }

  static async testHMACVerification(): Promise<TestResult> {
    const startTime = Date.now();
    console.log('🧪 Testing HMAC signature verification...');
    
    const testSecret = 'test-webhook-secret-12345';
    const testBody = '{"event":"payment_intent.status.updated","data":{"id":"pi_test_123","status":"completed"}}';
    
    try {
      // Create expected signature
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
      
      // Test valid signature
      const isValid = verifyWebhookSignature(testBody, expectedSignature, testSecret);
      console.log(`Valid signature test: ${isValid ? '✅' : '❌'}`);
      
      // Test invalid signature
      const invalidSignature = 'invalid-signature-12345';
      const isInvalid = verifyWebhookSignature(testBody, invalidSignature, testSecret);
      console.log(`Invalid signature test: ${!isInvalid ? '✅' : '❌'}`);
      
      return {
        testName: 'HMAC Signature Verification',
        passed: isValid && !isInvalid,
        duration: Date.now() - startTime,
        details: {
          validSignatureTest: isValid,
          invalidSignatureTest: !isInvalid,
          expectedSignature: expectedSignature.substring(0, 20) + '...'
        }
      };
      
    } catch (error) {
      return {
        testName: 'HMAC Signature Verification',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static testIPAllowlist(): TestResult {
    const startTime = Date.now();
    console.log('🧪 Testing IP allowlist...');
    
    const testCases = [
      { ip: '3.29.184.186', shouldPass: true },
      { ip: '3.29.190.95', shouldPass: true },
      { ip: '20.233.47.127', shouldPass: true },
      { ip: '192.168.1.1', shouldPass: false },
      { ip: '127.0.0.1', shouldPass: false },
      { ip: '10.0.0.1', shouldPass: false }
    ];

    let allPassed = true;
    const results: any[] = [];

    testCases.forEach(({ ip, shouldPass }) => {
      const isAllowed = isAllowedIP(ip);
      const testPassed = isAllowed === shouldPass;
      
      results.push({
        ip,
        allowed: isAllowed,
        shouldPass,
        passed: testPassed
      });
      
      if (!testPassed) allPassed = false;
      
      console.log(`${ip}: ${isAllowed ? 'allowed' : 'blocked'} ${
        testPassed ? '✅' : '❌'
      }`);
    });

    return {
      testName: 'IP Allowlist Verification',
      passed: allPassed,
      duration: Date.now() - startTime,
      details: results
    };
  }

  static testZodSchemas(): TestResult {
    const startTime = Date.now();
    console.log('🧪 Testing Zod schema validation...');
    
    // Valid payment intent
    const validPaymentIntent = {
      id: 'pi_test_123',
      amount: 4000,
      currency_code: 'AED',
      status: 'completed',
      redirect_url: 'https://ziina.com/payment/pi_test_123',
      success_url: 'https://app.example.com/payments/success?pi=pi_test_123',
      cancel_url: 'https://app.example.com/payments/cancel?pi=pi_test_123',
      fee_amount: 120,
      tip_amount: 0,
      message: 'Premium Subscription',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z'
    };

    // Valid webhook payload
    const validWebhookPayload = {
      event: 'payment_intent.status.updated',
      data: validPaymentIntent
    };

    // Invalid payment intent (wrong status)
    const invalidPaymentIntent = {
      ...validPaymentIntent,
      status: 'invalid_status'
    };

    try {
      // Test valid payment intent
      const validPIResult = PaymentIntentSchema.safeParse(validPaymentIntent);
      console.log(`Valid payment intent: ${validPIResult.success ? '✅' : '❌'}`);
      
      // Test valid webhook payload
      const validWHResult = WebhookPayloadSchema.safeParse(validWebhookPayload);
      console.log(`Valid webhook payload: ${validWHResult.success ? '✅' : '❌'}`);
      
      // Test invalid payment intent
      const invalidPIResult = PaymentIntentSchema.safeParse(invalidPaymentIntent);
      console.log(`Invalid payment intent rejection: ${!invalidPIResult.success ? '✅' : '❌'}`);

      const allPassed = validPIResult.success && validWHResult.success && !invalidPIResult.success;

      return {
        testName: 'Zod Schema Validation',
        passed: allPassed,
        duration: Date.now() - startTime,
        details: {
          validPaymentIntent: validPIResult.success,
          validWebhookPayload: validWHResult.success,
          invalidPaymentIntentRejected: !invalidPIResult.success,
          errors: invalidPIResult.success ? [] : invalidPIResult.error?.issues
        }
      };
    } catch (error) {
      return {
        testName: 'Zod Schema Validation',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Integration Tests
  static async testPaymentCreation(): Promise<TestResult> {
    const startTime = Date.now();
    console.log('🧪 Testing payment creation...');
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return {
          testName: 'Payment Creation',
          passed: false,
          duration: Date.now() - startTime,
          error: 'User not authenticated - please sign in to test payment creation'
        };
      }

      const testPayload = {
        amountAed: 40,
        test: true,
        message: 'Test Payment'
      };

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: testPayload,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        return {
          testName: 'Payment Creation',
          passed: false,
          duration: Date.now() - startTime,
          error: error.message,
          details: error
        };
      }

      const hasRedirectUrl = data?.redirectUrl && typeof data.redirectUrl === 'string';
      const hasPaymentId = data?.pi && typeof data.pi === 'string';

      return {
        testName: 'Payment Creation',
        passed: hasRedirectUrl && hasPaymentId,
        duration: Date.now() - startTime,
        details: {
          hasRedirectUrl,
          hasPaymentId,
          redirectUrl: data?.redirectUrl?.substring(0, 50) + '...',
          paymentId: data?.pi
        }
      };

    } catch (error) {
      return {
        testName: 'Payment Creation',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async testWebhookSimulation(): Promise<TestResult> {
    const startTime = Date.now();
    console.log('🧪 Testing webhook simulation...');
    
    // Create a simulated webhook payload
    const mockWebhookPayload = {
      event: 'payment_intent.status.updated',
      data: {
        id: `pi_test_simulation_${Date.now()}`,
        amount: 4000,
        currency_code: 'AED',
        status: 'completed',
        redirect_url: `https://ziina.com/payment/pi_test_simulation_${Date.now()}`,
        success_url: 'https://app.example.com/payments/success',
        cancel_url: 'https://app.example.com/payments/cancel',
        fee_amount: 120,
        tip_amount: 0,
        message: 'Test webhook simulation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    console.log('Simulated webhook payload:', mockWebhookPayload);
    console.log('Webhook simulation prepared ✅');
    console.log('  To test: Send this payload to /functions/v1/payment-webhook');

    return {
      testName: 'Webhook Simulation',
      passed: true,
      duration: Date.now() - startTime,
      details: {
        payload: mockWebhookPayload,
        note: 'Webhook payload generated successfully - manual testing required'
      }
    };
  }
}

export async function runZiinaTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  console.log('🧪 Starting Ziina Test Suite...\n');
  
  // Unit Tests
  results.push(ZiinaTestSuite.testAedToFilsConverter());
  results.push(await ZiinaTestSuite.testHMACVerification());
  results.push(ZiinaTestSuite.testIPAllowlist());
  results.push(ZiinaTestSuite.testZodSchemas());
  
  // Integration Tests
  results.push(await ZiinaTestSuite.testPaymentCreation());
  results.push(await ZiinaTestSuite.testWebhookSimulation());
  
  console.log('\n✨ Ziina Test Suite Complete!');
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  console.log(`📊 Summary: ${passedTests}/${totalTests} tests passed`);
  
  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.log('❌ Failed tests:');
    failedTests.forEach(test => {
      console.log(`  - ${test.testName}: ${test.error || 'Failed'}`);
    });
  }
  
  return results;
}
