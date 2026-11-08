import { useState } from 'react';
import { Store } from 'lucide-react';
import { toast } from 'sonner';
import { SalesUnlockDialog } from '@/components/SalesUnlockDialog';

/**
 * Small "Sales" pill for guests on the try-on (retailer demos): opens the sales-code box. With the
 * right code the device is signed in to the demo account and the try-ons work.
 */
export const SalesModeButton = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-full border border-foreground/15 bg-background/70 px-2.5 py-1 text-[12px] font-medium text-muted-foreground hover:bg-foreground/5 active:scale-95 transition"
        aria-label="Sales mode"
      >
        <Store className="h-3.5 w-3.5" />
        Sales
      </button>
      <SalesUnlockDialog
        open={open}
        onOpenChange={setOpen}
        onUnlocked={() => toast.success('Sales mode is on', { description: 'Try-on is unlocked on this device for 12 hours.' })}
      />
    </>
  );
};
