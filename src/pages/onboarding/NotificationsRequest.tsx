import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function NotificationsRequest() {
  const navigate = useNavigate();

  const handleTurnOn = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notifications enabled!');
      } else {
        toast.info('You can enable notifications later in settings');
      }
    }
    navigate('/onboarding/location');
  };

  const handleSkip = () => {
    navigate('/onboarding/location');
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted">
        <div className="h-full bg-foreground transition-all" style={{ width: '88%' }} />
      </div>

      {/* Back Button */}
      <div className="p-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6 overflow-y-auto">
        <div className="w-full max-w-md text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
              <div className="text-5xl">🔔</div>
            </div>
            
            <h1 className="text-2xl font-bold mb-3 text-foreground">
              Turn on notifications
            </h1>
            <p className="text-muted-foreground">
              Get updates when someone follows you or when AI generates new looks.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleTurnOn}
              className="w-full h-12 text-base font-semibold rounded-xl"
            >
              Turn On
            </Button>
            
            <button
              onClick={handleSkip}
              className="w-full text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
