import { useState } from 'react';
import { Loader2, Store } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { unlockSales } from '@/lib/salesMode';

interface SalesUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the device is signed in to the sales demo account. */
  onUnlocked?: () => void;
}

/** The hidden sales-code box (opened by a long-press on the sign-up popup's title). */
export const SalesUnlockDialog = ({ open, onOpenChange, onUnlocked }: SalesUnlockDialogProps) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = (next: boolean) => {
    if (busy) return;
    if (!next) {
      setCode('');
      setError(null);
    }
    onOpenChange(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await unlockSales(code.trim());
    setBusy(false);
    if (res.ok) {
      setCode('');
      onOpenChange(false);
      onUnlocked?.();
      return;
    }
    setError(res.message ?? 'Could not open sales mode.');
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="h-5 w-5 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">Sales mode</DialogTitle>
          <DialogDescription className="text-center">Enter the sales code to use the try-on.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={32}
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(null); }}
            placeholder="Code"
            aria-label="Sales code"
            className="text-center tracking-[0.3em]"
            autoFocus
          />
          {error && <p className="text-sm text-destructive text-center" role="alert">{error}</p>}
          <Button type="submit" className="w-full rounded-full" disabled={busy || !code.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
