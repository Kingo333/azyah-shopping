Add an OAuth-protected MCP server to the app so ChatGPT/Claude/Cursor can connect as the signed-in user and call tools scoped to that user.

## Background
- The Supabase OAuth 2.1 server is enabled with dynamic client registration.
- Authorization path is set to `/oauth/consent`, so the consent page must live at that exact route.
- This project uses React Router + Vite + Supabase Edge Functions, so the MCP server is authored via `@lovable.dev/mcp-js` and emitted to `supabase/functions/mcp` by the Vite plugin.

## What to build

### 1. Dependencies + Vite plugin
- Install `@lovable.dev/mcp-js` (zod is already present).
- Add `mcpPlugin()` from `@lovable.dev/mcp-js/stacks/supabase/vite` to `vite.config.ts`.

### 2. MCP server entry (`src/lib/mcp/index.ts`)
- Define the server with `defineMcp`.
- Wire `auth.oauth.issuer` to `https://klwolsopucgswhtdlsps.supabase.co/auth/v1` (built from `import.meta.env.VITE_SUPABASE_PROJECT_ID`).
- Set a name, title, version, and instructions describing the app’s tools.
- Register the initial user-scoped tools listed below.

### 3. Initial user-scoped tools (`src/lib/mcp/tools/`)
Each tool is a default-exported `defineTool` that receives the validated input and a `ToolContext`. It forwards the caller’s Supabase access token via a `createClient` instance so RLS runs as that user. No tool takes a `user_id` from input.

- `list_wardrobe_items` — list the caller’s wardrobe items (read-only).
- `add_wardrobe_item` — add a wardrobe item by URL or public item ID.
- `list_liked_products` — list products the caller liked.
- `list_wishlist_items` — list products the caller wishlisted.
- `list_user_outfits` — list outfits created by the caller.
- `get_user_profile` — return the caller’s public profile metadata (no sensitive fields).

### 4. Consent route (`/oauth/consent`)
- Add a new `OAuthConsent` page at `src/pages/OAuthConsent.tsx`.
- Read `authorization_id` from the query string.
- If the user is not signed in, redirect to `/onboarding/signup?mode=login&next=<encoded-consent-url>` and ensure the sign-in/sign-up flow returns the user to the original consent URL after authentication.
- If signed in, call `supabase.auth.oauth.getAuthorizationDetails(authorization_id)` to load the client/app name and scopes.
- Render approve/deny buttons; call `supabase.auth.oauth.approveAuthorization` / `denyAuthorization`; navigate to the returned `redirect_url`.
- Handle loading, error, and expired-authorization states.
- Register the route in `src/App.tsx` as a public route (no `ProtectedRoute`).

### 5. Auth redirect preservation
- Update `OAuthConsent` and the sign-in flow to validate and use a `next` parameter as a same-origin relative path, so users land back on the consent screen after signing in.

### 6. Favicon
- Ensure the app has a favicon at `/favicon.ico` (Lovable’s connector list uses it). If missing, add a simple branded icon.

### 7. Manifest + deploy
- After code changes, run the MCP manifest extractor to update `.lovable/mcp/manifest.json`.
- Deploy the `mcp` Edge Function so the live endpoint is available at `https://klwolsopucgswhtdlsps.supabase.co/functions/v1/mcp`.

## Out of scope
- No new database tables or RLS changes; tools reuse existing tables and rely on current RLS policies.
- No public/no-auth MCP variant; the server requires OAuth user identity.

## Acceptance criteria
- OAuth consent page loads at `/oauth/consent?authorization_id=...`.
- Unauthenticated users are redirected through sign-in and return to the same consent URL.
- Approving/denying completes the OAuth flow and redirects to the client app.
- The MCP manifest lists the tools correctly.
- The `mcp` Edge Function deploys without errors.
- Connected clients (ChatGPT/Claude/Cursor) can list tools and call them as the signed-in user.