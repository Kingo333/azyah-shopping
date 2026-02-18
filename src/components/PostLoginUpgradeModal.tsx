import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/hooks/usePremium';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, TrendingUp, Users, Gift, PenLine } from 'lucide-react';

const UPGRADE_STORAGE_KEY = 'upgrade_last_shown_at';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const premiumPerks = [
  { icon: <TrendingUp className="h-3.5 w-3.5" />, label: 'AI Try-On' },
  { icon: <Users className="h-3.5 w-3.5" />, label: 'UGC Collab' },
  { icon: <Gift className="h-3.5 w-3.5" />, label: 'Redeem Points' },
  
  { icon: <PenLine className="h-3.5 w-3.5" />, label: 'Post & Earn' },
];

export default function PostLoginUpgradeModal() {
  const { user } = useAuth();
  const { isPremium, loading } = usePremium();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (isPremium) return;

    const lastShown = localStorage.getItem(UPGRADE_STORAGE_KEY);
    if (lastShown && Date.now() - Number(lastShown) < ONE_WEEK_MS) return;

    const timer = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(UPGRADE_STORAGE_KEY, String(Date.now()));
    }, 1200);

    return () => clearTimeout(timer);
  }, [user, isPremium, loading]);

  const handleUpgrade = () => {
    setOpen(false);
    navigate('/dashboard/upgrade');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-[340px] rounded-3xl border-2 border-primary/20 bg-gradient-to-b from-background via-background to-primary/5 p-0 overflow-hidden shadow-[0_8px_40px_hsl(var(--primary)/0.15)]"
        overlayClassName="bg-black/60 backdrop-blur-sm"
      >
        {/* Decorative glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative px-6 pt-8 pb-6 flex flex-col items-center text-center">
          <DialogHeader className="items-center gap-3 mb-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
              <Crown className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-xl font-serif">Go Premium</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Unlock every feature, earn more, and stand out.
            </DialogDescription>
          </DialogHeader>

          {/* Perks grid */}
          <div className="grid grid-cols-2 gap-2 w-full mb-5">
            {premiumPerks.map((perk, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2.5 text-xs font-medium ${
                  i === premiumPerks.length - 1 && premiumPerks.length % 2 !== 0
                    ? 'col-span-2 justify-center'
                    : ''
                }`}
              >
                <span className="text-primary">{perk.icon}</span>
                <span>{perk.label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-2 w-full">
            <Button onClick={handleUpgrade} variant="premium" className="w-full h-11 text-sm font-semibold rounded-xl">
              View Plans
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} className="w-full text-muted-foreground text-xs">
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
