import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getRedirectRoute } from '@/lib/rbac';
import type { UserRole } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Label } from '@/components/ui/label';
import { ShoppingBag, Star, Building2, Loader2 } from 'lucide-react';

const ROLES = ['shopper', 'brand', 'retailer'] as const; // Admin role excluded from user selection

const SelectRole = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedRole, setSelectedRole] = useState<UserRole>('shopper');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelection = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/onboarding/signup', { replace: true });
        return;
      }

      // Only update the user metadata - the database trigger will handle the rest
      await supabase.auth.updateUser({ 
        data: { role: selectedRole } 
      });

      // Navigate to the appropriate dashboard
      const redirectPath = getRedirectRoute(selectedRole);
      navigate(redirectPath, { replace: true });
    } catch (error: any) {
      console.error('Role selection error:', error);
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'shopper': return ShoppingBag;
      case 'brand': return Star;
      case 'retailer': return Building2;
      default: return ShoppingBag;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'shopper': return 'Fashion Lover';
      case 'brand': return 'Brand Owner';
      case 'retailer': return 'Retailer';
      default: return 'Fashion Lover';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'shopper': return 'Shop & discover';
      case 'brand': return 'Sell products';
      case 'retailer': return 'Multi-brand';
      default: return 'Shop & discover';
    }
  };

  return (
    <div className="min-h-screen dashboard-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-lg opacity-30 animate-pulse"></div>
              <div className="relative glass-premium rounded-full p-6 shadow-lg">
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-cormorant font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Azyah
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">
              Select your role to continue
            </p>
          </div>
        </div>

        <GlassPanel variant="premium" className="p-8">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-cormorant font-semibold">Choose Your Role</h2>
              <p className="text-muted-foreground mt-2">
                This will determine your experience on Azyah
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {ROLES.map((role) => {
                const Icon = getRoleIcon(role);
                return (
                  <GlassPanel
                    key={role}
                    variant={selectedRole === role ? "premium" : "default"}
                    className={`p-4 cursor-pointer transition-all duration-200 ${
                      selectedRole === role
                        ? "border-primary/60 shadow-md scale-[1.02]"
                        : "hover:scale-[1.01] hover:border-primary/40"
                    }`}
                    onClick={() => setSelectedRole(role as UserRole)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${
                        selectedRole === role 
                          ? "bg-gradient-to-br from-primary/30 to-primary/20" 
                          : "bg-muted/50"
                      }`}>
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-base">{getRoleLabel(role)}</h3>
                        <p className="text-sm text-muted-foreground">{getRoleDescription(role)}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 ${
                        selectedRole === role 
                          ? "border-primary bg-primary" 
                          : "border-muted-foreground"
                      }`}>
                        {selectedRole === role && (
                          <div className="w-3 h-3 rounded-full bg-white m-0.5"></div>
                        )}
                      </div>
                    </div>
                  </GlassPanel>
                );
              })}
            </div>

            <Button 
              onClick={handleRoleSelection}
              variant="premium"
              size="lg"
              className="w-full h-12"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up your account...
                </>
              ) : (
                `Continue as ${getRoleLabel(selectedRole)}`
              )}
            </Button>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default SelectRole;