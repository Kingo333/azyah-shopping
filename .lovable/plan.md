# Azyah "Find Better Deals" – Phia-Parity Implementation Plan

## Current Status: Phase 2.1 Complete ✅

### What Changed (This Session)

Replaced non-functional custom plugin with `@capgo/inappbrowser` for real WebView extraction.

**Implementation:**
1. ✅ Installed `@capgo/inappbrowser@^7.0.0` (ships with native WKWebView/WebView code)
2. ✅ Rewrote `OpenInAzyahButton.tsx` with all critical fixes:
   - Listeners registered BEFORE `openWebView()` (prevents race conditions)
   - Guards (`injectedRef`, `completedRef`) prevent multiple injections/results
   - Robust wrapper pattern (no fragile string replacement)
   - Individual listener handle cleanup via `.remove()`
   - 15-second timeout with cleanup and fallback message
3. ✅ Updated `codemagic.yaml` to sync both iOS and Android
4. ✅ Removed unused custom plugin (`plugins/azyah-webview-extractor/`)
5. ✅ Removed unused types (`src/types/webview-extractor-plugin.ts`)

---

## Technical Flow

```
User taps "Open in Azyah"
    ↓
Register listeners (pageLoaded, messageFromWebview, closeEvent)
    ↓
Start 15s timeout
    ↓
InAppBrowser.openWebView(url) → Real WKWebView/WebView opens
    ↓
browserPageLoaded fires → executeScript(wrappedExtractionScript)
    ↓
Script extracts JSON-LD/OG/DOM → window.mobileApp.postMessage(result)
    ↓
messageFromWebview listener → parseExtractionResult()
    ↓
onContextExtracted(context) → useDealsFromContext.searchFromContext()
    ↓
deals-from-context uses main_image_url for Google Lens
    ↓
Visual rerank + result floor → 10+ relevant results
```

---

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Added `@capgo/inappbrowser@^7.0.0` |
| `src/components/deals/OpenInAzyahButton.tsx` | Full rewrite with safe patterns |
| `codemagic.yaml` | Sync both iOS + Android |

## Files Deleted

| File | Reason |
|------|--------|
| `plugins/azyah-webview-extractor/*` | Replaced by @capgo/inappbrowser |
| `src/types/webview-extractor-plugin.ts` | No longer needed |

---

## Next Steps

### Phase 2.2: Safari Web Extension (Requires Xcode)

When Xcode access is available:
1. Create Safari Web Extension target
2. Use same extraction logic (JSON-LD → OG → DOM)
3. Enable "AA → Manage Extensions" toggle experience (like Phia)

### Phase 2.15: Share-to-Azyah (Optional Enhancement)

Add iOS Share Sheet / Android intent handling:
1. User taps Share on product page in Safari/Chrome → Azyah
2. App receives URL via deep link
3. Opens WebView extractor with that URL

---

## Verification Checklist

Before shipping, verify on device:

- [ ] iOS: "Open in Azyah" opens WKWebView (not Safari)
- [ ] Android: "Open in Azyah" opens WebView (not Chrome Custom Tab)
- [ ] Extraction completes for Zara URL → title + image extracted
- [ ] Extraction completes for ASOS URL → title + image extracted
- [ ] Extraction completes for Nike URL → title + image extracted
- [ ] Timeout fires after 15s if extraction fails
- [ ] User can close WebView manually (cleanup works)
- [ ] deals-from-context receives main_image_url
- [ ] Results are better than URL-paste fallback

---

## Architecture Summary

| Component | File | Purpose |
|-----------|------|---------|
| Button | `OpenInAzyahButton.tsx` | Opens WebView, injects script, handles result |
| Script | `webview-extractor.ts` | JSON-LD → OG → DOM extraction logic |
| Parser | `parseExtractionResult()` | Validates and types extraction result |
| Hook | `useDealsFromContext.ts` | Calls `deals-from-context` edge function |
| Backend | `deals-from-context/index.ts` | Lens + query pack + visual rerank |
| UI | `LinkTab.tsx` | Orchestrates extraction → search → display |
