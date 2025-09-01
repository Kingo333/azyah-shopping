/**
 * Security Headers Utility
 * Provides standardized security headers for edge functions and API responses
 */

export const getSecurityHeaders = () => ({
  // CORS headers for web app access
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  
  // Security headers
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY', 
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", 
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // HSTS header (only for HTTPS)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
});

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Rate limiting helper
export const checkRateLimit = (ip: string, maxRequests = 100, windowMs = 60000) => {
  // This is a simple in-memory rate limiter
  // In production, you'd want to use Redis or a proper rate limiting service
  const now = Date.now();
  const requests: Record<string, number[]> = {};
  
  if (!requests[ip]) {
    requests[ip] = [];
  }
  
  // Clean old requests outside the window
  requests[ip] = requests[ip].filter(time => now - time < windowMs);
  
  // Check if limit exceeded
  if (requests[ip].length >= maxRequests) {
    return false;
  }
  
  // Add current request
  requests[ip].push(now);
  return true;
};

// Security validation helpers
export const validateInput = (input: string, maxLength = 1000): boolean => {
  if (!input || typeof input !== 'string') return false;
  if (input.length > maxLength) return false;
  
  // Check for common injection patterns
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload=/gi,
    /onerror=/gi,
    /onclick=/gi
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(input));
};

export const sanitizeUserInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};