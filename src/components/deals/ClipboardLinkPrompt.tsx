import React from 'react';
import { Button } from '@/components/ui/button';
import { Link2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClipboardLinkPromptProps {
  url: string;
  onAccept: () => void;
  onDismiss: () => void;
}

/**
 * Toast-style prompt that appears when a URL is detected in the clipboard.
 * Allows user to open the URL in Deals or dismiss.
 */
export function ClipboardLinkPrompt({ url, onAccept, onDismiss }: ClipboardLinkPromptProps) {
  // Truncate URL for display
  const displayUrl = url.length > 40 ? url.slice(0, 40) + '...' : url;
  
  // Extract domain for cleaner display
  let domain = '';
  try {
    domain = new URL(url).hostname.replace('www.', '');
  } catch {
    domain = displayUrl;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="
          fixed bottom-[calc(90px+env(safe-area-inset-bottom))] left-4 right-4 z-50
          bg-background/95 backdrop-blur-xl
          border border-border/50
          rounded-2xl shadow-2xl
          p-4
        "
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Link2 className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Link detected in clipboard
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {domain}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl"
            onClick={onDismiss}
          >
            Dismiss
          </Button>
          <Button
            size="sm"
            className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
            onClick={onAccept}
          >
            Find Deals
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
