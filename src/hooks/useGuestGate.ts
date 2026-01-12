import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestMode } from '@/hooks/useGuestMode';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface UseGuestGateReturn {
  requireAuth: (action: string, callback: () => void) => void;
  requireAuthSoft: (action: string, callback: () => void) => boolean;
  showPrompt: boolean;
  setShowPrompt: (show: boolean) => void;
  promptAction: string;
}

export const useGuestGate = (): UseGuestGateReturn => {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  // Non-blocking soft auth - shows toast instead of modal
  const requireAuthSoft = useCallback((action: string, callback: () => void): boolean => {
    if (user && !isGuestMode()) {
      callback();
      return true;
    }

    // Show non-blocking toast notification
    toast(`Sign in to ${action}`, {
      description: 'Create an account to save your favorites',
      action: {
        label: 'Sign Up',
        onClick: () => navigate('/onboarding/signup')
      },
      duration: 3000,
    });
    return false;
  }, [user, navigate]);

  return {
    requireAuth,
    requireAuthSoft,
    showPrompt,
    setShowPrompt,
    promptAction,
  };
};
