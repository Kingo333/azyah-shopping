
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AiStudioConnectionTest from '@/components/AiStudioConnectionTest';
import AiTryOnModal from '@/components/AiTryOnModal';

const AiStudioTest: React.FC = () => {
  const navigate = useNavigate();
  const [showTryOnModal, setShowTryOnModal] = React.useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">AI Studio Connection Test</h1>
        </div>

        {/* Connection Test */}
        <div className="grid gap-6 md:grid-cols-2">
          <AiStudioConnectionTest />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Test AI Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Once connected, you can test the AI Try-On functionality:
              </p>
              
              <Button 
                onClick={() => setShowTryOnModal(true)}
                className="w-full gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Test AI Try-On
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* AI Try-On Modal */}
        <AiTryOnModal
          isOpen={showTryOnModal}
          onClose={() => setShowTryOnModal(false)}
        />
      </div>
    </div>
  );
};

export default AiStudioTest;
