"use client";
import { useState, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import ShopperNavigation from "@/components/ShopperNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoicePanel } from "@/components/VoicePanel";
import { DocumentUpload } from "@/components/DocumentUpload";
import { toast } from "sonner";
import { Upload, Camera, MessageCircle, Sparkles, Copy, Save, Eye, EyeOff, Trash2, WandSparkles, Play, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type RecItem = { 
  name: string; 
  finish?: string; 
  why_it_matches: string; 
  shade_family?: string; 
  price_tier?: "drugstore"|"mid"|"premium"; 
  alt_options?: string[] 
}

type BeautyConsultation = {
  skin_profile: { 
    tone_depth: "fair"|"light"|"medium"|"tan"|"deep"; 
    undertone: "cool"|"warm"|"neutral"|"olive"; 
    skin_type: "dry"|"oily"|"combination"|"normal"|"sensitive"; 
    visible_concerns: string[]; 
    confidence: number 
  };
  questions?: string[];
  recommendations: { 
    primer: RecItem[]; 
    foundation_concealer: RecItem[]; 
    brows_eyeliner_bronzer: RecItem[]; 
    shadow_palette: RecItem[] 
  };
  technique_notes: string[];
};

type ChatMessage = {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  image?: string;
  consultation?: BeautyConsultation;
  timestamp: Date;
};

export default function BeautyConsultantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hi! I'm your AI Beauty Consultant. I can help you find the perfect makeup based on your skin tone and preferences. You can upload a selfie for a complete analysis, or just tell me about your skin color and what you're looking for!",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(true);
  const [expertMode, setExpertMode] = useState(false);
  const [prefs, setPrefs] = useState<{ finish?: string; coverage?: "light"|"medium"|"full" }>({});

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      setSelectedImage(base64);
      
      // Add user message with image
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: 'Uploaded selfie for analysis',
        image: base64,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      await analyzeImage(base64);
    } catch (error) {
      toast.error("Error uploading image");
    }
  };

  const analyzeImage = async (imageBase64: string) => {
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('beauty-consult', {
        body: { 
          image_base64: imageBase64, 
          prefs,
          user_id: user?.id 
        }
      });

      if (response.error) throw response.error;

      const consultation = response.data as BeautyConsultation;
      
      // Add assistant response with consultation
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: generateConsultationSummary(consultation),
        consultation,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setShowImage(false); // Auto-hide image after analysis
      
      // Log event
      if (user?.id) {
        await supabase.from('beauty_consult_events').insert({
          user_id: user.id,
          event: 'image_analysis',
          payload: { confidence: consultation.skin_profile.confidence }
        });
      }
      
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Error analyzing image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateConsultationSummary = (consultation: BeautyConsultation): string => {
    const { skin_profile } = consultation;
    return `Based on your selfie, I've analyzed your skin profile:

**Skin Analysis:**
• Tone Depth: ${skin_profile.tone_depth}
• Undertone: ${skin_profile.undertone}  
• Skin Type: ${skin_profile.skin_type}
• Confidence: ${Math.round(skin_profile.confidence * 100)}%

I've prepared personalized product recommendations for you! ${consultation.questions?.length ? "I have a few quick questions to refine your recommendations." : ""}`;
  };

  const handleTextSubmit = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // For text-only interactions, we'll create a more conversational response
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I understand you're looking for beauty advice! For the most accurate recommendations, I'd suggest uploading a clear, well-lit selfie so I can analyze your skin tone and features. Alternatively, you can describe your skin tone (fair, light, medium, tan, or deep) and any specific concerns you have, and I'll provide general guidance!",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error("Error processing your message");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceClick = async (key: "finish"|"coverage", val: string, messageId: string) => {
    const newPrefs = { ...prefs, [key]: val };
    setPrefs(newPrefs);
    
    if (selectedImage) {
      await analyzeImage(selectedImage);
    }
  };

  const copyRoutine = (consultation: BeautyConsultation) => {
    const routine = generateRoutineText(consultation);
    navigator.clipboard.writeText(routine);
    toast.success("Routine copied to clipboard!");
  };

  const generateRoutineText = (consultation: BeautyConsultation): string => {
    const { skin_profile, recommendations, technique_notes } = consultation;
    
    let routine = `MY BEAUTY ROUTINE\n\n`;
    routine += `Skin Profile: ${skin_profile.tone_depth} ${skin_profile.undertone} ${skin_profile.skin_type}\n\n`;
    
    Object.entries(recommendations).forEach(([category, items]) => {
      routine += `${category.replace(/_/g, ' ').toUpperCase()}:\n`;
      items.slice(0, 3).forEach((item, i) => {
        routine += `${i + 1}. ${item.name}\n`;
        if (item.finish) routine += `   Finish: ${item.finish}\n`;
        if (item.shade_family) routine += `   Shade: ${item.shade_family}\n`;
        routine += `   Why: ${item.why_it_matches}\n\n`;
      });
    });
    
    routine += `TECHNIQUE NOTES:\n`;
    technique_notes.forEach((note, i) => {
      routine += `• ${note}\n`;
    });
    
    return routine;
  };

  return (
    <>
      <SEOHead 
        title="AI Beauty Consultant - Personalized Makeup Recommendations"
        description="Get personalized makeup recommendations based on your skin tone, type, and preferences with our AI-powered beauty consultant."
      />
      
      <div className="min-h-screen bg-background">
        <ShopperNavigation />
        
        <main className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chat Interface */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Beauty Consultant
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {expertMode && <Badge variant="secondary">Expert Mode</Badge>}
                      {selectedImage && (
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setShowImage(!showImage)}
                          >
                            {showImage ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedImage(null);
                              setShowImage(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Messages */}
                  <div className="max-h-96 overflow-y-auto space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            message.type === 'user'
                              ? 'bg-primary text-primary-foreground ml-4'
                              : 'bg-muted mr-4'
                          }`}
                        >
                          {message.image && showImage && (
                            <div className="mb-2 rounded-lg overflow-hidden">
                              <img 
                                src={message.image} 
                                alt="Uploaded selfie" 
                                className="w-full h-32 object-cover"
                              />
                            </div>
                          )}
                          
                          <div className="whitespace-pre-wrap text-sm">
                            {message.content}
                          </div>
                          
                          {/* Consultation Results */}
                          {message.consultation && (
                            <div className="mt-4 space-y-4">
                              {/* Skin Profile Badges */}
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  Depth: {message.consultation.skin_profile.tone_depth}
                                </Badge>
                                <Badge variant="outline">
                                  Undertone: {message.consultation.skin_profile.undertone}
                                </Badge>
                                <Badge variant="outline">
                                  Type: {message.consultation.skin_profile.skin_type}
                                </Badge>
                                <Badge variant="outline">
                                  Confidence: {Math.round(message.consultation.skin_profile.confidence * 100)}%
                                </Badge>
                              </div>
                              
                              {/* Quick Questions */}
                              {message.consultation.questions && message.consultation.questions.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Quick preferences:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {message.consultation.questions.includes("finish") && 
                                      ["Matte", "Natural", "Glow"].map(option => (
                                        <Button
                                          key={option}
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handlePreferenceClick("finish", option.toLowerCase(), message.id)}
                                        >
                                          {option}
                                        </Button>
                                      ))
                                    }
                                    {message.consultation.questions.includes("coverage") && 
                                      ["Light", "Medium", "Full"].map(option => (
                                        <Button
                                          key={option}
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handlePreferenceClick("coverage", option.toLowerCase(), message.id)}
                                        >
                                          {option}
                                        </Button>
                                      ))
                                    }
                                  </div>
                                </div>
                              )}
                              
                              {/* Product Recommendations */}
                              {Object.entries(message.consultation.recommendations).map(([category, items]) => (
                                <div key={category} className="space-y-2">
                                  <h3 className="font-semibold text-sm capitalize">
                                    {category.replace(/_/g, ' / ')}
                                  </h3>
                                  <div className="grid gap-2">
                                    {items.slice(0, 3).map((item, i) => (
                                      <div key={i} className="p-3 rounded-lg border bg-card text-card-foreground">
                                        <h4 className="font-medium text-sm">{item.name}</h4>
                                        <p className="text-xs text-muted-foreground">
                                          {item.finish} {item.shade_family && `• ${item.shade_family}`}
                                        </p>
                                        <p className="text-sm mt-1">{item.why_it_matches}</p>
                                        <p className="text-xs mt-1 uppercase tracking-wide text-muted-foreground">
                                          {item.price_tier ?? "—"}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              
                              {/* Technique Notes */}
                              {message.consultation.technique_notes && message.consultation.technique_notes.length > 0 && (
                                <div className="space-y-2">
                                  <h3 className="font-semibold text-sm">Technique Notes</h3>
                                  <ul className="list-disc ml-5 text-sm space-y-1">
                                    {message.consultation.technique_notes.map((note, i) => (
                                      <li key={i}>{note}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => copyRoutine(message.consultation)}
                                  className="flex items-center gap-2"
                                >
                                  <Copy className="h-4 w-4" />
                                  Copy Routine
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="flex items-center gap-2"
                                >
                                  <Save className="h-4 w-4" />
                                  Save to Closet
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-4 py-2 mr-4">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span className="text-sm">Analyzing...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Input Area */}
                  <div className="border-t pt-4">
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Ask about makeup, describe your skin, or upload a selfie..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
                            className="flex-1"
                          />
                          <Button onClick={handleTextSubmit} disabled={!inputText.trim() || isLoading}>
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex gap-2">
                          <Label htmlFor="image-upload" className="cursor-pointer">
                            <Button variant="outline" size="sm" asChild>
                              <span className="flex items-center gap-2">
                                <Camera className="h-4 w-4" />
                                Upload Photo
                              </span>
                            </Button>
                          </Label>
                          <Input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Sidebar */}
            <div className="space-y-4">
              {/* Voice Panel */}
              <VoicePanel />
              
              {/* Document Upload (Expert Mode) */}
              {expertMode && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Knowledge Base</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DocumentUpload />
                  </CardContent>
                </Card>
              )}
              
              {/* Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tips for Better Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <h4 className="font-medium text-foreground">For Photo Analysis:</h4>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>Use natural lighting</li>
                      <li>Face the camera directly</li>
                      <li>Remove sunglasses</li>
                      <li>Clean, bare face works best</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-foreground">For Text Descriptions:</h4>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>Describe your skin tone depth</li>
                      <li>Mention undertones if known</li>
                      <li>Share any skin concerns</li>
                      <li>Tell me your preferences</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Mode Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Expert Mode</span>
                      {expertMode && <Badge variant="secondary" className="text-xs">Active</Badge>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpertMode(!expertMode)}
                    >
                      {expertMode ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                  
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-muted rounded-lg">
                      <h4 className="font-medium text-foreground mb-2">🌟 Normal Mode (Current)</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• AI beauty consultation</li>
                        <li>• Photo analysis & product recommendations</li>
                        <li>• Basic voice features</li>
                      </ul>
                    </div>
                    
                    {expertMode ? (
                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <h4 className="font-medium text-primary mb-2">🚀 Expert Mode (Active)</h4>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• Everything in Normal Mode</li>
                          <li>• Upload custom beauty documents</li>
                          <li>• Advanced voice synthesis with multiple voices</li>
                          <li>• Enhanced product knowledge base</li>
                        </ul>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <h4 className="font-medium text-muted-foreground mb-2">🚀 Expert Mode (Available)</h4>
                        <ul className="space-y-1 text-muted-foreground">
                          <li>• Everything in Normal Mode plus:</li>
                          <li>• Upload beauty documents & shade charts</li>
                          <li>• Professional voice synthesis</li>
                          <li>• Custom knowledge base integration</li>
                        </ul>
                        <p className="text-xs mt-2 text-primary">Click "Enable" above to unlock these features</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}