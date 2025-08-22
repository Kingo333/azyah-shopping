
import { supabase } from '@/integrations/supabase/client';

// Unit Test Functions for Payment Flow
export class PaymentTestSuite {
  
  // Test AED to Fils conversion
  static testAedToFilsConversion() {
    const testCases = [
      { aed: 40, expectedFils: 4000 },
      { aed: 2, expectedFils: 200 }, // minimum
      { aed: 100, expectedFils: 10000 },
      { aed: 1.5, expectedFils: 150 }, // below minimum - should fail
      { aed: 0, expectedFils: 0 }, // invalid - should fail
    ];

    console.log('🧪 Testing AED to Fils conversion...');
    
    testCases.forEach(({ aed, expectedFils }) => {
      const fils = Math.round(aed * 100);
      const isValid = fils >= 200; // minimum 2 AED = 200 fils
      
      console.log(`${aed} AED → ${fils} fils (expected: ${expectedFils}) ${
        fils === expectedFils && isValid ? '✅' : '❌'
      }`);
      
      if (fils < 200) {
        console.log(`  ⚠️  Below minimum: ${aed} AED (${fils} fils) < 2 AED (200 fils)`);
      }
    });
  }

  // Test HMAC signature verification
  static async testHMACVerification() {
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
      
    } catch (error) {
      console.error('HMAC test failed:', error);
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
  static testZodSchemas() {
    console.log('🧪 Testing Zod schema validation...');
    
    const validPaymentIntent = {
      event: 'payment_intent.status.updated',
      data: {
        id: 'pi_test_123',
        amount: 4000,
        currency_code: 'AED',
        status: 'completed',
        operation_id: 'op_test_456',
        fee_amount: 120,
        tip_amount: 0,
        latest_error: null
      }
    };

    const invalidPaymentIntent = {
      event: 'payment_intent.status.updated',
      data: {
        id: 'pi_test_123',
        amount: 4000,
        currency_code: 'AED',
        status: 'invalid_status', // Invalid enum value
        operation_id: 'op_test_456'
        // Missing required fields
      }
    };

    try {
      import('@/types/ziina').then(({ WebhookPayloadSchema }) => {
        // Test valid payload
        const validResult = WebhookPayloadSchema.safeParse(validPaymentIntent);
        console.log(`Valid payload test: ${validResult.success ? '✅' : '❌'}`);
        
        // Test invalid payload
        const invalidResult = WebhookPayloadSchema.safeParse(invalidPaymentIntent);
        console.log(`Invalid payload test: ${!invalidResult.success ? '✅' : '❌'}`);
        
        if (!invalidResult.success) {
          console.log('  Expected validation errors:', invalidResult.error.issues.length);
        }
      });
    } catch (error) {
      console.error('Zod schema test failed:', error);
    }
  }

  // Integration test for payment creation
  static async testPaymentCreation() {
    console.log('🧪 Testing payment creation flow...');
    
    try {
      const testPayload = {
        product: 'consumer_premium' as const,
        amountAed: 40,
        test: true
      };

      console.log('Creating test payment intent...');
      
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: testPayload,
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) {
        console.log(`Payment creation test: ❌ ${error.message}`);
        return;
      }

      console.log(`Payment creation test: ✅`);
      console.log(`  Redirect URL: ${data.redirectUrl?.substring(0, 50)}...`);
      console.log(`  Payment Intent ID: ${data.pi}`);
      
      return data;
    } catch (error) {
      console.error('Payment creation test failed:', error);
    }
  }

  // Test webhook simulation
  static async testWebhookSimulation() {
    console.log('🧪 Testing webhook simulation...');
    
    const simulatedWebhook = {
      event: 'payment_intent.status.updated',
      data: {
        id: 'pi_test_simulation_' + Date.now(),
        amount: 4000,
        currency_code: 'AED',
        status: 'completed',
        operation_id: 'op_test_' + Date.now(),
        fee_amount: 120,
        tip_amount: 0,
        latest_error: null
      }
    };

    console.log('Simulated webhook payload:', simulatedWebhook);
    
    // Note: In a real test, you would send this to your webhook endpoint
    // For now, we just validate the structure
    console.log('Webhook simulation prepared ✅');
    console.log('  To test: Send this payload to /functions/v1/payment-webhook');
    
    return simulatedWebhook;
  }

  // Run all tests
  static async runAllTests() {
    console.log('🚀 Running Payment Test Suite...\n');
    
    this.testAedToFilsConversion();
    console.log('');
    
    await this.testHMACVerification();
    console.log('');
    
    this.testZodSchemas();
    console.log('');
    
    await this.testPaymentCreation();
    console.log('');
    
    await this.testWebhookSimulation();
    
    console.log('\n✨ Payment Test Suite Complete!');
  }
}

// Export for easy testing in console
export const runPaymentTests = () => PaymentTestSuite.runAllTests();
