import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Upload, Wand2 } from 'lucide-react';
import AiStudioModal from '@/components/AiStudioModal';

interface AiStudioSectionProps {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

const AiStudioSection: React.FC<AiStudioSectionProps> = ({ modalOpen, setModalOpen }) => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Studio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Create AI-generated fashion content and try-on experiences. Upload photos and use AI to enhance your style.
            </p>
            <Button 
              onClick={() => setModalOpen(true)}
              className="w-full md:w-auto"
            >
              <Upload className="h-4 w-4 mr-2" />
              Open AI Studio
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="h-4 w-4" />
                <h3 className="font-medium">Style Generation</h3>
              </div>
              <p className="text-sm text-muted-foreground">Generate new style combinations with AI</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="h-4 w-4" />
                <h3 className="font-medium">Image Enhancement</h3>
              </div>
              <p className="text-sm text-muted-foreground">Enhance and style your photos</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4" />
                <h3 className="font-medium">Virtual Try-On</h3>
              </div>
              <p className="text-sm text-muted-foreground">Try on clothes virtually with AI</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <AiStudioModal 
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};

export default AiStudioSection;