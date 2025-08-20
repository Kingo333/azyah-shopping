import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Settings, LogOut, Sun, Moon, User, Info } from 'lucide-react';
import { FeedbackModal } from '@/components/FeedbackModal';
const DashboardHeader: React.FC = () => {
  const {
    user,
    signOut
  } = useAuth();
  const {
    theme,
    setTheme
  } = useTheme();
  const navigate = useNavigate();
  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  const handleSignOut = async () => {
    await signOut();
  };
  const getUserName = () => {
    return user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  };

  const getUserType = (): 'shopper' | 'brand' | 'retailer' => {
    // Determine user type based on current route or user metadata
    const path = window.location.pathname;
    if (path.includes('/brand') || path.includes('/brand-portal')) return 'brand';
    if (path.includes('/retailer') || path.includes('/retailer-portal')) return 'retailer';
    return 'shopper';
  };
  return <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <h1 className="font-cormorant text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Azyah
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Feedback Support Button */}
        <FeedbackModal userType={getUserType()}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10 hover:scale-105 transition-all">
            <Info className="h-4 w-4" />
          </Button>
        </FeedbackModal>

        {/* Theme Toggle */}
        <Button variant="ghost" size="sm" onClick={handleThemeToggle} className="hover:bg-primary/10 hover:scale-105 transition-all">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-3 hover:bg-primary/10 hover:scale-105 transition-all">
              <Avatar className="h-8 w-8 border-2 border-white/20">
                <AvatarFallback className="text-sm bg-gradient-to-br from-primary/10 to-accent/10">
                  {getUserName().charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium">
                {getUserName()}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-panel border-white/20">
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>;
};
export default DashboardHeader;