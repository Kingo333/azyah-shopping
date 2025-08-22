
import React from 'react';
import { Crown } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { MaintenancePaymentButton } from '@/components/MaintenancePaymentButton';
import { ZiinaPaymentButton } from '@/components/ZiinaPaymentButton';
import { FEATURES } from '@/config/features';

const PremiumBanner: React.FC = () => {
  return (
    <GlassPanel className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-accent-cartier/10" />
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-6">
        <div className="text-center sm:text-left w-full sm:w-auto">
          <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-accent to-accent-cartier bg-clip-text text-transparent mb-2">
            Unlock Premium Access
          </h3>
          <div className="text-xs sm:text-sm text-muted-foreground">
            <span className="font-medium">40 AED/month • 20 AI Try-ons daily • Unlimited replica • UGC collabs</span>
          </div>
        </div>
        
        {FEATURES.PAYMENTS_MAINTENANCE ? (
          <MaintenancePaymentButton 
            className="w-full sm:w-auto"
            size="sm"
          />
        ) : (
          <ZiinaPaymentButton 
            className="bg-gradient-to-r from-accent to-accent-cartier hover:from-accent/90 hover:to-accent-cartier/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
            size="sm"
          />
        )}
      </div>
    </GlassPanel>
  );
};

export default PremiumBanner;
