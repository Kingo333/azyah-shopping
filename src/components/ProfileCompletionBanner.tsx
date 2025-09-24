import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X, User, ArrowRight } from 'lucide-react';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useAuth } from '@/contexts/AuthContext';

export function ProfileCompletionBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { percentage, missingFields, isComplete, isLoading } = useProfileCompletion();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if banner was dismissed recently
  useEffect(() => {
    const dismissedData = localStorage.getItem('profile-completion-dismissed');
    if (dismissedData) {
      const { timestamp } = JSON.parse(dismissedData);
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      if (timestamp > twentyFourHoursAgo) {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('profile-completion-dismissed', JSON.stringify({
      timestamp: Date.now()
    }));
  };

  const handleCompleteProfile = () => {
    const userRole = user?.user_metadata?.role;
    
    if (userRole === 'brand') {
      // Navigate to brand portal settings tab
      navigate('/brand-portal?tab=settings');
    } else if (userRole === 'retailer') {
      // Navigate to retailer portal settings tab
      navigate('/retailer-portal?tab=settings');
    } else {
      // Default to general settings for shoppers
      navigate('/settings');
    }
  };

  // Don't show if loading, complete, or dismissed
  if (isLoading || isComplete || isDismissed) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-accent/5 mb-6">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Complete Your Profile ({percentage}%)
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <Progress value={percentage} className="mb-3 h-2" />
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Missing: {missingFields.slice(0, 2).join(', ')}
                  {missingFields.length > 2 && ` +${missingFields.length - 2} more`}
                </div>
                
                <Button
                  size="sm"
                  onClick={handleCompleteProfile}
                  className="h-8 px-3 text-xs"
                >
                  Complete Profile
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}