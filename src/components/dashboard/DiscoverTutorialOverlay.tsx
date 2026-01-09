import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, User, Link2, DollarSign, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DiscoverTutorialOverlayProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export function DiscoverTutorialOverlay({ isVisible, onDismiss }: DiscoverTutorialOverlayProps) {
  const [step, setStep] = useState<'discover' | 'profile'>('discover');

  if (!isVisible) return null;

  const handleNext = () => {
    if (step === 'discover') {
      setStep('profile');
    } else {
      onDismiss();
    }
  };

  const handleDismiss = () => {
    setStep('discover'); // Reset for next time
    onDismiss();
  };

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
              clipPath: step === 'discover' 
                ? `inset(0 0 calc(64px + var(--safe-bottom, 0px)) 0)`
                : 'none'
            }}
            onClick={handleDismiss}
          />

          <AnimatePresence mode="wait">
            {step === 'discover' ? (
              /* Discover tooltip - positioned above the Discover button */
              <motion.div
                key="discover"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="fixed z-50 flex flex-col items-center left-[28%] md:left-[45%]"
                style={{
                  bottom: 'calc(64px + var(--safe-bottom, 0px) + 32px)',
                  transform: 'translateX(-50%)'
                }}
              >
                {/* Compact Card */}
                <div className="bg-card rounded-xl px-4 py-3 shadow-2xl border border-border text-center relative max-w-[220px]">
                  <button
                    onClick={handleDismiss}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-card border border-border hover:bg-muted transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>

                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <ShoppingBag className="h-4 w-4 text-[hsl(var(--azyah-maroon))]" />
                    <span className="text-sm font-medium text-foreground">Discover</span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Find products in a new way — swipe through items you love!
                  </p>

                  <Button
                    onClick={handleNext}
                    size="sm"
                    className="h-7 text-xs bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 text-white rounded-full px-4 mt-2"
                  >
                    Next
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>

                {/* Arrow pointing down to Discover button */}
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
            ) : (
              /* Profile/Affiliate tooltip - centered on screen */
              <motion.div
                key="profile"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="fixed z-50 inset-0 flex items-center justify-center p-4"
              >
                <div className="bg-card rounded-xl px-5 py-4 shadow-2xl border border-border text-center relative max-w-[280px]">
                  <button
                    onClick={handleDismiss}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-card border border-border hover:bg-muted transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>

                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <User className="h-4 w-4 text-[hsl(var(--azyah-maroon))]" />
                    <span className="text-sm font-medium text-foreground">Your Style Page</span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    Create your personal style page to share outfits and earn from affiliate links!
                  </p>

                  <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Link2 className="h-3 w-3 text-[hsl(var(--azyah-maroon))]" />
                      <span>Add affiliate codes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-[hsl(var(--azyah-maroon))]" />
                      <span>Earn rewards</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground leading-relaxed mb-3 bg-muted/50 rounded-lg p-2">
                    Attach outfits to your codes so followers can see exactly what you're promoting!
                  </p>

                  <Button
                    onClick={handleDismiss}
                    size="sm"
                    className="h-7 text-xs bg-[hsl(var(--azyah-maroon))] hover:bg-[hsl(var(--azyah-maroon))]/90 text-white rounded-full px-4"
                  >
                    Got it!
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
