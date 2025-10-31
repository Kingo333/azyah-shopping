import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, Star } from 'lucide-react';

interface SwipeInstructionsProps {
  show: boolean;
}

export const SwipeInstructions = memo(({ show }: SwipeInstructionsProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 25
          }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-3 rounded-2xl glass-premium shadow-xl"
        >
          <div className="flex items-center gap-4 text-sm font-medium">
            <motion.div 
              className="flex items-center gap-1.5 text-destructive"
              animate={{ x: [-2, 0, -2] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <X className="h-4 w-4" />
              <span className="text-xs">Pass</span>
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-1.5 text-primary"
              animate={{ y: [-2, 0, -2] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            >
              <Star className="h-4 w-4" />
              <span className="text-xs">Save</span>
            </motion.div>
            
            <motion.div 
              className="flex items-center gap-1.5 text-primary"
              animate={{ x: [2, 0, 2] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
            >
              <Heart className="h-4 w-4" />
              <span className="text-xs">Like</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

SwipeInstructions.displayName = 'SwipeInstructions';
