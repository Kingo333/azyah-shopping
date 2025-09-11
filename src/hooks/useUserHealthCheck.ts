import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface HealthCheckResult {
  hasUserRecord: boolean;
  hasBrandRecord: boolean;
  hasRetailerRecord: boolean;
  isHealthy: boolean;
  missingComponents: string[];
}

export const useUserHealthCheck = () => {
  const { user } = useAuth();
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const performHealthCheck = async () => {
    if (!user) return null;

    setIsChecking(true);
    try {
      const missingComponents: string[] = [];

      // Check user record
      const { data: userData } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      const hasUserRecord = !!userData;
      if (!hasUserRecord) missingComponents.push('user record');

      const userRole = userData?.role || user.user_metadata?.role || 'shopper';

      // Check role-specific records
      let hasBrandRecord = true;
      let hasRetailerRecord = true;

      if (userRole === 'brand') {
        const { data: brandData } = await supabase
          .from('brands')
          .select('id')
          .eq('owner_user_id', user.id)
          .maybeSingle();
        
        hasBrandRecord = !!brandData;
        if (!hasBrandRecord) missingComponents.push('brand portal');
      }

      if (userRole === 'retailer') {
        const { data: retailerData } = await supabase
          .from('retailers')
          .select('id')
          .eq('owner_user_id', user.id)
          .maybeSingle();
        
        hasRetailerRecord = !!retailerData;
        if (!hasRetailerRecord) missingComponents.push('retailer portal');
      }

      const result: HealthCheckResult = {
        hasUserRecord,
        hasBrandRecord,
        hasRetailerRecord,
        isHealthy: missingComponents.length === 0,
        missingComponents
      };

      setHealthCheck(result);
      return result;
    } catch (error) {
      console.error('Health check failed:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (user) {
      performHealthCheck();
    }
  }, [user]);

  return {
    healthCheck,
    isChecking,
    performHealthCheck
  };
};