import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import beforeOutfit from '@/assets/before-outfit.jpg';
import afterOutfit from '@/assets/after-outfit.jpg';

interface BeforeAfterSliderProps {
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({ className = "" }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sway animation to demonstrate interaction
  useEffect(() => {
    if (hasInteracted || isDragging) return;

    let isCancelled = false;

    const runSwayAnimation = async () => {
      if (isCancelled) return;
      
      // Animate using smooth steps
      const steps = [35, 65, 50];
      const durations = [600, 800, 500];
      
      for (let i = 0; i < steps.length; i++) {
        if (isCancelled) return;
        setSliderPosition(steps[i]);
        await new Promise(r => setTimeout(r, durations[i]));
      }
    };

    const timeout = setTimeout(runSwayAnimation, 500);
    const interval = setInterval(runSwayAnimation, 4000);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [hasInteracted, isDragging]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setHasInteracted(true);
    setIsDragging(true);
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
    setHasInteracted(true);
    setIsDragging(true);
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
          clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
          transition: 'clip-path 0.5s ease-out'
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
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10 cursor-ew-resize animate-pulse"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)', transition: 'left 0.5s ease-out' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={{ opacity: isDragging ? 1 : [1, 0.7, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {/* Handle Circle with left-right arrows */}
        <motion.div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center"
          animate={{ scale: isDragging ? 1.1 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center">
            <div className="w-1 h-3 border-l-2 border-gray-400"></div>
            <div className="w-1 h-3 border-r-2 border-gray-400 ml-1"></div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Instruction text (only shown initially) */}
      {sliderPosition === 50 && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: isDragging ? 0 : 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/75 text-white text-xs px-3 py-1 rounded-full pointer-events-none"
        >
          Slide to compare
        </motion.div>
      )}
    </div>
  );
};