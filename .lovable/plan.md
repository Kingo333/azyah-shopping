

# Apply User's Refined Extension Fixes

## Summary

You've provided a refined, battle-tested version of the extension's `content_script.js` that addresses several issues the current codebase has. I'll apply your fixes to make the extension load and work properly on retail sites like Next.ae.

---

## Changes You Made (That I'll Apply)

| Issue | Current Code | Your Fix |
|-------|--------------|----------|
| **Retry timeout** | 10 attempts / 5 seconds | 14 attempts / 7 seconds (more time for slow sites) |
| **Extractor injection** | Direct assignment, no try/catch | IIFE with try/catch for safety |
| **Detection signals** | Narrower button detection | Expanded Arabic + more button variants |
| **Button detection selectors** | `a.button, a[class*="btn"]` | `a, input[type="submit"]` (broader) |
| **Size selectors** | Limited class patterns | Added `[class*="size" i]` catch-all |
| **Body text scan** | 15,000 chars | 20,000 chars (catches more price data) |
| **Inline extraction image threshold** | 100x100px | 120x120px (higher quality) |
| **Variable declarations** | Multiple in STATE section | Cleaner scoping, `imageSelectorActive` moved closer to usage |
| **Error handling** | Some missing catches | Comprehensive try/catch on extraction |
| **SPA nav delay** | 300ms | 400ms (more reliable on slow transitions) |
| **Manifest** | Missing `tabs` permission | Add `tabs` for `chrome.tabs.query()` |

---

## Files to Modify

### 1. `extension/manifest.json`
- Add `"tabs"` permission (required by sidepanel.js for `chrome.tabs.query()`)

### 2. `extension/content_script.js`
- Apply your refined version with:
  - Extended retry timeout (14 attempts / 7 seconds)
  - Safer extractor injection with IIFE + try/catch
  - Expanded button detection with Arabic variants
  - Broader selector coverage for size/cart/price
  - Increased body text scan to 20,000 chars
  - More robust cleanup patterns
  - Better error handling in click handler

---

## Implementation Details

### Manifest Update
```json
"permissions": [
  "activeTab",
  "scripting", 
  "storage",
  "sidePanel",
  "tabs"  // <-- ADD THIS
]
```

### Key content_script.js Improvements

**1. Safer extractor injection:**
```javascript
(() => {
  try {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('lib/extractor.js');
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {
    console.warn('[Azyah] Failed to inject extractor:', e);
  }
})();
```

**2. Expanded button detection:**
```javascript
const buttons = document.querySelectorAll('button, [role="button"], a, input[type="submit"]');
for (const el of buttons) {
  const text = (el.textContent || el.getAttribute('value') || '').toLowerCase();
  if (/add to (cart|bag|basket)|buy now|add to trolley|checkout|اضف إلى السلة|أضف للسلة|اشتري الآن/i.test(text)) {
    signals.push('cart-button');
    break;
  }
}
```

**3. Extended retry (7 seconds instead of 5):**
```javascript
let attempts = 0;
const maxAttempts = 14; // ~7s
const intervalMs = 500;
```

**4. Moved `imageSelectorActive` to local scope:**
```javascript
// Closer to where it's used
let imageSelectorActive = false;
function activateImageSelector() { ... }
```

---

## Testing After Changes

1. **Reload extension** in `chrome://extensions`
2. **Visit Next.ae product page** (e.g., `/en/style/...`)
3. **Check console** for:
   ```javascript
   window.__AZYAH_CONTENT_SCRIPT_LOADED  // Should be true
   // Should see detection logs with strong/weak signals
   ```
4. **Verify button appears** within 3-7 seconds
5. **Click button** → Side panel should open

---

## Debug Commands for Next.ae

```javascript
// 1. Verify script loaded
window.__AZYAH_CONTENT_SCRIPT_LOADED

// 2. Check for button
document.getElementById('azyah-fab-host')

// 3. Check Shadow DOM button
document.getElementById('azyah-fab-host')?.shadowRoot?.querySelector('.fab')

// 4. Manual extraction test
window.AzyahExtractor?.extractProduct()
```

