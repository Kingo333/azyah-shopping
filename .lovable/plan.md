# Azyah "Find Better Deals" – Phia-Parity Implementation Plan

## Current Status: Phase 2.1 + Link Intake Complete ✅

### What Changed (This Session)

1. **WebView Extraction via @capgo/inappbrowser** - COMPLETE ✅
2. **Cold Start Deep Link Handling** - COMPLETE ✅
3. **Clipboard Link Detection Fallback** - COMPLETE ✅
4. **Universal URL Acceptance** - COMPLETE ✅ (no domain allowlist)

---

## Implementation Summary

### 1. WebView Extraction (`OpenInAzyahButton.tsx`)
- Uses `@capgo/inappbrowser` for real WKWebView/WebView
- Listeners registered BEFORE `openWebView()` (race-condition safe)
- Guards prevent multiple injections/results
- 15-second timeout with cleanup

### 2. Deep Link Handler (`useDeepLinkHandler.ts`)
- **Cold start**: `App.getLaunchUrl()` called on mount
- **Warm start**: `appUrlOpen` listener for URLs while app is running
- **Product URL detection**: Accepts ANY valid http/https URL (no domain allowlist)
- **Safe decoding**: Handles multiple URL encoding levels
- **Routing**: Product URLs → `/dashboard` with `{ openDeals: true, productUrl }`

### 3. Clipboard Fallback (`useClipboardLinkDetector.ts`)
- Checks clipboard on app mount (cold start) and on app resume (warm start)
- Detects any http/https URL
- Only prompts once per URL (prevents re-prompting)
- User must accept before opening Deals (no auto-open)

### 4. Dashboard Integration (`RoleDashboard.tsx`)
- Handles `location.state.openDeals` from deep links
- Shows `ClipboardLinkPrompt` when URL detected in clipboard
- Passes `initialUrl` to `DealsDrawer` → `LinkTab`
- Clears state properly using `navigate('/dashboard', { replace: true, state: {} })`

---

## Technical Flow

### Flow A: Deep Link (Cold/Warm Start)
```
User opens azyah://open?url=https://asos.com/product/123
    ↓
useDeepLinkHandler parses URL
    ↓
Detects product URL (any http/https)
    ↓
navigate('/dashboard', { state: { openDeals: true, productUrl } })
    ↓
RoleDashboard reads location.state
    ↓
Opens DealsDrawer with initialUrl
    ↓
LinkTab pre-filled with URL
```

### Flow B: Clipboard Fallback (Safari Copy → Open App)
```
User copies product URL in Safari
    ↓
Opens Azyah app
    ↓
useClipboardLinkDetector reads clipboard
    ↓
Detects http/https URL → shows ClipboardLinkPrompt
    ↓
User taps "Find Deals"
    ↓
DealsDrawer opens with URL → searches for deals
```

### Flow C: In-App WebView Extraction
```
User pastes URL → taps "Open in Azyah"
    ↓
InAppBrowser.openWebView() → real WKWebView
    ↓
Script extracts JSON-LD/OG/DOM
    ↓
window.mobileApp.postMessage(result)
    ↓
onContextExtracted → deals-from-context with main_image_url
    ↓
Google Lens + visual rerank → 10+ results
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useDeepLinkHandler.ts` | Cold start + universal URL detection |
| `src/hooks/useClipboardLinkDetector.ts` | NEW - clipboard fallback |
| `src/components/deals/ClipboardLinkPrompt.tsx` | NEW - prompt UI |
| `src/components/deals/LinkTab.tsx` | Accept `initialUrl` prop |
| `src/components/deals/DealsDrawer.tsx` | Pass `initialUrl` to LinkTab |
| `src/components/RoleDashboard.tsx` | Handle openDeals state + clipboard |
| `package.json` | Added `@capacitor/clipboard` |

---

## What Works Now (No Xcode Required)

✅ **"Open in Azyah" button** - Real WebView extraction on ASOS/Zara/Nike
✅ **Deep links** - `azyah://open?url=...` works for cold + warm start
✅ **Clipboard detection** - Copy URL in Safari → open Azyah → prompt appears
✅ **URL paste fallback** - Still works as secondary option

## What Does NOT Work Yet (Needs Xcode)

❌ **Safari Share Sheet** - "Share → Azyah" requires iOS Share Extension target
❌ **Safari AA Extension** - "AA → Manage Extensions" requires Safari Web Extension

---

## Verification Checklist

### Deep Link Tests
- [ ] Cold start: `azyah://open?url=https://asos.com/product` → Deals opens with URL
- [ ] Warm start: Same URL while app is running → Deals opens
- [ ] Encoded URL: `azyah://open?url=https%3A%2F%2Fasos.com` → decodes correctly

### Clipboard Tests
- [ ] Copy ASOS URL in Safari → open Azyah → prompt appears
- [ ] Tap "Find Deals" → Deals drawer opens with URL prefilled
- [ ] Tap "Dismiss" → prompt disappears, doesn't re-prompt
- [ ] Copy same URL again → doesn't re-prompt (already seen)

### WebView Extraction Tests
- [ ] Zara URL → extraction returns title + image
- [ ] ASOS URL → extraction returns title + image
- [ ] Nike URL → extraction returns title + image
- [ ] 15s timeout fires if extraction fails

---

## Next Steps (When Xcode Available)

### Phase 2.2: Safari Share Extension
1. Add iOS Share Extension target in Xcode
2. Handle incoming URLs in extension
3. Pass to main app via app groups or URL scheme

### Phase 2.3: Safari Web Extension
1. Add Safari Web Extension target
2. Enable "AA → Manage Extensions" toggle
3. Same extraction logic (JSON-LD → OG → DOM)

| Component | File | Purpose |
|-----------|------|---------|
| Button | `OpenInAzyahButton.tsx` | Opens WebView, injects script, handles result |
| Script | `webview-extractor.ts` | JSON-LD → OG → DOM extraction logic |
| Parser | `parseExtractionResult()` | Validates and types extraction result |
| Hook | `useDealsFromContext.ts` | Calls `deals-from-context` edge function |
| Backend | `deals-from-context/index.ts` | Lens + query pack + visual rerank |
| UI | `LinkTab.tsx` | Orchestrates extraction → search → display |
