import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Settings, LogOut, Sun, Moon, User, Plus } from 'lucide-react';
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
  onAddProduct?: () => void;
  className?: string;
}

export const RetailerPortalHeader: React.FC<RetailerPortalHeaderProps> = ({
  retailer,
  onAddProduct,
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
    <div className={cn("flex items-center justify-between mb-8 p-4 rounded-lg bg-card border border-border", className)}>
      <div className="flex items-center gap-4">
        <div className="text-foreground">
          <h1 className="text-3xl font-bold">Retailer Portal</h1>
          <p className="text-muted-foreground mt-1 dark:text-muted-foreground/80">
            {retailer?.name || 'Your Store'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <Button variant="ghost" size="sm" onClick={handleThemeToggle} className="hover:bg-accent/50 dark:hover:bg-accent/20 hover:scale-105 transition-all">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {onAddProduct && (
          <Button onClick={onAddProduct} className="gap-2 bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/80">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-3 hover:bg-accent/50 dark:hover:bg-accent/20 hover:scale-105 transition-all">
              <Avatar className="h-8 w-8 border-2 border-border dark:border-border/50">
                <AvatarFallback className="text-sm bg-gradient-to-br from-primary/20 to-accent/20 dark:from-primary/30 dark:to-accent/30">
                  {getUserName().charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium">
                {getUserName()}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-50 w-56 bg-background border border-border shadow-lg">
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};