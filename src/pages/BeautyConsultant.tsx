"use client";

import { useState, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import ShopperNavigation from "@/components/ShopperNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedVoicePanel } from "@/components/EnhancedVoicePanel";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { ShoppingModePanel } from "@/components/ShoppingModePanel";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ProductRecommendationCard } from "@/components/ProductRecommendationCard";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";
import { toast } from "sonner";
import { Upload, Camera, MessageCircle, Sparkles, Copy, Save, Eye, EyeOff, Trash2, WandSparkles, Play, Download, Mic } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
type RecItem = {
  name: string;
  brand?: string;
  finish?: string;
  why_it_matches: string;
  shade_family?: string;
  price_tier?: "drugstore" | "mid" | "premium";
  alt_options?: string[];
  price?: number;
  currency?: string;
  image_url?: string;
  url?: string;
  availability?: "in_stock" | "out_of_stock" | string;
  rating?: number;
};
type BeautyConsultation = {
  skin_profile: {
    tone_depth: "fair" | "light" | "medium" | "tan" | "deep";
    undertone: "cool" | "warm" | "neutral" | "olive";
    skin_type: "dry" | "oily" | "combination" | "normal" | "sensitive";
    visible_concerns: string[];
    confidence: number;
  };
  questions?: string[];
  recommendations: {
    primer: RecItem[];
    foundation_concealer: RecItem[];
    brows_eyeliner_bronzer: RecItem[];
    shadow_palette: RecItem[];
  };
  technique_notes: string[];
  real_products?: boolean;
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
  const {
    user
  } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1',
    type: 'assistant',
    content: "Hi! I'm your AI Beauty Consultant. I can help you find the perfect makeup based on your skin tone and preferences. You can upload a selfie for a complete analysis, or just tell me about your skin color and what you're looking for!\n\n⚠️ **Important Disclaimer**: This is cosmetic advice only, not medical advice. Always patch test new products for allergic reactions and consult a dermatologist for skin concerns or conditions.",
    timestamp: new Date()
  }]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(true);
  const [expertMode, setExpertMode] = useState(false);
  const [shoppingMode, setShoppingMode] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [isListening, setIsListening] = useState(false);
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  const [prefs, setPrefs] = useState<{
    finish?: string;
    coverage?: "light" | "medium" | "full";
  }>({});
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  const handleImageUpload = async (file: File, mode: 'analysis' | 'shopping' = 'analysis') => {
    try {
      const base64 = await fileToBase64(file);
      setSelectedImage(base64);

      // Add user message with image
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: mode === 'shopping' ? 'Uploaded product photo for shopping recommendations' : 'Uploaded selfie for analysis',
        image: base64,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      await analyzeImage(base64, mode);
    } catch (error) {
      toast.error("Error uploading image");
    }
  };
  const analyzeImage = async (imageBase64: string, mode: 'analysis' | 'shopping' = 'analysis') => {
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('beauty-consult', {
        body: {
          image_base64: imageBase64,
          prefs,
          user_id: user?.id
        }
      });
      
      if (response.error) {
        console.error('Beauty consult error:', response.error);
        throw new Error(response.error.message || 'Failed to analyze image');
      }

      if (!response.data) {
        throw new Error('No analysis data received');
      }
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
          payload: {
            confidence: consultation.skin_profile.confidence
          }
        });
      }
    } catch (error) {
      console.error("Analysis error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      const errorChatMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `I apologize, but I couldn't analyze your image: ${errorMessage}. Please ensure your photo is clear and well-lit, then try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorChatMessage]);
      
      toast.error(`Analysis failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  const generateConsultationSummary = (consultation: BeautyConsultation): string => {
    const {
      skin_profile
    } = consultation;
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
    const currentInput = inputText;
    setInputText("");
    setIsLoading(true);
    
    try {
      // Enhanced text consultation with AI
      const conversation_history = messages.slice(-4).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await supabase.functions.invoke('beauty-text-consult', {
        body: {
          message: currentInput,
          conversation_history,
          user_id: user?.id,
          skin_profile: messages.find(m => m.consultation)?.consultation?.skin_profile
        }
      });

      if (response.error) {
        console.error('Supabase function error:', response.error);
        throw new Error(response.error.message || 'Failed to get consultation response');
      }

      if (!response.data?.response) {
        throw new Error('No response received from consultation service');
      }

      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: response.data.response + (response.data.suggested_analysis ? 
          "\n\n💡 **Tip**: Upload a selfie for personalized product recommendations based on your exact skin tone and features!" : ""),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Log event
      if (user?.id) {
        await supabase.from('beauty_consult_events').insert({
          user_id: user.id,
          event: 'text_interaction',
          payload: { message: currentInput }
        });
      }
    } catch (error) {
      console.error("Text consultation error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const fallbackMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `I apologize, but I encountered an error: ${errorMessage}. Please try again in a moment.\n\nFor the most accurate recommendations, I'd suggest uploading a clear, well-lit selfie so I can analyze your skin tone and features. Alternatively, you can describe your skin tone (fair, light, medium, tan, or deep) and any specific concerns you have.\n\n⚠️ **Important**: This is cosmetic advice only. Always patch test new products and consult a dermatologist for skin concerns.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, fallbackMessage]);
      toast.error(`Chat error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  const handlePreferenceClick = async (key: "finish" | "coverage", val: string, messageId: string) => {
    const newPrefs = {
      ...prefs,
      [key]: val
    };
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
  const handleVoiceMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user voice message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Generate AI response (set the input text first)
    setInputText(text);
    await handleTextSubmit();

    // Auto-generate voice response if expert mode is enabled
    if (expertMode) {
      // Get the latest assistant message and convert to speech
      setTimeout(async () => {
        const latestMessages = [...messages, userMessage];
        const lastAssistantMessage = latestMessages.filter(m => m.type === 'assistant').pop();
        if (lastAssistantMessage) {
          await generateVoiceResponse(lastAssistantMessage.content);
        }
      }, 1000);
    }
  };
  const generateVoiceResponse = async (text: string) => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('beauty-voice', {
        body: {
          text,
          voice_id: selectedVoice,
          want_mp3: true
        }
      });
      if (error) throw error;

      // Play the audio response
      const audioBlob = new Blob([Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0))], {
        type: data.mime
      });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      audio.play();
      toast.success('AI responded with voice');
    } catch (error) {
      console.error('Voice response error:', error);
    }
  };
  const generateRoutineText = (consultation: BeautyConsultation): string => {
    const {
      skin_profile,
      recommendations,
      technique_notes
    } = consultation;
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
  return <>
      <SEOHead title="AI Beauty Consultant - Personalized Makeup Recommendations" description="Get personalized makeup recommendations based on your skin tone, type, and preferences with our AI-powered beauty consultant." />
      
      <div className="min-h-screen bg-background">
        <ShopperNavigation />
        
        <main className="container mx-auto px-4 py-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                
                <h1 className="text-2xl font-semibold">Beauty Consultant</h1>
                {expertMode && <Badge variant="secondary" className="ml-2">Expert</Badge>}
                {shoppingMode && <Badge variant="default" className="ml-2">Shopping</Badge>}
              </div>
              
              {selectedImage && <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowImage(!showImage)} className="text-muted-foreground">
                    {showImage ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                setSelectedImage(null);
                setShowImage(true);
              }} className="text-muted-foreground">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>}
            </div>

            <div className="grid lg:grid-cols-4 gap-6">
              {/* Main Chat */}
              <div className="lg:col-span-3">
                <Card className="h-[calc(100vh-200px)] flex flex-col">
                
                  <CardContent className="flex-1 flex flex-col p-4">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 scroll-smooth max-h-[calc(100vh-350px)]">
                    {messages.map((message, index) => <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`} style={{
                      animationDelay: `${index * 0.1}s`
                    }}>
                        <div className={`max-w-[80%] rounded-xl px-3 py-2 ${message.type === 'user' ? 'bg-primary text-primary-foreground ml-4' : 'bg-muted/80 mr-4'}`}>
                          {message.image && showImage && <div className="mb-2 rounded-md overflow-hidden">
                              <img src={message.image} alt="Uploaded image" className="w-full h-24 object-cover" />
                            </div>}
                          
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                          </div>
                          
                          {/* Consultation Results */}
                          {message.consultation && <div className="mt-4 space-y-4">
                              {/* Skin Profile */}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2 bg-secondary/20 rounded-md">
                                  <span className="text-muted-foreground">Depth:</span> {message.consultation.skin_profile.tone_depth}
                                </div>
                                <div className="p-2 bg-secondary/20 rounded-md">
                                  <span className="text-muted-foreground">Tone:</span> {message.consultation.skin_profile.undertone}
                                </div>
                                <div className="p-2 bg-secondary/20 rounded-md">
                                  <span className="text-muted-foreground">Type:</span> {message.consultation.skin_profile.skin_type}
                                </div>
                                <div className="p-2 bg-secondary/20 rounded-md">
                                  <span className="text-muted-foreground">Match:</span> {Math.round(message.consultation.skin_profile.confidence * 100)}%
                                </div>
                              </div>
                              
                              {/* Quick Questions */}
                              {message.consultation.questions && message.consultation.questions.length > 0 && <div className="space-y-2">
                                  <p className="text-sm font-medium">Quick preferences:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {message.consultation.questions.includes("finish") && ["Matte", "Natural", "Glow"].map(option => <Button key={option} variant="outline" size="sm" onClick={() => handlePreferenceClick("finish", option.toLowerCase(), message.id)}>
                                          {option}
                                        </Button>)}
                                    {message.consultation.questions.includes("coverage") && ["Light", "Medium", "Full"].map(option => <Button key={option} variant="outline" size="sm" onClick={() => handlePreferenceClick("coverage", option.toLowerCase(), message.id)}>
                                          {option}
                                        </Button>)}
                                  </div>
                                </div>}
                              
                              {/* Product Recommendations - Enhanced */}
                              {Object.entries(message.consultation.recommendations).map(([category, items]) => <div key={category} className="mt-4">
                                  <Button variant="outline" size="sm" onClick={() => {
                              const element = document.getElementById(`recommendations-${category}-${message.id}`);
                              if (element) {
                                element.style.display = element.style.display === 'none' ? 'block' : 'none';
                              }
                            }} className="flex items-center gap-2 mb-3">
                                    <Sparkles className="h-3 w-3" />
                                    {category.replace(/_/g, ' / ')} ({items.length} items)
                                    {message.consultation.real_products && <Badge variant="secondary" className="text-xs ml-1">Real Products</Badge>}
                                  </Button>
                                  <div id={`recommendations-${category}-${message.id}`} style={{
                              display: 'none'
                            }} className="space-y-3">
                                    {items.slice(0, 3).map((item, i) => (
                                      <ProductRecommendationCard
                                        key={i}
                                        product={item}
                                        skin_profile={message.consultation.skin_profile}
                                      />
                                    ))}
                                  </div>
                                </div>)}
                              
                              {/* Actions */}
                              <div className="flex gap-2 pt-2">
                                <Button variant="outline" size="sm" onClick={() => copyRoutine(message.consultation)} className="h-8 px-3 text-xs">
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                                  <Save className="h-3 w-3 mr-1" />
                                  Save
                                </Button>
                              </div>
                            </div>}
                        </div>
                      </div>)}
                    
                    {isLoading && <div className="flex justify-start">
                        <div className="bg-muted/80 rounded-xl px-3 py-2 mr-4">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 border border-primary border-t-transparent"></div>
                            <span className="text-sm text-muted-foreground">Analyzing...</span>
                          </div>
                        </div>
                      </div>}
                  </div>
                  
                  {/* Input Area */}
                  <div className="border-t pt-3">
                    <div className="flex gap-2 mb-3">
                      <Input placeholder={shoppingMode ? "Ask about products..." : "Ask about makeup or describe your skin..."} value={inputText} onChange={e => setInputText(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleTextSubmit()} className="flex-1" />
                      <Button onClick={handleTextSubmit} disabled={!inputText.trim() || isLoading} size="sm">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Label htmlFor="image-upload" className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild>
                          <span className="flex items-center gap-1 text-xs">
                            <Camera className="h-3 w-3" />
                            {shoppingMode ? "Scan" : "Photo"}
                          </span>
                        </Button>
                      </Label>
                      
                      <VoiceRecorder onTranscription={handleVoiceMessage} disabled={isLoading} />
                      
                      <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], shoppingMode ? 'shopping' : 'analysis')} />
                    </div>
                  </div>
                </CardContent>
                </Card>
              </div>
              
              {/* Compact Sidebar */}
              <div className="space-y-4">
                {/* Controls */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                     {/* Mode Toggles */}
                     <div className="flex gap-2">
                       <Button variant={shoppingMode ? "default" : "outline"} size="sm" onClick={() => setShoppingMode(!shoppingMode)} className="flex-1 text-xs">
                         Shopping
                       </Button>
                       <Button variant={expertMode ? "default" : "outline"} size="sm" onClick={() => setExpertMode(!expertMode)} className="flex-1 text-xs">
                         Expert
                       </Button>
                     </div>
                     
                     {/* Shopping Mode Info */}
                     {shoppingMode && <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                         <div className="flex items-start gap-2">
                           <div className="p-1 rounded bg-primary/10">
                             <Sparkles className="h-3 w-3 text-primary" />
                           </div>
                           <div className="flex-1">
                             <h4 className="font-medium text-sm text-primary mb-1">Shopping Mode Active</h4>
                             <p className="text-xs text-muted-foreground leading-relaxed">
                               Take photos of makeup products in-store to get instant recommendations, shade matching, 
                               price comparisons, and personalized alternatives based on your skin tone.
                             </p>
                           </div>
                         </div>
                       </div>}
                    
                    {/* Voice Panel */}
                    <EnhancedVoicePanel text={messages.find(m => m.consultation)?.content || "Upload a selfie to get personalized voice recommendations!"} onVoiceChange={setSelectedVoice} />
                    
                     {/* Safety Disclaimer */}
                     {!hasAcceptedDisclaimer && (
                       <SafetyDisclaimer onAccept={() => setHasAcceptedDisclaimer(true)} />
                     )}
                     
                     {/* Document Upload (Expert Mode) */}
                     {expertMode && <div className="border-t pt-3">
                         <DocumentUpload />
                       </div>}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>;
}