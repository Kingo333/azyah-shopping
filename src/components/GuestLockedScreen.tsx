import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useLongPress } from '@/hooks/useLongPress';
import { SalesUnlockDialog } from '@/components/SalesUnlockDialog';

const LABELS: Array<[string, string]> = [
  ['/settings', 'Settings'],
  ['/dress-me', 'Dress Me'],
  ['/likes', 'your likes'],
  ['/wishlist', 'your wishlist'],
  ['/cart', 'your cart'],
  ['/ugc', 'posting'],
  ['/events', 'events'],
  ['/toy-replica', 'Toy Replica'],
];

export const lockedFeatureName = (pathname: string): string =>
  LABELS.find(([p]) => pathname === p || pathname.startsWith(p + '/'))?.[1] ?? 'this feature';

/**
 * What a guest sees on a shopper page that only works with an account. Hidden: holding the
 * title for 2 seconds opens the sales-code box, as on the sign-up popup.
 */
export const GuestLockedScreen = ({ pathname }: { pathname: string }) => {
  const navigate = useNavigate();
  const [salesOpen, setSalesOpen] = useState(false);
  const longPress = useLongPress(() => setSalesOpen(true));
  const feature = lockedFeatureName(pathname);

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 pb-24 text-center">
      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h1 className="text-xl font-semibold" {...longPress}>Create an Account</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Sign up for free to use {feature}. It only takes a few seconds!
      </p>
      <Button className="w-full max-w-xs rounded-full" onClick={() => navigate('/onboarding/signup')}>
        Sign Up Free
      </Button>
      <Button variant="ghost" className="w-full max-w-xs rounded-full" onClick={() => navigate('/dashboard')}>
        Keep browsing
      </Button>
      <SalesUnlockDialog
        open={salesOpen}
        onOpenChange={setSalesOpen}
        onUnlocked={() => toast.success('Sales mode is on', { description: 'Try-on is unlocked on this device for 12 hours.' })}
      />
    </main>
  );
};
