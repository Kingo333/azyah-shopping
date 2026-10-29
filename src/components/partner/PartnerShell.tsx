import React from 'react';
import { useTheme } from 'next-themes';
import { HelpCircle, LogOut, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FeedbackModal } from '@/components/FeedbackModal';
import { cn } from '@/lib/utils';

export interface PartnerNavItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface PartnerShellProps {
  orgName: string;
  orgLogo?: string | null;
  /** "Brand portal" or "Store portal". */
  portalLabel: string;
  userType: 'brand' | 'retailer';
  items: PartnerNavItem[];
  active: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

function OrgMark({ name, logo }: { name: string; logo?: string | null }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'A';
  if (logo) {
    return <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-lg bg-card object-contain" />;
  }
  return (
    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink text-[13px] font-semibold text-white dark:text-black">
      {initials}
    </span>
  );
}

/**
 * Partner portal layout (spec 7.23): on computers a quiet sidebar the same
 * color as the page; on phones a top bar and a bottom bar.
 */
export function PartnerShell({ orgName, orgLogo, portalLabel, userType, items, active, onChange, children }: PartnerShellProps) {
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const hasNav = items.length > 0;

  const footerButton =
    'flex min-h-[40px] w-full items-center gap-3 rounded-xl px-3 text-left text-[14px] text-ink-2 transition-colors hover:bg-fill hover:text-ink';
  const iconButton = 'flex h-10 w-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-fill hover:text-ink';

  return (
    <div className="min-h-screen bg-ground text-ink">
      <div className="mx-auto flex max-w-7xl">
        {/* Computer: sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col px-3 py-6 md:flex">
          <div className="flex items-center gap-3 px-3 pb-6">
            <OrgMark name={orgName} logo={orgLogo} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-tight">{orgName}</p>
              <p className="text-[12px] text-ink-2">{portalLabel}</p>
            </div>
          </div>
          <nav aria-label={portalLabel} className="flex flex-col gap-0.5">
            {items.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange(value)}
                aria-current={active === value ? 'page' : undefined}
                className={cn(
                  'flex min-h-[40px] items-center gap-3 rounded-xl px-3 text-left text-[14px] transition-colors',
                  active === value ? 'bg-fill font-medium text-ink' : 'text-ink-2 hover:bg-fill/60 hover:text-ink',
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-0.5">
            <FeedbackModal userType={userType}>
              <button type="button" className={footerButton}>
                <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                Help and feedback
              </button>
            </FeedbackModal>
            <button type="button" className={footerButton} onClick={toggleTheme}>
              <ThemeIcon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button type="button" className={footerButton} onClick={() => signOut()}>
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Phone: top bar */}
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-ground/95 px-4 py-2.5 safe-area-pt md:hidden">
            <OrgMark name={orgName} logo={orgLogo} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight">{orgName}</p>
              <p className="text-[12px] text-ink-2">{portalLabel}</p>
            </div>
            <FeedbackModal userType={userType}>
              <button type="button" className={iconButton} aria-label="Help and feedback">
                <HelpCircle className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </FeedbackModal>
            <button type="button" className={iconButton} onClick={toggleTheme} aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              <ThemeIcon className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <button type="button" className={iconButton} onClick={() => signOut()} aria-label="Sign out">
              <LogOut className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </header>

          <main
            className={cn('px-4 py-5 md:px-8 md:py-8', hasNav && 'pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-8')}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Phone: bottom bar */}
      {hasNav && (
        <nav
          aria-label={portalLabel}
          className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          {items.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange(value)}
              aria-current={active === value ? 'page' : undefined}
              className={cn(
                'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px]',
                active === value ? 'font-medium text-ink' : 'text-ink-3',
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={active === value ? 2 : 1.75} aria-hidden />
              {label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

/** Page title for a portal section: large title, one line under it, actions on the right. */
export function PartnerSectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[14px] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
