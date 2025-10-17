import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIsLiked, useToggleLike } from '@/hooks/useLikeFit';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  fitId: string;
  likeCount: number;
  showCount?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export const LikeButton = ({ fitId, likeCount, showCount = true, size = 'default' }: LikeButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: isLiked } = useIsLiked(fitId);
  const { mutate: toggleLike, isPending } = useToggleLike(fitId);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      navigate('/onboarding/signup');
      return;
    }

    toggleLike();
  };

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleLike}
      disabled={isPending}
      className={cn(
        "gap-2",
        isLiked && "text-red-500 hover:text-red-600"
      )}
    >
      <Heart
        size={iconSize}
        className={cn(
          "transition-all",
          isLiked && "fill-current"
        )}
      />
      {showCount && <span>{likeCount}</span>}
    </Button>
  );
};
