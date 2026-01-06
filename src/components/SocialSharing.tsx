import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Share2, 
  Facebook, 
  Twitter, 
  Instagram, 
  MessageCircle,
  Copy,
  QrCode,
  Mail,
  Link2,
  Download,
  Heart,
  Users,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import { getShareableUrl, getProductShareUrl, SITE_URL } from '@/lib/nativeShare';

interface SocialSharingProps {
  item: {
    id: string;
    title: string;
    description?: string;
    image_url?: string;
    url?: string;
    type: 'product' | 'outfit' | 'mood-board' | 'post' | 'item';
  };
  user?: {
    name: string;
    avatar_url?: string;
  };
  onShare?: (platform: string, data: any) => void;
}

const SocialSharing = ({ item, user, onShare }: SocialSharingProps) => {
  const { toast } = useToast();
  const [showShareModal, setShowShareModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  // Generate the correct share URL based on item type
  const getShareUrl = (): string => {
    // If a custom URL is provided, use it
    if (item.url) return item.url;
    
    // Route based on item type
    switch (item.type) {
      case 'outfit':
        return getShareableUrl('outfit', item.id);
      case 'item':
        // 'item' refers to wardrobe items
        return getShareableUrl('item', item.id);
      case 'product':
        // Products use /products/:id route
        return getProductShareUrl(item.id);
      case 'mood-board':
        return `${SITE_URL}/mood-boards/${item.id}`;
      case 'post':
        return `${SITE_URL}/posts/${item.id}`;
      default:
        return `${SITE_URL}/${item.type}s/${item.id}`;
    }
  };

  const shareUrl = getShareUrl();
  const defaultMessage = `Check out this amazing ${item.type}: ${item.title}`;

  const platforms = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600',
      handler: () => shareToFacebook()
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-black',
      handler: () => shareToTwitter()
    },
    {
      name: 'Instagram',
      icon: Instagram,
      color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      handler: () => shareToInstagram()
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-600',
      handler: () => shareToWhatsApp()
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-gray-600',
      handler: () => shareViaEmail()
    },
    {
      name: 'Copy Link',
      icon: Copy,
      color: 'bg-gray-500',
      handler: () => copyToClipboard()
    }
  ];

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(customMessage || defaultMessage)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    trackShare('facebook');
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(customMessage || defaultMessage)}&url=${encodeURIComponent(shareUrl)}&hashtags=azyah,fashion`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    trackShare('twitter');
  };

  const shareToInstagram = () => {
    // Instagram doesn't support direct URL sharing, so we'll copy the text and open Instagram
    copyToClipboard();
    window.open('https://www.instagram.com', '_blank');
    toast({
      title: "Instagram sharing",
      description: "Link copied! You can now paste it in your Instagram story or bio.",
    });
    trackShare('instagram');
  };

  const shareToWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${customMessage || defaultMessage} ${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
    trackShare('whatsapp');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Check out this ${item.type} on Azyah`);
    const body = encodeURIComponent(`${customMessage || defaultMessage}\n\n${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    trackShare('email');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied!",
        description: "Share link has been copied to your clipboard.",
      });
      trackShare('clipboard');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const generateQRCode = async () => {
    setIsGeneratingQR(true);
    try {
      const qrUrl = await QRCode.toDataURL(shareUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrUrl);
      trackShare('qr-code');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate QR code.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `azyah-${item.type}-${item.id}-qr.png`;
      link.href = qrCodeUrl;
      link.click();
      trackShare('qr-download');
    }
  };

  const useNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: customMessage || defaultMessage,
          url: shareUrl
        });
        trackShare('native');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          toast({
            title: "Error",
            description: "Failed to share using native share.",
            variant: "destructive",
          });
        }
      }
    } else {
      toast({
        title: "Not supported",
        description: "Native sharing is not supported on this device.",
        variant: "destructive",
      });
    }
  };

  const trackShare = (platform: string) => {
    if (onShare) {
      onShare(platform, {
        item_id: item.id,
        item_type: item.type,
        platform,
        message: customMessage || defaultMessage,
        url: shareUrl,
        user_id: user?.name
      });
    }
    
    // Track in analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'share', {
        method: platform,
        content_type: item.type,
        item_id: item.id
      });
    }
  };

  return (
    <>
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share {item.type}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Item Preview */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {item.type}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custom Message */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Custom message (optional)
              </label>
              <Textarea
                placeholder={defaultMessage}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>

            {/* Native Share (if supported) */}
            {navigator.share && (
              <Button onClick={useNativeShare} className="w-full" variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Use device sharing
              </Button>
            )}

            {/* Platform Buttons */}
            <div className="grid grid-cols-3 gap-3">
              {platforms.map((platform) => (
                <Button
                  key={platform.name}
                  variant="outline"
                  className="flex flex-col items-center gap-2 h-auto py-3 px-2"
                  onClick={platform.handler}
                >
                  <div className={`p-2 rounded-full ${platform.color} text-white`}>
                    <platform.icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs">{platform.name}</span>
                </Button>
              ))}
            </div>

            {/* QR Code Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">QR Code</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateQRCode}
                  disabled={isGeneratingQR}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  {isGeneratingQR ? 'Generating...' : 'Generate'}
                </Button>
              </div>
              
              {qrCodeUrl && (
                <div className="text-center">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="mx-auto mb-3 border rounded-lg"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadQRCode}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download QR
                  </Button>
                </div>
              )}
            </div>

            {/* Share URL */}
            <div>
              <label className="text-sm font-medium mb-2 block">Share URL</label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Social Stats Preview */}
            <div className="text-center text-xs text-muted-foreground border-t pt-4">
              <div className="flex items-center justify-center gap-4">
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  Share for likes
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Grow community
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Discover fashion
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SocialSharing;
