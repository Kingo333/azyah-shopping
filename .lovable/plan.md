# Shared preview link not showing today's changes

Lovable's docs say a shared preview link always shows the latest in-progress version, not a frozen copy. If yours is stuck on yesterday, the cause is almost always one of these, not the link itself:

1. **Browser cache on the viewer's device** - the app is installed as a web app / cached. Fix: hard refresh (Ctrl+Shift+R / Cmd+Shift+R), or open the link in a private window.
2. **Preview not rebuilt yet** - if today's changes were the last thing done, open the editor preview once so it rebuilds, then reload the shared link.
3. **Changes live on a draft, not main** - shared links show the main project. Today's work was on main, so this is unlikely.

## What I'll do after approval
- Open the shared preview link in a fresh browser and check whether it serves today's version (design v3 on by default).
- If it serves the new version: confirm the issue was cache and tell you how to clear it on phones.
- If it serves the old version: check whether the app's offline/cache setup (service worker) is pinning an old copy, and fix it so devices pick up updates on reload.

I'll need the shared link you created (paste it in chat) to test it.
