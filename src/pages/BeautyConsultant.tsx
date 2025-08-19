import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WandSparkles, Upload, Camera, Eye, EyeOff, Trash2, Copy, Download, Play, Pause } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import ShopperNavigation from '@/components/ShopperNavigation';

interface RecItem {
  name: string;
  finish?: string;
  why_it_matches: string;
  shade_family?: string;
  price_tier?: 'drugstore' | 'mid' | 'premium';
  alt_options?: string[];
}

interface BeautyConsultation {
  skin_profile: {
    tone_depth: 'fair' | 'light' | 'medium' | 'tan' | 'deep';
    undertone: 'cool' | 'warm' | 'neutral' | 'olive';
    skin_type: 'dry' | 'oily' | 'combination' | 'normal' | 'sensitive';
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
}

const BeautyConsultant: React.FC = () => {
  const { user } = useAuth();
  const [img, setImg] = useState<string | undefined>();
  const [collapsed, setCollapsed] = useState(true);
  const [data, setData] = useState<BeautyConsultation | undefined>();
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState<{ 
    finish?: string; 
    coverage?: 'light' | 'medium' | 'full' 
  }>({});

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onUpload = async (file: File) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use the beauty consultant.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const b64 = await fileToBase64(file);
      setImg(b64);
      
      const response = await supabase.functions.invoke('beauty-consult', {
        body: { 
          image_base64: b64, 
          prefs,
          user_id: user.id 
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Analysis failed');
      }

      setData(response.data);
      setCollapsed(true);
      
      toast({
        title: "Analysis complete!",
        description: "Your personalized beauty recommendations are ready."
      });
    } catch (error) {
      console.error('Error analyzing photo:', error);
      toast({
        title: "Analysis failed",
        description: "Please try again with a clear, well-lit photo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const answerChip = async (key: 'finish' | 'coverage', val: string) => {
    if (!img || !user) return;
    
    setLoading(true);
    try {
      const newPrefs = { ...prefs, [key]: val };
      setPrefs(newPrefs);
      
      const response = await supabase.functions.invoke('beauty-consult', {
        body: { 
          image_base64: img, 
          prefs: newPrefs,
          user_id: user.id 
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Update failed');
      }

      setData(response.data);
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Update failed",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyRoutine = () => {
    if (!data) return;
    
    let routine = `My Beauty Routine\n\n`;
    routine += `Skin Profile: ${data.skin_profile.tone_depth} ${data.skin_profile.undertone} ${data.skin_profile.skin_type}\n\n`;
    
    Object.entries(data.recommendations).forEach(([section, items]) => {
      routine += `${section.replace('_', ' / ').toUpperCase()}:\n`;
      items.slice(0, 3).forEach((item, i) => {
        routine += `${i + 1}. ${item.name}`;
        if (item.finish) routine += ` (${item.finish})`;
        if (item.shade_family) routine += ` - ${item.shade_family}`;
        routine += `\n   ${item.why_it_matches}\n`;
      });
      routine += '\n';
    });
    
    if (data.technique_notes.length > 0) {
      routine += 'TECHNIQUE NOTES:\n';
      data.technique_notes.forEach((note, i) => {
        routine += `• ${note}\n`;
      });
    }
    
    navigator.clipboard.writeText(routine);
    toast({
      title: "Routine copied!",
      description: "Your beauty routine has been copied to clipboard."
    });
  };

  return (
    <div className="min-h-screen dashboard-bg">
      <SEOHead 
        title="AI Beauty Consultant - Azyah"
        description="Get personalized beauty recommendations with our AI-powered beauty consultant"
      />
      
      <div className="container mx-auto max-w-6xl p-4">
        <ShopperNavigation />
        
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <section className="space-y-4">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WandSparkles className="h-8 w-8 text-pink-600" />
                <h1 className="text-2xl font-bold font-playfair">Beauty Consultant</h1>
                <Badge variant="secondary" className="bg-pink-100 text-pink-700">AI Powered</Badge>
              </div>
              {img && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setCollapsed(!collapsed)}
                  >
                    {collapsed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {collapsed ? "Show photo" : "Hide photo"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setImg(undefined);
                      setData(undefined);
                      setPrefs({});
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )}
            </header>

            <p className="text-muted-foreground">
              Upload a clear, front-facing selfie to get personalized beauty recommendations powered by AI.
            </p>

            {!img && (
              <Card className="border-dashed border-2 hover:border-pink-300 transition-colors">
                <CardContent className="p-8">
                  <label className="cursor-pointer block text-center space-y-4">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => e.target.files && onUpload(e.target.files[0])}
                      disabled={loading}
                    />
                    <div className="w-16 h-16 mx-auto rounded-full bg-pink-100 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-pink-600" />
                    </div>
                    <div>
                      <p className="font-medium">Upload a selfie</p>
                      <p className="text-sm text-muted-foreground">
                        Make sure your face is well-lit and clearly visible
                      </p>
                    </div>
                  </label>
                </CardContent>
              </Card>
            )}

            {loading && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing your photo...</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {data?.questions && data.questions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {data.questions.includes("finish") && ["Matte", "Natural", "Glow"].map(x => (
                      <Button
                        key={x}
                        variant="outline"
                        size="sm"
                        onClick={() => answerChip("finish", x.toLowerCase())}
                        disabled={loading}
                      >
                        {x}
                      </Button>
                    ))}
                    {data.questions.includes("coverage") && ["Light", "Medium", "Full"].map(x => (
                      <Button
                        key={x}
                        variant="outline"
                        size="sm"
                        onClick={() => answerChip("coverage", x.toLowerCase())}
                        disabled={loading}
                      >
                        {x}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {data && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Skin Profile</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Depth: {data.skin_profile.tone_depth}</Badge>
                      <Badge variant="outline">Undertone: {data.skin_profile.undertone}</Badge>
                      <Badge variant="outline">Type: {data.skin_profile.skin_type}</Badge>
                      <Badge variant="outline">
                        Confidence: {(data.skin_profile.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    {data.skin_profile.visible_concerns.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-muted-foreground mb-2">Visible concerns:</p>
                        <div className="flex flex-wrap gap-1">
                          {data.skin_profile.visible_concerns.map((concern, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {concern}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {(['primer', 'foundation_concealer', 'brows_eyeliner_bronzer', 'shadow_palette'] as const).map(section => (
                  <Card key={section}>
                    <CardHeader>
                      <CardTitle className="text-lg capitalize">
                        {section.replace(/_/g, ' / ')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-1 gap-3">
                        {data.recommendations[section].slice(0, 3).map((r, i) => (
                          <div key={i} className="p-4 rounded-lg border bg-card/50">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-medium">{r.name}</h3>
                              {r.price_tier && (
                                <Badge 
                                  variant={r.price_tier === 'drugstore' ? 'secondary' : 
                                          r.price_tier === 'mid' ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {r.price_tier}
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {r.finish && <p>Finish: {r.finish}</p>}
                              {r.shade_family && <p>Shade: {r.shade_family}</p>}
                            </div>
                            <p className="text-sm mt-2">{r.why_it_matches}</p>
                            {r.alt_options && r.alt_options.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-muted-foreground">Alternatives:</p>
                                <p className="text-xs">{r.alt_options.join(', ')}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {data.technique_notes.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Technique Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {data.technique_notes.map((note, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <span className="text-sm">{note}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button onClick={copyRoutine} variant="outline">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy routine
                  </Button>
                  <Button 
                    onClick={() => toast({ title: "Feature coming soon!", description: "Save to closet will be available soon." })}
                    variant="outline"
                  >
                    Save to My Closet
                  </Button>
                </div>
              </>
            )}
          </section>

          <aside className="space-y-4">
            {img && !collapsed && (
              <Card>
                <CardContent className="p-0">
                  <div className="rounded-lg overflow-hidden">
                    <img src={img} alt="Your selfie" className="w-full h-auto" />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <WandSparkles className="h-5 w-5" />
                  Voice & Audio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Hear your routine read aloud. Choose a voice and play or download as MP3.
                </p>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full" disabled>
                    <Play className="h-4 w-4 mr-2" />
                    Play routine (Coming soon)
                  </Button>
                  <Button variant="outline" className="w-full" disabled>
                    <Download className="h-4 w-4 mr-2" />
                    Download MP3 (Coming soon)
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tips for Better Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Camera className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <p>Use natural lighting for the most accurate skin analysis</p>
                </div>
                <div className="flex items-start gap-2">
                  <WandSparkles className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <p>Remove any makeup for the best skin type detection</p>
                </div>
                <div className="flex items-start gap-2">
                  <Eye className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <p>Face the camera directly and keep your eyes open</p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BeautyConsultant;