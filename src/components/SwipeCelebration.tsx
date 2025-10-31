import { memo } from 'react';
import { motion } from 'framer-motion';
import { Star, Heart, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SwipeCelebrationProps {
  onViewLikes: () => void;
  onStartOver: () => void;
}

export const SwipeCelebration = memo(({ onViewLikes, onStartOver }: SwipeCelebrationProps) => {
  return (
    <Card className="w-full max-w-md mx-auto rounded-3xl overflow-hidden border-0 shadow-xl">
      <CardContent className="p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 200,
            damping: 20
          }}
          className="flex flex-col items-center text-center space-y-6"
        >
          {/* Animated star burst */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.1
            }}
            className="relative"
          >
            {/* Glow rings */}
            <motion.div
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
            />
            
            <div className="relative bg-gradient-to-br from-primary via-primary to-primary/80 p-6 rounded-full shadow-lg shadow-primary/30">
              <Star className="h-12 w-12 text-primary-foreground" fill="currentColor" strokeWidth={2} />
            </div>
            
            {/* Floating hearts */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 0, x: 0 }}
                animate={{ 
                  opacity: [0, 1, 0],
                  y: [-20, -60],
                  x: [0, (i - 1) * 30]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeOut"
                }}
                className="absolute top-0 left-1/2"
              >
                <Heart className="h-4 w-4 text-primary" fill="currentColor" />
              </motion.div>
            ))}
          </motion.div>

          {/* Message */}
          <div className="space-y-2">
            <h3 className="text-2xl font-bold font-playfair">You've Seen Everything!</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Great job exploring! Check your likes or start over to discover more.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <Button
              onClick={onViewLikes}
              variant="outline"
              className="flex-1 gap-2 rounded-full"
            >
              <Heart className="h-4 w-4" />
              View Likes
            </Button>
            
            <Button
              onClick={onStartOver}
              className="flex-1 gap-2 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <RotateCcw className="h-4 w-4" />
              Start Over
            </Button>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
});

SwipeCelebration.displayName = 'SwipeCelebration';
