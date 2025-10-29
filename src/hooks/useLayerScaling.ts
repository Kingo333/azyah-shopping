import { useState, useEffect } from 'react';

export const useLayerScaling = () => {
  const [availableHeight, setAvailableHeight] = useState(0);
  const [availableWidth, setAvailableWidth] = useState(0);

  useEffect(() => {
    const calculateDimensions = () => {
      const headerHeight = 60;
      const categoryPillsHeight = 60; // floating pills at bottom
      const safeAreaBottom = 20;
      
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Canvas height: full viewport minus controls
      const canvasHeight = viewportHeight - headerHeight - categoryPillsHeight - safeAreaBottom;
      
      setAvailableHeight(canvasHeight);
      setAvailableWidth(viewportWidth);
    };
    
    calculateDimensions();
    window.addEventListener('resize', calculateDimensions);
    return () => window.removeEventListener('resize', calculateDimensions);
  }, []);

  return { 
    availableHeight, 
    availableWidth,
    maxItemHeight: availableHeight * 0.78, // 78dvh equivalent
    maxItemWidth: availableWidth * 0.92,   // 92vw equivalent
  };
};
