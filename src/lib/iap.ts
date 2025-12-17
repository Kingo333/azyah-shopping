/**
 * iOS In-App Purchase Helper using RevenueCat
 * 
 * This module provides a safe abstraction for iOS StoreKit purchases.
 * On web, all functions return safe defaults or throw clear errors.
 */

import { Capacitor } from '@capacitor/core';

// Lazy load RevenueCat to avoid import errors on web
let Purchases: any = null;
let LOG_LEVEL: any = null;

// Product IDs from App Store Connect
export const PRODUCT_IDS = {
  MONTHLY: 'com.azyah.style.premium.monthly',
  YEARLY: 'com.azyah.style.premium.yearly'
} as const;

export type ProductId = typeof PRODUCT_IDS[keyof typeof PRODUCT_IDS];

export interface IAPProduct {
  identifier: string;
  title: string;
  description: string;
  price: number;
  priceString: string;
  currencyCode: string;
}

export interface PurchaseResult {
  success: boolean;
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  expiresAt?: Date;
  error?: string;
  cancelled?: boolean;
}

export interface RestoreResult {
  success: boolean;
  hasActiveSubscription: boolean;
  activeProductId?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Check if we're running on native iOS
 */
export function isNativeIOS(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

/**
 * Check if we're running on any native platform
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Initialize IAP - only works on native iOS
 * Returns true if initialization succeeded
 */
export async function initIap(): Promise<boolean> {
  if (!isNativeIOS()) {
    console.log('[IAP] Skipping init - not native iOS');
    return false;
  }

  // Check for API key - no fallback
  const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY;
  if (!apiKey) {
    console.error('[IAP] VITE_REVENUECAT_API_KEY is missing - IAP disabled. Set this environment variable to enable in-app purchases.');
    return false;
  }

  try {
    // Dynamic import to avoid bundling issues on web
    const module = await import('@revenuecat/purchases-capacitor');
    Purchases = module.Purchases;
    LOG_LEVEL = module.LOG_LEVEL;

    // Set debug logging in development
    if (import.meta.env.DEV) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    }

    // Configure RevenueCat
    await Purchases.configure({
      apiKey,
      appUserID: null // Let RevenueCat generate anonymous ID, we'll identify with logIn later
    });

    console.log('[IAP] RevenueCat initialized successfully');
    return true;
  } catch (error) {
    console.error('[IAP] Failed to initialize:', error);
    return false;
  }
}

/**
 * Log in user to RevenueCat (call after user signs in)
 * This properly identifies the user for cross-device restore
 */
export async function setIapUserId(userId: string): Promise<void> {
  if (!isNativeIOS() || !Purchases) {
    return;
  }

  try {
    await Purchases.logIn({ appUserID: userId });
    console.log('[IAP] User logged in to RevenueCat:', userId);
  } catch (error) {
    console.error('[IAP] Failed to log in user:', error);
  }
}

/**
 * Log out user from RevenueCat (call on sign out)
 * This resets to anonymous user for proper state management
 */
export async function logOutIap(): Promise<void> {
  if (!isNativeIOS() || !Purchases) {
    return;
  }

  try {
    await Purchases.logOut();
    console.log('[IAP] User logged out from RevenueCat');
  } catch (error) {
    console.error('[IAP] Failed to log out:', error);
  }
}

/**
 * Get current offerings from RevenueCat
 * This is the recommended way to get products - returns what's configured in RC dashboard
 */
export async function getOfferings(): Promise<any> {
  if (!isNativeIOS() || !Purchases) {
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    console.log('[IAP] Offerings fetched:', offerings);
    return offerings;
  } catch (error) {
    console.error('[IAP] Failed to get offerings:', error);
    return null;
  }
}

/**
 * Get product information from StoreKit via Offerings
 * Returns empty array on web
 */
export async function getProducts(productIds: string[]): Promise<IAPProduct[]> {
  if (!isNativeIOS()) {
    console.log('[IAP] getProducts called on non-iOS platform');
    return [];
  }

  if (!Purchases) {
    console.error('[IAP] IAP not initialized. Call initIap() first.');
    return [];
  }

  try {
    const offerings = await Purchases.getOfferings();
    const products: IAPProduct[] = [];

    // Check current offering first (recommended)
    if (offerings.current?.availablePackages) {
      for (const pkg of offerings.current.availablePackages) {
        const product = pkg.product;
        if (productIds.includes(product.identifier)) {
          products.push({
            identifier: product.identifier,
            title: product.title,
            description: product.description,
            price: product.price,
            priceString: product.priceString,
            currencyCode: product.currencyCode
          });
        }
      }
    }

    // Also check all offerings as fallback
    if (offerings.all) {
      for (const offering of Object.values(offerings.all) as any[]) {
        if (offering.availablePackages) {
          for (const pkg of offering.availablePackages) {
            const product = pkg.product;
            if (productIds.includes(product.identifier) && 
                !products.find(p => p.identifier === product.identifier)) {
              products.push({
                identifier: product.identifier,
                title: product.title,
                description: product.description,
                price: product.price,
                priceString: product.priceString,
                currencyCode: product.currencyCode
              });
            }
          }
        }
      }
    }

    console.log('[IAP] Products fetched:', products);
    return products;
  } catch (error) {
    console.error('[IAP] Failed to get products:', error);
    return [];
  }
}

/**
 * Purchase a product
 * Returns purchase result with success status and transaction details
 */
export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  if (!isNativeIOS()) {
    return { 
      success: false, 
      error: 'In-app purchases are only available on iOS devices' 
    };
  }

