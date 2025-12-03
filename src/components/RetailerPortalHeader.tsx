import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { LogOut, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Retailer {
  id: string;
  name: string;
  logo_url: string | null;
  bio: string | null;
  website: string | null;
}

interface RetailerPortalHeaderProps {
  retailer: Retailer | null;
  className?: string;
}

export const RetailerPortalHeader: React.FC<RetailerPortalHeaderProps> = ({
  retailer,
  className
}) => {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
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

  return (
    <div className={cn("flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-8 p-3 md:p-4 rounded-lg bg-card border border-border gap-3 md:gap-0", className)}>
      <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
        <div className="text-foreground min-w-0">
          <h1 className="text-lg md:text-3xl font-bold truncate">
            <span className="hidden md:inline">Retailer Portal</span>
            <span className="md:hidden">{retailer?.name || 'Your Store'}</span>
          </h1>
          <p className="text-xs md:text-base text-muted-foreground mt-0.5 md:mt-1 dark:text-muted-foreground/80 truncate">
            <span className="hidden md:inline">{retailer?.name || 'Your Store'}</span>
            <span className="md:hidden">Retailer Portal</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-end">
        {/* Theme Toggle */}
        <Button variant="ghost" size="sm" onClick={handleThemeToggle} className="hover:bg-accent/50 dark:hover:bg-accent/20 hover:scale-105 transition-all h-8 w-8 md:h-10 md:w-10">
          {theme === 'dark' ? <Sun className="h-4 w-4 md:h-5 md:w-5" /> : <Moon className="h-4 w-4 md:h-5 md:w-5" />}
        </Button>

        {/* User Info & Sign Out */}
        <div className="flex items-center gap-1 md:gap-2">
          <Avatar className="h-6 w-6 md:h-8 md:w-8 border-2 border-border dark:border-border/50 flex-shrink-0">
            <AvatarFallback className="text-xs md:text-sm bg-gradient-to-br from-primary/20 to-accent/20 dark:from-primary/30 dark:to-accent/30">
              {getUserName().charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs md:text-sm font-medium truncate max-w-20 md:max-w-none">
            {getUserName()}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            className="h-8 w-8 md:h-10 md:w-10 p-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};