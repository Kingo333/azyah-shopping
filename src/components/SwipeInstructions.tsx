import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';

interface SwipeInstructionsProps {
  show: boolean;
}

export const SwipeInstructions = memo(({ show }: SwipeInstructionsProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 25
          }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-xl bg-background/20 backdrop-blur-sm border border-border/10"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-foreground whitespace-nowrap">
            <ArrowLeft className="h-4 w-4" />
            <span>Pass</span>
            <span className="text-muted-foreground">•</span>
            <ArrowUp className="h-4 w-4" />
            <span>Save</span>
            <span className="text-muted-foreground">•</span>
            <ArrowRight className="h-4 w-4" />
            <span>Like</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

SwipeInstructions.displayName = 'SwipeInstructions';
