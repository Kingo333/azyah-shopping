import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AIAnalyzerIntro() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted">
        <div className="h-full bg-foreground transition-all" style={{ width: '80%' }} />
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
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <div className="w-48 h-48 mx-auto mb-8 bg-muted rounded-2xl flex items-center justify-center">
              {/* Placeholder for AI analysis visualization */}
              <div className="text-6xl">🤖</div>
            </div>
            
            <h1 className="text-2xl font-bold mb-3 text-foreground">
              Azyah AI analyzes your outfits
            </h1>
            <p className="text-muted-foreground">
              We remove backgrounds and identify details like brand, color, and type automatically.
            </p>
          </div>

          <Button
            onClick={() => navigate('/onboarding/community-intro')}
            className="w-full h-12 text-base font-semibold rounded-xl"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
