import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function LocationRequest() {
  const navigate = useNavigate();

  const handleAllow = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          toast.success('Location enabled!');
          navigate('/onboarding/subscription-features');
        },
        (error) => {
          toast.error('Location access denied');
          navigate('/onboarding/subscription-features');
        }
      );
    } else {
      toast.info('Geolocation not supported');
      navigate('/onboarding/subscription-features');
    }
  };

  const handleDontAllow = () => {
    navigate('/onboarding/subscription-features');
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted">
        <div className="h-full bg-foreground transition-all" style={{ width: '92%' }} />
      </div>

      {/* Back Button */}
      <div className="p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto mb-8 bg-muted rounded-full flex items-center justify-center">
              <div className="text-5xl">📍</div>
            </div>
            
            <h1 className="text-2xl font-bold mb-3 text-foreground">
              Dress according to the weather near you
            </h1>
            <p className="text-muted-foreground">
              We use your location to make outfit suggestions for your climate.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleAllow}
              className="w-full h-12 text-base font-semibold rounded-xl"
            >
              Allow While Using App
            </Button>
            
            <button
              onClick={handleDontAllow}
              className="w-full text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Don't Allow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
