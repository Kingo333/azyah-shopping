import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CommentButtonProps {
  commentCount: number;
  onClick: (e: React.MouseEvent) => void;
  showCount?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

export const CommentButton = ({ commentCount, onClick, showCount = true, size = 'default' }: CommentButtonProps) => {
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={onClick}
      className="gap-2"
    >
      <MessageCircle size={iconSize} />
      {showCount && <span>{commentCount}</span>}
    </Button>
  );
};
