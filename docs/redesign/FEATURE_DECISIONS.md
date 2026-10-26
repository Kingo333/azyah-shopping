# Feature Decisions

Status: **recommendations awaiting approval.** "Hide" means the route and data stay; only the entry point goes, behind a feature flag (`src/contexts/FeatureFlagsContext.tsx` already exists). Nothing is deleted without explicit approval. Rollback for any hide = flip the flag back.

| Capability | Recommendation | Rationale (evidence) | Impact | Rollback |
|---|---|---|---|---|
| Swipe / grid discovery | **Keep visible** (Discover › For You) | Core loop; `/swipe` is today's main tab | Moves under new tab | Redirect `/swipe` stays |
| Global search | **Merge** into Discover › Search; add outfits | `GlobalSearch.tsx` only searches product titles, people, brands | Better search | Keep modal component until replaced |
| Globe | ~~Keep, refocus to People / Outfits / Brands~~ **Superseded: keep as is (see owner decisions below)** | 5 tabs today, 3 of them blank the globe and open drawers | Clearer purpose | `?tab=` redirects |
| Live Cam | **Keep visible, promote** to Try On tab | Differentiator, hidden in modal tab 3, shoppers only | Big UX gain | Old modal stays behind flag until new screen is accepted |
| Picture / Video try-on | **Keep but relocate** (Try On › Photo/Video) | Working, credit-based | Fewer entry points | — |
| BitStudio try-on via Favorites | **Merge** into Try On › Photo, then retire provider | Duplicate provider (`ProductTryOnModal`) | One provider bill | Flag |
| Event photo try-on | **Merge** into Try On (event garments as a garment source) and Kiosk | Same idea as Photo mode | — | `/events` redirect |
| AR (3D overlay) | **Keep** QR route; **defer** decision on kiosk use | Works per `.planning/`; Live Cam is the stronger demo | None now | — |
| Outfit canvas (Dress Me) | **Keep**; entry from Community › Create and Profile | Core creative tool | Entry moves | Paths unchanged |
| Wardrobe | **Keep but relocate** (Profile; also a garment source in Try On) | Feeds canvas and Live Cam | — | Paths unchanged |
| Moodboard builder | **Recommend removal** (code only) | `MoodBoardBuilder.tsx` never imported; `looks` has 2 rows | −1 dead feature | Git history; keep `looks` table |
| Posts | **Keep**, unify with outfits in one feed | 1 post, 3 fits; two creation modals | One Create flow | — |
| `/community` vs `/dress-me/community` vs `/fashion-feed` | **Merge** into `/community` | Three surfaces for the same content | Simpler | Redirects |
| Mock `/feed`, stub `/forum` | **Hide** now, **recommend removal** | Hard-coded data (`Feed.tsx:52`), 53-line stub | Removes fake content | Redirect to `/community` |
| UGC collaborations | **Hide behind flag**, move to Partner Workspace | Bottom tab, 0 collaborations ever | Frees a tab | Flag |
| Brand reputation (reviews, scams, Q&A) | **Hide behind flag** | Moderation burden, little use | — | Flag |
| Rewards / points / salons | **Keep but relocate** in Profile; **fix S4 first** | Monetisation lever; insecure redemption | — | — |
| Salon dashboard in brand portal | **Hide** for non-salon partners | Beauty salons ≠ fashion brands | Cleaner portal | Flag |
| Affiliate codes / promos | **Keep but relocate** (Profile), flag | 2 promos | — | Flag |
| Deals / price match | **Hide behind flag** | 6 functions, external API cost | — | Flag |
| Cart / checkout | **Hide** (route kept) | 0 rows, no in-app entry; shoppers buy on brand sites | None | Flag |
| Subscriptions / Upgrade | **Keep** | Monetisation (RevenueCat iOS, Stripe web) | — | — |
| Beauty consultant | **Hide** FAB, **recommend removal** of UI | Page unrouted; 9 deployed functions | Lower API exposure | Git |
| Toy replica | **Recommend removal** of UI | Unused | — | Git |
| Dead pages/components (~20 pages, ~116 files) | **Recommend removal** in one reviewed PR after the new IA ships | Never imported/routed | Smaller codebase, faster builds | Git revert |
| Brand & retailer portals | **Merge** into Partner Workspace | Two portals, overlapping product/import tools | Clearer B2B | Redirects |
| Analytics | **Keep** basic; add retention for `events` (689k rows) | Supporting | — | — |
| Admin delete-user tool | **Keep**, admin only | Ops need | — | — |
| `/debug/health` | **Hide** in production | Public today | — | — |
| Old onboarding pages | **Recommend removal** | Already marked deprecated | — | Git |

## Decisions needed from the owner (see the summary message for recommended defaults)
1. Live Cam access: shoppers only (today) or every signed-in user; free or premium?
2. Partner verification: approve brands/retailers manually before they can publish?
3. Cart/checkout: confirm it should be hidden.
4. UGC collaborations: hide now, revisit later?
5. Kiosk engine: Live Cam (JoyAI) as the kiosk experience, AR as fallback?

## Owner decisions (session 2, 2026-10-26)
| Capability | Decision | Notes |
|---|---|---|
| Globe | **Keep exactly as it works today** (owner, 2026-10-26: "operates as it does before any change"). Same full-screen globe, same tabs Brands / Follow / People / Deals, same pins, country drawer, Following and Deals drawers, search bar, Skip to Feed. Only change: the Fit tab is hidden (4 tabs instead of 5). | Supersedes the earlier People/Outfits/Brands layer idea and the old "Globe → 3 layers" / "Following becomes a filter" rows: **no globe rework**. In the new nav, Discover › Globe shows the existing `Explore` page unchanged; `/explore` and every `?tab=` keep working. Phase 2 adds regression tests for the globe first (there are none today). Checked 2026-10-26: the security migration doesn't touch anything the globe reads. |
| Your Fit (body-measurement matching) | **Hide behind a flag (`your_fit`, off). No longer needed.** Data and code stay. | Hide every entry point: Explore globe tab + `YourFitDrawer`, Community "Your Fit" tab (`YourFitContent`), Profile `YourFitPill`, ProfileSettings measurements section (`AddYourFitModal`), onboarding measurements step, RoleDashboard "Your fit" button. `/explore?tab=your-fit` → `/explore?tab=brands`. Not affected: the swipe "fit preference" style label (relaxed/tailored) and DressMe's "save your fit" (= outfit). |
