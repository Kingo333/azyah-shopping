import { useState } from 'react';
import { Link2, Copy, Share2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useUserReferralCode } from '@/hooks/useReferrals';
import { SITE_URL, nativeShare } from '@/lib/nativeShare';
import { StyleLinkModal } from '@/components/StyleLinkModal';

export function StyleLinkCard() {
  const { user } = useAuth();
  const { data: referralCode } = useUserReferralCode();
  const [showQRModal, setShowQRModal] = useState(false);

  // Get username from user metadata or fallback to user id
  const username = user?.user_metadata?.username || user?.id;

  // Build the Style Link URL
  const styleLinkUrl = referralCode
    ? `${SITE_URL}/u/${username}?ref=${referralCode}`
    : `${SITE_URL}/u/${username}`;

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(styleLinkUrl);
      toast.success('Link copied! Earn more when friends join.');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await nativeShare({
      title: 'My Azyah Style Link',
      text: 'Check out my outfits and style on Azyah! Shop my looks and earn rewards.',
      url: styleLinkUrl,
      dialogTitle: 'Share your Style Link',
    });
    
    if (success) {
      toast.success('Shared! Earn more when friends join & create.');
    }
  };

  const handleShowQR = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQRModal(true);
  };

  if (!user) return null;

  return (
    <>
      <div className="h-full rounded-xl border bg-gradient-to-br from-[hsl(var(--azyah-maroon))]/5 via-background to-[hsl(var(--azyah-maroon))]/10 p-3 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-[hsl(var(--azyah-maroon))]/10">
            <Link2 className="h-4 w-4 text-[hsl(var(--azyah-maroon))]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-semibold truncate">My Style Link</h3>
            <p className="text-[9px] text-muted-foreground leading-tight truncate">
              Share outfits + shop links
            </p>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-[10px] text-muted-foreground mb-3 leading-snug">
          Earn rewards when friends join & create
        </p>

        {/* Action Buttons */}
        <div className="mt-auto grid grid-cols-3 gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="h-7 text-[10px] px-1.5 gap-1"
          >
            <Copy className="h-3 w-3" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="h-7 text-[10px] px-1.5 gap-1"
          >
            <Share2 className="h-3 w-3" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShowQR}
            className="h-7 text-[10px] px-1.5 gap-1"
          >
            <QrCode className="h-3 w-3" />
            QR
          </Button>
        </div>
      </div>

      <StyleLinkModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        username={username || ''}
        referralCode={referralCode}
      />
    </>
  );
}
