"use client";

import { useState, useRef, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import ShopperNavigation from "@/components/ShopperNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, Send, Sparkles, MapPin, Image as ImageIcon, Bot, User, Mic, Package, Clock, Crown, Star, Heart, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { VoiceMessage } from "@/components/VoiceMessage";
import { useUserCredits } from "@/hooks/useUserCredits";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { sanitizeHtml } from "@/utils/sanitizeHtml";
import { useImageOptimization } from "@/hooks/useImageOptimization";
import { useUserBeautyProfile } from "@/hooks/useUserBeautyProfile";
import { supabase } from "@/integrations/supabase/client";

type ChatMessage = {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  image?: string;
  timestamp: Date;
  audioUrl?: string;
  transcription?: string;
  isVoice?: boolean;
};

type ConsultationResult = {
  success: boolean;
  timestamp: string;
  consultation: {
    text: string;
    voice_summary: string;
    audio_file?: string;
    transcription?: {
      success: boolean;
      message: string;
      transcription: string;
    };
  };
};

const beautyTips = [
  { icon: "💄", tip: "Apply lipstick in thin layers for longer-lasting color" },
  { icon: "🌸", tip: "Always moisturize before applying foundation" },
  { icon: "✨", tip: "Use primer to make your makeup last all day" },
  { icon: "🎨", tip: "Blend eyeshadow in circular motions for smooth gradients" },
  { icon: "💫", tip: "Set your makeup with translucent powder" },
];

export default function BeautyConsultantPage() {
  const { user } = useAuth();
  const { credits, loading: creditsLoading, updateCredits } = useUserCredits();
  const { profile: beautyProfile, hasValidProfile, updateProfile: updateBeautyProfile, getProfileSummary, fetchProfile } = useUserBeautyProfile();
  const { getOptimizedBase64 } = useImageOptimization();
  
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1',
    type: 'assistant',
    content: "Hi! I'm Azyah, your AI Beauty Consultant. Upload a selfie, speak to me, or ask any beauty question for personalized recommendations! Available in English & (متوفر باللغة العربية) 💄✨",
    timestamp: new Date()
  }]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [region, setRegion] = useState('US');
  const [loading, setLoading] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Product Analysis Mode
  const [analysisMode, setAnalysisMode] = useState<'chat' | 'product_analysis'>('chat');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [skinImage, setSkinImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [skinImagePreview, setSkinImagePreview] = useState<string | null>(null);
  const [hasInitialProductResponse, setHasInitialProductResponse] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const skinFileInputRef = useRef<HTMLInputElement>(null);

  // Beauty tips carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % beautyTips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load beauty profile on component mount
  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id, fetchProfile]);

  // Load conversation history when mode changes
  useEffect(() => {
    const loadModeHistory = async () => {
      if (!user?.id) return;
      try {
        const sessionPrefix = analysisMode === 'product_analysis' ? 'product_score' : 'chat_mode';
        const { data: sessionData } = await supabase
          .from('user_sessions')
          .select('conversation_history')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .like('session_id', `${sessionPrefix}_${user.id}_%`)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sessionData?.conversation_history && Array.isArray(sessionData.conversation_history)) {
          const historyMessages: ChatMessage[] = [{
            id: '1',
            type: 'assistant',
            content: analysisMode === 'product_analysis' 
              ? "Hi! I'm Azyah, your AI Beauty Consultant. Upload a product and your skin/face photo to get a detailed compatibility score (0-100%) with breakdown! Perfect for shopping decisions. Available in English & (متوفر باللغة العربية) 💄✨"
              : "Hi! I'm Azyah, your AI Beauty Consultant. Upload a selfie, speak to me, or ask any beauty question for personalized recommendations! Available in English & (متوفر باللغة العربية) 💄✨",
            timestamp: new Date()
          }];

          sessionData.conversation_history.forEach((msg: any, index: number) => {
            historyMessages.push({
              id: `history_${analysisMode}_${index}`,
              type: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content,
              timestamp: new Date(msg.timestamp || Date.now()),
              isVoice: msg.role === 'user' && msg.content.includes('🎤')
            });
          });
          setMessages(historyMessages);
        } else {
          setMessages([{
            id: '1',
            type: 'assistant',
            content: analysisMode === 'product_analysis' 
              ? "Hi! I'm Azyah, your AI Beauty Consultant. Upload a product and your skin/face photo to get a detailed compatibility score (0-100%) with breakdown! Perfect for shopping decisions. Available in English & (متوفر باللغة العربية) 💄✨"
              : "Hi! I'm Azyah, your AI Beauty Consultant. Upload a selfie, speak to me, or ask any beauty question for personalized recommendations! Available in English & (متوفر باللغة العربية) 💄✨",
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Error loading conversation history:', error);
      }
    };

    loadModeHistory();
    
    if (analysisMode === 'chat') {
      clearProductAnalysisImages();
      setHasInitialProductResponse(false);
    } else {
      clearImage();
    }
    
    setInputMessage('');
  }, [analysisMode, user?.id]);

  const validateImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return false;
    }
    return true;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateImageFile(file)) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateImageFile(file)) {
      setProductImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProductImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSkinImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateImageFile(file)) {
      setSkinImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSkinImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitConsultation = async (message: string, image?: File, audioBlob?: Blob) => {
    setLoading(true);

    if (analysisMode === 'product_analysis') {
      if (!productImage || !skinImage) {
        toast.error('Both product and skin/face images are required for compatibility scoring');
        setLoading(false);
        return;
      }
    }

    if (!user?.id) {
      toast.error('Please sign in to use the beauty consultant');
      setLoading(false);
      return;
    }

    try {
      let imageBase64 = '';
      let audioBase64 = '';
      
      if (image) {
        try {
          imageBase64 = await getOptimizedBase64(image, {
            maxWidth: 1024,
            maxHeight: 1024,
            quality: 0.8
          });
        } catch (err) {
          imageBase64 = await fileToBase64(image);
        }
      }

      if (audioBlob) {
        audioBase64 = await blobToBase64(audioBlob);
      }

      const payload: any = {
        user_id: user.id,
        message: message || '',
        region: region,
        mode: analysisMode
      };

      if (analysisMode === 'product_analysis') {
        if (productImage) {
          try {
            payload.product_image = await getOptimizedBase64(productImage, {
              maxWidth: 1024,
              maxHeight: 1024,
              quality: 0.8
            });
          } catch (err) {
            payload.product_image = await fileToBase64(productImage);
          }
        }
        if (skinImage) {
          try {
            payload.skin_image = await getOptimizedBase64(skinImage, {
              maxWidth: 1024,
              maxHeight: 1024,
              quality: 0.8
            });
          } catch (err) {
            payload.skin_image = await fileToBase64(skinImage);
          }
        }
      } else {
        if (imageBase64) {
          payload.image = imageBase64;
        }
      }

      if (audioBase64) {
        payload.audio = audioBase64;
      }

      const response = await supabase.functions.invoke('beauty-consultation', {
        body: payload
      });

      if (response.error) {
        throw new Error(response.error.message || 'Consultation failed');
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.message || 'Consultation failed');
      }

      const assistantMessage: ChatMessage = {
        id: `${analysisMode}_${Date.now()}`,
        type: 'assistant',
        content: result.consultation.text,
        timestamp: new Date(),
        audioUrl: result.consultation.audio_url,
        transcription: result.consultation.voice_summary,
        isVoice: !!result.consultation.audio_url
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (analysisMode === 'product_analysis') {
        setHasInitialProductResponse(true);
      }

      if (result.consultation.credits_remaining !== undefined) {
        updateCredits({
          credits_remaining: result.consultation.credits_remaining,
          is_premium: result.consultation.is_premium || false
        });
      }

      if (result.consultation.audio_url) {
        setIsPlayingVoice(true);
        const audio = new Audio(result.consultation.audio_url);
        audio.onended = () => setIsPlayingVoice(false);
        audio.onerror = () => setIsPlayingVoice(false);
        audio.play().catch(() => setIsPlayingVoice(false));
      }

      toast.success('Beauty consultation completed!');
    } catch (error) {
      console.error('Consultation failed:', error);
      let errorMessage = 'I apologize, but I encountered an error. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('No credits remaining')) {
          toast.error('No credits remaining. Upgrade to premium for more credits!');
          return;
        } else {
          errorMessage = `I encountered an issue: ${error.message}`;
        }
      }

      const errorResponse: ChatMessage = {
        id: `error_${analysisMode}_${Date.now()}`,
        type: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !selectedImage && analysisMode === 'chat') || 
        (analysisMode === 'product_analysis' && !productImage && !skinImage && !inputMessage.trim())) {
      return;
    }

    const currentMessage = inputMessage.trim();
    const currentImage = selectedImage;
    const currentProductImage = productImage;
    const currentSkinImage = skinImage;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: currentMessage || (currentImage ? '🖼️ Uploaded an image for analysis' : ''),
      image: currentImage ? URL.createObjectURL(currentImage) : undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    clearImage();

    await submitConsultation(currentMessage, currentImage);
  };

  const handleVoiceTranscription = async (transcription: string) => {
    if (!transcription.trim()) return;

    const userMessage: ChatMessage = {
      id: `voice_${Date.now()}`,
      type: 'user',
      content: `🎤 ${transcription}`,
      timestamp: new Date(),
      isVoice: true
    };

    setMessages(prev => [...prev, userMessage]);
    await submitConsultation(transcription);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearProductAnalysisImages = () => {
    setProductImage(null);
    setProductImagePreview(null);
    setSkinImage(null);
    setSkinImagePreview(null);
    if (productFileInputRef.current) {
      productFileInputRef.current.value = '';
    }
    if (skinFileInputRef.current) {
      skinFileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="dashboard-bg">
      <SEOHead 
        title="AI Beauty Consultant - Azyah | Get Personalized Beauty Advice"
        description="Get AI-powered beauty advice, product recommendations, and skin analysis from Azyah. Upload photos for personalized beauty consultations and tips."
        keywords="AI beauty consultant, beauty advice, skin analysis, product recommendations, makeup tips, skincare"
      />
      <ShopperNavigation />
      
      <main className="container mx-auto px-4 py-8 pt-24 max-w-4xl min-h-screen">
        {/* Header Card with Avatar, Title and Back Button */}
        <Card className="glass-premium mb-6 border-0 overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                {/* Back Button */}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => window.history.back()}
                  className="h-10 w-10 rounded-full hover:bg-primary/10 transition-all duration-300"
                  title="Back to Dashboard"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-primary-glow/30 p-1">
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/90 to-accent flex items-center justify-center shadow-lg">
                        <Bot className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-left">
                    <h1 className="text-2xl font-playfair font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      Azyah – AI Beauty Consultant
                    </h1>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                      <span>Your personal beauty expert</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Available 24/7
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Credits Display - Elegant pill style */}
              <div className="flex items-center gap-3">
                <div className="glass-panel rounded-full px-4 py-2 flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{credits?.credits_remaining || 0}</span>
                  </div>
                  <Progress 
                    value={((credits?.credits_remaining || 0) / (credits?.is_premium ? 50 : 10)) * 100} 
                    className="w-16 h-2" 
                  />
                </div>
                <div className="glass-panel rounded-full px-3 py-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Daily reset at midnight
                  </span>
                </div>
                {!credits?.is_premium && (
                  <Button size="sm" className="bg-gradient-to-r from-accent to-primary text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <Crown className="w-3 h-3 mr-1" />
                    Upgrade
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tab Navigation */}
        <Card className="glass-panel mb-6 border-0">
          <CardContent className="p-1">
            <Tabs value={analysisMode} onValueChange={(value) => setAnalysisMode(value as 'chat' | 'product_analysis')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-transparent">
                <TabsTrigger 
                  value="chat" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Chat Mode
                </TabsTrigger>
                <TabsTrigger 
                  value="product_analysis"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Product Score
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Chat Messages */}
        <Card className="glass-premium mb-6 border-0 overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[500px] overflow-y-auto scrollbar-hide p-6">
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-4 animate-fade-in ${
                      message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                      message.type === 'user' 
                        ? 'bg-gradient-to-br from-primary to-primary-glow' 
                        : 'bg-gradient-to-br from-accent/80 to-primary/60'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <Bot className="w-5 h-5 text-white" />
                      )}
                    </div>
                    
                    <div className={`flex flex-col max-w-[80%] ${
                      message.type === 'user' ? 'items-end' : 'items-start'
                    }`}>
                      <div className={`relative p-4 rounded-2xl shadow-lg backdrop-blur-sm ${
                        message.type === 'user'
                          ? 'bg-primary/90 text-white rounded-tr-md ml-4'
                          : 'bg-white/80 dark:bg-card/80 text-foreground rounded-tl-md mr-4 border border-white/20'
                      }`}>
                        <div className="text-sm leading-relaxed">
                          {message.isVoice ? (
                            <div className="flex items-center gap-2">
                              <Mic className="w-4 h-4" />
                              <span>{message.content}</span>
                            </div>
                          ) : (
                            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.content) }} />
                          )}
                        </div>
                        
                        {message.image && (
                          <img 
                            src={message.image} 
                            alt="User uploaded content" 
                            className="mt-3 max-w-[250px] rounded-xl border border-white/30 shadow-md"
                          />
                        )}
                      </div>
                      
                      {message.audioUrl && message.transcription && (
                        <div className="mt-3 max-w-[300px]">
                          <VoiceMessage 
                            audioUrl={message.audioUrl}
                            transcription={message.transcription}
                          />
                        </div>
                      )}
                      
                      <span className="text-xs text-muted-foreground mt-2 px-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex items-start gap-4 animate-scale-in">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-accent/80 to-primary/60 shadow-lg">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm p-4 rounded-2xl rounded-tl-md shadow-lg border border-white/20 mr-4">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></div>
                        </div>
                        <span className="text-primary font-medium">Azyah is analyzing...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Preview Cards */}
        {(imagePreview || productImagePreview || skinImagePreview) && (
          <div className="mb-6 space-y-3">
            {imagePreview && analysisMode === 'chat' && (
              <Card className="glass-panel border-0 animate-scale-in">
                <CardContent className="p-4 flex items-center gap-4">
                  <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg shadow-md" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Ready for analysis</p>
                    <p className="text-xs text-muted-foreground">Beauty consultation image</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearImage} className="text-destructive hover:bg-destructive/10">
                    Remove
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {analysisMode === 'product_analysis' && (productImagePreview || skinImagePreview) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {productImagePreview && (
                  <Card className="glass-panel border-0 animate-scale-in">
                    <CardContent className="p-4 flex items-center gap-3">
                      <img src={productImagePreview} alt="Product" className="w-12 h-12 object-cover rounded-lg shadow-md" />
                      <div className="flex-1">
                        <p className="font-medium text-sm flex items-center gap-2">
                          <Package className="w-4 h-4 text-blue-500" />
                          Product Image
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setProductImage(null);
                        setProductImagePreview(null);
                      }} className="text-destructive hover:bg-destructive/10">
                        ×
                      </Button>
                    </CardContent>
                  </Card>
                )}
                
                {skinImagePreview && (
                  <Card className="glass-panel border-0 animate-scale-in">
                    <CardContent className="p-4 flex items-center gap-3">
                      <img src={skinImagePreview} alt="Skin" className="w-12 h-12 object-cover rounded-lg shadow-md" />
                      <div className="flex-1">
                        <p className="font-medium text-sm flex items-center gap-2">
                          <User className="w-4 h-4 text-amber-500" />
                          Skin Image
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setSkinImage(null);
                        setSkinImagePreview(null);
                      }} className="text-destructive hover:bg-destructive/10">
                        ×
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* Input Panel - Floating Style */}
        <Card className="glass-premium border-0 mt-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <VoiceRecorder 
                  onTranscription={handleVoiceTranscription} 
                  disabled={loading} 
                />
                
                {analysisMode === 'chat' ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-full border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                          disabled={loading}
                        >
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Upload selfie for analysis</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => productFileInputRef.current?.click()}
                            className={`rounded-full border-2 transition-all duration-300 ${
                              !productImage ? 'border-blue-500/50 bg-blue-500/5 animate-pulse' : 'border-border hover:border-primary/50'
                            }`}
                            disabled={loading}
                          >
                            <Package className="w-4 h-4 text-blue-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Upload product image</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => skinFileInputRef.current?.click()}
                            className={`rounded-full border-2 transition-all duration-300 ${
                              !skinImage ? 'border-amber-500/50 bg-amber-500/5 animate-pulse' : 'border-border hover:border-primary/50'
                            }`}
                            disabled={loading}
                          >
                            <User className="w-4 h-4 text-amber-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Upload skin/face image</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
                
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="w-16 h-10 rounded-full border-2">
                    <MapPin className="w-4 h-4" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">🇺🇸 US</SelectItem>
                    <SelectItem value="UK">🇬🇧 UK</SelectItem>
                    <SelectItem value="AU">🇦🇺 AU</SelectItem>
                    <SelectItem value="CA">🇨🇦 CA</SelectItem>
                    <SelectItem value="AE">🇦🇪 UAE</SelectItem>
                    <SelectItem value="SA">🇸🇦 SA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Message Input */}
              <div className="flex-1 relative">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    analysisMode === 'product_analysis' 
                      ? (!productImage || !skinImage 
                          ? "Upload both images to analyze compatibility..." 
                          : "Ask about product compatibility...")
                      : "Ask about skincare, makeup, or beauty tips..."
                  }
                  className="h-12 pr-12 rounded-full border-2 bg-background/50 backdrop-blur-sm focus:border-primary/50 transition-all duration-300"
                  disabled={loading}
                />
                <Button
                  onClick={handleSendMessage}
                  size="icon"
                  className="absolute right-1 top-1 h-10 w-10 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
                  disabled={loading || (!inputMessage.trim() && !selectedImage && analysisMode === 'chat') || 
                    (analysisMode === 'product_analysis' && (!productImage || !skinImage) && !inputMessage.trim())}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Beauty Tips Carousel */}
        <Card className="glass-panel mt-6 border-0">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">💡 Beauty Tip</p>
              <div className="flex items-center justify-center gap-3 animate-fade-in" key={currentTipIndex}>
                <span className="text-2xl">{beautyTips[currentTipIndex].icon}</span>
                <p className="text-sm font-medium">{beautyTips[currentTipIndex].tip}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Back Button - Fixed Position */}
        <div className="fixed top-20 left-4 md:hidden z-50">
          <Button 
            variant="outline"
            size="icon"
            onClick={() => window.history.back()}
            className="w-12 h-12 rounded-full bg-white/90 dark:bg-card/90 backdrop-blur-sm border-2 shadow-lg hover:shadow-xl transition-all duration-300"
            title="Back to Dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
        </div>

        {/* Sticky "Ask Azyah" Button for Mobile */}
        <div className="fixed bottom-6 right-6 md:hidden z-50">
          <Button 
            onClick={() => document.querySelector('input')?.focus()}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent shadow-lg hover:shadow-xl transition-all duration-300"
            title="Ask Azyah"
          >
            <Sparkles className="w-6 h-6 text-white" />
          </Button>
        </div>
      </main>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      <input
        ref={productFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleProductImageUpload}
        className="hidden"
      />
      <input
        ref={skinFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleSkinImageUpload}
        className="hidden"
      />
    </div>
  );
}