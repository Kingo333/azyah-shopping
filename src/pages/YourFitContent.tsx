import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SmartImage } from '@/components/SmartImage';
import { Ruler, Users, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AddYourFitModal } from '@/components/profile/AddYourFitModal';

interface UserMeasurements {
  height?: number;
  weight?: number;
  top_size?: string;
  bottom_size?: string;
  dress_size?: string;
}

interface FitMatch {
  id: string;
  title: string | null;
  render_path: string | null;
  image_preview: string | null;
  created_at: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar_url: string | null;
  };
  matchScore: 'close' | 'similar';
}

const HEIGHT_TOLERANCE = 5; // ±5cm for similar height

export const YourFitContent: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAddFitModal, setShowAddFitModal] = React.useState(false);

  // Fetch current user's measurements
  const { data: userMeasurements, refetch: refetchMeasurements } = useQuery({
    queryKey: ['user-measurements', user?.id],
    queryFn: async (): Promise<UserMeasurements | null> => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single();
      
      const prefs = data?.preferences as Record<string, unknown> | null;
      return (prefs?.measurements as UserMeasurements) || null;
    },
    enabled: !!user?.id,
  });

  // Fetch matching looks
  const { data: matchingLooks, isLoading } = useQuery({
    queryKey: ['your-fit-looks', user?.id, userMeasurements?.height],
    queryFn: async (): Promise<FitMatch[]> => {
      if (!user?.id || !userMeasurements?.height) return [];

      const userHeight = userMeasurements.height;
      const minHeight = userHeight - HEIGHT_TOLERANCE;
      const maxHeight = userHeight + HEIGHT_TOLERANCE;

      // Get all users with similar height
      const { data: usersWithFit, error: usersError } = await supabase
        .from('users')
        .select('id, username, name, avatar_url, preferences')
        .neq('id', user.id);

      if (usersError || !usersWithFit) return [];

      // Filter users by height
      const matchingUserIds: string[] = [];
      const userInfoMap: Record<string, { id: string; username: string | null; name: string | null; avatar_url: string | null }> = {};

      usersWithFit.forEach((u) => {
        const prefs = u.preferences as Record<string, unknown> | null;
        const measurements = prefs?.measurements as UserMeasurements | undefined;
        if (measurements?.height && measurements.height >= minHeight && measurements.height <= maxHeight) {
          matchingUserIds.push(u.id);
          userInfoMap[u.id] = {
            id: u.id,
            username: u.username,
            name: u.name,
            avatar_url: u.avatar_url,
          };
        }
      });

      if (matchingUserIds.length === 0) return [];

      // Get fits from matching users
      const { data: fits, error: fitsError } = await supabase
        .from('fits')
        .select('id, title, render_path, image_preview, created_at, user_id')
        .in('user_id', matchingUserIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fitsError || !fits) return [];

      return fits.map((fit) => ({
        id: fit.id,
        title: fit.title,
        render_path: fit.render_path,
        image_preview: fit.image_preview,
        created_at: fit.created_at,
        user: userInfoMap[fit.user_id] || { id: fit.user_id, username: null, name: null, avatar_url: null },
        matchScore: 'similar' as const,
      }));
    },
    enabled: !!user?.id && !!userMeasurements?.height,
  });

  const hasMeasurements = !!userMeasurements?.height;
  const hasEnoughMatches = (matchingLooks?.length || 0) >= 10;

  const handleAddFitComplete = () => {
    setShowAddFitModal(false);
    refetchMeasurements();
  };

  // No measurements yet
  if (!hasMeasurements) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Ruler className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Add your fit to get started</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-xs">
          Share your measurements to discover looks from people with a similar fit.
        </p>
        <Button onClick={() => setShowAddFitModal(true)}>
          <Ruler className="h-4 w-4 mr-2" />
          Add Your Fit
        </Button>

        <AddYourFitModal
          open={showAddFitModal}
          onOpenChange={setShowAddFitModal}
          onComplete={handleAddFitComplete}
        />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Users className="h-4 w-4" />
          <span>Finding looks from people with similar fit...</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Not enough matches
  if (!hasEnoughMatches) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Not enough matches yet</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Invite friends or keep browsing to help us learn. We'll show you looks from people with similar measurements once more users join.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>Looks from people with similar measurements</span>
      </div>

      {/* Grid of matching looks */}
      <div className="grid grid-cols-2 gap-3">
        {matchingLooks?.map((look) => (
          <Card
            key={look.id}
            className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/explore/outfit/${look.id}`)}
          >
            <div className="aspect-[3/4] relative">
              <SmartImage
                src={look.render_path || look.image_preview || ''}
                alt={look.title || 'Outfit'}
                className="w-full h-full object-cover"
              />
              
              {/* Similar fit badge */}
              <Badge
                variant="secondary"
                className="absolute top-2 left-2 text-[10px] bg-background/80 backdrop-blur-sm"
              >
                Similar fit
              </Badge>
            </div>
            <CardContent className="p-2">
              <p className="text-xs text-muted-foreground truncate">
                {look.user.name || look.user.username || 'Anonymous'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default YourFitContent;
