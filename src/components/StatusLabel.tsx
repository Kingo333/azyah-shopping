import { cn } from '@/lib/utils';
import { statusTone, type StatusTone } from '@/lib/statusTone';

const TONE_CLASS: Record<StatusTone, string> = {
  ok: 'bg-ok text-ok-foreground',
  wait: 'bg-wait text-wait-foreground',
  bad: 'bg-bad text-bad-foreground',
  neutral: 'bg-fill text-ink-2',
};

/** Design v3 status label: pale tint with dark text of the same hue, 11px, round. */
export function StatusLabel({ status, children, className }: { status: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', TONE_CLASS[statusTone(status)], className)}>
      {children}
    </span>
  );
}
