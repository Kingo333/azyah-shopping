import { Session, User } from '@supabase/supabase-js';

const PAYMENT_SESSION_KEY = 'azyah_payment_session_backup';
const PAYMENT_FLOW_KEY = 'azyah_payment_flow_active';

interface PaymentSessionBackup {
  session: Session;
  user: User;
  timestamp: number;
  paymentIntentId?: string;
}

export const storePaymentSessionBackup = (session: Session, user: User, paymentIntentId?: string) => {
  try {
    const backup: PaymentSessionBackup = {
      session,
      user,
      timestamp: Date.now(),
      paymentIntentId
    };
    sessionStorage.setItem(PAYMENT_SESSION_KEY, JSON.stringify(backup));
    sessionStorage.setItem(PAYMENT_FLOW_KEY, 'true');
    console.log('Payment session backup stored');
  } catch (error) {
    console.error('Failed to store payment session backup:', error);
  }
};

export const getPaymentSessionBackup = (): PaymentSessionBackup | null => {
  try {
    const stored = sessionStorage.getItem(PAYMENT_SESSION_KEY);
    if (!stored) return null;
    
    const backup: PaymentSessionBackup = JSON.parse(stored);
    // Check if backup is less than 30 minutes old
    if (Date.now() - backup.timestamp > 30 * 60 * 1000) {
      clearPaymentSessionBackup();
      return null;
    }
    
    return backup;
  } catch (error) {
    console.error('Failed to retrieve payment session backup:', error);
    return null;
  }
};

export const clearPaymentSessionBackup = () => {
  try {
    sessionStorage.removeItem(PAYMENT_SESSION_KEY);
    sessionStorage.removeItem(PAYMENT_FLOW_KEY);
    console.log('Payment session backup cleared');
  } catch (error) {
    console.error('Failed to clear payment session backup:', error);
  }
};

export const isPaymentFlowActive = (): boolean => {
  return sessionStorage.getItem(PAYMENT_FLOW_KEY) === 'true';
};

export const isPaymentReturnPage = (): boolean => {
  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  
  return (
    pathname === '/payment-success' ||
    pathname === '/payment-cancel' ||
    pathname === '/payment-failed' ||
    searchParams.has('payment_intent_id')
  );
};