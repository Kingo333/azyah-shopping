import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface LayerScrollContextType {
  activeScrollIndex: number;
  setActiveScrollIndex: (index: number) => void;
  syncAllLayers: () => void;
  registerCarousel: (id: string, scrollFn: (index: number) => void) => void;
  unregisterCarousel: (id: string) => void;
}

const LayerScrollContext = createContext<LayerScrollContextType | undefined>(undefined);

export const LayerScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeScrollIndex, setActiveScrollIndex] = useState(0);
  const carouselsRef = useRef<Map<string, (index: number) => void>>(new Map());

  const registerCarousel = useCallback((id: string, scrollFn: (index: number) => void) => {
    console.log(`🔗 Registering carousel: ${id}`);
    carouselsRef.current.set(id, scrollFn);
  }, []);

  const unregisterCarousel = useCallback((id: string) => {
    console.log(`🔓 Unregistering carousel: ${id}`);
    carouselsRef.current.delete(id);
  }, []);

  const handleSetActiveScrollIndex = useCallback((index: number) => {
    console.log(`🎯 Global scroll index updated: ${index}`);
    setActiveScrollIndex(index);
    
    // Sync all registered carousels
    carouselsRef.current.forEach((scrollFn, id) => {
      console.log(`  → Syncing carousel: ${id} to index ${index}`);
      scrollFn(index);
    });
  }, []);

  const syncAllLayers = useCallback(() => {
    console.log(`🔄 Force syncing all ${carouselsRef.current.size} carousels to index ${activeScrollIndex}`);
    carouselsRef.current.forEach((scrollFn, id) => {
      scrollFn(activeScrollIndex);
    });
  }, [activeScrollIndex]);

  return (
    <LayerScrollContext.Provider
      value={{
        activeScrollIndex,
        setActiveScrollIndex: handleSetActiveScrollIndex,
        syncAllLayers,
        registerCarousel,
        unregisterCarousel,
      }}
    >
      {children}
    </LayerScrollContext.Provider>
  );
};

export const useLayerScroll = () => {
  const context = useContext(LayerScrollContext);
  if (!context) {
    throw new Error('useLayerScroll must be used within LayerScrollProvider');
  }
  return context;
};
