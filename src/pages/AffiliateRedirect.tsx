import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Legacy /affiliate/:userId redirect handler.
 * Resolves the user ID to a username and redirects to /u/:username/deals.
 * Shows a friendly message if user not found.
 */
export default function AffiliateRedirect() {
  const { userId } = useParams<{ userId: string }>();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function resolveUsername() {
      if (!userId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        // Try to find user by ID
        const { data, error } = await supabase
          .from('users')
          .select('username')
          .eq('id', userId)
          .single();

        if (error || !data?.username) {
          // Maybe userId is already a username - try that
          const { data: userByName } = await supabase
            .from('users')
            .select('username')
            .eq('username', userId)
            .single();

          if (userByName?.username) {
            setUsername(userByName.username);
          } else {
            setNotFound(true);
          }
        } else {
          setUsername(data.username);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    resolveUsername();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading deals...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This affiliate link is no longer valid or the user doesn't exist.
          </p>
          <a 
            href="/" 
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  // Redirect to the user's deals page
  return <Navigate to={`/u/${username}/deals`} replace />;
}
