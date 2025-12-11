import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FeatureShortcutTileProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  badge?: number;
}

export const FeatureShortcutTile: React.FC<FeatureShortcutTileProps> = ({
  icon: Icon,
  label,
  onClick,
  badge,
}) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 md:gap-3 p-3 md:p-6 bg-card rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] min-w-[64px] md:min-w-[110px] relative"
    >
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-[hsl(var(--azyah-maroon))] text-white text-[10px] font-medium rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <div className="w-8 h-8 md:w-14 md:h-14 rounded-lg bg-secondary flex items-center justify-center">
        <Icon className="h-4 w-4 md:h-7 md:w-7 text-muted-foreground" />
      </div>
      <span className="text-[10px] md:text-sm font-medium text-muted-foreground text-center leading-tight">
        {label}
      </span>
    </button>
  );
};
