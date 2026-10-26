# Partner and Events Review

_Session 2, 2026-10-26. Read-only review: nothing here is built or applied yet._
Method: code reading (signup, portals, product upload, events, event try-on), live database checks (RLS policies, columns, row counts, storage buckets, Edge Function list), the Supabase skill's security checklist, and the Superpowers design process (findings → recommended design → owner decisions → plan).

## TL;DR
1. **Login and roles are sound after today's security fix.** Brands and retailers sign up with email + password using `?role=brand|retailer`. The server now decides the role, nobody can switch it, and no current screen tries to. Nothing for partners broke.
2. **Anyone signed in can create a brand or retailer profile and publish products to everyone.** The database only checks "you own it", not "you're a verified brand". Today 1 of 5 brand profiles (Abayacult) belongs to the retailer account, which may be intended (a store's own label), but a shopper could do the same.
3. **Events are a separate island.** An event's "brands" are typed names, not real brand accounts, and event garments aren't real products. So brands can't see or manage their event items, shoppers can't save or buy them, and the kiosk plan ("brand asks to join an event") is impossible with today's tables.
4. **Event try-on does use The New Black**, but with no credits, no limits and no checks, and shoppers' photos sit in a public bucket.
5. **Recommended shape:** one Partner Workspace with a thin "Events & pop-ups" section. Events link to real brands and real products. Shoppers get no new tab: events show up where they already shop (Discover, brand pages, the Try On garment tray, QR at the stand), and every try-on goes through the one Try On screen.

## 1. How it works today

### Accounts and login
| Step | Today | Verdict |
|---|---|---|
| Sign up | `/onboarding/signup` (email + password only; OAuth removed). `?role=brand` or `?role=retailer` skips the welcome screen. Role goes into signup metadata. | OK |
| Role assignment | `handle_new_user` / `handle_new_user_role` triggers copy the metadata role into `users.role` and `user_roles`. Since the fix: only shopper/brand/retailer are accepted; admin becomes shopper; the role can't be changed afterwards except by the server. | OK (fixed today) |
| Route guards | `ProtectedRoute` checks `user_roles`: `/brand-portal` for brand/admin, `/retailer-portal` for retailer/admin. | OK |
| UI decisions | 22 places read `user_metadata.role` (user-editable) for display, e.g. hiding the shopper bottom bar for partners. | Display only; Phase 2.4 replaces it with one `useRole()` |
| Brand / retailer profile | Created **by the browser** on the first portal visit (`BrandPortal.createBrandForUser`, same pattern in `RetailerPortal`). | Weak: see P1 |
| Switching account type | No screen does this. | Fine: none of today's flows broke |

Live counts: 7 `users` rows (brand 2, retailer 1, shopper 4); `user_roles` has 8 (brand 2, retailer 1, shopper 5), so one account has no `users` row. 5 brand profiles: ASOS (126 products, no owner, imported via the retailer), Unbranded (no owner), Alex Fashion Co (brand account), abdullahiking33 (brand account, 0 products), Abayacult (owned by the retailer account). 1 retailer profile.

### Adding items for shoppers
- **Brand portal tabs:** Products · Collabs · Analytics · Settings (agencies and studios see Services/Portfolio; salons get their own dashboard). **No Events tab.**
- **Retailer portal tabs:** Products · Collabs · Brands · Events · Analytics · Settings.
- **Add product** (`AddProductModal`): single form, or **bulk upload**, which creates one product per photo as `status = 'active'`, titled "Product 1…n", price 0, published immediately.
- **Import** (`ImportWizardModal`, `process-import`): imports from a website.
- **Shoppers** see products through Discover/swipe, brand pages and search.

### Events
```
Retailer ─ creates ─▶ retail_events (name, dates, location, banner, status draft/active/ended)
   └─ adds ─▶ event_brands  (brand_name TEXT + logo; NOT linked to a brand account)
         └─ uploads ─▶ event_brand_products (garment image, try-on image, AR model,
                         garment_type; product_id exists but is empty for all 5 rows)
Shopper ─ /events (login required) ─▶ pick event ─▶ brand ─▶ item
   ├─ "Try on" ─▶ EventTryOnModal ─▶ thenewblack-event-tryon (The New Black API)
   │      photo uploaded to the PUBLIC bucket event-user-photos; result to PUBLIC event-tryon-results
   ├─ "AR" / QR ─▶ /ar/:eventId/:brandId?productId=…  (3D overlay, no GPU cost)
   └─ Live Cam garment picker also lists event items (any 12, any event)
Brand ─ no access to any of this
```
Live data: 1 event ("Fashion week", active, 31 Jan–30 Apr 2026, **already ended**, so shoppers see no events today), 1 event brand, 5 event items (all labelled `bitstudio`), 24 event try-on jobs (BitStudio 2025, Gemini 2025, **The New Black 1 success on 2026-03-28**). There's also a second, parallel system: 9 products with `products.is_event_only = true`.

## 2. Findings

| ID | Severity | Finding | Evidence | Affects |
|---|---|---|---|---|
| P1 | High | Any signed-in user can create a brand or retailer profile, then insert products that every shopper sees. No verification. | `brands` / `retailers` INSERT policies only check `owner_user_id = auth.uid()`, not the account's role or verification | Trust and spam; partner verification (decision 3) |
| P2 | High | A retailer can create or edit products **under any brand's id**, and a brand can attach any `retailer_id`. Brand impersonation. | `products` "Retailer owners can insert/manage" check only `retailer_id`; brand policies only check `brand_id` | Brand pages, Discover, analytics |
| P3 | Medium | Public brand and retailer rows expose every column, including `contact_email`. | SELECT policies "Public can view limited … info only" use `true`, with no column limits | Partner privacy |
| P4 | Medium | Duplicate and overlapping policies (two ALL and two INSERT on `brands`/`retailers`), all `TO public`. | `pg_policies` | Hard to reason about; one bad policy opens everything (permissive policies are OR-ed) |
| P6 | Correction | S10 overstated it. When an UPDATE or ALL policy has no WITH CHECK, Postgres reuses USING for new rows, so a row **can't** be reassigned to another owner. | Postgres CREATE POLICY semantics | Downgrade S10 to cleanup: still add explicit WITH CHECK, as the Supabase checklist recommends |
| P7 | High (workflow) | Bulk upload publishes placeholder products ("Product 1", price 0) straight to shoppers. | `AddProductModal` bulk path `status: 'active'` | Shopper feed quality |
| P8 | High | Archived and inactive products are visible to everyone (S6). 28 non-active products today. | `products` "Event products only visible in event context" (`TO public`) OR-ed with other SELECT policies | Shoppers see withdrawn items |
| P9 | Medium | Products have no try-on readiness fields. `garment_type` and the try-on image exist only on event items. | `products` columns | "Try On from any product card" (Phase 4), kiosk, Live Cam |
| P10 | Medium | Two parallel event-product systems: `products.is_event_only` (9) and `event_brand_products` (5). | DB counts | Confusing; data drifts |
| E1 | High (structure) | Event brands are free text, not linked to `brands`. Brands can't see, accept or manage their event items (S11); brand pages can't show "at this event"; analytics can't be attributed. | `event_brands(brand_name, logo_url)` has no `brand_id` | Brand workflow, kiosk plan |
| E2 | High (structure) | Event items aren't catalog products (`product_id` empty for all). Shoppers can't save, buy or share them, and they never appear in Discover or search. | `event_brand_products.product_id` all null | Shopper value of events |
| E3 | High (cost) | Event try-on calls The New Black with **no credit check, no limit**, no check that the event is active or that the item belongs to it, and accepts any person-image URL. | `thenewblack-event-tryon` (deployed v50) vs `thenewblack-picture`, which deducts AI credits | Paid API spend |
| E4 | High (privacy) | Shopper photos for event try-on and the results are in **public** buckets (`event-user-photos` 7 files, `event-tryon-results` 4). The function logs photo URLs. | `storage.buckets.public = true` | Personal data (S7) |
| E5 | Low | Stale provider labels (`bitstudio` on items that now use The New Black), unused BitStudio/Gemini selector code (`src/lib/tryon/`), `event_user_photos.bitstudio_image_id`. | code + data | Confusion, wrong analytics |
| E6 | Medium (UX) | Shoppers must log in just to *browse* events; events are only reachable from dashboard and profile buttons; nothing shows when no event is active. | `ProtectedRoute` AUTH_REQUIRED_ROUTES has `/events` | Discoverability |
| E7 | Low | Live Cam's garment picker lists any 12 event items, including from ended events. | `LiveCamGarmentPicker` query | Minor; leave alone until the Try On phase (Live Cam rule) |

## 3. Recommended structure

### 3.1 Accounts (shopper, brand, retailer)
- Keep email + password and role-at-signup. Keep the server-only role (done today).
- **Create the brand or retailer profile on the server at signup** (in the same trigger), not from the browser on first visit. Only users whose `user_roles` says brand/retailer can own one, one per account.
- **Partner verification** (decision 3, recommended: manual approval): `verification_status` = pending / approved / rejected, set by the server or an admin only. Pending partners can build their catalog, but **shoppers only see products from approved partners**.
- **Public profile columns only:** shoppers and logged-out visitors read name, slug, logo, cover, bio, socials, website, country, category, currency. `contact_email` stays private (column privileges or a `security_invoker` view, per the Supabase checklist; plain views bypass RLS).
- **Consolidate policies:** one policy per action, `TO authenticated` / `TO anon` explicitly, ownership in USING **and** WITH CHECK.

### 3.2 Products (one catalog for everything)
- **Lifecycle:** `draft` → `active` → `archived`. Bulk upload and import create **drafts**. "Publish" requires title, price, at least one image and a category. Shoppers only ever see `active` products from approved partners (also fixes P8).
- **Who can write:** a brand writes its own products. A retailer writes products for its own store, for **unclaimed catalog brands** (no owner, e.g. ASOS imports), or for a claimed brand **only with an accepted partnership**. There is no partnership table today: the retailer's "Brands" list is derived from imported products (`useRetailerBrands`), so add an explicit `retailer_brands` (retailer, brand, status) link. A retailer must never write under a claimed brand without it (fixes P2).
- **Try-on readiness on the product itself:** `garment_type`, try-on image (clean, front, ≥ 768 px), and `try_on_ready` (computed by a readiness check). The same garment then works in Discover › Try on, Live Cam, events and the kiosk, with no re-uploading per event.

### 3.3 Events (my answer to "do we need a whole events section?")
**Yes, but a thin one, inside one Partner Workspace, and no separate events catalog.** Products are managed once, in Products, and an event only *references* them.

- **Partner Workspace** (`/partner`, one shell for both roles): Overview · Products · Try-on readiness · **Events & pop-ups** · Analytics · Settings. `/brand-portal` and `/retailer-portal` redirect there.
  - **Retailer = organiser:** create the event (dates, location, banner) → invite brands (or accept brand requests) → curate the event collection by picking from participating brands' try-on-ready products → (later) kiosk stands.
  - **Brand = participant:** sees invitations and open events → accepts or requests to join → picks which of **its own products** to bring → sees readiness warnings and event analytics.
- **Data (non-destructive, keeps every existing id and URL):**
  - `event_brands`: add `brand_id` (nullable, linked to `brands`) and `status` (invited / requested / approved / declined). `brand_name` and `logo` stay for **guest brands** that don't have an Azyah account yet (retailer-managed, claimable later).
  - `event_brand_products` (event items): add a required `product_id` for new items. Keep the try-on and AR override fields (for event-specific AR models). A linked, approved brand can manage its own items here (fixes S11).
  - Stop creating `products.is_event_only` rows; fold the 9 existing ones in during the migration.
  - Event status gains "upcoming" automatically from dates; "active" means between start and end.
- **Must keep working:** `/events`, every printed QR link `/ar/:eventId/:brandId?productId=…` (those ids stay), Live Cam's picker (`event_brand_products.id`, `image_url`, `garment_type`, `live_cam_garment_settings`), the Live Cam WebSocket contract.

### 3.4 Where shoppers meet events (no new tab)
- **Discover › For you:** a "Happening now" card when an event is active (name, dates, location) → opens the event page.
- **Event page** (`/events/:id`, with today's `/events` still working): **browsable without login**; brands → items → **Try on** · Save · Share · Shop brand · AR (QR). Logging in is only needed to try on or save.
- **Brand page:** "Find us at … until …" when the brand is participating.
- **Try On › garment tray:** an "Event" source (already in the IA), so event items work in Live and Photo try-on.
- **At the venue:** QR → event page, or the kiosk later (KIOSK_MVP.md). This structure is the kiosk's prerequisite.

### 3.5 The New Black connection
- Keep The New Black as the **Photo** try-on engine for events (and everywhere Photo mode is used). Live stays JoyAI.
- **One path:** event photo try-on goes through the same Try On › Photo flow and the same credit rules as `thenewblack-picture`. Event items arrive pre-selected (`/try-on?event_item=<id>`). Retire the separate modal once the new screen ships.
- **Server checks** in the event try-on function: event is active, item belongs to the event, person photo is the caller's own upload, and credits (or an event-sponsored free allowance, decision below) are deducted.
- **Private buckets and expiring links** for person photos and results; stop logging photo URLs.
- Fix the provider labels (`thenewblack`) and remove the unused BitStudio/Gemini selector code.

## 4. What each change affects, and when

| Change | Touches | Phase | Needs your OK for |
|---|---|---|---|
| Products: shoppers see only active (P8) | `products` SELECT policies | 1.4 (DB only) | Applying the migration |
| Partner write rules (P1, P2), public columns (P3), policy cleanup (P4, P6) | `brands`, `retailers`, `products` policies; signup trigger | 1.4 / 5.2 | Migration |
| Verification status | `brands`, `retailers` columns, admin approve tool; Discover queries filter on it | 5.2 | Migration; decision 3 |
| Event try-on checks and credits (E3), private buckets (E4) | `thenewblack-event-tryon`, buckets, `EventTryOnModal`, `Events.tsx` image URLs | 1.4 (buckets) + 4 (flow) | Edge Function deploy, migration |
| Bulk upload as draft + publish checklist (P7) | `AddProductModal`, `ImportWizardModal`, portal product lists | 5.1 | — (frontend; PR review) |
| Product try-on readiness (P9) | `products` columns, readiness check, portal "Try-on readiness" page | 5.3 | Migration |
| Events linked to brands and products (E1, E2, P10) | `event_brands`, `event_brand_products`, `RetailerEvents`, `EventBrandManager`, `BrandProductManager`, new brand-side Events page | 5.4 | Migration |
| Events in Discover, brand page, garment tray; public browsing (E6) | Discover, BrandDetail, Try On tray, `ProtectedRoute` | 3 / 4 | Your phone test (Try On) |
| Partner Workspace shell | new `/partner`, redirects from both portals | 5.1 | — |

## 5. Decisions for the owner
1. **Who pays for event try-ons?** Recommended: the shopper's normal credits, with an optional organiser-sponsored free allowance per event later.
2. **Guest brands at events** (brands without an Azyah account): allow the retailer to add them? Recommended: yes, marked "guest", claimable by the brand later.
3. **Browse events without logging in?** Recommended: yes; logging in is only needed to try on or save.
4. **Partner verification** (open since session 1): manual approval before shoppers see a partner's products? Recommended: yes.
