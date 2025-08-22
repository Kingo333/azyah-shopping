
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface MaintenancePaymentButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function MaintenancePaymentButton({ 
  variant = 'default',
  size = 'default',
  className 
}: MaintenancePaymentButtonProps) {
  return (
    <Button 
      variant="outline" 
      disabled 
      className={className}
      size={size}
    >
      <AlertTriangle className="w-4 h-4 mr-2" />
      Payments Under Maintenance
    </Button>
  );
}
