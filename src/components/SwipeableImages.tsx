import { useState, useCallback, useMemo } from 'react';
import { motion, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SwipeableImagesProps {
  images: string[];
}

const DISTANCE_THRESHOLD = 100;

export const SwipeableImages = ({ images }: SwipeableImagesProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Motion values for swipe effect
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const currentImage = useMemo(() => images[currentIndex], [images, currentIndex]);

  const handleSwipeEnd = useCallback((event: any, info: PanInfo) => {
    const { offset } = info;

    if (offset.x > DISTANCE_THRESHOLD && currentIndex > 0) {
      // Swipe right - go to previous image
      setCurrentIndex(prev => prev - 1);
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    } else if (offset.x < -DISTANCE_THRESHOLD && currentIndex < images.length - 1) {
      // Swipe left - go to next image
      setCurrentIndex(prev => prev + 1);
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    } else {
      // Return to center
      animate(x, 0, { type: "spring", stiffness: 150, damping: 20 });
    }
  }, [currentIndex, images.length, x]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100">
      <motion.div
        className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ x, rotate, opacity }}
        drag="x"
        dragElastic={0.2}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleSwipeEnd}
      >
        <img
          src={currentImage}
          alt={`Style ${currentIndex + 1}`}
          className="w-full h-full object-contain select-none pointer-events-none"
          draggable={false}
        />
      </motion.div>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-all ${
              index === currentIndex ? 'w-6 bg-gray-800' : 'w-1.5 bg-gray-800/30'
            }`}
          />
        ))}
      </div>

      {/* Pulsing Swipe Indicators */}
      {currentIndex > 0 && (
        <motion.div
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-sm rounded-full p-3 shadow-lg"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </motion.div>
      )}
      {currentIndex < images.length - 1 && (
        <motion.div
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-sm rounded-full p-3 shadow-lg"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </motion.div>
      )}
    </div>
  );
};
