# Private people photos — design

_2026-10-27. Status: waiting for owner approval. Nothing built or applied._

## Why
Photos of people sit in storage folders that anyone on the internet can open, and some of those folders let anyone, even logged-out visitors, upload or overwrite files. A try-on selfie, a full-body photo or an AI image of someone wearing clothes should only be seen by that person, unless they chose to share it. The owner's words: protect people's photos without breaking Live Cam or AI Studio; community items stay visible to others under the app's existing sharing rules.

## What's there today (checked on live, 2026-10-27)

| Folder | What's in it | Who should see it | Today | Used by |
|---|---|---|---|---|
| `ai-tryon-uploads` (24 files) | Person photos (and clothing photos) uploaded in AI Studio | Only the owner | Anyone can open and list | AI Studio picture + video try-on (`useTheNewBlack.uploadImage`) |
| `ai-tryon-results` (11) | AI images of the person wearing clothes; also event try-on results (v51) and the "video input" image | Only the owner | **Anyone can open, list, upload and overwrite** | `thenewblack-picture`, `thenewblack-picture-free`, `thenewblack-event-tryon`; AI Studio results; AI Studio gallery (`ai_assets`); Events page |
| `ai-tryon-videos` (4) | AI videos of the person | Only the owner | **Anyone can open, list, upload and overwrite** | `thenewblack-video` |
| `tnb-video-inputs` (4) | Person image prepared for the video provider | Only the owner (and the provider, briefly) | **Anyone can open, list, upload and delete** | `thenewblack-video` |
| `search-images` (4, last Aug 2025) | Photo-search uploads | Only the owner | Anyone can open and list | Nothing in the current code |
| `wardrobe` (15, last Nov 2025) | Older closet cut-outs | Only the owner | Anyone with the link can open (listing already owner-only) | `gemini-bg-remove` (not called by the app); no database row points at it |
| `wardrobe-items` (32) | Closet photos and cut-outs; 10 default items | Owner; everyone for items marked "public reuse", items in public fits, share links, default items | Anyone can open and list | 41 app files, **Live Cam "My Closet"**, closet analysis (FashionCLIP worker, Gemini), share previews |
| `saved-outfits` (23) | Outfit pictures made from clothes | Owner; everyone when the outfit is public or shared | Anyone can open and list | Outfits, public outfit pages, share previews |
| `product-outfits` (13) | Brand outfit images for products | Everyone (brand content) | **Any logged-in user can upload, overwrite or delete any brand's images** | Brand portal |
| `optimized-images` (11, last Aug 2025) | Cached product images | Everyone | **Anyone can upload and overwrite** | `optimize-image` (unused since Aug 2025) |

Already private and owner-only (no change): `live-cam-snapshots`, event folders, `deals-uploads`, `toy-replica-*`, `tryon*`.

Also found: **deleting an account leaves the person's photos behind.** `delete-account` only cleans `wardrobe`, `tryon` and three folders that don't exist; AI Studio photos, closet photos, outfits, event photos and Live Cam snapshots stay.

Community rules today (database): closet items are visible to the owner or to everyone when `public_reuse_permitted`; outfits (`fits`) to the owner, the person it was gifted to, or everyone when `is_public`; default closet items to every logged-in user.

## Goals
1. Photos of people (AI Studio uploads, results, videos, video inputs, photo search, old closet folder) open only for their owner.
2. Nobody can upload, overwrite or delete files in someone else's folder, or in brand/product folders they don't own.
3. Nobody can list everyone's files in any photo folder.
4. Deleting an account deletes all of that person's photos.
5. Live Cam keeps working exactly as today; AI Studio picture, video and event try-on keep working; the AI Studio gallery and the Events page keep showing past results.
6. Community content (shared closet items, public outfits, share links, default items, brand content, posts) stays visible as today.

## Non-goals
- No change to Live Cam: `useLiveCamSession.ts`, `live-cam-*` functions, the Worker, RunPod. The Live Cam garment picker isn't touched either.
- No change to what is shared: the sharing rules above stay as they are.
- Closet and outfit photos stay "anyone with the link can open" (see "Closet and outfits" below for why).
- No re-processing of closet items (no new FashionCLIP/Gemini runs).

## Anti-goals (would be a failure even if it "works")
- Live Cam "My Closet" garments failing to load.
- A public outfit or shared item showing a broken image to other people.
- AI Studio losing a result the person just made, or a gallery of broken images.
- Expiring links saved into the database as if they were permanent.

## Design

### Key idea: temporary links
A private file is opened with a temporary link (a "signed URL") that stops working after a set time. Temporary links also work while a folder is still public, so the app and functions can switch to them first and the folders are locked afterwards. Nothing breaks in between.

The database keeps storing the normal, permanent address of each file (as today). The app turns it into a temporary link only when it shows the picture. That way old rows keep working and no expiring link is ever saved.

