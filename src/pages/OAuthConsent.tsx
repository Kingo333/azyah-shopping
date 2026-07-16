import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { approveAuthorization, denyAuthorization, getAuthorizationDetails } from "@/lib/oauthConsent";

interface AuthorizationDetails {
  client?: {
    name?: string;
  } | null;
  redirect_url?: string;
  redirect_to?: string;
}

function isSameOriginRelativePath(path: string): boolean {
  try {
    const url = new URL(path, window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith("/");
  } catch {
    return false;
  }
}

export default function OAuthConsent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const authorizationId = searchParams.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const consentPath = `${window.location.pathname}${window.location.search}`;

  useEffect(() => {
    let active = true;

    (async () => {
      if (!authorizationId) {
        setError("Missing authorization request.");
        return;
      }

      // Wait for auth state to settle before deciding whether to redirect.
      if (authLoading) return;

      if (!user) {
        const next = encodeURIComponent(consentPath);
        navigate(`/onboarding/signup?mode=login&next=${next}`, { replace: true });
        return;
      }

      try {
        const { data, error: detailsError } = await getAuthorizationDetails(authorizationId);
        if (!active) return;

        if (detailsError) {
          setError(detailsError.message);
          return;
        }

        if (!data) {
          setError("This authorization request is no longer available.");
          return;
        }

        const immediate = data.redirect_url ?? data.redirect_to;
        if (immediate && !data.client) {
          window.location.href = immediate;
          return;
        }

        setDetails(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load authorization details.");
      }
    })();

    return () => {
      active = false;
    };
  }, [authorizationId, user, authLoading, navigate, consentPath]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);

    try {
      const { data, error: decisionError } = approve
        ? await approveAuthorization(authorizationId)
        : await denyAuthorization(authorizationId);

      if (decisionError) {
        setError(decisionError.message);
        setBusy(false);
        return;
      }

      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setError("No redirect returned by the authorization server.");
        setBusy(false);
        return;
      }

      window.location.href = target;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete authorization.");
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Authorization error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Go home
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading authorization request…
          </CardContent>
        </Card>
      </main>
    );
  }

  const clientName = details.client?.name ?? "an external app";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Connect {clientName}</CardTitle>
          </div>
          <CardDescription>
            {clientName} wants to access your Azyah Style account as you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This lets {clientName} read and manage your wardrobe, liked products, wishlist, outfits,
            and profile using the permissions you already have in Azyah Style.
          </p>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button variant="outline" disabled={busy} onClick={() => decide(false)} className="flex-1">
            Deny
          </Button>
          <Button disabled={busy} onClick={() => decide(true)} className="flex-1">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
