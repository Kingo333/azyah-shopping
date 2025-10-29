import { useState, useEffect } from 'react';

export const useLayerScaling = (numberOfActiveLayers: number) => {
  const [availableHeight, setAvailableHeight] = useState(0);
  const [maxItemHeight, setMaxItemHeight] = useState(0);

  useEffect(() => {
    const calculateHeight = () => {
      const headerHeight = 60; // sticky header
      const tabsHeight = 56; // bottom category tabs
      const carouselHeight = 140; // bottom carousel
      const safeArea = 20; // safe area padding
      
      const viewportHeight = window.innerHeight;
      const usableHeight = viewportHeight - headerHeight - tabsHeight - carouselHeight - safeArea;
      setAvailableHeight(usableHeight);
      
      // Calculate max height per item (with some overlap allowance)
      const itemHeight = numberOfActiveLayers > 0 
        ? (usableHeight * 0.9) / numberOfActiveLayers 
        : usableHeight * 0.8;
      setMaxItemHeight(itemHeight);
    };
    
    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, [numberOfActiveLayers]);

  return { availableHeight, maxItemHeight };
};
