"use client";

import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import ShopperNavigation from "@/components/ShopperNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Camera, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type ConsultationResult = {
  message: string;
  analysis?: {
    skin_tone: string;
    undertone: string;
    skin_type: string;
    recommendations: any[];
  };
};

export default function BeautyConsultantPage() {
  const { user } = useAuth();
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [region, setRegion] = useState('');
  const [consultation, setConsultation] = useState<ConsultationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitConsultation = async () => {
    if (!image) {
      toast.error('Please upload an image first');
      return;
    }
    
    setLoading(true);
    const formData = new FormData();
    formData.append('image', image);
    formData.append('message', message || 'Analyze my skin and provide beauty recommendations');
    formData.append('region', region || 'US');

    try {
      const response = await fetch('https://eoal3jgggfuduet.m.pipedream.net', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setConsultation(result);
      toast.success('Beauty consultation completed!');
    } catch (error) {
      console.error('Consultation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Consultation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetConsultation = () => {
    setImage(null);
    setImagePreview(null);
    setMessage('');
    setRegion('');
    setConsultation(null);
  };

  return (
    <>
      <SEOHead 
        title="AI Beauty Consultant - Personalized Makeup Recommendations" 
        description="Get personalized makeup recommendations based on your skin tone, type, and preferences with our AI-powered beauty consultant." 
      />
      
      <div className="min-h-screen bg-background">
        <ShopperNavigation />
        
        <main className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/20">
                  <Sparkles className="h-8 w-8 text-pink-600 dark:text-pink-400" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  AI Beauty Consultant
                </h1>
              </div>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Upload your selfie to get personalized makeup recommendations based on your unique skin tone, type, and preferences.
              </p>
            </div>

            {!consultation ? (
              /* Upload and Input Form */
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Beauty Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Image Upload */}
                  <div className="space-y-4">
                    <Label htmlFor="image" className="text-base font-medium">
                      Upload Your Selfie *
                    </Label>
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="image"
                        className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors"
                      >
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-h-full max-w-full object-contain rounded-lg"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                          </div>
                        )}
                        <input 
                          id="image"
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload}
                          className="hidden"
                          required 
                        />
                      </label>
                    </div>
                  </div>

                  {/* Questions/Preferences */}
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-base font-medium">
                      Questions or Preferences (Optional)
                    </Label>
                    <Input
                      id="message"
                      type="text" 
                      placeholder="e.g., Looking for everyday natural look, sensitive skin, prefer drugstore brands..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Region Selection */}
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Your Region</Label>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your region for localized recommendations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="AE">United Arab Emirates</SelectItem>
                        <SelectItem value="SA">Saudi Arabia</SelectItem>
                        <SelectItem value="DE">Germany</SelectItem>
                        <SelectItem value="FR">France</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Submit Button */}
                  <Button 
                    onClick={submitConsultation} 
                    disabled={!image || loading}
                    className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analyzing Your Beauty Profile...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Get Beauty Consultation
                      </>
                    )}
                  </Button>

                  {/* Disclaimer */}
                  <div className="text-xs text-muted-foreground bg-muted/30 p-4 rounded-lg">
                    <p className="font-semibold mb-2">⚠️ Important Disclaimer:</p>
                    <p>
                      This AI provides cosmetic advice only, not medical advice. Always patch test new products for allergic reactions and consult a dermatologist for skin concerns or conditions. Results may vary based on individual skin chemistry.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Consultation Results */
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-pink-600" />
                      Your Personalized Beauty Consultation
                    </span>
                    <Button variant="outline" onClick={resetConsultation}>
                      New Consultation
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div dangerouslySetInnerHTML={{ __html: consultation.message }} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips Section */}
            <Card>
              <CardHeader>
                <CardTitle>Tips for Best Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Photo Guidelines:</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Use natural lighting when possible</li>
                      <li>• Face the camera directly</li>
                      <li>• Ensure your face is clearly visible</li>
                      <li>• Remove heavy makeup for accurate analysis</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">What to Include:</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Your skin concerns or goals</li>
                      <li>• Preferred makeup style (natural, bold, etc.)</li>
                      <li>• Budget preferences</li>
                      <li>• Any skin sensitivities</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}