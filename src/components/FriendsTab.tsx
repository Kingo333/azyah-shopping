import React, { useState } from 'react';
import { useFriends } from '@/hooks/useFriends';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Users, Package, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FriendProfileModal } from './FriendProfileModal';
import { AddFriendModal } from './AddFriendModal';

export const FriendsTab: React.FC = () => {
  const navigate = useNavigate();
  const { data: friends = [], isLoading } = useFriends();
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);

  const handleCreateOutfit = (friendId: string) => {
    navigate(`/dress-me/canvas?mode=friend&friendId=${friendId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-9 w-32" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Users className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Add friends to style with their public items and create outfits for them
        </p>
        <Button onClick={() => setIsAddFriendOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Friend
        </Button>
        <AddFriendModal open={isAddFriendOpen} onOpenChange={setIsAddFriendOpen} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Friends</h2>
          <p className="text-sm text-muted-foreground">{friends.length} friend{friends.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setIsAddFriendOpen(true)} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Friend
        </Button>
      </div>

      <div className="grid gap-4">
        {friends.map((friend) => (
          <Card key={friend.id} className="p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={friend.avatar_url || undefined} />
                <AvatarFallback>{friend.username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h3 className="font-semibold">@{friend.username}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {friend.public_items_count || 0} public item{friend.public_items_count !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFriendId(friend.id)}
                >
                  View Profile
                </Button>
                {(!friend.public_items_count || friend.public_items_count === 0) ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            size="sm"
                            disabled
                          >
                            Create Outfit
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>@{friend.username} has no public items yet</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleCreateOutfit(friend.id)}
                  >
                    Create Outfit
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <FriendProfileModal
        friendId={selectedFriendId}
        open={!!selectedFriendId}
        onOpenChange={(open) => !open && setSelectedFriendId(null)}
      />

      <AddFriendModal open={isAddFriendOpen} onOpenChange={setIsAddFriendOpen} />
    </div>
  );
};
