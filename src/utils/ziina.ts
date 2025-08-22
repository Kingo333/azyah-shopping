
import crypto from 'crypto';

// Convert AED to fils (minimum 2 AED = 200 fils)
export function convertAedToFils(aed: number): number {
  const fils = Math.round(aed * 100);
  if (fils < 200) {
    throw new Error('Minimum amount is 2 AED (200 fils)');
  }
  return fils;
}

// Convert fils to AED
export function convertFilsToAed(fils: number): number {
  return fils / 100;
}

// Verify webhook HMAC signature
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

// Check if IP is in allowlist
export function isAllowedIP(ip: string): boolean {
  const allowedIPs = ['3.29.184.186', '3.29.190.95', '20.233.47.127'];
  return allowedIPs.includes(ip);
}
