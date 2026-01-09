import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Link2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isGuestMode } from '@/hooks/useGuestMode';
import { GuestActionPrompt } from '@/components/GuestActionPrompt';

export function StyleLinkCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isGuest = isGuestMode();
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);

  // Fetch user profile from database (not auth metadata)
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile-stylelink', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('users')
        .select('username, name, avatar_url')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Sync profile from auth metadata (one-time if name/avatar missing)
  const syncProfileMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('sync_my_profile_from_auth');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile-stylelink', user?.id] });
    },
  });

  // Ensure username exists (collision-safe, server-side)
  const ensureUsernameMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('ensure_my_username');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile-stylelink', user?.id] });
    },
  });

  // On mount: sync profile and ensure username if needed
  useEffect(() => {
    if (userProfile && !profileLoading) {
      // Sync name/avatar if missing
      if (!userProfile.name || !userProfile.avatar_url) {
        syncProfileMutation.mutate();
      }
      // Ensure username if missing
      if (!userProfile.username) {
        ensureUsernameMutation.mutate();
      }
    }
  }, [userProfile, profileLoading]);

  // Effective handle: use database username or fallback to pending state
  const effectiveHandle = userProfile?.username || null;
  const displayName = userProfile?.name || user?.user_metadata?.name || 'Your Name';
  
  // Get initials for avatar fallback
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleViewMyPage = () => {
    if (effectiveHandle) {
      navigate(`/u/${effectiveHandle}`);
    } else {
      toast.error('Setting up your page... try again in a moment');
    }
  };

  const handleGuestClick = () => {
    setShowGuestPrompt(true);
  };

  // Guest mode: show a preview card that prompts sign up
  if (isGuest || !user) {
    return (
      <>
        <div 
          className="w-full rounded-xl border bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/5 via-background to-[hsl(var(--azyah-maroon))]/10 p-2.5 lg:p-4 cursor-pointer hover:border-[hsl(var(--azyah-maroon))]/30 transition-colors"
          onClick={handleGuestClick}
        >
          <div className="flex items-center gap-2.5 lg:gap-3 mb-2">
            <Avatar className="h-7 w-7 lg:h-9 lg:w-9 ring-1 ring-[hsl(var(--azyah-maroon))]/20 flex-shrink-0">
              <AvatarFallback className="bg-[hsl(var(--azyah-maroon))]/10 text-[hsl(var(--azyah-maroon))] text-[10px] lg:text-sm">
                <User className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs lg:text-base font-medium">Your Style Page</p>
              <p className="text-[10px] lg:text-xs text-muted-foreground">
                @yourhandle
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] lg:text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              <span>Affiliate links</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span>Earn rewards</span>
            </div>
          </div>
        </div>
        <GuestActionPrompt
          open={showGuestPrompt}
          onOpenChange={setShowGuestPrompt}
          action="create your style page with affiliate links"
        />
      </>
    );
  }

  const isSettingUp = profileLoading || ensureUsernameMutation.isPending || !effectiveHandle;

  return (
    <div className="w-full rounded-xl border bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/5 via-background to-[hsl(var(--azyah-maroon))]/10 p-2.5 lg:p-4 flex items-center gap-2.5 lg:gap-3">
      <Avatar className="h-7 w-7 lg:h-9 lg:w-9 ring-1 ring-[hsl(var(--azyah-maroon))]/20 flex-shrink-0">
        <AvatarImage src={userProfile?.avatar_url || undefined} />
        <AvatarFallback className="bg-[hsl(var(--azyah-maroon))]/10 text-[hsl(var(--azyah-maroon))] text-[10px] lg:text-sm">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-xs lg:text-base font-medium truncate">{displayName}</p>
        <p className="text-[10px] lg:text-xs text-muted-foreground truncate">
          {effectiveHandle ? `@${effectiveHandle}` : 'Setting up...'}
        </p>
      </div>
      <Button
        size="sm"
        className="h-7 lg:h-9 px-2.5 lg:px-3 text-[10px] lg:text-xs bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 flex-shrink-0"
        onClick={handleViewMyPage}
        disabled={isSettingUp}
      >
        <User className="h-3 w-3 lg:h-3.5 lg:w-3.5 mr-1 lg:mr-1.5" />
        View
      </Button>
    </div>
  );
}
