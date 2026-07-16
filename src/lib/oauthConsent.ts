import { supabase } from "@/integrations/supabase/client";

/**
 * Typed wrapper around the beta Supabase Auth OAuth namespace.
 * The methods are not yet in the public type definitions but are available
 * on the client when the OAuth 2.1 server is enabled.
 */
interface OAuthAuthorizationDetails {
  redirect_url?: string;
  redirect_to?: string;
  client?: {
    name?: string;
  } | null;
}

interface OAuthDecisionResponse {
  redirect_url?: string;
  redirect_to?: string;
}

export async function getAuthorizationDetails(authorizationId: string) {
  const client = supabase.auth as any;
  if (!client.oauth?.getAuthorizationDetails) {
    throw new Error("OAuth consent APIs are not available in this client");
  }
  return (await client.oauth.getAuthorizationDetails(authorizationId)) as {
    data: OAuthAuthorizationDetails | null;
    error: Error | null;
  };
}

export async function approveAuthorization(authorizationId: string) {
  const client = supabase.auth as any;
  if (!client.oauth?.approveAuthorization) {
    throw new Error("OAuth consent APIs are not available in this client");
  }
  return (await client.oauth.approveAuthorization(authorizationId)) as {
    data: OAuthDecisionResponse | null;
    error: Error | null;
  };
}

export async function denyAuthorization(authorizationId: string) {
  const client = supabase.auth as any;
  if (!client.oauth?.denyAuthorization) {
    throw new Error("OAuth consent APIs are not available in this client");
  }
  return (await client.oauth.denyAuthorization(authorizationId)) as {
    data: OAuthDecisionResponse | null;
    error: Error | null;
  };
}
