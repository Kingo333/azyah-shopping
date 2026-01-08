import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Share2, Download, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { SITE_URL, nativeShare } from '@/lib/nativeShare';

interface StyleLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  referralCode?: string | null;
}

export const StyleLinkModal = ({
  isOpen,
  onClose,
  username,
  referralCode,
}: StyleLinkModalProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  // Build the Style Link URL with optional referral
  const styleLinkUrl = referralCode
    ? `${SITE_URL}/u/${username}?ref=${referralCode}`
    : `${SITE_URL}/u/${username}`;

  // Generate QR code when modal opens
  useEffect(() => {
    if (isOpen && username) {
      generateQRCode();
    }
  }, [isOpen, username, styleLinkUrl]);

  const generateQRCode = async () => {
    setIsGeneratingQR(true);
    try {
      const qrUrl = await QRCode.toDataURL(styleLinkUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1a1a1a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(styleLinkUrl);
      toast.success('Link copied! Share it everywhere ✨');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    await nativeShare({
      title: 'My Azyah Style Link',
      text: 'Check out my outfits and style on Azyah!',
      url: styleLinkUrl,
      dialogTitle: 'Share your Style Link',
    });
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = `azyah-style-${username}-qr.png`;
    link.href = qrCodeUrl;
    link.click();
    toast.success('QR code downloaded!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Sparkles className="h-5 w-5 text-[hsl(var(--azyah-maroon))]" />
            My Style Link
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex flex-col items-center">
            {isGeneratingQR ? (
              <div className="w-48 h-48 bg-muted rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Generating...</span>
              </div>
            ) : qrCodeUrl ? (
              <div className="p-4 bg-white rounded-xl shadow-sm border">
                <img
                  src={qrCodeUrl}
                  alt="Style Link QR Code"
                  className="w-48 h-48"
                />
              </div>
            ) : null}
            
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Scan to view your Style Link page
            </p>
          </div>

          {/* URL Display */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Style Link</label>
            <div className="flex gap-2">
              <Input
                value={styleLinkUrl}
                readOnly
                className="text-xs bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleShare}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadQR}
              disabled={!qrCodeUrl}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download QR
            </Button>
          </div>

          {/* Tip */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">
              💡 <span className="font-medium">Pro tip:</span> Add this link to your Instagram or TikTok bio to share your style with followers
            </p>
          </div>

          {referralCode && (
            <p className="text-[10px] text-center text-muted-foreground">
              Referral code <span className="font-mono font-medium">{referralCode}</span> is embedded in your link
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
