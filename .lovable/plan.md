# Phia-Style "Find Better Deals" Implementation Status

## Phase 2.1 Status: WebView Extractor Plugin Scaffold Complete

### ✅ What's Done

| Component | Status | Details |
|-----------|--------|---------|
| **ProductContext Schema** | ✅ DONE | `src/types/ProductContext.ts` with full typing |
| **deals-from-context Endpoint** | ✅ DONE | JWT, rate limiting, caching, Lens integration |
| **Visual Heuristic Rerank** | ✅ DONE | 0.4 color + 0.4 category + 0.2 source quality |
| **Dedupe + Merge Arrays** | ✅ DONE | link → product_id → composite fallback |
| **Blocked-site Detection** | ✅ FIXED | Precise domain matching |
| **Plugin TypeScript API** | ✅ DONE | `plugins/azyah-webview-extractor/` scaffold |
| **OpenInAzyahButton Wiring** | ✅ DONE | Calls plugin + routes to onContextExtracted |
| **LinkTab Context Flow** | ✅ DONE | onContextExtracted → searchFromContext() |
| **Native iOS/Android Code** | ❌ PENDING | Requires local Xcode/Android Studio |

---

## Plugin Architecture

```
plugins/
└── azyah-webview-extractor/
    ├── package.json              # Capacitor v7 plugin config
    ├── tsconfig.json             # TypeScript config
    ├── src/
    │   ├── definitions.ts        # Plugin API types
    │   ├── index.ts              # Plugin registration
    │   └── web.ts                # Web fallback (opens URL in tab)
    ├── ios/
    │   └── ios-implementation.ts # Implementation guide (Swift code needed)
    └── android/
        └── android-implementation.ts # Implementation guide (Java code needed)
```

---

## TypeScript Wiring Complete

### OpenInAzyahButton.tsx
- ✅ Registers `AzyahWebViewExtractor` plugin via Capacitor
- ✅ Calls `openAndExtract({ url, script, timeoutMs })`
- ✅ Parses result and builds `ProductContext`
- ✅ Calls `onContextExtracted(context)` on success
- ✅ Falls back to `onExtractionFailed()` on error
- ✅ Shows status states (idle/extracting/success/failed)

### LinkTab.tsx
- ✅ Uses both `useDealsFromUrl` (fallback) and `useDealsFromContext` (preferred)
- ✅ `handleContextExtracted` calls `searchFromContext(context)`
- ✅ `handleExtractionFailed` falls back to URL paste flow
- ✅ Shows "Enhanced search" indicator when using context mode
- ✅ OpenInAzyahButton wired with both handlers

---

## Native Implementation Required

**The TypeScript side is complete. Native code must be written in Xcode/Android Studio after exporting to GitHub.**

### iOS (WKWebView)
File: `plugins/azyah-webview-extractor/ios/Plugin/`

```swift
// Required implementation:
// 1. Present modal UIViewController with WKWebView
// 2. Set navigationDelegate to detect didFinish
// 3. Call evaluateJavaScript(script) when page loads
// 4. Return JSON result via call.resolve()
// 5. Handle timeout + "Done" button
```

### Android (WebView)
File: `plugins/azyah-webview-extractor/android/src/main/java/com/azyah/webviewextractor/`

```java
// Required implementation:
// 1. Open Activity with android.webkit.WebView
// 2. Enable JavaScript: settings.setJavaScriptEnabled(true)
// 3. Override onPageFinished() in WebViewClient
// 4. Call evaluateJavascript(script, callback)
// 5. Return result via ActivityResult
```

---

## Next Steps (For Local Development)

1. **Export to GitHub** via "Export to Github" button
2. **Clone locally** and run `npm install`
3. **Write native code**:
   - iOS: Create Swift files in `plugins/azyah-webview-extractor/ios/Plugin/`
   - Android: Create Java files in `plugins/azyah-webview-extractor/android/src/`
4. **Build plugin**: `cd plugins/azyah-webview-extractor && npm run build`
5. **Sync native projects**: `npx cap sync ios && npx cap sync android`
6. **Test on device**:
   - Run `npx cap run ios` or `npx cap run android`
   - Open ASOS/Zara/Nike product page
   - Tap "Open in Azyah"
   - Verify ProductContext is extracted
   - Verify deals-from-context returns better results

---

## Verification Checklist

| Test | Expected | Actual |
|------|----------|--------|
| ASOS product → Open in Azyah | Returns title + main_image_url | Pending |
| Zara product → Open in Azyah | Returns title + main_image_url | Pending |
| Nike product → Open in Azyah | Returns title + main_image_url | Pending |
| Context mode → deals-from-context | Uses Lens with extracted image | Pending |
| Results quality | More similar than URL paste | Pending |

---

## Files Reference

| File | Status | Purpose |
|------|--------|---------|
| `plugins/azyah-webview-extractor/package.json` | ✅ Created | Plugin npm config |
| `plugins/azyah-webview-extractor/src/definitions.ts` | ✅ Created | TypeScript API |
| `plugins/azyah-webview-extractor/src/index.ts` | ✅ Created | Plugin registration |
| `plugins/azyah-webview-extractor/src/web.ts` | ✅ Created | Web fallback |
| `src/types/webview-extractor-plugin.ts` | ✅ Created | Local type definitions |
| `src/components/deals/OpenInAzyahButton.tsx` | ✅ Updated | Uses plugin, wires callbacks |
| `src/components/deals/LinkTab.tsx` | ✅ Updated | Context flow, catalog matching |
| `src/types/ProductContext.ts` | ✅ Done | Type definitions |
| `src/hooks/useDealsFromContext.ts` | ✅ Done | Frontend hook |
| `src/lib/webview-extractor.ts` | ✅ Done | EXTRACTION_SCRIPT |
| `supabase/functions/deals-from-context/index.ts` | ✅ Done | Backend endpoint |

---

## Phase 2.1 Approval Rule

**Phase 2.1 is complete when:**

> On iPhone + Android (after native code is written):
> 1. Open a Zara/ASOS/Nike product page
> 2. Tap "Open in Azyah"
> 3. WebView opens (NOT Safari/Chrome)
> 4. ProductContext is extracted (title + main_image_url)
> 5. deals-from-context is called with the context
> 6. Results are clearly more similar than URL paste fallback

**Current status:** TypeScript wiring complete. Native implementation pending.
