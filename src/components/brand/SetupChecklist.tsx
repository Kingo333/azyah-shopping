import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, Circle, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface SetupChecklistProps {
  brandType: 'fashion_brand' | 'agency' | 'studio' | 'salon';
  items: ChecklistItem[];
  onDismiss?: () => void;
  className?: string;
}

export const SetupChecklist: React.FC<SetupChecklistProps> = ({
  brandType,
  items,
  onDismiss,
  className
}) => {
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isComplete = completedCount === totalCount;

  // Get title based on brand type
  const getTitle = () => {
    switch (brandType) {
      case 'salon':
        return 'Set up your Salon';
      case 'agency':
      case 'studio':
        return 'Set up your Agency';
      case 'fashion_brand':
      default:
        return 'Complete your Brand Profile';
    }
  };

  // Don't show if all items are complete
  if (isComplete) {
    return null;
  }

  return (
    <Card className={cn('border-primary/20 bg-primary/5', className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm">{getTitle()}</h3>
              <span className="text-xs text-muted-foreground">
                {completedCount}/{totalCount} complete
              </span>
            </div>
            <Progress value={progressPercent} className="h-1.5 mb-3" />
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center justify-between gap-2 text-sm',
                    item.completed ? 'text-muted-foreground' : 'text-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {item.completed ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={cn(item.completed && 'line-through')}>
                      {item.label}
                    </span>
                  </div>
                  {!item.completed && item.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-primary hover:text-primary"
                      onClick={item.action}
                    >
                      {item.actionLabel || 'Add'}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
