import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Palette } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface StyleableUser {
  id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  public_item_count: number;
}

export const StyleableUsersGrid = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: styleableUsers, isLoading } = useQuery({
    queryKey: ['styleable-users'],
    queryFn: async () => {
      // Get users who have public wardrobe items
      const { data: publicItems, error: itemsError } = await supabase
        .from('wardrobe_items')
        .select('user_id')
        .eq('public_reuse_permitted', true);

      if (itemsError) throw itemsError;

      // Count items per user
      const userCounts: Record<string, number> = {};
      publicItems?.forEach(item => {
        userCounts[item.user_id] = (userCounts[item.user_id] || 0) + 1;
      });

      const userIds = Object.keys(userCounts).filter(id => id !== user?.id);
      if (userIds.length === 0) return [];

      // Fetch user profiles
      const { data: users, error: usersError } = await supabase
        .from('users_public')
        .select('id, username, name, avatar_url')
        .in('id', userIds);

      if (usersError) throw usersError;

      return (users || []).map(u => ({
        ...u,
        public_item_count: userCounts[u.id] || 0,
      })).sort((a, b) => b.public_item_count - a.public_item_count) as StyleableUser[];
    },
    enabled: !!user,
  });

  const handleStyleClick = (userId: string) => {
    navigate(`/dress-me/canvas?mode=suggest&targetId=${userId}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="w-16 h-16 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!styleableUsers || styleableUsers.length === 0) {
    return (
      <div className="community-empty-state">
        <span className="text-5xl mb-3">🎨</span>
        <p className="text-lg font-medium">No styleable users yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Users with public wardrobe items will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {styleableUsers.map((styleableUser) => {
        const displayName = styleableUser.username || styleableUser.name || 'Anonymous';
        
        return (
          <Card 
            key={styleableUser.id} 
            className="p-4 hover:shadow-lg transition-all"
          >
            <div className="flex flex-col items-center gap-3">
              <Avatar className="w-16 h-16">
                <AvatarImage src={styleableUser.avatar_url || undefined} />
                <AvatarFallback className="text-xl">
                  {displayName[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center">
                <p className="font-medium text-sm line-clamp-1">@{displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {styleableUser.public_item_count} public item{styleableUser.public_item_count !== 1 ? 's' : ''}
                </p>
              </div>
              
              <Button
                size="sm"
                className="w-full"
                onClick={() => handleStyleClick(styleableUser.id)}
              >
                <Palette className="w-4 h-4 mr-1.5" />
                Style
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
