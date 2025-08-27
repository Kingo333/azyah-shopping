"use client";

import { useState, useRef, useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import ShopperNavigation from "@/components/ShopperNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      const formData = new FormData();
      
      if (message) {
        formData.append('message', message);
      }
      
      if (image) {
        formData.append('selfie', image);
      }
      
      if (audioBlob) {
        formData.append('audio', audioBlob);
      }
      
      formData.append('region', region);
      formData.append('user_id', user?.id || 'anonymous');

      const response = await fetch('https://eoal3jgggfuduet.m.pipedream.net', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ConsultationResult = await response.json();
      console.log('Webhook response:', result);
      
      if (!result.success) {
        throw new Error('Consultation was not successful');
      }
      
      // Add assistant response with voice support
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: result.consultation.text,
        timestamp: new Date(),
        audioUrl: result.consultation.audio_file,
        transcription: result.consultation.voice_summary,
        isVoice: !!result.consultation.audio_file,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Auto-play Azyah's voice response if available
      if (result.consultation.audio_file) {
        setIsPlayingVoice(true);
        const audio = new Audio(result.consultation.audio_file);
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
      
      <div className="min-h-screen bg-background">
        <ShopperNavigation />
        
        <main className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/20">
                  <Sparkles className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Azyah AI Beauty Consultant
                </h1>
              </div>
              <p className="text-muted-foreground text-sm">
                🎤 Speak, 📸 upload, or 💬 chat for personalized beauty advice
              </p>
            </div>

            {/* Chat Container */}
            <Card className="h-[70vh] flex flex-col">
              {/* Messages Area */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.type === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/20'
                      }`}>
                        {message.type === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                        )}
                      </div>
                      
                      {/* Message Content */}
                      <div className="space-y-2">
                        {message.isVoice && (message.audioUrl || message.transcription) ? (
                          <VoiceMessage
                            audioUrl={message.audioUrl}
                            transcription={message.transcription}
                            isUser={message.type === 'user'}
                          />
                        ) : (
                          <div className={`rounded-2xl px-4 py-2 ${
                            message.type === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted/80'
                          }`}>
                            {message.image && (
                              <div className="mb-2 rounded-lg overflow-hidden">
                                <img 
                                  src={message.image} 
                                  alt="Uploaded image" 
                                  className="max-w-48 h-auto object-cover"
                                />
                              </div>
                            )}
                            <div className="text-sm whitespace-pre-wrap leading-relaxed">
                              <div dangerouslySetInnerHTML={{ __html: message.content }} />
                            </div>
                          </div>
                        )}
                        
                        <div className={`text-xs opacity-70 ${
                          message.type === 'user' ? 'text-right' : 'text-left'
                        } ${message.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex gap-3 max-w-[80%]">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/20 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div className="bg-muted/80 rounded-2xl px-4 py-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-pink-600"></div>
                          {isPlayingVoice ? "Azyah is speaking..." : "Analyzing your beauty profile..."}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Input Area */}
              <div className="border-t p-4 space-y-3">
                {/* Region Selector */}
                {showRegionSelector && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Region:</span>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger className="w-auto h-8 text-sm">
                        <SelectValue />
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowRegionSelector(false)}
                      className="h-8 px-2 text-xs"
                    >
                      Done
                    </Button>
                  </div>
                )}

                {/* Image Preview */}
                {imagePreview && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-12 h-12 object-cover rounded"
                    />
                    <span className="text-sm text-muted-foreground flex-1">Ready to analyze your selfie</span>
                    <Button variant="ghost" size="sm" onClick={clearImage} className="h-8 w-8 p-0">
                      ×
                    </Button>
                  </div>
                )}

                {/* Input Row */}
                <div className="flex items-end gap-2">
                  <div className="flex gap-1">
                    <VoiceRecorder
                      onTranscription={handleVoiceTranscription}
                      disabled={loading}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 w-10 p-0"
                      title="Upload image"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRegionSelector(!showRegionSelector)}
                      className="h-10 w-10 p-0"
                      title="Select region"
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex-1">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about makeup, upload a selfie, or speak for personalized advice..."
                      className="min-h-10 resize-none"
                      disabled={loading}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleSendMessage}
                    disabled={(!inputMessage.trim() && !selectedImage) || loading}
                    size="sm"
                    className="h-10 w-10 p-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Help text */}
                <div className="text-xs text-muted-foreground text-center">
                  💬 Type, 🎤 speak, or 📸 upload for personalized beauty advice
                </div>

                {/* Disclaimer */}
                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded text-center">
                  ⚠️ Cosmetic advice only, not medical advice. Always patch test new products.
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}