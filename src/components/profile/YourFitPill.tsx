import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserTasteProfile } from '@/hooks/useUserTasteProfile';

interface YourFitPillProps {
  height?: string | null;
}

export const YourFitPill: React.FC<YourFitPillProps> = ({ height }) => {
  const navigate = useNavigate();
  const { tasteProfile } = useUserTasteProfile();
  const confidence = Math.round((tasteProfile?.preference_confidence || 0) * 100);

  return (
    <div className="px-4 pt-2">
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 flex-shrink-0">
          <Ruler className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">
            {height ? `${height}` : 'Your Fit'}
            {confidence > 0 && (
              <span className="text-muted-foreground ml-1.5">· {confidence}% match</span>
            )}
          </p>
          <p className="text-[10px] text-muted-foreground">Style profile & measurements</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full text-[10px] h-7 px-3"
          onClick={() => navigate('/explore?tab=your-fit')}
        >
          {confidence > 50 ? 'Update' : 'Complete'}
        </Button>
      </div>
    </div>
  );
};
