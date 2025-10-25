import { useServerSideAnalytics } from './useServerSideAnalytics';

export const useDressMeAnalytics = () => {
  const { trackEvent } = useServerSideAnalytics();

  const track = {
    open: () => trackEvent({ event_type: 'dressme_open', event_data: {} }),
    
    addItem: (itemId: string) => trackEvent({ 
      event_type: 'dressme_add_item', 
      product_id: itemId,
      event_data: { item_id: itemId } 
    }),
    
    upload: (category: string) => trackEvent({ 
      event_type: 'dressme_upload', 
      event_data: { category } 
    }),
    
    bgRemoved: (success: boolean) => trackEvent({ 
      event_type: success ? 'dressme_bg_removed' : 'error_bg_remove',
      event_data: { success } 
    }),
    
    saveFit: (fitId: string, isPublic: boolean) => trackEvent({ 
      event_type: 'dressme_save_fit',
      event_data: { fit_id: fitId, is_public: isPublic } 
    }),
    
    share: (fitId: string) => trackEvent({ 
      event_type: 'dressme_share',
      event_data: { fit_id: fitId } 
    }),
    
    usePublicFit: (fitId: string, creatorId: string) => trackEvent({ 
      event_type: 'dressme_use_public_fit',
      event_data: { fit_id: fitId, creator_id: creatorId } 
    }),
    
    render: (fitId: string, duration_ms: number) => trackEvent({ 
      event_type: 'dressme_render',
      event_data: { fit_id: fitId, duration_ms } 
    }),
    
    error: (error_type: string, message: string) => trackEvent({ 
      event_type: 'error_bg_remove',
      event_data: { error_type, message } 
    }),

    selectionModeEntered: () => trackEvent({
      event_type: 'dressme_selection_mode_entered',
      event_data: {}
    }),

    itemsDeleted: (count: number) => trackEvent({
      event_type: 'dressme_items_deleted',
      event_data: { count }
    }),

    itemDetailViewed: (itemId: string) => trackEvent({
      event_type: 'dressme_item_detail_viewed',
      event_data: { item_id: itemId }
    }),

    itemEnhanceStarted: (itemId: string) => trackEvent({
      event_type: 'dressme_item_enhance_started',
      event_data: { item_id: itemId }
    }),

    itemEnhanceCompleted: (itemId: string) => trackEvent({
      event_type: 'dressme_item_enhance_completed',
      event_data: { item_id: itemId }
    }),

    itemEnhanceFailed: (itemId: string, errorType: string) => trackEvent({
      event_type: 'dressme_item_enhance_failed',
      event_data: { item_id: itemId, error_type: errorType }
    }),
  };

  return track;
};
