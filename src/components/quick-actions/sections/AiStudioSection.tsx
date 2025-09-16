import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Camera, Wand2, ImageIcon } from 'lucide-react';

interface AiStudioSectionProps {
  onAiStudioOpen: () => void;
}

const AiStudioSection: React.FC<AiStudioSectionProps> = ({ onAiStudioOpen }) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">AI Studio</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Create AI-generated fashion content and try-on experiences. Upload photos and use AI to enhance your style.
          </p>
        </div>
        <Button onClick={onAiStudioOpen} size="lg" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Open AI Studio
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="text-center">
            <Camera className="h-8 w-8 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">Try-On</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Upload your photo and virtually try on different outfits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Wand2 className="h-8 w-8 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">Style Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Generate new fashion designs and style combinations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <ImageIcon className="h-8 w-8 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">Image Enhancement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Enhance your fashion photos with AI-powered editing
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AiStudioSection;