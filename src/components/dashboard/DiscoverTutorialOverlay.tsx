import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X } from 'lucide-react';
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
              // Cut out the bottom navigation area
              clipPath: `inset(0 0 calc(64px + var(--safe-bottom, 0px)) 0)`
            }}
            onClick={onDismiss}
          />

          {/* Spotlight glow on the Discover button area */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="fixed z-40 pointer-events-none"
            style={{
              bottom: 'calc(64px + var(--safe-bottom, 0px) - 30px)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80px',
              height: '80px',
              background: 'radial-gradient(circle, rgba(122, 20, 62, 0.4) 0%, transparent 70%)',
              borderRadius: '50%'
            }}
          />

          {/* Tooltip pointing down to Discover button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="fixed z-50 left-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{
              bottom: 'calc(64px + var(--safe-bottom, 0px) + 80px)'
            }}
          >
            {/* Card */}
            <div className="bg-card rounded-2xl p-5 shadow-2xl border border-border max-w-xs mx-4 text-center">
              {/* Close button */}
              <button
                onClick={onDismiss}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Icon */}
              <div className="w-12 h-12 rounded-full bg-[hsl(var(--azyah-maroon))] flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="h-6 w-6 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-serif font-medium text-foreground mb-2">
                Discover Items
              </h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Find products in a whole new way of shopping! Swipe through items you'll love.
              </p>

              {/* CTA Button */}
              <Button
                onClick={onDismiss}
                className="w-full bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 text-white rounded-full"
              >
                Got it!
              </Button>
            </div>

            {/* Arrow pointing down */}
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="mt-3"
            >
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none"
                className="text-[hsl(var(--azyah-maroon))]"
              >
                <path 
                  d="M12 4V20M12 20L6 14M12 20L18 14" 
                  stroke="currentColor" 
                  strokeWidth="2" 
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
