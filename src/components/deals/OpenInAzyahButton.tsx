import React, { useState } from 'react';
import { Browser } from '@capacitor/browser';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OpenInAzyahButtonProps {
  url: string;
  onContextExtracted?: (context: any) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

/**
 * "Open in Azyah" button that launches an in-app browser
 * for Phia-style in-session product extraction.
 * 
 * Note: Full WebView extraction with JS injection requires
 * a native plugin. This uses Capacitor Browser as a fallback
 * which opens the system browser.
 */
export function OpenInAzyahButton({
  url,
  onContextExtracted,
  className,
  variant = 'outline',
  size = 'sm',
}: OpenInAzyahButtonProps) {
  const [isOpening, setIsOpening] = useState(false);

  const handleOpenInAzyah = async () => {
    setIsOpening(true);
    
    try {
      // Open in Capacitor Browser (system in-app browser)
      // Full extraction would require a custom WebView plugin with JS injection
      await Browser.open({
        url,
        presentationStyle: 'popover',
        toolbarColor: '#1f2937', // Match Azyah dark theme
      });

      // Listen for browser closed event
      Browser.addListener('browserFinished', () => {
        setIsOpening(false);
        // In a full implementation, we'd receive the extracted context here
        // For now, this is a placeholder for when we add native WebView extraction
      });

    } catch (err) {
      console.error('Failed to open in-app browser:', err);
      
      // Fallback: open in system browser
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleOpenInAzyah}
      disabled={isOpening}
      className={cn(
        'gap-2 rounded-xl',
        'bg-primary/10 hover:bg-primary/20 border-primary/20',
        'text-primary',
        className
      )}
    >
      {isOpening ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Opening...
        </>
      ) : (
        <>
          <Globe className="h-4 w-4" />
          Open in Azyah
        </>
      )}
    </Button>
  );
}

export default OpenInAzyahButton;
