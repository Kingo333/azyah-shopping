import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import beforeOutfit from '@/assets/before-outfit.jpg';
import afterOutfit from '@/assets/after-outfit.jpg';

interface BeforeAfterSliderProps {
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({ className = "" }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoAnimating, setIsAutoAnimating] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setIsAutoAnimating(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setIsAutoAnimating(false);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Auto animation effect
  React.useEffect(() => {
    if (!isAutoAnimating || isDragging) return;
    
    const interval = setInterval(() => {
      setSliderPosition(prev => {
        // Oscillate between 40% and 60%
        if (prev <= 40) return 60;
        if (prev >= 60) return 40;
        return prev > 50 ? 40 : 60;
      });
    }, 2000); // Change every 2 seconds
    
    return () => clearInterval(interval);
  }, [isAutoAnimating, isDragging]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden cursor-ew-resize select-none ${className}`}
    >
      {/* After Image (right side) */}
      <div className="absolute inset-0">
        <img
          src={afterOutfit}
          alt="After outfit"
          className="w-full h-full object-cover"
          draggable={false}
        />
        <div className="absolute top-4 right-4 bg-black/75 text-white text-xs px-2 py-1 rounded-full">
          After
        </div>
      </div>
      
      {/* Before Image (left side) with clip mask */}
      <div 
        className="absolute inset-0"
        style={{
          clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
        }}
      >
        <img
          src={beforeOutfit}
          alt="Before outfit"
          className="w-full h-full object-cover"
          draggable={false}
        />
        <div className="absolute top-4 left-4 bg-black/75 text-white text-xs px-2 py-1 rounded-full">
          Before
        </div>
      </div>
      
      {/* Slider Handle */}
      <motion.div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10 cursor-ew-resize"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Handle Circle with left-right arrows */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className="flex items-center">
            <div className="w-1 h-3 border-l-2 border-gray-400"></div>
            <div className="w-1 h-3 border-r-2 border-gray-400 ml-1"></div>
          </div>
        </div>
      </motion.div>
      
      {/* Instruction text (only shown initially and when auto-animating) */}
      {sliderPosition === 50 && isAutoAnimating && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: isDragging ? 0 : 1 }}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/75 text-white text-xs px-3 py-1 rounded-full pointer-events-none"
        >
          Slide to compare
        </motion.div>
      )}
    </div>
  );
};