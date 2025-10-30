/**
 * Layer Position Manager
 * Centralized position state for wardrobe layers with infinite wrapping
 */

export interface LayerPosition {
  layerId: string;
  position: number; // Current position index (0-based)
  itemCount: number; // Total items in this layer
}

class LayerPositionManager {
  private positions: Map<string, LayerPosition> = new Map();
  private listeners: Set<(positions: Map<string, LayerPosition>) => void> = new Set();

  /**
   * Initialize or update a layer's position state
   */
  setLayer(layerId: string, itemCount: number, initialPosition: number = 0): void {
    this.positions.set(layerId, {
      layerId,
      position: this.wrapPosition(initialPosition, itemCount),
      itemCount,
    });
    this.notifyListeners();
  }

  /**
   * Remove a layer from tracking
   */
  removeLayer(layerId: string): void {
    this.positions.delete(layerId);
    this.notifyListeners();
  }

  /**
   * Update position for a specific layer
   */
  updatePosition(layerId: string, newPosition: number): void {
    const layer = this.positions.get(layerId);
    if (!layer) return;

    this.positions.set(layerId, {
      ...layer,
      position: this.wrapPosition(newPosition, layer.itemCount),
    });
    this.notifyListeners();
  }

  /**
   * Navigate to next item (with wrapping)
   */
  next(layerId: string): void {
    const layer = this.positions.get(layerId);
    if (!layer) return;
    this.updatePosition(layerId, layer.position + 1);
  }

  /**
   * Navigate to previous item (with wrapping)
   */
  prev(layerId: string): void {
    const layer = this.positions.get(layerId);
    if (!layer) return;
    this.updatePosition(layerId, layer.position - 1);
  }

  /**
   * Get current position for a layer
   */
  getPosition(layerId: string): number | undefined {
    return this.positions.get(layerId)?.position;
  }

  /**
   * Get all positions
   */
  getAllPositions(): Map<string, LayerPosition> {
    return new Map(this.positions);
  }

  /**
   * Subscribe to position changes
   */
  subscribe(listener: (positions: Map<string, LayerPosition>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Shuffle all layers (randomize positions)
   */
  shuffleAll(pinnedLayerIds: Set<string> = new Set()): void {
    this.positions.forEach((layer, layerId) => {
      if (!pinnedLayerIds.has(layerId) && layer.itemCount > 0) {
        const randomPosition = Math.floor(Math.random() * layer.itemCount);
        this.positions.set(layerId, {
          ...layer,
          position: randomPosition,
        });
      }
    });
    this.notifyListeners();
  }

  /**
   * Wrap position to valid range using modulo
   */
  private wrapPosition(position: number, itemCount: number): number {
    if (itemCount === 0) return 0;
    return ((position % itemCount) + itemCount) % itemCount;
  }

  /**
   * Notify all subscribers
   */
  private notifyListeners(): void {
    const positions = this.getAllPositions();
    this.listeners.forEach(listener => listener(positions));
  }

  /**
   * Clear all state
   */
  reset(): void {
    this.positions.clear();
    this.notifyListeners();
  }
}

// Singleton instance
export const layerPositionManager = new LayerPositionManager();
