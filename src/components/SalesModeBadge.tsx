import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { setGuestMode } from '@/hooks/useGuestMode';
import { SALES_CHANGED_EVENT, clearSalesMode, salesModeState, salesModeUserId } from '@/lib/salesMode';

/**
 * Small "Sales demo" pill with Exit while this device is in sales mode. Ends sales mode by itself
 * after 12 hours (signs out of the demo account and goes back to guest).
 */
export const SalesModeBadge = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState(() => salesModeState());

  useEffect(() => {
    const refresh = () => setState(salesModeState());
    window.addEventListener(SALES_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    const id = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener(SALES_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
      window.clearInterval(id);
    };
  }, []);

  const exit = async () => {
    clearSalesMode();
    await signOut();
    setGuestMode();
    navigate('/dashboard', { replace: true });
  };

  // Someone signed in with their own account (or signed out): sales mode no longer applies.
  useEffect(() => {
    if (state === 'off' || !user) return;
    const salesUser = salesModeUserId();
    if (salesUser && user.id !== salesUser) clearSalesMode();
  }, [user, state]);

  // After 12 hours: sign out of the demo account and go back to guest.
  useEffect(() => {
    if (state !== 'expired' || !user) return; // wait for the session to load before deciding
    if (user.id === salesModeUserId()) void exit();
    else clearSalesMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, user]);

  if (state !== 'active' || !user) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 rounded-full bg-black/80 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 6px)' }}
    >
      <Store className="h-3.5 w-3.5" />
      <span>Sales demo</span>
      <button type="button" onClick={() => void exit()} className="ml-1 flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5">
        <LogOut className="h-3 w-3" /> Exit
      </button>
    </div>
  );
};
