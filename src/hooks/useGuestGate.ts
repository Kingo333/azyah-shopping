import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestMode } from '@/hooks/useGuestMode';

interface UseGuestGateReturn {
  requireAuth: (action: string, callback: () => void) => void;
  showPrompt: boolean;
  setShowPrompt: (show: boolean) => void;
  promptAction: string;
}

export const useGuestGate = (): UseGuestGateReturn => {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptAction, setPromptAction] = useState('use this feature');

  const requireAuth = useCallback((action: string, callback: () => void) => {
    // If user is logged in (not a guest), execute the callback
    if (user && !isGuestMode()) {
      callback();
      return;
    }

    // If guest or no user, show the prompt
    setPromptAction(action);
    setShowPrompt(true);
  }, [user]);

  return {
    requireAuth,
    showPrompt,
    setShowPrompt,
    promptAction,
  };
};
