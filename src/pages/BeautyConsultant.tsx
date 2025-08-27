"use client";

import { useState, useRef, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import ShopperNavigation from "@/components/ShopperNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Send, Sparkles, MapPin, Image as ImageIcon, Bot, User, Mic } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { VoiceMessage } from "@/components/VoiceMessage";

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
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hi! I'm Azyah, your AI Beauty Consultant. Upload a selfie, speak to me, or ask any beauty question for personalized recommendations! 💄✨",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [region, setRegion] = useState('US');
  const [loading, setLoading] = useState(false);
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitConsultation = async (message: string, image?: File, audioBlob?: Blob) => {
    setLoading(true);
    
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
      const payload = {
        user_id: user?.id || 'anonymous_' + Date.now(),
        message: message || '',
        region: region,
        image: imageBase64,
        audio: audioBase64
      };

      console.log('Sending consultation request:', { ...payload, image: imageBase64 ? '[image data]' : '', audio: audioBase64 ? '[audio data]' : '' });

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://klwolsopucgswhtdlsps.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsd29sc29wdWNnc3dodGRsc3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNTQ4NTIsImV4cCI6MjA2OTgzMDg1Mn0.t1GFgR9xiIh7PBmoYs_xKLi1fF1iLTF6pqMlLMHowHQ'
      );

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
        isVoice: !!result.consultation.audio_url,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
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
    if (!inputMessage.trim() && !selectedImage) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage || (selectedImage ? "Here's my selfie for analysis" : ""),
      image: imagePreview || undefined,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);

    // Submit consultation
    await submitConsultation(inputMessage, selectedImage || undefined);

    // Clear inputs
    setInputMessage('');
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVoiceTranscription = async (transcription: string) => {
    // Add voice message to chat
    const voiceMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: transcription,
      timestamp: new Date(),
      image: imagePreview || undefined,
      isVoice: true,
      transcription,
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <SEOHead 
        title="AI Beauty Consultant - Voice-Enabled Personalized Makeup Recommendations" 
        description="Get personalized makeup recommendations with voice conversations and selfie analysis from Azyah, your AI-powered beauty consultant." 
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
        <ShopperNavigation />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-4 md:mb-8 animate-fade-in">
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
                Voice conversations, selfie analysis, and personalized beauty advice
              </p>
            </div>

            {/* Chat Container */}
            <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-xl animate-scale-in">
              {/* Messages Area */}
              <div className="h-[40vh] md:h-[50vh] overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-muted/5">
                {messages.map((message, index) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all duration-300 hover:scale-105 ${
                        message.type === 'user' 
                          ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground' 
                          : 'bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20'
                      }`}>
                        {message.type === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <span className="text-lg">👩🏻</span>
                        )}
                      </div>
                      
                      {/* Message Content */}
                      <div className="space-y-2 flex-1">
                        {message.isVoice && (message.audioUrl || message.transcription) ? (
                          <div className="transform transition-all duration-300 hover:scale-[1.02]">
                            <VoiceMessage
                              audioUrl={message.audioUrl}
                              transcription={message.transcription}
                              isUser={message.type === 'user'}
                            />
                          </div>
                        ) : (
                          <div className={`rounded-2xl px-4 py-3 backdrop-blur-sm border shadow-sm transition-all duration-300 hover:shadow-md ${
                            message.type === 'user' 
                              ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-primary/20' 
                              : 'bg-card/60 border-border/50'
                          }`}>
                            {message.image && (
                              <div className="mb-3 rounded-xl overflow-hidden border border-border/30">
                                <img 
                                  src={message.image} 
                                  alt="Uploaded selfie" 
                                  className="w-full max-w-56 h-auto object-cover transition-transform duration-300 hover:scale-105"
                                />
                              </div>
                            )}
                            <div className="text-sm leading-relaxed">
                              <div dangerouslySetInnerHTML={{ __html: message.content }} />
                            </div>
                          </div>
                        )}
                        
                        <div className={`text-xs opacity-60 transition-opacity duration-300 hover:opacity-80 ${
                          message.type === 'user' ? 'text-right' : 'text-left'
                        }`}>
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="flex gap-3 max-w-[85%] md:max-w-[75%]">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
                        <span className="text-lg animate-pulse">👩🏻</span>
                      </div>
                      <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <span className="ml-2 font-medium">
                            {isPlayingVoice ? "Azyah is speaking..." : "Analyzing your beauty profile..."}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-border/50 bg-card/30 backdrop-blur-sm p-3 md:p-4 space-y-3">
                {/* Region Selector */}
                {showRegionSelector && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/30 animate-slide-in-right">
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowRegionSelector(false)}
                      className="h-8 px-3 text-xs hover:bg-primary/10"
                    >
                      Done
                    </Button>
                  </div>
                )}

                {/* Image Preview */}
                {imagePreview && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/30 animate-scale-in">
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-14 h-14 object-cover rounded-lg border border-border/30 shadow-sm"
                      />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <ImageIcon className="h-2 w-2 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Selfie ready</p>
                      <p className="text-xs text-muted-foreground">Analyzing your skin tone and features</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearImage} 
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      ×
                    </Button>
                  </div>
                )}

                {/* Input Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                  {/* Action Buttons */}
                  <div className="flex gap-1.5 sm:gap-2 order-2 sm:order-1">
                    <VoiceRecorder
                      onTranscription={handleVoiceTranscription}
                      disabled={loading}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl border-border/50 bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300"
                      title="Upload selfie"
                      disabled={loading}
                    >
                      <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowRegionSelector(!showRegionSelector)}
                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl border-border/50 bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300"
                      title="Select region"
                      disabled={loading}
                    >
                      <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  
                  {/* Message Input */}
                  <div className="flex-1 relative order-1 sm:order-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about skincare, makeup, or beauty tips..."
                      className="h-11 sm:h-12 pr-14 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                      disabled={loading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={loading || (!inputMessage.trim() && !selectedImage)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105 disabled:hover:scale-100"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    "Analyze my skin tone",
                    "Foundation recommendations", 
                    "Evening makeup look",
                    "Skincare routine"
                  ].map((suggestion, index) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => setInputMessage(suggestion)}
                      className="h-7 sm:h-8 px-2 sm:px-3 text-xs rounded-lg border-border/30 bg-background/30 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300"
                      disabled={loading}
                    >
                      {suggestion}
                    </Button>
                  ))}
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

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>
    </>
  );
}