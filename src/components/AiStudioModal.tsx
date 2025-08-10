
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Image, 
  Palette, 
  Wand2, 
  Camera,
  Download,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AiStudioModal: React.FC<AiStudioModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [activeStudio, setActiveStudio] = useState<'tryon' | 'generate' | 'enhance' | null>(null);

  const handleClose = () => {
    setActiveStudio(null);
    onClose();
  };

  const handleStudioSelect = (studio: 'tryon' | 'generate' | 'enhance') => {
    setActiveStudio(studio);
    // Here you would typically navigate to the specific studio or show its interface
    toast({
      description: `${studio === 'tryon' ? 'AI Try-On' : studio === 'generate' ? 'Image Generation' : 'Image Enhancement'} coming soon!`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Studio
            <Badge variant="outline" className="text-xs">
              Creative Tools
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!activeStudio ? (
            <>
              {/* Studio Selection */}
              <div className="text-center space-y-4 mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Welcome to AI Studio</h2>
                  <p className="text-muted-foreground">
                    Create, enhance, and transform fashion content with AI-powered tools
                  </p>
                </div>
              </div>

              {/* Studio Tools Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* AI Try-On Studio */}
                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => handleStudioSelect('tryon')}>
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-lg">AI Try-On</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Virtually try on clothes using AI technology. Upload your photo and see how different outfits look on you.
                    </p>
                    <div className="flex flex-wrap gap-1 justify-center">
                      <Badge variant="secondary" className="text-xs">Virtual Fitting</Badge>
                      <Badge variant="secondary" className="text-xs">Real-time</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Image Generation Studio */}
                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => handleStudioSelect('generate')}>
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Image className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-lg">Image Generation</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate fashion images from text descriptions. Create unique styles, outfits, and fashion concepts.
                    </p>
                    <div className="flex flex-wrap gap-1 justify-center">
                      <Badge variant="secondary" className="text-xs">Text-to-Image</Badge>
                      <Badge variant="secondary" className="text-xs">Creative</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Enhancement Studio */}
                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => handleStudioSelect('enhance')}>
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Wand2 className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-lg">Image Enhancement</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Enhance and edit fashion photos. Remove backgrounds, adjust lighting, and improve image quality.
                    </p>
                    <div className="flex flex-wrap gap-1 justify-center">
                      <Badge variant="secondary" className="text-xs">Photo Editing</Badge>
                      <Badge variant="secondary" className="text-xs">Enhancement</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Features Overview */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 p-6 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Palette className="h-5 w-5 text-purple-600" />
                  What you can do in AI Studio
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      Try on clothes virtually with realistic fitting
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Generate unique fashion designs from text
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Create mood boards and style collections
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      Enhance and edit fashion photography
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      Remove backgrounds and adjust lighting
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                      Export high-quality results for sharing
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Individual Studio Interface (placeholder for now)
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-white animate-pulse" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {activeStudio === 'tryon' ? 'AI Try-On Studio' : 
                 activeStudio === 'generate' ? 'Image Generation Studio' : 
                 'Image Enhancement Studio'}
              </h3>
              <p className="text-muted-foreground mb-6">
                This feature is coming soon! We're working hard to bring you the best AI-powered fashion tools.
              </p>
              <Button onClick={() => setActiveStudio(null)} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Back to Studio Selection
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AiStudioModal;