  if (!Purchases) {
    return { 
      success: false, 
      error: 'IAP not initialized. Please restart the app.' 
    };
  }

  try {
    // Get the package for this product from offerings
    const offerings = await Purchases.getOfferings();
    let targetPackage: any = null;

    // Find the package in offerings
    if (offerings.current?.availablePackages) {
      targetPackage = offerings.current.availablePackages.find(
        (pkg: any) => pkg.product.identifier === productId
      );
    }

    if (!targetPackage && offerings.all) {
      for (const offering of Object.values(offerings.all) as any[]) {
        if (offering.availablePackages) {
          targetPackage = offering.availablePackages.find(
            (pkg: any) => pkg.product.identifier === productId
          );
          if (targetPackage) break;
        }
      }
    }

    if (!targetPackage) {
      return { 
        success: false, 
        error: 'Product not found. Please try again later.' 
      };
    }

    // Make the purchase
    const purchaseResult = await Purchases.purchasePackage({ 
      aPackage: targetPackage 
    });

    // Extract subscription info
    const customerInfo = purchaseResult.customerInfo;
    const entitlements = customerInfo.entitlements.active;
    
    // Check if premium entitlement is now active
    const premiumEntitlement = entitlements['premium'] || entitlements['Premium'];
    
    if (premiumEntitlement) {
      return {
        success: true,
        productId,
        transactionId: premiumEntitlement.latestPurchaseDate,
        originalTransactionId: premiumEntitlement.originalPurchaseDate,
        expiresAt: premiumEntitlement.expirationDate 
          ? new Date(premiumEntitlement.expirationDate) 
          : undefined
      };
    }

    // Fallback - check if any subscription is active
    const activeSubscription = Object.values(entitlements)[0] as any;
    if (activeSubscription) {
      return {
        success: true,
        productId,
        expiresAt: activeSubscription.expirationDate 
          ? new Date(activeSubscription.expirationDate) 
          : undefined
      };
    }

    return {
      success: true,
      productId
    };
  } catch (error: any) {
    console.error('[IAP] Purchase failed:', error);
    
    // Check if user cancelled
    if (error.code === 1 || error.userCancelled || 
        error.message?.includes('cancelled') || 
        error.message?.includes('canceled')) {
      return {
        success: false,
        cancelled: true,
        error: 'Purchase cancelled'
      };
    }

    return {
      success: false,
      error: error.message || 'Purchase failed. Please try again.'
    };
  }
}

/**
 * Restore previous purchases
 * Returns restore result with active subscription status
 */
export async function restorePurchases(): Promise<RestoreResult> {
  if (!isNativeIOS()) {
    return { 
      success: false, 
      hasActiveSubscription: false,
      error: 'In-app purchases are only available on iOS devices' 
    };
  }

  if (!Purchases) {
    return { 
      success: false, 
      hasActiveSubscription: false,
      error: 'IAP not initialized. Please restart the app.' 
    };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const entitlements = customerInfo.customerInfo.entitlements.active;

    // Check for active premium entitlement
    const premiumEntitlement = entitlements['premium'] || entitlements['Premium'];
    
    if (premiumEntitlement) {
      // Try to determine which product
      let activeProductId: string | undefined;
      if (premiumEntitlement.productIdentifier) {
        activeProductId = premiumEntitlement.productIdentifier;
      }

      return {
        success: true,
        hasActiveSubscription: true,
        activeProductId,
        expiresAt: premiumEntitlement.expirationDate 
          ? new Date(premiumEntitlement.expirationDate) 
          : undefined
      };
    }

    // Check any active subscription
    const activeEntitlements = Object.entries(entitlements);
    if (activeEntitlements.length > 0) {
      const [_, entitlement] = activeEntitlements[0] as [string, any];
      return {
        success: true,
        hasActiveSubscription: true,
        activeProductId: entitlement.productIdentifier,
        expiresAt: entitlement.expirationDate 
          ? new Date(entitlement.expirationDate) 
          : undefined
      };
    }

    return {
      success: true,
      hasActiveSubscription: false
    };
  } catch (error: any) {
    console.error('[IAP] Restore failed:', error);
    return {
      success: false,
      hasActiveSubscription: false,
      error: error.message || 'Failed to restore purchases'
    };
  }
}

/**
 * Get current subscription status from RevenueCat
 */
export async function getSubscriptionStatus(): Promise<{
  isActive: boolean;
  productId?: string;
  expiresAt?: Date;
}> {
  if (!isNativeIOS() || !Purchases) {
    return { isActive: false };
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlements = customerInfo.customerInfo.entitlements.active;
    
    const premiumEntitlement = entitlements['premium'] || entitlements['Premium'];
    if (premiumEntitlement) {
      return {
        isActive: true,
        productId: premiumEntitlement.productIdentifier,
        expiresAt: premiumEntitlement.expirationDate 
          ? new Date(premiumEntitlement.expirationDate) 
          : undefined
      };
    }

    return { isActive: false };
  } catch (error) {
    console.error('[IAP] Failed to get subscription status:', error);
    return { isActive: false };
  }
}
