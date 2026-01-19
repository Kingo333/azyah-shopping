import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isGuestMode } from '@/hooks/useGuestMode';
import { GuestActionPrompt } from '@/components/GuestActionPrompt';

export function StyleLinkCardCompact() {
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
          className="flex items-center gap-2 w-full cursor-pointer"
          onClick={handleGuestClick}
        >
          <Avatar className="h-7 w-7 flex-shrink-0 ring-1 ring-[hsl(var(--azyah-maroon))]/20">
            <AvatarFallback className="bg-[hsl(var(--azyah-maroon))]/10 text-[hsl(var(--azyah-maroon))] text-[10px]">
              <User className="h-3.5 w-3.5" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium truncate">Your Style Page</p>
            <p className="text-[9px] text-muted-foreground truncate">@yourhandle</p>
          </div>
          <Button
            size="sm"
            className="h-6 px-2 text-[9px] bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 flex-shrink-0"
          >
            View
          </Button>
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
    <div className="flex items-center gap-2 w-full">
      <Avatar className="h-7 w-7 flex-shrink-0 ring-1 ring-[hsl(var(--azyah-maroon))]/20">
        <AvatarImage src={userProfile?.avatar_url || undefined} />
        <AvatarFallback className="bg-[hsl(var(--azyah-maroon))]/10 text-[hsl(var(--azyah-maroon))] text-[10px]">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium truncate">{displayName}</p>
        <p className="text-[9px] text-muted-foreground truncate">
          {effectiveHandle ? `@${effectiveHandle}` : 'Setting up...'}
        </p>
      </div>
      <Button
        size="sm"
        className="h-6 px-2 text-[9px] bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 flex-shrink-0"
        onClick={handleViewMyPage}
        disabled={isSettingUp}
      >
        View
      </Button>
    </div>
  );
}
