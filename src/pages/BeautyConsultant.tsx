"use client";

import { useState, useRef, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import ShopperNavigation from "@/components/ShopperNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Send, Sparkles, MapPin, Image as ImageIcon, Bot, User, Mic, ToggleLeft, ToggleRight, Package, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { VoiceMessage } from "@/components/VoiceMessage";
import { useUserCredits } from "@/hooks/useUserCredits";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { sanitizeHtml } from "@/utils/sanitizeHtml";

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

export default function BeautyConsultantPage() {
  const {
    user
  } = useAuth();
  const {
    credits,
    loading: creditsLoading,
    updateCredits
  } = useUserCredits();
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1',
    type: 'assistant',
    content: "Hi! I'm Azyah, your AI Beauty Consultant. Upload a selfie, speak to me, or ask any beauty question for personalized recommendations! Available in English & Arabic 💄✨",
    timestamp: new Date()
  }]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [region, setRegion] = useState('US');
  const [loading, setLoading] = useState(false);
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  // Product Analysis Mode
  const [analysisMode, setAnalysisMode] = useState<'chat' | 'product_analysis'>('chat');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [skinImage, setSkinImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [skinImagePreview, setSkinImagePreview] = useState<string | null>(null);
  
  // Tooltip tracking for insert image buttons
  const [showImageTooltips, setShowImageTooltips] = useState(false);
  const [hasShownTooltips, setHasShownTooltips] = useState(() => {
    // Check if tooltips have been shown in this session
    return sessionStorage.getItem('beautyConsultant_tooltips_shown') === 'true';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const skinFileInputRef = useRef<HTMLInputElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update greeting message when mode changes
  useEffect(() => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0 && newMessages[0].id === '1') {
        newMessages[0] = {
          ...newMessages[0],
          content: analysisMode === 'product_analysis' ? "Hi! I'm Azyah, your AI Beauty Consultant. Upload a product and your skin/face photo to get a compatibility score with confidence rating! Use me in stores while shopping. Available in English & Arabic 💄✨" : "Hi! I'm Azyah, your AI Beauty Consultant. Upload a selfie, speak to me, or ask any beauty question for personalized recommendations! Available in English & Arabic 💄✨"
        };
      }
      return newMessages;
    });

    // Show tooltips when switching to product analysis mode (one-time per session)
    if (analysisMode === 'product_analysis' && !hasShownTooltips) {
      setShowImageTooltips(true);
      setHasShownTooltips(true);
      sessionStorage.setItem('beautyConsultant_tooltips_shown', 'true');
      
      // Hide tooltips after 1 second
      setTimeout(() => {
        setShowImageTooltips(false);
      }, 1000);
    }
  }, [analysisMode, hasShownTooltips]);
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
      reader.onload = e => {
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
      reader.onload = e => {
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
      reader.onload = e => {
        setSkinImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const submitConsultation = async (message: string, image?: File, audioBlob?: Blob) => {
    setLoading(true);

    // Validate product analysis mode requirements
    if (analysisMode === 'product_analysis' && (!productImage || !skinImage)) {
      toast.error('Please upload both product and skin images for analysis');
      setLoading(false);
      return;
    }
    try {
      // Convert files to base64 for the API
      let imageBase64 = '';
      let audioBase64 = '';
      if (image) {
        imageBase64 = await fileToBase64(image);
      }
      if (audioBlob) {
        audioBase64 = await blobToBase64(audioBlob);
      }

      // Create request payload
      const payload: any = {
        user_id: user?.id || 'anonymous_' + Date.now(),
        message: message || '',
        region: region,
        mode: analysisMode
      };
      if (analysisMode === 'product_analysis') {
        if (productImage) {
          const productBase64 = await fileToBase64(productImage);
          payload.product_image = productBase64;
        }
        if (skinImage) {
          const skinBase64 = await fileToBase64(skinImage);
          payload.skin_image = skinBase64;
        }
      } else {
        if (imageBase64) {
          payload.image = imageBase64;
        }
      }
      if (audioBase64) {
        payload.audio = audioBase64;
      }
      console.log('Sending consultation request:', {
        ...payload,
        image: imageBase64 ? '[image data]' : '',
        audio: audioBase64 ? '[audio data]' : ''
      });
      const {
        createClient
      } = await import('@supabase/supabase-js');
      const supabase = createClient('https://klwolsopucgswhtdlsps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsd29sc29wdWNnc3dodGRsc3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNTQ4NTIsImV4cCI6MjA2OTgzMDg1Mn0.t1GFgR9xiIh7PBmoYs_xKLi1fF1iLTF6pqMlLMHowHQ');
      const response = await supabase.functions.invoke('beauty-consultation', {
        body: payload
      });
      if (response.error) {
        throw new Error(response.error.message || 'Consultation failed');
      }
      const result = response.data;
      console.log('Consultation result:', result);

      // Add assistant response with voice support
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: result.consultation.text,
        timestamp: new Date(),
        audioUrl: result.consultation.audio_url,
        transcription: result.consultation.voice_summary,
        isVoice: !!result.consultation.audio_url
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update credits from response
      if (result.consultation.credits_remaining !== undefined) {
        updateCredits({
          credits_remaining: result.consultation.credits_remaining,
          is_premium: result.consultation.is_premium || false
        });
      }

      // Auto-play Azyah's voice response if available
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

      // Handle credit-related errors specifically
      if (error instanceof Error && error.message.includes('No credits remaining')) {
        toast.error('No credits remaining. Upgrade to premium for more credits!');
        return;
      }
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `I apologize, but I encountered an error: ${error instanceof Error ? error.message : 'Consultation failed. Please try again.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error(error instanceof Error ? error.message : 'Consultation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions to convert files to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
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
        // Remove data:audio/webm;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };
  const handleSendMessage = async () => {
    if (analysisMode === 'product_analysis') {
      if (!productImage || !skinImage) {
        toast.error('Please upload both product and skin images for analysis');
        return;
      }
      if (!user) {
        toast.error('Please sign in to use the beauty consultant');
        return;
      }
      if (!credits || credits.credits_remaining <= 0) {
        toast.error('No credits remaining. Upgrade to premium for more credits!');
        return;
      }

      // Add user message with both images
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: inputMessage.trim() || "Analyze product compatibility",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      await submitConsultation(inputMessage.trim() || "Analyze product compatibility", undefined);
      setInputMessage('');
      clearProductAnalysisImages();
    } else {
      if (!inputMessage.trim() && !selectedImage) return;
      if (!user) {
        toast.error('Please sign in to use the beauty consultant');
        return;
      }
      if (!credits || credits.credits_remaining <= 0) {
        toast.error('No credits remaining. Upgrade to premium for more credits!');
        return;
      }

      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: inputMessage || (selectedImage ? "Here's my image for analysis" : ""),
        image: imagePreview || undefined,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      await submitConsultation(inputMessage, selectedImage || undefined);

      // Clear inputs
      setInputMessage('');
      clearImage();
    }
  };
  const handleVoiceTranscription = async (transcription: string) => {
    // Disable voice in product analysis mode if images aren't uploaded
    if (analysisMode === 'product_analysis' && (!productImage || !skinImage)) {
      toast.error('Please upload both product and skin images before using voice');
      return;
    }

    // Add voice message to chat
    const voiceMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: transcription,
      timestamp: new Date(),
      image: imagePreview || undefined,
      isVoice: true,
      transcription
    };
    setMessages(prev => [...prev, voiceMessage]);

    // Submit consultation with voice
    await submitConsultation(transcription, selectedImage || undefined);

    // Clear inputs
    setInputMessage('');
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return <>
      <SEOHead title="AI Beauty Consultant - Voice-Enabled Personalized Makeup Recommendations" description="Get personalized makeup recommendations with voice conversations and selfie analysis from Azyah, your AI-powered beauty consultant." />
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
        <ShopperNavigation />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-4 md:mb-6 animate-fade-in">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="relative">
                  <div className="p-3 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm border border-primary/10">
                    <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-md"></div>
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                    Azyah
                  </h1>
                  <p className="text-xs text-muted-foreground font-medium">
                    AI Beauty Consultant
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                Voice conversations, selfie analysis, shopping partner product score, and personalized beauty advice
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="mb-4 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/30">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`p-1.5 rounded-lg transition-all duration-300 ${analysisMode === 'chat' ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
                    <Bot className="h-3 w-3" />
                  </div>
                  <span className={`font-medium transition-colors duration-300 ${analysisMode === 'chat' ? 'text-primary' : 'text-muted-foreground'}`}>Chat</span>
                </div>
                
                <Button variant="ghost" size="sm" onClick={() => {
                setAnalysisMode(analysisMode === 'chat' ? 'product_analysis' : 'chat');
                clearImage();
                clearProductAnalysisImages();
              }} className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 transition-all duration-300">
                  {analysisMode === 'chat' ? <ToggleLeft className="h-4 w-4 text-muted-foreground" /> : <ToggleRight className="h-4 w-4 text-primary" />}
                </Button>
                
                <div className="flex items-center gap-2 text-sm">
                  <div className={`p-1.5 rounded-lg transition-all duration-300 ${analysisMode === 'product_analysis' ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
                    <Package className="h-3 w-3" />
                  </div>
                  <span className={`font-medium transition-colors duration-300 ${analysisMode === 'product_analysis' ? 'text-primary' : 'text-muted-foreground'}`}>Product Score</span>
                </div>
              </div>
            </div>

            {/* Credits Display */}
            <div className="mb-4 max-w-md mx-auto space-y-2">
              <CreditsDisplay creditsRemaining={credits?.credits_remaining || 0} isPremium={credits?.is_premium || false} loading={creditsLoading} />
              
              {/* Chat Persistence Info */}
              <div className="text-center text-xs text-muted-foreground bg-muted/20 rounded-lg p-2 border border-border/30">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="h-3 w-3" />
                  <span className="font-medium">Chat Memory</span>
                </div>
                {credits?.is_premium ? <p>
                    <span className="text-amber-500 font-medium">Premium:</span> Chat history and AI memory persist permanently
                  </p> : <p>
                    Chat history resets after 24 hours. 
                    <span className="text-amber-500 font-medium ml-1">Upgrade to Premium</span> for permanent memory and more credits
                  </p>}
              </div>
            </div>

            {/* Chat Container */}
            <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-xl animate-scale-in">
              {/* Messages Area */}
              <div className="h-[40vh] md:h-[50vh] overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-muted/5">
                {messages.map((message, index) => <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`} style={{
                animationDelay: `${index * 0.1}s`
              }}>
                    <div className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all duration-300 hover:scale-105 ${message.type === 'user' ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground' : 'bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20'}`}>
                        {message.type === 'user' ? <User className="h-4 w-4" /> : <span className="text-lg">👩🏻</span>}
                      </div>
                      
                      {/* Message Content */}
                      <div className="space-y-2 flex-1">
                        {message.isVoice && (message.audioUrl || message.transcription) ? <div className="transform transition-all duration-300 hover:scale-[1.02]">
                            <VoiceMessage audioUrl={message.audioUrl} transcription={message.transcription} isUser={message.type === 'user'} />
                          </div> : <div className={`rounded-2xl px-4 py-3 backdrop-blur-sm border shadow-sm transition-all duration-300 hover:shadow-md ${message.type === 'user' ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-primary/20' : 'bg-card/60 border-border/50'}`}>
                            {message.image && <div className="mb-3 rounded-xl overflow-hidden border border-border/30 relative">
                                <img src={message.image} alt="Uploaded selfie" className="w-full max-w-56 h-auto object-cover transition-transform duration-300 hover:scale-105" />
                                {loading && index === messages.length - 1 && <div className="absolute inset-0 rounded-xl overflow-hidden">
                                    <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px]"></div>
                                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-[scan_2s_ease-in-out_infinite]"></div>
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1.5 bg-black/50 rounded-full backdrop-blur-sm">
                                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                      <span className="text-xs text-white font-medium">Scanning...</span>
                                    </div>
                                  </div>}
                              </div>}
                            <div className="text-sm leading-relaxed">
                              <div dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(message.content)
                        }} />
                            </div>
                          </div>}
                        
                        <div className={`text-xs opacity-60 transition-opacity duration-300 hover:opacity-80 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>)}
                
                {loading && <div className="flex justify-start animate-fade-in">
                    <div className="flex gap-3 max-w-[85%] md:max-w-[75%]">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
                        <span className="text-lg animate-pulse">👩🏻</span>
                      </div>
                      <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{
                        animationDelay: '0.1s'
                      }}></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{
                        animationDelay: '0.2s'
                      }}></div>
                          <span className="ml-2 font-medium">
                            {isPlayingVoice ? "Azyah is speaking..." : "Analyzing your beauty profile..."}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-border/50 bg-card/30 backdrop-blur-sm p-3 md:p-4 space-y-3">
                {/* Region Selector */}
                {showRegionSelector && <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/30 animate-slide-in-right">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <MapPin className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-muted-foreground font-medium">Region:</span>
                    </div>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger className="w-auto h-8 text-sm bg-background/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">🇺🇸 United States</SelectItem>
                        <SelectItem value="UK">🇬🇧 United Kingdom</SelectItem>
                        <SelectItem value="AU">🇦🇺 Australia</SelectItem>
                        <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                        <SelectItem value="AE">🇦🇪 UAE</SelectItem>
                        <SelectItem value="SA">🇸🇦 Saudi Arabia</SelectItem>
                        <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                        <SelectItem value="FR">🇫🇷 France</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => setShowRegionSelector(false)} className="h-8 px-3 text-xs hover:bg-primary/10">
                      Done
                    </Button>
                  </div>}

                {/* Image Previews */}
                {analysisMode === 'chat' && imagePreview && <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/30 animate-scale-in">
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="w-14 h-14 object-cover rounded-lg border border-border/30 shadow-sm" />
                      {loading && <div className="absolute inset-0 rounded-lg overflow-hidden">
                          <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px]"></div>
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-[scan_2s_ease-in-out_infinite]"></div>
                        </div>}
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <ImageIcon className="h-2 w-2 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {loading ? "Scanning image..." : "Image ready"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {loading ? "AI analyzing image content" : "Ready for beauty analysis"}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={clearImage} className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive" disabled={loading}>
                      ×
                    </Button>
                  </div>}

                {/* Product Analysis Images */}
                {analysisMode === 'product_analysis' && (productImagePreview || skinImagePreview) && <div className="space-y-3">
                    {productImagePreview && <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/30 animate-scale-in">
                        <div className="relative">
                          <img src={productImagePreview} alt="Product Preview" className="w-14 h-14 object-cover rounded-lg border border-border/30 shadow-sm" />
                          {loading && <div className="absolute inset-0 rounded-lg overflow-hidden">
                              <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px]"></div>
                              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-[scan_2s_ease-in-out_infinite]"></div>
                            </div>}
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <Package className="h-2 w-2 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">Product Image</p>
                          <p className="text-xs text-muted-foreground">Beauty product for analysis</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => {
                    setProductImage(null);
                    setProductImagePreview(null);
                  }} className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive" disabled={loading}>
                          ×
                        </Button>
                      </div>}

                    {skinImagePreview && <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/30 animate-scale-in">
                        <div className="relative">
                          <img src={skinImagePreview} alt="Skin Preview" className="w-14 h-14 object-cover rounded-lg border border-border/30 shadow-sm" />
                          {loading && <div className="absolute inset-0 rounded-lg overflow-hidden">
                              <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px]"></div>
                              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-[scan_2s_ease-in-out_infinite]"></div>
                            </div>}
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                            <User className="h-2 w-2 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">Skin/Face Image</p>
                          <p className="text-xs text-muted-foreground">Your skin tone reference</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => {
                    setSkinImage(null);
                    setSkinImagePreview(null);
                  }} className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive" disabled={loading}>
                          ×
                        </Button>
                      </div>}
                  </div>}

                {/* Input Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                  {/* Action Buttons */}
                   <div className="flex gap-1.5 sm:gap-2 order-2 sm:order-1">
                     <VoiceRecorder onTranscription={handleVoiceTranscription} disabled={loading || (analysisMode === 'product_analysis' && (!productImage || !skinImage))} />
                    
                    {analysisMode === 'chat' ? <TooltipProvider>
                        <Tooltip open={!selectedImage} onOpenChange={() => {}}>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl border-border/50 bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300" title="Upload image" disabled={loading}>
                              <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </TooltipTrigger>
                          
                        </Tooltip>
                      </TooltipProvider> : <div className="flex flex-col gap-3">
                        <div className="flex gap-1.5 sm:gap-2">
                          <div className="flex flex-col items-center gap-1">
                            <TooltipProvider>
                              <Tooltip open={showImageTooltips || !productImage} onOpenChange={() => {}}>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" onClick={() => productFileInputRef.current?.click()} className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl border-border/50 bg-background/50 hover:bg-blue-500/5 hover:border-blue-500/30 transition-all duration-300 ${!productImage ? '!animate-slow-pulse shadow-lg shadow-blue-500/20 border-blue-500/30' : ''}`} title="Upload product image" disabled={loading}>
                                    <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-background border shadow-lg">
                                  <p className="text-xs font-medium">Click to insert product image</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <span className="text-xs text-muted-foreground text-center">Product</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <TooltipProvider>
                              <Tooltip open={showImageTooltips || !skinImage} onOpenChange={() => {}}>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" onClick={() => skinFileInputRef.current?.click()} className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl border-border/50 bg-background/50 hover:bg-amber-500/5 hover:border-amber-500/30 transition-all duration-300 ${!skinImage ? '!animate-slow-pulse shadow-lg shadow-amber-500/20 border-amber-500/30' : ''}`} title="Upload skin/face image" disabled={loading}>
                                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-background border shadow-lg">
                                  <p className="text-xs font-medium">Click to insert skin/face image</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <span className="text-xs text-muted-foreground text-center">Skin/Face</span>
                          </div>
                        </div>
                      </div>}
                    
                    <Button variant="outline" size="icon" onClick={() => setShowRegionSelector(!showRegionSelector)} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl border-border/50 bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300" title="Select region" disabled={loading}>
                      <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  
                  {/* Message Input */}
                  <div className="flex-1 relative order-1 sm:order-2">
                    <Input value={inputMessage} onChange={e => setInputMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder={analysisMode === 'product_analysis' ? (productImage && skinImage ? "Ask questions about product compatibility..." : "Upload product & skin images for compatibility analysis...") : "Ask about skincare, makeup, or beauty tips..."} className="h-11 sm:h-12 pr-14 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm focus:border-primary/50 focus:ring-primary/20 transition-all duration-300" disabled={loading || (analysisMode === 'product_analysis' && (!productImage || !skinImage))} />
                    <Button onClick={handleSendMessage} disabled={loading || (analysisMode === 'product_analysis' ? !productImage || !skinImage : !inputMessage.trim() && !selectedImage)} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105 disabled:hover:scale-100">
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {(analysisMode === 'chat' ? ["Analyze my skin tone", "Foundation recommendations", "Evening makeup look", "Skincare routine"] : ["Is this foundation a good match?", "Will this lipstick suit me?", "Rate this product compatibility", "How should I apply this?"]).map((suggestion, index) => <Button key={suggestion} variant="outline" size="sm" onClick={() => setInputMessage(suggestion)} className="h-7 sm:h-8 px-2 sm:px-3 text-xs rounded-lg border-border/30 bg-background/30 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300" disabled={loading || (analysisMode === 'product_analysis' && (!productImage || !skinImage))}>
                      {suggestion}
                    </Button>)}
                </div>
              </div>
            </div>

            {/* Safety Disclaimer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                💡 <strong>Beauty Tip:</strong> For best results, take selfies in natural lighting. 
                Remember, this is cosmetic advice only and not medical guidance.
              </p>
            </div>
          </div>
        </main>

        {/* Hidden File Inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        <input ref={productFileInputRef} type="file" accept="image/*" onChange={handleProductImageUpload} className="hidden" />
        <input ref={skinFileInputRef} type="file" accept="image/*" onChange={handleSkinImageUpload} className="hidden" />
      </div>
    </>;
}
