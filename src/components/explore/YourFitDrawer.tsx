import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ruler, ChevronRight, ChevronUp, ChevronDown, LogIn, Sparkles } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SmartImage } from '@/components/SmartImage';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { isGuestMode } from '@/hooks/useGuestMode';
import { AddYourFitModal } from '@/components/profile/AddYourFitModal';

interface YourFitDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserMeasurements {
  height?: number;
  weight?: number;
  top_size?: string;
  bottom_size?: string;
  dress_size?: string;
}

interface FitMatch {
  id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  matchScore: 'close' | 'similar';
  fits: {
    id: string;
    title: string | null;
    image_preview: string | null;
    render_path: string | null;
  }[];
}

const HEIGHT_TOLERANCE = 5; // ±5cm for matching

export function YourFitDrawer({ open, onOpenChange }: YourFitDrawerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);

  const isGuest = !user || isGuestMode();

  // Fetch current user's measurements
  const { data: userMeasurements, isLoading: measurementsLoading, refetch: refetchMeasurements } = useQuery({
    queryKey: ['user-measurements', user?.id],
    queryFn: async (): Promise<UserMeasurements | null> => {
      if (!user?.id) return null;
      
      const { data } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single();
      
      if (!data?.preferences) return null;
      const prefs = data.preferences as Record<string, unknown>;
      return (prefs.measurements as UserMeasurements) || null;
    },
    enabled: !!user?.id && open,
  });

  // Auto-open measurements modal if user has no measurements and drawer opens
  useEffect(() => {
    if (open && !isGuest && !measurementsLoading && !userMeasurements?.height) {
      setShowMeasurementsModal(true);
    }
  }, [open, isGuest, measurementsLoading, userMeasurements]);

  // Fetch matching users based on measurements
  const { data: matchingUsers = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['your-fit-matches', user?.id, userMeasurements?.height],
    queryFn: async (): Promise<FitMatch[]> => {
      if (!user?.id || !userMeasurements?.height) return [];
      
      const userHeight = userMeasurements.height;
      
      // Get users with similar height (we need to query all and filter in JS)
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, preferences')
        .neq('id', user.id);
      
      if (!allUsers) return [];
      
      // Filter users by height matching
      const matchingUserIds: { id: string; matchScore: 'close' | 'similar' }[] = [];
      
      allUsers.forEach((u) => {
        if (!u.preferences || typeof u.preferences !== 'object') return;
        const prefs = u.preferences as Record<string, unknown>;
        const measurements = prefs.measurements as UserMeasurements | undefined;
        if (!measurements?.height) return;
        
        const heightDiff = Math.abs(measurements.height - userHeight);
        
        if (heightDiff <= 2) {
          matchingUserIds.push({ id: u.id, matchScore: 'close' });
        } else if (heightDiff <= HEIGHT_TOLERANCE) {
          matchingUserIds.push({ id: u.id, matchScore: 'similar' });
        }
      });
      
      if (matchingUserIds.length === 0) return [];
      
      // Get public profiles for matching users
      const { data: profiles } = await supabase
        .from('users_public')
        .select('id, name, username, avatar_url')
        .in('id', matchingUserIds.map(u => u.id));
      
      if (!profiles) return [];
      
      // Get public fits for matching users
      const { data: fits } = await supabase
        .from('fits')
        .select('id, user_id, title, image_preview, render_path')
        .in('user_id', matchingUserIds.map(u => u.id))
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      
      // Combine data
      return profiles.map((profile) => {
        const matchInfo = matchingUserIds.find(u => u.id === profile.id);
        const userFits = (fits || []).filter(f => f.user_id === profile.id).slice(0, 5);
        
        return {
          id: profile.id,
          name: profile.name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          matchScore: matchInfo?.matchScore || 'similar',
          fits: userFits.map(f => ({
            id: f.id,
            title: f.title,
            image_preview: f.image_preview,
            render_path: f.render_path,
          })),
        };
      }).filter(u => u.fits.length > 0); // Only show users with public fits
    },
    enabled: !!user?.id && !!userMeasurements?.height && open,
  });

  const handleUserClick = (userId: string) => {
    onOpenChange(false);
    navigate(`/profile/${userId}`);
  };

  const handleFitClick = (fitId: string) => {
    onOpenChange(false);
    navigate(`/explore/outfit/${fitId}`);
  };

  const handleSignUp = () => {
    onOpenChange(false);
    navigate('/onboarding/signup');
  };

  const handleMeasurementsComplete = () => {
    setShowMeasurementsModal(false);
    refetchMeasurements();
  };

  const isLoading = measurementsLoading || matchesLoading;

  // Guest state - show sign up prompt
  if (isGuest) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-t border-white/20 shadow-2xl max-h-[55vh]">
          <DrawerHeader className="pb-3 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-500/10">
                <Ruler className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <DrawerTitle className="text-xl font-semibold tracking-tight">Your Fit</DrawerTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Find outfits from people your size</p>
              </div>
            </div>
          </DrawerHeader>

          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
              <LogIn className="w-8 h-8 text-violet-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">Log in to match outfits to your measurements</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Create an account and add your measurements to see outfits from people with a similar body type.
            </p>
            <Button onClick={handleSignUp} className="gap-2">
              <LogIn className="w-4 h-4" />
              Sign Up / Log In
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent 
          className={cn(
            "bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-t border-white/20 shadow-2xl transition-all duration-300 ease-out",
            isExpanded ? "h-[95vh]" : "max-h-[55vh]"
          )}
        >
          <DrawerHeader className="pb-3 relative border-b border-border/30">
            {/* Expand/Collapse Button */}
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="absolute top-3 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all"
              aria-label={isExpanded ? "Minimize drawer" : "View all"}
            >
              <span className="text-xs font-medium text-muted-foreground">
                {isExpanded ? 'Minimize' : 'View All'}
              </span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            <div className="flex items-center gap-3 pr-24">
              <div className="p-2 rounded-xl bg-violet-500/10">
                <Ruler className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <DrawerTitle className="text-xl font-semibold tracking-tight">Your Fit</DrawerTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {userMeasurements?.height 
                    ? `${matchingUsers.length} people with similar measurements` 
                    : 'Add measurements to find matches'
                  }
                </p>
              </div>
            </div>

            {/* Current measurements summary */}
            {userMeasurements?.height && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  Height: {userMeasurements.height}cm
                </Badge>
                {userMeasurements.top_size && (
                  <Badge variant="secondary" className="text-xs">
                    Top: {userMeasurements.top_size}
                  </Badge>
                )}
                {userMeasurements.bottom_size && (
                  <Badge variant="secondary" className="text-xs">
                    Bottom: {userMeasurements.bottom_size}
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs h-6 px-2"
                  onClick={() => setShowMeasurementsModal(true)}
                >
                  Edit
                </Button>
              </div>
            )}
          </DrawerHeader>

          <ScrollArea className="flex-1 px-4 pb-4">
            {isLoading ? (
              <div className="grid grid-cols-3 gap-3 py-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
              </div>
            ) : !userMeasurements?.height ? (
              // No measurements state
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
                  <Ruler className="w-8 h-8 text-violet-500" />
                </div>
                <h3 className="text-lg font-medium mb-2">Add your measurements</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  We'll show you outfits from people with similar body measurements.
                </p>
                <Button onClick={() => setShowMeasurementsModal(true)} className="gap-2">
                  <Ruler className="w-4 h-4" />
                  Add Measurements
                </Button>
              </div>
            ) : matchingUsers.length === 0 ? (
              // No matches state
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No matches yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                  We couldn't find anyone with similar measurements who has shared public outfits. Check back soon!
                </p>
              </div>
            ) : (
              // Matches list
              <div className="space-y-4 py-4">
                {matchingUsers.map((person) => (
                  <div key={person.id} className="space-y-2">
                    {/* Person Header */}
                    <button 
                      onClick={() => handleUserClick(person.id)} 
                      className="flex items-center gap-3 w-full text-left hover:bg-accent/30 rounded-lg p-2 transition-colors"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={person.avatar_url || undefined} alt={person.name || person.username || 'User'} />
                        <AvatarFallback className="bg-violet-500/10 text-violet-500 text-sm">
                          {(person.name || person.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {person.name || person.username || 'Anonymous'}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] py-0",
                              person.matchScore === 'close' 
                                ? "border-green-500 text-green-600" 
                                : "border-violet-500 text-violet-600"
                            )}
                          >
                            {person.matchScore === 'close' ? 'Close match' : 'Similar'}
                          </Badge>
                        </div>
                        {person.username && person.name && (
                          <span className="text-xs text-muted-foreground">@{person.username}</span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                    
                    {/* Person's Public Fits */}
                    {person.fits.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 ml-12">
                        {person.fits.slice(0, 3).map((fit) => (
                          <Card 
                            key={fit.id} 
                            className="overflow-hidden cursor-pointer hover:shadow-md transition-all bg-card/80 border-border/50"
                            onClick={() => handleFitClick(fit.id)}
                          >
                            <div className="aspect-[3/4] relative overflow-hidden bg-muted">
                              <SmartImage 
                                src={fit.render_path || fit.image_preview || '/placeholder.svg'} 
                                alt={fit.title || 'Outfit'} 
                                className="w-full h-full object-cover"
                                sizes="80px"
                              />
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      {/* Measurements Modal */}
      <AddYourFitModal
        open={showMeasurementsModal}
        onOpenChange={setShowMeasurementsModal}
        onComplete={handleMeasurementsComplete}
      />
    </>
  );
}

export default YourFitDrawer;
