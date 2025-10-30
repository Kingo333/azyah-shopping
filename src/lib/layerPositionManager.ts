/**
 * Layer Position Manager
 * Centralized state management for wardrobe layer positions
 * Handles position wrapping and synchronization across all layers
 */

type PositionChangeListener = (layerId: string, position: number) => void;

class LayerPositionManager {
  private positions: Map<string, number> = new Map();
  private listeners: Set<PositionChangeListener> = new Set();

  /**
   * Get current position for a layer (wraps to 0 if not set)
   */
  getPosition(layerId: string): number {
    return this.positions.get(layerId) ?? 0;
  }

  /**
   * Set position for a layer and notify listeners
   */
  setPosition(layerId: string, position: number): void {
    this.positions.set(layerId, position);
    this.notifyListeners(layerId, position);
  }

  /**
   * Shuffle a specific layer by incrementing position randomly
   * @param layerId - Layer to shuffle
   * @param itemCount - Number of items in the layer
   */
  shuffle(layerId: string, itemCount: number): void {
    if (itemCount <= 1) return;

    const currentPosition = this.getPosition(layerId);
    // Random increment between 1 and itemCount-1 to ensure different item
    const increment = Math.floor(Math.random() * (itemCount - 1)) + 1;
    const newPosition = (currentPosition + increment) % itemCount;
    
    this.setPosition(layerId, newPosition);
  }

  /**
   * Shuffle all unpinned layers
   */
  shuffleAll(layers: Array<{ id: string; itemCount: number; isPinned: boolean }>): void {
    layers.forEach(layer => {
      if (!layer.isPinned && layer.itemCount > 0) {
        this.shuffle(layer.id, layer.itemCount);
      }
    });
  }

  /**
   * Subscribe to position changes
   */
  subscribe(listener: PositionChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of position change
   */
  private notifyListeners(layerId: string, position: number): void {
    this.listeners.forEach(listener => listener(layerId, position));
  }

  /**
   * Reset all positions
   */
  reset(): void {
    this.positions.clear();
  }
}

// Singleton instance
export const layerPositionManager = new LayerPositionManager();
