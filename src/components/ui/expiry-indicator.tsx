import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ExpiryIndicatorProps {
  createdAt: string;
  expiryHours?: number;
  className?: string;
}

/**
 * A small circular indicator that shows countdown to asset expiry
 * Color transitions: Green (>24h) → Yellow (12-24h) → Red (<12h)
 */
export const ExpiryIndicator: React.FC<ExpiryIndicatorProps> = ({
  createdAt,
  expiryHours = 48,
  className
}) => {
  const [hoursLeft, setHoursLeft] = useState(expiryHours);

  useEffect(() => {
    const update = () => {
      const created = new Date(createdAt);
      const expiresAt = new Date(created.getTime() + expiryHours * 60 * 60 * 1000);
      const remaining = expiresAt.getTime() - Date.now();
      setHoursLeft(Math.max(0, remaining / (1000 * 60 * 60)));
    };

    update();
    const interval = setInterval(update, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [createdAt, expiryHours]);

  // Color based on remaining time
  const colorClass = hoursLeft > 24
    ? 'bg-green-500'
    : hoursLeft > 12
    ? 'bg-yellow-500'
    : 'bg-red-500';

  // Format display
  const displayText = hoursLeft >= 24
    ? `${Math.floor(hoursLeft / 24)}d`
    : `${Math.floor(hoursLeft)}h`;

  return (
    <div
      className={cn(
        'absolute bottom-1 right-1 w-4 h-4 rounded-full flex items-center justify-center',
        'text-[8px] font-bold text-white shadow-sm border border-white/50',
        colorClass,
        className
      )}
      title={`Expires in ${Math.floor(hoursLeft)}h`}
    >
      {hoursLeft < 48 && displayText}
    </div>
  );
};

export default ExpiryIndicator;
