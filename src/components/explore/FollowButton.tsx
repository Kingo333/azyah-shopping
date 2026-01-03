import React from 'react';
import { Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  isFollowing: boolean;
  onToggle: () => void;
  isLoading?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  isFollowing,
  onToggle,
  isLoading = false,
  size = 'sm',
  className,
}) => {
  if (isFollowing) {
    return null; // Hide button when already following per spec
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      disabled={isLoading}
      className={cn(
        'rounded-full opacity-70 hover:opacity-100 transition-opacity',
        size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
        className
      )}
    >
      <Plus className={cn(size === 'sm' ? 'h-4 w-4' : 'h-5 w-5')} />
    </Button>
  );
};

export default FollowButton;
