import { useState, useCallback } from 'react';

export const useCarouselMemory = () => {
  const [carouselPositions, setCarouselPositions] = useState<Record<string, number>>({});

  const savePosition = useCallback((category: string, index: number) => {
    setCarouselPositions(prev => ({
      ...prev,
      [category]: index
    }));
  }, []);

  const getPosition = useCallback((category: string) => {
    return carouselPositions[category] || 0;
  }, [carouselPositions]);

  const clearPosition = useCallback((category: string) => {
    setCarouselPositions(prev => {
      const newPositions = { ...prev };
      delete newPositions[category];
      return newPositions;
    });
  }, []);

  return { savePosition, getPosition, clearPosition };
};
