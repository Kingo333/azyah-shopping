import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sun, Moon, User, HelpCircle, Search, Settings } from 'lucide-react';
import { useDesignV3 } from '@/hooks/useDesignV3';

const V3_ICON_BUTTON = 'flex h-8 w-8 items-center justify-center rounded-full bg-fill text-ink active:opacity-70';
import { FeedbackModal } from '@/components/FeedbackModal';
import { isGuestMode } from '@/hooks/useGuestMode';
import { GuestActionPrompt } from '@/components/GuestActionPrompt';
import { usePremium } from '@/hooks/usePremium';

interface DashboardHeaderProps {
  onOpenSearch?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onOpenSearch }) => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const isGuest = isGuestMode();
  const { isPremium, loading: premiumLoading } = usePremium();
  const v3 = useDesignV3();

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleUpgradeClick = () => {
    if (isGuest || !user) {
      setShowGuestPrompt(true);
    } else {
      navigate('/dashboard/upgrade');
    }
  };

  const showUpgradeButton = !isPremium && !premiumLoading;

  // Design v3: the "Azyah" wordmark (the one serif), search, help and settings.
  // Dark mode isn't checked in v3 yet, so its toggle is left out.
  if (v3) {
    return (
      <section className="sticky z-50 bg-ground px-4 pb-2 pt-3" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between">
          <span className="font-wordmark text-[24px] font-medium leading-none text-ink">Azyah</span>
          <div className="flex items-center gap-2">
            {showUpgradeButton && (
              <button
                type="button"
                onClick={handleUpgradeClick}
                className="h-8 rounded-full bg-fill px-3 text-[13px] font-medium text-ink active:opacity-70"
              >
                Premium
              </button>
            )}
            {onOpenSearch && (
              <button type="button" aria-label="Search" onClick={onOpenSearch} className={V3_ICON_BUTTON}>
                <Search className="h-4 w-4" />
              </button>
            )}
            <FeedbackModal userType="shopper">
              <button type="button" aria-label="Help and feedback" className={V3_ICON_BUTTON}>
                <HelpCircle className="h-4 w-4" />
              </button>
            </FeedbackModal>
            <button type="button" aria-label="Settings" onClick={() => navigate('/settings')} className={V3_ICON_BUTTON}>
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
        <GuestActionPrompt open={showGuestPrompt} onOpenChange={setShowGuestPrompt} action="upgrade to Premium" />
      </section>
    );
  }

  return (
    <section 
      className="sticky z-50 bg-background border-b border-border px-4 py-3"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[hsl(var(--azyah-maroon))] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="font-serif font-medium text-foreground">Azyah</span>
        </div>

        {/* Center - Upgrade Button */}
        {showUpgradeButton && (
          <Button 
            onClick={handleUpgradeClick}
            variant="outline"
            size="sm"
            className="text-[10px] px-2.5 py-0.5 h-6 rounded-full border-[hsl(var(--azyah-border))] hover:bg-[hsl(var(--azyah-ivory))] ring-2 ring-[hsl(var(--azyah-maroon))]/30 shadow-[0_0_10px_hsl(var(--azyah-maroon)/0.2)] animate-pulse"
          >
            Upgrade to Premium
          </Button>
        )}

        {/* Right Icons */}
        <div className="flex items-center gap-1.5">
          {onOpenSearch && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={onOpenSearch}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
          <FeedbackModal userType="shopper">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </FeedbackModal>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleThemeToggle}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => navigate('/settings')}
          >
            {user?.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Profile" 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      <GuestActionPrompt 
        open={showGuestPrompt} 
        onOpenChange={setShowGuestPrompt}
        action="upgrade to Premium"
      />
    </section>
  );
};

export default DashboardHeader;
