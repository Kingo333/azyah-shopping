

# Remove Page Extraction & InAppBrowser -- Simplify Deals to API-Only

## Problem

The Codemagic iOS build fails because `@capgo/inappbrowser` has Swift compilation errors (incompatible with the current Xcode/Swift version on the build machine). This package powers the "Open in Azyah" WebView-based product extraction feature, which you no longer need -- you want deals to work purely via API (URL paste + server-side metadata extraction).

## What Gets Removed

1. **`@capgo/inappbrowser` npm package** -- the root cause of the iOS build failure
2. **`src/components/deals/OpenInAzyahButton.tsx`** -- the WebView extraction button component
3. **`src/lib/webview-extractor.ts`** -- the JS injection script for extracting product data from pages
4. **`src/hooks/useDealsFromContext.ts`** -- the hook that calls `deals-from-context` edge function with extracted ProductContext
5. **`extension/` directory** -- the Chrome extension files (content script, service worker, side panel, etc.)

## What Gets Simplified

**`src/components/deals/LinkTab.tsx`:**
- Remove all imports/usage of `OpenInAzyahButton`, `useDealsFromContext`, and `ProductContext`
- Remove the "blocked site" warning with WebView fallback
- Remove the "low results suggestion" with WebView button
- Remove the "context mode indicator" banner
- Keep only the straightforward URL paste flow: user pastes URL, hits "Find Better Deals", results come back via `useDealsFromUrl` (which calls `extract-link-metadata` on the server side)

**`src/types/ProductContext.ts`:**
- Keep the types since they may still be used by the `deals-from-context` edge function or other server-side code, but remove the `WebViewExtractionResult` type and `azyah_webview` extraction source since those are no longer used client-side

## Technical Details

| Action | File/Package |
|--------|-------------|
| Remove npm package | `@capgo/inappbrowser` from `package.json` |
| Delete file | `src/components/deals/OpenInAzyahButton.tsx` |
| Delete file | `src/lib/webview-extractor.ts` |
| Delete file | `src/hooks/useDealsFromContext.ts` |
| Delete directory | `extension/` (all files) |
| Simplify | `src/components/deals/LinkTab.tsx` -- remove context mode, OpenInAzyah references, blocked-site warning |
| Optional cleanup | `src/types/ProductContext.ts` -- remove WebView-specific types |

## Result

- iOS build will succeed (no more `@capgo/inappbrowser` Swift errors)
- Deals feature works purely via URL paste + server-side API (`extract-link-metadata` edge function)
- Simpler, more maintainable code with fewer moving parts

