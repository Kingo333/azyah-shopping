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
import { Star, TrendingUp, Users, Gift, DollarSign, PenLine } from 'lucide-react';

const UPGRADE_SESSION_KEY = 'upgrade_shown_this_session';

const premiumPerks = [
  { icon: <TrendingUp className="h-4 w-4" />, label: 'AI Try-On: Picture & Video' },
  { icon: <Users className="h-4 w-4" />, label: 'UGC Collab' },
  { icon: <Gift className="h-4 w-4" />, label: 'Redeem Points' },
  { icon: <DollarSign className="h-4 w-4" />, label: 'Find Deals' },
  { icon: <PenLine className="h-4 w-4" />, label: 'Post & Earn' },
];

export default function PostLoginUpgradeModal() {
  const { user } = useAuth();
  const { isPremium, loading } = usePremium();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (isPremium) return;

    const alreadyShown = sessionStorage.getItem(UPGRADE_SESSION_KEY);
    if (alreadyShown) return;

    // Small delay so page renders first
    const timer = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem(UPGRADE_SESSION_KEY, 'true');
    }, 1200);

    return () => clearTimeout(timer);
  }, [user, isPremium, loading]);

  const handleUpgrade = () => {
    setOpen(false);
    navigate('/upgrade');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader className="text-center items-center gap-2">
          <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Star className="h-5 w-5 text-primary fill-primary" />
          </div>
          <DialogTitle className="text-lg font-serif">Go Premium</DialogTitle>
          <DialogDescription className="text-sm">
            Unlock every feature, earn more, and stand out.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {premiumPerks.map((perk, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="text-primary">{perk.icon}</span>
              <span>{perk.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleUpgrade} className="w-full">
            View Plans
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} className="w-full text-muted-foreground">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