### Step 1 — Close the open doors (database only, no app change)
- `ai-tryon-results`, `ai-tryon-videos`, `tnb-video-inputs`, `optimized-images`: remove the rules that let anyone upload, overwrite or delete. Only the server functions write there, and they use the service key, which doesn't need these rules.
- `ai-tryon-uploads`: uploads only into your own folder (the app already does this).
- `product-outfits`: upload, overwrite and delete only for the brand or store that owns the product (file names start with the product id).
- Add owner-only "read" rules to `ai-tryon-uploads`, `ai-tryon-results`, `ai-tryon-videos`, `tnb-video-inputs`, `search-images` and `saved-outfits`. They're needed for temporary links and for the "replace file" upload AI Studio uses. While the folders are still public they change nothing.
- Probes (rollback-only, as before) prove: a logged-out visitor and another user can't upload, overwrite or delete; the owner still can; the server key still can; a brand can't touch another brand's outfit image.

### Step 2 — AI Studio and event try-on switch to temporary links (app + 4 functions; folders still public)
- `useTheNewBlack.uploadImage`: after upload, return a 1-hour temporary link of your own photo instead of the public address.
- `thenewblack-picture`, `thenewblack-picture-free`, `thenewblack-video`, `thenewblack-event-tryon`: store results as today, but return a 24-hour temporary link. Give The New Black a temporary link of the person photo (1 hour for pictures, 24 hours for video inputs, since video jobs run longer). Log the permanent address, never the temporary one.
- New helper `src/lib/privateMedia.ts`: recognises our storage addresses (direct Supabase or the `api.azyahstyle.com` proxy, public or signed form), turns addresses in private folders into temporary links in one batch per folder, and leaves everything else alone. It also turns a temporary link back into the permanent address before anything is saved.
- AI Studio gallery (`useAiAssets`): save the permanent address; show temporary links.
- Events page: past event results stored as full addresses get temporary links too (today they pass through unchanged).
- Owner phone test of this version, folders still public: picture try-on, video try-on, event try-on, AI Studio gallery, Events page, **Live Cam (unchanged, sanity check)**.

### Step 3 — Lock the people-photo folders (database only)
- Make private: `ai-tryon-uploads`, `ai-tryon-results`, `ai-tryon-videos`, `tnb-video-inputs`, `search-images`, `wardrobe`.
- Remove their "anyone can view" rules; the owner-only rules from step 1 remain.
- Probes prove: logged-out visitors and other users get nothing (no file, no list, no temporary link); the owner can open, list and make temporary links; the server key still works. Smoke test: an old public address now returns an error.
- Owner phone test again (same list as step 2).

### Step 4 — Closet and outfits: no more listing (database only)
- `wardrobe-items` and `saved-outfits` stay "anyone with the link can open", because closet items and outfits are community content (public reuse, public outfits, share links, share previews for social apps, default items) and **Live Cam downloads "My Closet" garments straight from these links**. Locking them would need changes in 41 app files, the closet analysis functions and the share previews, plus Live Cam testing, for clothes photos that people mostly share on purpose.
- Remove only the "anyone can list" rules, so nobody can browse everyone's closet. Owners keep their own rules. Links keep working, so Live Cam, public pages and previews are unaffected.
- Probe: a stranger can't list someone's closet folder; the owner can; the public link of a closet photo still opens.

### Step 5 — Account deletion removes every photo (1 function + 1 database helper)
- New database helper (server key only) that lists every stored file of a user in any folder: files in their own folder and event files under `<event>/<user>/`.
- `delete-account` removes all of them through the storage API (the database can't delete files directly) before deleting the account, then reports how many were removed.
- Probe: the helper finds a test user's files in every folder and can't be called by users.

### Order, approvals and undo
1 → 2 → phone test → 3 → phone test → 4 → 5. Each database step is one migration with a rollback script and is applied only with the owner's yes. Each function deploy is asked for separately. Step 2 ships through `main` (owner OK to merge). Undo: steps 1, 3 and 4 roll back with their scripts in seconds; step 2 code works with folders public or private.

## Decided by me (owner can change)
- Link lifetimes: 1 hour for your own uploads, 1 hour for picture inputs sent to The New Black, 24 hours for video inputs and for results shown in the app. Gallery and Events page make fresh links each time they load.
- `search-images` and `wardrobe` locked although nothing in the app reads them now (no database row points at them).
- `optimized-images` writes closed although its function's code isn't in the repo; it hasn't written anything since Aug 2025, and server writes don't need the rule.
- Closet originals: the original photo of a closet item (before cut-out) could show a person. Keeping the original private and sharing only the cut-out is a possible later step, not in this round.

## Left to the builder
Exact helper and function names, how the batch signing caches links, test file layout, rollback script details.

## Kiosk (separate)
Not part of this work; see `docs/redesign/KIOSK_MVP.md`.
