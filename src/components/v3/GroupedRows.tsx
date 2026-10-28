import React from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GroupedRow {
  label: string;
  icon?: LucideIcon;
  /** Trailing value in ink-2, e.g. "120 pts". */
  value?: string;
  onClick: () => void;
}

/** Design v3 grouped rows (iPhone Settings style): one card, rows divided by a hairline. */
export function GroupedRows({ rows, className }: { rows: GroupedRow[]; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-[20px] bg-card', className)}>
      {rows.map(({ label, icon: Icon, value, onClick }, i) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className="flex min-h-[48px] w-full items-center gap-3 pl-4 text-left transition-colors active:bg-fill"
        >
          {Icon && <Icon className="h-5 w-5 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden />}
          <span className={cn('flex min-h-[48px] flex-1 items-center gap-2 pr-3', i > 0 && 'border-t border-line')}>
            <span className="flex-1 text-[15px] text-ink">{label}</span>
            {value && <span className="max-w-[45%] truncate text-[15px] text-ink-2 tabular-nums">{value}</span>}
            <ChevronRight className="h-4 w-4 shrink-0 text-[#C7C7CC]" aria-hidden />
          </span>
        </button>
      ))}
    </div>
  );
}
