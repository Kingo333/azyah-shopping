import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sun, Moon, User, HelpCircle, Search } from 'lucide-react';
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
