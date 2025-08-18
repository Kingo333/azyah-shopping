import { supabase } from '@/integrations/supabase/client';

export const clearInvalidSession = async () => {
  try {
    console.log('Clearing invalid session...');
    
    // Clear localStorage
    localStorage.removeItem('sb-klwolsopucgswhtdlsps-auth-token');
    
    // Force sign out
    await supabase.auth.signOut();
    
    // Refresh the page to force a clean state
    window.location.reload();
  } catch (error) {
    console.error('Error clearing session:', error);
    // Force reload anyway
    window.location.reload();
  }
};

export const debugAuthState = async () => {
  console.log('=== AUTH DEBUG START ===');
  
  const { data: { session }, error } = await supabase.auth.getSession();
  console.log('Current session:', session);
  console.log('Session error:', error);
  
  if (session?.user) {
    console.log('User ID:', session.user.id);
    console.log('User email:', session.user.email);
    console.log('User metadata:', session.user.user_metadata);
    
    // Check user role in database
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      console.log('Database user data:', userData);
      console.log('Database user error:', userError);
    } catch (dbError) {
      console.log('Database query error:', dbError);
    }
  }
  
  console.log('=== AUTH DEBUG END ===');
};