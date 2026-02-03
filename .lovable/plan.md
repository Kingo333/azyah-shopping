
# Fix Chrome Extension Authentication Bridge

## Problem Summary

The Chrome extension's authentication is completely broken because there's no mechanism to transfer the auth token from the Azyah web app to the extension's storage.

**Current broken flow:**
1. User opens extension → sees "Sign In Required"
2. User clicks "Sign In to Azyah" → opens web app at `/auth`
3. User signs in successfully → token stored in web app's localStorage
4. User clicks "I've signed in" in extension → extension checks `chrome.storage.local` → **finds nothing** → still shows "Sign In Required"

**The missing piece:** No code exists to transfer the Supabase auth token from the web app to the extension's `chrome.storage.local`.

---

## Solution: Web-to-Extension Auth Bridge

I'll implement a secure token bridge using Chrome's external messaging API. This is the recommended MV3 pattern for authenticating extension users through a web app.

### Architecture Overview

```
┌─────────────────────┐        ┌──────────────────────┐
│   Chrome Extension  │        │    Azyah Web App     │
│                     │        │                      │
│  1. Opens auth page │───────>│  /extension-auth     │
│     with ext ID     │        │                      │
│                     │        │  2. User signs in    │
│                     │        │     (existing flow)  │
│                     │        │                      │
│  4. Stores token    │<───────│  3. Sends token via  │
│     in chrome       │        │     chrome.runtime   │
│     .storage.local  │        │     .sendMessage()   │
│                     │        │                      │
│  5. Ready to search │        │  Shows success       │
└─────────────────────┘        └──────────────────────┘
```

---

## Implementation Steps

### Step 1: Update Extension Manifest

Add `externally_connectable` to allow the Azyah web app to send messages to the extension:

**File:** `extension/manifest.json`

Add new field:
```json
"externally_connectable": {
  "matches": [
    "https://azyah-shopping.lovable.app/*",
    "https://*.lovable.app/*",
    "http://localhost:*/*"
  ]
}
```

This allows only the Azyah domains to communicate with the extension.

---

### Step 2: Add External Message Handler in Service Worker

Update the service worker to listen for incoming auth tokens from the web app.

**File:** `extension/service_worker.js`

Add a new external message listener:
```javascript
// Listen for auth tokens from web app
chrome.runtime.onMessageExternal.addListener(
  async (message, sender, sendResponse) => {
    // Verify sender is from allowed domain
    if (!sender.url?.includes('lovable.app') && !sender.url?.includes('localhost')) {
      sendResponse({ success: false, error: 'Unauthorized origin' });
      return;
    }
    
    if (message.type === 'SET_AUTH_TOKEN') {
      // Store token in extension storage
      await chrome.storage.local.set({
        authToken: message.token,
        authExpiry: message.expiry || (Date.now() + 3600000) // 1 hour default
      });
      sendResponse({ success: true });
    }
    
    if (message.type === 'CLEAR_AUTH_TOKEN') {
      await chrome.storage.local.remove(['authToken', 'authExpiry']);
      sendResponse({ success: true });
    }
    
    return true; // Keep channel open for async response
  }
);
```

---

### Step 3: Create Extension Auth Page in Web App

Create a dedicated page that handles authentication specifically for the extension flow.

**File:** `src/pages/ExtensionAuth.tsx`

This page will:
1. Check if user is already authenticated
2. If yes, immediately send token to extension
3. If no, show login form
4. After successful login, send token to extension
5. Show success message and allow closing the tab

Key features:
- Auto-detects extension ID from URL parameter
- Shows clear visual feedback for success/failure
- Handles the token transfer automatically
- Works with existing Supabase auth

---

### Step 4: Add Route for Extension Auth Page

**File:** `src/App.tsx`

Add new route:
```jsx
<Route path="/extension-auth" element={<ExtensionAuth />} />
```

---

### Step 5: Update Side Panel Sign-In Link

Update the side panel to open the new extension auth page with the extension ID.

**File:** `extension/sidepanel.html`

Change the sign-in link from:
```html
<a href="https://azyah-shopping.lovable.app/auth" target="_blank">
```

To dynamically include the extension ID (handled via JavaScript).

**File:** `extension/sidepanel.js`

Add logic to get extension ID and update the sign-in URL:
```javascript
// Get extension ID and update auth link
const extId = chrome.runtime.id;
const authLink = document.querySelector('#auth-link');
if (authLink) {
  authLink.href = `https://azyah-shopping.lovable.app/extension-auth?ext=${extId}`;
}
```

---

### Step 6: Update "I've signed in" Button Logic

Improve the check-auth button to also trigger a re-check by listening for storage changes.

**File:** `extension/sidepanel.js`

Add storage change listener:
```javascript
// Listen for auth token updates
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.authToken?.newValue) {
    // Token was set - reinitialize
    init();
  }
});
```

---

## Technical Details

### Security Considerations

1. **Origin Validation**: The service worker validates that incoming messages come from allowed domains only
2. **Token Expiry**: Tokens are stored with expiry timestamps and cleared when expired
3. **No Token in URL**: Token is sent via Chrome messaging API, not exposed in URLs
4. **HTTPS Only**: `externally_connectable` only allows HTTPS origins (except localhost for dev)

### Extension ID Handling

Chrome extension IDs are:
- **Stable** when installed from Chrome Web Store (based on extension key)
- **Dynamic** when loaded unpacked (changes on each load)

For development, the extension ID is passed as a URL parameter. For production, it can be hardcoded after publishing to the Store.

### Token Lifecycle

| Event | Action |
|-------|--------|
| User signs in via web app | Token sent to extension storage |
| Token expires (401 response) | Extension clears token, shows sign-in prompt |
| User signs out of web app | (Optional) Can send CLEAR_AUTH_TOKEN message |
| Extension checks auth | Reads from chrome.storage.local |

---

## File Changes Summary

| File | Change |
|------|--------|
| `extension/manifest.json` | Add `externally_connectable` field |
| `extension/service_worker.js` | Add `onMessageExternal` listener |
| `extension/sidepanel.html` | Update auth link to use ID |
| `extension/sidepanel.js` | Add dynamic auth URL + storage listener |
| `src/pages/ExtensionAuth.tsx` | New page for extension auth flow |
| `src/App.tsx` | Add route for `/extension-auth` |

---

## Testing Checklist

After implementation:

1. **Load extension** in Chrome via `chrome://extensions`
2. **Copy the extension ID** from the card
3. **Open side panel** → Should show "Sign In Required"
4. **Click "Sign In to Azyah"** → Should open web app with extension ID in URL
5. **Sign in** with email/password
6. **See success message** → Token should auto-transfer
7. **Return to extension** → Should show "Ready to Find Deals" or product preview
8. **Test on a product page** → "Find Deals" button should work

---

## Edge Cases Handled

- **Already logged in**: If user is already authenticated in web app, token transfers immediately
- **Extension not installed**: Web app shows helpful message if messaging fails
- **Token expired**: Extension clears storage and prompts for re-auth
- **Multiple tabs**: Only one auth tab needed; all extension instances update via storage listener
