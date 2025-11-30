import { useState, useCallback, useMemo } from 'react';
import { motion, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronLeft, ChevronRight, MoveHorizontal } from 'lucide-react';

interface SwipeableImagesProps {
  images: string[];
  productInfo?: Array<{ name: string; brand: string }>;
}

const DISTANCE_THRESHOLD = 100;

export const SwipeableImages = ({ images, productInfo }: SwipeableImagesProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Motion values for swipe effect
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const currentImage = useMemo(() => images[currentIndex], [images, currentIndex]);
  const currentProduct = useMemo(() => productInfo?.[currentIndex], [productInfo, currentIndex]);

  const handleSwipeEnd = useCallback((event: any, info: PanInfo) => {
    const { offset } = info;

    if (offset.x > DISTANCE_THRESHOLD) {
      // Swipe right - go to previous image (loop to last if at first)
      setCurrentIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    } else if (offset.x < -DISTANCE_THRESHOLD) {
      // Swipe left - go to next image (loop to first if at last)
      setCurrentIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    } else {
      // Return to center
      animate(x, 0, { type: "spring", stiffness: 150, damping: 20 });
    }
  }, [currentIndex, images.length, x]);

  return (
    <div className="relative w-full h-full overflow-visible">
      <motion.div
        className="w-full h-full bg-white rounded-3xl shadow-xl overflow-hidden cursor-grab active:cursor-grabbing relative"
        style={{ x, rotate, opacity }}
        drag="x"
        dragElastic={0.2}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleSwipeEnd}
      >
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
          <img
            src={currentImage}
            alt={`Style ${currentIndex + 1}`}
            className="w-full h-full object-contain select-none pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Swipe Instruction */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full pointer-events-none">
          <MoveHorizontal className="w-3.5 h-3.5 text-white" />
          <span className="text-white text-xs font-medium">Swipe left or right</span>
        </div>

        {/* Product Info Overlay */}
        {currentProduct && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent">
            <h3 className="font-semibold text-gray-900 text-lg">{currentProduct.name}</h3>
            <p className="text-sm text-[#E91E8C] font-medium">By {currentProduct.brand}</p>
          </div>
        )}
      </motion.div>

      {/* Pagination Dots */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-all ${
              index === currentIndex ? 'w-6 bg-gray-800' : 'w-1.5 bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
