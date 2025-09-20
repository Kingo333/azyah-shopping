// Utility to convert between old slot-based and new item-based board state formats

interface OldSlot {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'tall' | 'wide' | 'square' | 'free';
  size: 'S' | 'M' | 'L';
  mask?: 'rect' | 'round' | 'circle';
  padding?: number;
  rotation?: number;
  itemId?: string;
  item?: any;
}

interface OldBoardState {
  canvas: {
    width: number;
    height: number;
    background: { type: string; color: string };
  };
  slots: OldSlot[];
  selectedSlotIds: string[];
  history?: any[];
  historyIndex?: number;
}

interface NewBoardItem {
  id: string;
  item: any;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

interface NewBoardState {
  canvas: {
    width: number;
    height: number;
    background: { type: string; color: string };
  };
  items: NewBoardItem[];
  selectedItemIds: string[];
}

export const convertOldToNewBoardState = (oldState: OldBoardState): NewBoardState => {
  // Convert slots with items to board items
  const items: NewBoardItem[] = oldState.slots
    .filter(slot => slot.item) // Only include slots that have items
    .map(slot => ({
      id: slot.id,
      item: slot.item,
      position: { x: slot.x, y: slot.y },
      size: { width: slot.w, height: slot.h }
    }));

  return {
    canvas: oldState.canvas,
    items,
    selectedItemIds: [] // Reset selection for simplicity
  };
};

export const convertNewToOldBoardState = (newState: NewBoardState): OldBoardState => {
  // Convert items back to slots
  const slots: OldSlot[] = newState.items.map(item => ({
    id: item.id,
    x: item.position?.x || 0,
    y: item.position?.y || 0,
    w: item.size?.width || 200,
    h: item.size?.height || 240,
    type: 'square' as const,
    size: 'M' as const,
    mask: 'rect' as const,
    padding: 8,
    itemId: item.item?.id,
    item: item.item
  }));

  return {
    canvas: newState.canvas,
    slots,
    selectedSlotIds: [],
    history: [],
    historyIndex: -1
  };
};