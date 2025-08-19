import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Settings, LogOut, Sun, Moon, User, Plus, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  bio: string | null;
  website: string | null;
}

interface BrandPortalHeaderProps {
  brand: Brand | null;
  onAddProduct?: () => void;
  onImportFromWebsite?: () => void;
  className?: string;
}

export const BrandPortalHeader: React.FC<BrandPortalHeaderProps> = ({
  brand,
  onAddProduct,
  onImportFromWebsite,
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
    <div className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4", className)}>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-xl overflow-hidden">
            {brand?.logo_url ? 
              <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" /> : 
              <div className="w-full h-full flex items-center justify-center text-muted-foreground font-playfair">
                {brand?.name.charAt(0).toUpperCase() || 'B'}
              </div>
            }
          </div>
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <h1 className="text-lg sm:text-2xl font-bold font-playfair">{brand?.name || 'Brand Portal'}</h1>
              <Badge variant="secondary" className="text-xs rounded-full w-fit">Verified</Badge>
            </div>
            <p className="text-muted-foreground text-sm">{brand?.bio || 'Brand description'}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        {/* Theme Toggle */}
        <Button variant="ghost" size="sm" onClick={handleThemeToggle} className="hover:bg-primary/10 hover:scale-105 transition-all">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {onImportFromWebsite && (
          <Button 
            variant="outline"
            className="rounded-xl flex-1 sm:flex-none"
            onClick={onImportFromWebsite}
          >
            <Globe className="h-4 w-4 mr-2" />
            Import from Website
          </Button>
        )}

        {onAddProduct && (
          <Button 
            className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 flex-1 sm:flex-none"
            onClick={onAddProduct}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        )}

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