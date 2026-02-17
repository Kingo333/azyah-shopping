import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PenLine, Plus } from 'lucide-react';

interface ProfileSummaryCardProps {
  userProfile: {
    name: string;
    avatar_url?: string;
    username?: string;
  } | null;
  postsCount: number;
  brandsCount: number;
  onNewPost?: () => void;
}

export const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({
  userProfile,
  postsCount,
  brandsCount,
  onNewPost,
}) => {
  const navigate = useNavigate();
  const displayName = userProfile?.name || 'Your Name';
  const username = userProfile?.username;

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="flex flex-col items-center pt-3 pb-2 px-4">
      <Avatar className="h-16 w-16 ring-2 ring-border shadow-sm">
        <AvatarImage src={userProfile?.avatar_url} alt={displayName} />
        <AvatarFallback className="text-lg font-semibold bg-muted text-muted-foreground">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      <h1 className="mt-2 text-lg font-semibold text-foreground">{displayName}</h1>
      {username && (
        <p className="text-sm text-muted-foreground">@{username}</p>
      )}

      <div className="flex items-center gap-6 mt-2">
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{postsCount}</p>
          <p className="text-xs text-muted-foreground">Posts</p>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{brandsCount}</p>
          <p className="text-xs text-muted-foreground">Brands</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full text-xs h-8 px-4"
          onClick={() => navigate('/settings')}
        >
          <PenLine className="h-3.5 w-3.5 mr-1.5" />
          Edit Profile
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full text-xs h-8 px-4"
          onClick={onNewPost}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Post
        </Button>
      </div>
    </div>
  );
};
