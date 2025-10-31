import { memo } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SwipeEmptyStateProps {
  onReset?: () => void;
}

export const SwipeEmptyState = memo(({ onReset }: SwipeEmptyStateProps) => {
  return (
    <Card className="w-full max-w-md mx-auto rounded-3xl overflow-hidden border-0 shadow-xl">
      <CardContent className="p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center space-y-6"
        >
          {/* Animated icon */}
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1
            }}
            className="relative"
          >
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse" />
            <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-full">
              <Search className="h-12 w-12 text-primary" strokeWidth={1.5} />
            </div>
          </motion.div>

          {/* Message */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold font-playfair">No Products Found</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              We couldn't find any products matching your criteria. Try adjusting your filters or search terms.
            </p>
          </div>

          {/* Action button */}
          {onReset && (
            <Button
              onClick={onReset}
              variant="outline"
              className="gap-2 rounded-full px-6"
            >
              <RefreshCw className="h-4 w-4" />
              Reset Filters
            </Button>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
});

SwipeEmptyState.displayName = 'SwipeEmptyState';
