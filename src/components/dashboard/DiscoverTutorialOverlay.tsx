import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DiscoverTutorialOverlayProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export function DiscoverTutorialOverlay({ isVisible, onDismiss }: DiscoverTutorialOverlayProps) {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Dark overlay covering everything EXCEPT bottom navigation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40"
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              clipPath: `inset(0 0 calc(64px + var(--safe-bottom, 0px)) 0)`
            }}
            onClick={onDismiss}
          />

          {/* Compact tooltip centered above Discover button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="fixed z-50 left-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{
              bottom: 'calc(64px + var(--safe-bottom, 0px) + 16px)'
            }}
          >
            {/* Compact Card */}
            <div className="bg-card rounded-xl px-4 py-3 shadow-2xl border border-border text-center relative">
              <button
                onClick={onDismiss}
                className="absolute -top-2 -right-2 p-1 rounded-full bg-card border border-border hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>

              <p className="text-sm font-medium text-foreground mb-2">
                Shop items in a new way!
              </p>

              <Button
                onClick={onDismiss}
                size="sm"
                className="h-7 text-xs bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 text-white rounded-full px-4"
              >
                Got it
              </Button>
            </div>

            {/* Arrow pointing down */}
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              className="mt-2"
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none"
                className="text-[hsl(var(--azyah-maroon))]"
              >
                <path 
                  d="M12 4V20M12 20L6 14M12 20L18 14" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
