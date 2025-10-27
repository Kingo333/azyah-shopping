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
    <Card className="border border-[#E5E3DF] bg-white shadow-sm mb-6">
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* User Icon - Simple Line Icon */}
          <User className="w-5 h-5 text-foreground flex-shrink-0" />
          
          {/* Progress Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm font-medium text-foreground font-sans">
                Complete Your Profile
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                ({percentage}%)
              </span>
            </div>
            
            {/* Progress Bar */}
            <Progress 
              value={percentage} 
              className="h-1.5 bg-[#E5E3DF] [&>div]:bg-[#7A143E]"
            />
          </div>
          
          {/* Action Button - Circular Arrow */}
          <Button
            size="icon"
            onClick={handleCompleteProfile}
            className="h-9 w-9 rounded-full bg-[#7A143E] hover:bg-[#5A0F2E] flex-shrink-0"
          >
            <ArrowRight className="w-4 h-4 text-white" />
          </Button>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 hover:bg-transparent"
            onClick={handleDismiss}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </Card>
  );
}