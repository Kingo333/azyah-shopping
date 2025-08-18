// Visual Edits Mode Monitor
// Provides session recovery and monitoring for Visual Edits transitions

import { isVisualEditsMode, getStableAuthState, setStableAuthState } from './visualEditsDetection';
import { supabase } from '@/integrations/supabase/client';

export class VisualEditsMonitor {
  private modeChangeListeners: Array<(isActive: boolean) => void> = [];
  private currentMode: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.currentMode = isVisualEditsMode();
    this.startMonitoring();
  }

  private startMonitoring() {
    // Check for mode changes every 2 seconds
    this.checkInterval = setInterval(() => {
      const newMode = isVisualEditsMode();
      if (newMode !== this.currentMode) {
        this.currentMode = newMode;
        this.notifyModeChange(newMode);
        
        // Handle Visual Edits transitions
        if (newMode) {
          this.onEnterVisualEdits();
        } else {
          this.onExitVisualEdits();
        }
      }
    }, 2000);
  }

  private async onEnterVisualEdits() {
    console.log('VisualEditsMonitor: Entering Visual Edits mode');
    
    // Ensure current session is preserved
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setStableAuthState(session.user, session);
    }
  }

  private async onExitVisualEdits() {
    console.log('VisualEditsMonitor: Exiting Visual Edits mode');
    
    // Attempt session recovery if needed
    const currentSession = await supabase.auth.getSession();
    if (!currentSession.data.session) {
      await this.attemptSessionRecovery();
    }
  }

  private async attemptSessionRecovery() {
    console.log('VisualEditsMonitor: Attempting session recovery');
    
    const stableState = getStableAuthState();
    if (stableState && Date.now() - stableState.timestamp < (stableState.validity || 30 * 60 * 1000)) {
      try {
        // Try to refresh the session
        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: stableState.session.refresh_token
        });
        
        if (data.session && !error) {
          console.log('VisualEditsMonitor: Session recovery successful');
          setStableAuthState(data.user!, data.session);
        } else {
          console.log('VisualEditsMonitor: Session recovery failed, clearing stable state');
        }
      } catch (error) {
        console.error('VisualEditsMonitor: Session recovery error:', error);
      }
    }
  }

  private notifyModeChange(isActive: boolean) {
    this.modeChangeListeners.forEach(listener => {
      try {
        listener(isActive);
      } catch (error) {
        console.error('VisualEditsMonitor: Error in mode change listener:', error);
      }
    });
  }

  public onModeChange(listener: (isActive: boolean) => void) {
    this.modeChangeListeners.push(listener);
    
    // Return cleanup function
    return () => {
      const index = this.modeChangeListeners.indexOf(listener);
      if (index > -1) {
        this.modeChangeListeners.splice(index, 1);
      }
    };
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.modeChangeListeners = [];
  }
}

// Global monitor instance
export const visualEditsMonitor = new VisualEditsMonitor();