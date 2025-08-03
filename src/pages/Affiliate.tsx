import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Share2, TrendingUp, DollarSign, Users, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Affiliate = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState('');

  const generateAffiliateLink = async () => {
    if (!user) return;
    
    setIsGeneratingLink(true);
    try {
      const code = `${user.email?.split('@')[0]}-${Math.random().toString(36).substr(2, 6)}`;
      
      const { error } = await supabase
        .from('affiliate_links')
        .insert({
          user_id: user.id,
          code: code,
          active: true
        });

      if (error) throw error;
      
      setAffiliateCode(code);
      toast({
        title: "Affiliate link generated!",
        description: "Your unique referral code has been created.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate affiliate link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard.",
    });
  };

  const affiliateUrl = affiliateCode ? `https://azyah.app?ref=${affiliateCode}` : '';

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Affiliate Center</h1>
          <p className="text-muted-foreground">
            Share your love for fashion and earn commissions on every sale
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.00</div>
              <p className="text-xs text-muted-foreground">+0% from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">+0% from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">0% conversion rate</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5%</div>
              <p className="text-xs text-muted-foreground">Standard rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Generate Link Section */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Affiliate Link</CardTitle>
            <CardDescription>
              Create your unique referral link to start earning commissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!affiliateCode ? (
              <Button 
                onClick={generateAffiliateLink} 
                disabled={isGeneratingLink}
                className="w-full md:w-auto"
              >
                {isGeneratingLink ? 'Generating...' : 'Generate My Affiliate Link'}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="affiliate-link">Your Affiliate Link</Label>
                  <div className="flex gap-2">
                    <Input
                      id="affiliate-link"
                      value={affiliateUrl}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(affiliateUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: 'Check out Azyah',
                            url: affiliateUrl
                          });
                        }
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="affiliate-code">Your Affiliate Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="affiliate-code"
                      value={affiliateCode}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(affiliateCode)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Share2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Share</h3>
                <p className="text-sm text-muted-foreground">
                  Share your affiliate link with friends and followers
                </p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Shop</h3>
                <p className="text-sm text-muted-foreground">
                  They discover and purchase amazing fashion items
                </p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Earn</h3>
                <p className="text-sm text-muted-foreground">
                  You earn 5% commission on every successful purchase
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Pro Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Badge variant="secondary">Social Media</Badge>
                <p className="text-sm">Share your link on Instagram stories and posts with fashion content</p>
              </div>
              <div className="space-y-2">
                <Badge variant="secondary">Content Creation</Badge>
                <p className="text-sm">Create styling videos and include your affiliate link in descriptions</p>
              </div>
              <div className="space-y-2">
                <Badge variant="secondary">Personal Network</Badge>
                <p className="text-sm">Share with friends who love fashion and shopping</p>
              </div>
              <div className="space-y-2">
                <Badge variant="secondary">Seasonal Trends</Badge>
                <p className="text-sm">Promote trending items during peak shopping seasons</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Affiliate;