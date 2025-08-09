
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ARGarmentOverlay } from './ARGarmentOverlay';
import type { Product } from '@/types';

interface ARSmartFitProps {
  product: Product;
  selectedSize: string;
  selectedColor: string;
}

export const ARSmartFit: React.FC<ARSmartFitProps> = ({
  product,
  selectedSize,
  selectedColor
}) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [bodyMetrics, setBodyMetrics] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        description: "Image size should be less than 10MB",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Convert file to data URL for display
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Simulate body analysis (in a real implementation, this would use AI)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock body metrics analysis
      setBodyMetrics({
        shoulderWidth: 42,
        chestWidth: 38,
        waistWidth: 32,
        hipWidth: 40,
        height: 170,
        fitScore: Math.floor(Math.random() * 30) + 70, // Random score between 70-100
        recommendations: [
          "This size should fit well in the shoulders",
          "May be slightly loose around the waist",
          "Perfect length for your height"
        ]
      });
      
      setAnalysisComplete(true);
      toast({
        description: "Smart Fit analysis complete! Check the fit recommendations.",
      });
    } catch (error) {
      toast({
        description: "Failed to analyze image. Please try again.",
        variant: "destructive"
      });
      console.error('Smart Fit analysis error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setUploadedImage(null);
    setAnalysisComplete(false);
    setBodyMetrics(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {!uploadedImage ? (
        <Card className="border-dashed border-2 border-muted-foreground/25 bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Fit Analysis</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Upload a full-body photo to see how the {product.title} will fit you. 
              Stand straight with arms slightly away from your body for best results.
            </p>
            <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Photo
            </Button>
            <Badge variant="secondary" className="mt-2">
              <Sparkles className="h-3 w-3 mr-1" />
              Beta Feature
            </Badge>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Photo with AR overlay */}
          <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
            <img
              src={uploadedImage}
              alt="Uploaded photo"
              className="w-full h-full object-cover"
            />
            
            {analysisComplete && (
              <ARGarmentOverlay
                product={product}
                selectedSize={selectedSize}
                selectedColor={selectedColor}
                isVisible={true}
                containerWidth={400}
                containerHeight={600}
              />
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Analyzing your body measurements...</p>
                </div>
              </div>
            )}
          </div>

          {/* Fit Analysis Results */}
          {analysisComplete && bodyMetrics && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold">Fit Analysis</h3>
                  <Badge 
                    variant={bodyMetrics.fitScore >= 80 ? "default" : "secondary"}
                    className="ml-auto"
                  >
                    {bodyMetrics.fitScore}% Match
                  </Badge>
                </div>
                
                <div className="space-y-2 mb-4">
                  {bodyMetrics.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleReset} variant="outline">
                    Try Another Photo
                  </Button>
                  <Button size="sm" className="flex-1">
                    Looks Good - Add to Bag
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!analysisComplete && !isProcessing && (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleReset} variant="outline">
                Choose Different Photo
              </Button>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
