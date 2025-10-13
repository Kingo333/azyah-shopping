import { supabase } from '@/integrations/supabase/client';

export const trackOnboardingEvent = async (
  event: string,
  metadata?: Record<string, any>
) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn('Cannot track event: No authenticated user');
      return;
    }

    const { error } = await supabase.from('events').insert({
      user_id: user.id,
      event_type: event,
      event_data: metadata || {},
    });

    if (error) {
      console.error('Error tracking onboarding event:', error);
    }
  } catch (error) {
    console.error('Error in trackOnboardingEvent:', error);
  }
};
