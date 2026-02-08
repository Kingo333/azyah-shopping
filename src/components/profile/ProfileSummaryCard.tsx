import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Settings, PenLine } from 'lucide-react';

interface ProfileSummaryCardProps {
  userProfile: {
    name: string;
    avatar_url?: string;
    username?: string;
  } | null;
  postsCount: number;
  brandsCount: number;
}

export const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({
  userProfile,
  postsCount,
  brandsCount,
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
    <div className="flex flex-col items-center pt-6 pb-4 px-4">
      {/* Avatar */}
      <Avatar className="h-20 w-20 ring-2 ring-border shadow-sm">
        <AvatarImage src={userProfile?.avatar_url} alt={displayName} />
        <AvatarFallback className="text-lg font-semibold bg-muted text-muted-foreground">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      {/* Name + Username */}
      <h1 className="mt-3 text-lg font-semibold text-foreground">{displayName}</h1>
      {username && (
        <p className="text-sm text-muted-foreground">@{username}</p>
      )}

      {/* Counters */}
      <div className="flex items-center gap-6 mt-3">
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

      {/* Quick Actions */}
      <div className="flex items-center gap-2 mt-4">
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
          onClick={() => navigate('/settings')}
        >
          <Settings className="h-3.5 w-3.5 mr-1.5" />
          Settings
        </Button>
      </div>
    </div>
  );
};
