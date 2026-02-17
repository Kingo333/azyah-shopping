

# Premium Upgrade Page Redesign + Terms/Privacy Compliance + Cookie Policy

## Overview

Four deliverables: (A) Premium glass redesign of the Upgrade page (frontend only, zero backend changes), (B) Terms page updated with subscription/AI/rewards/UGC sections for Apple compliance, (C) Privacy page fixed to remove Stripe and add AI/biometric/retention disclosures, (D) New Cookie Policy page linked from the Landing footer.

---

## A. Upgrade Page -- Premium Glass Redesign

**File: `src/pages/dashboard/Upgrade.tsx`**

All changes are CSS/JSX only. Every RevenueCat call, product fetch, purchase handler, restore handler, and state logic stays identical.

### Background
- Strengthen gradient from 5% to 12% opacity: `from-[hsl(var(--azyah-maroon))]/12 via-background to-primary/8`
- Add a secondary radial gradient via a pseudo-element (`absolute inset-0 bg-radial-gradient`) for depth
- Add a subtle CSS sparkle/dot decorative pattern behind the hero using a repeating radial-gradient on a `::before` pseudo-element (pure CSS, no images)

### Header
- Add a small brand mark: the Crown icon in maroon before "Choose Your Plan"
- Keep sticky behavior and glass styling intact

### Hero Section
- Enlarge Crown icon from `h-6 w-6` to `h-10 w-10`
- Add a soft glow ring: `shadow-[0_0_24px_rgba(var(--azyah-maroon-rgb),0.25)]` around the icon
- Add a subtle CSS shimmer animation (keyframes that slide a gradient highlight across the card)
- Keep headline and subtext, tighten to 1 line each

### Feature Pills
- Replace flat `bg-primary/10` with glass: `bg-white/40 backdrop-blur-md border border-white/20 rounded-full`
- Expand to 6 pills (fits 2-column grid cleanly):
  1. AI Try-On (existing)
  2. UGC Collaboration (existing)
  3. Redeem Points (existing)
  4. Height/Fit Check (new pill)
  5. Taste Learning (new pill)
  6. Price Comparison (new pill)

### Plan Cards
- Increase padding from `p-3` to `p-4`
- Add subtle inner glow on selected card: `shadow-[inset_0_0_12px_rgba(var(--azyah-maroon-rgb),0.08)]`
- Add a small Crown icon on yearly card next to "BEST VALUE" badge
- Make cards feel tappable: `active:scale-[0.98]` press feedback
- All onClick/selection logic untouched

### Comparison Table
- Make it collapsible: default collapsed with "See full comparison" toggle button
- Add alternating row backgrounds: `even:bg-white/20` for readability
- Wrapped in Collapsible from Radix (already installed in the project)

### CTA Button
- Replace solid button with gradient: `bg-gradient-to-r from-[hsl(var(--azyah-maroon))] to-primary text-white`
- Add subtle glow shadow: `shadow-[0_4px_16px_rgba(var(--azyah-maroon-rgb),0.3)]`
- All onClick handler (`handleContinue`) and disabled logic stay identical

### Footer
- Keep Terms/Privacy links, add Cookie Policy link

### Shimmer Animation (CSS)
Add to the component or a style tag:
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```
Applied as a subtle overlay on the hero card only.

---

## B. Terms & Conditions -- Apple Compliance Update

**File: `src/pages/Terms.tsx`**

### Changes
- Update "Last Updated" to **February 17, 2026**
- Add 5 new sections after the existing 12, renumbered:

**New Section: Subscriptions & Auto-Renewal** (Apple requirement)
- Azyah Premium is offered as an auto-renewable subscription
- Billing: charged through Apple In-App Purchase at confirmation
- Auto-renewal: subscription renews automatically unless cancelled at least 24 hours before the end of the current period
- How to cancel: iOS Settings > Apple ID > Subscriptions
- No partial refunds for unused portions of a subscription period (unless required by applicable law)
- Pricing shown in-app and may vary by region/currency

**New Section: AI-Generated Content**
- AI virtual try-on generates synthetic preview images and videos; results are approximations and may not reflect actual appearance
- Users retain ownership of uploaded photos; by uploading, users grant Azyah a limited license to process images for generating try-on results
- AI outputs are for personal use and preview purposes only
- Azyah may moderate or remove AI-generated content at its discretion

**New Section: Rewards & Points Program**
- Points earned through platform activity have no cash value
- Points are non-transferable between accounts
- Points may be redeemed for AI credits as described in-app
- Azyah reserves the right to modify, suspend, or terminate the rewards program at any time

**New Section: UGC Collaborations**
- Users participating in brand collaborations do so as independent parties, not employees
- Content created through collaborations is subject to the terms agreed between user and brand
- Azyah facilitates collaboration opportunities but is not a party to payment or delivery disputes
- Users are responsible for the accuracy and legality of content they create

**New Section: Personalization & AI Features**
- The platform uses AI to learn user style preferences (taste learning) through swipe interactions and browsing behavior
- Height and fit fact-checking provides AI-estimated sizing guidance; results are approximate and should not replace trying items on
- Price comparison features aggregate publicly available pricing data; Azyah does not guarantee price accuracy

- Update contact section to include: **support@azyahstyle.com**
- Renumber all sections sequentially (1-17)

---

## C. Privacy Policy -- Fix Inaccuracies + Add Disclosures

**File: `src/pages/Privacy.tsx`**

### Changes
- Update "Last Updated" to **February 17, 2026**

**Section 1 (Information We Collect)** -- Add:
- "Facial and body imagery (uploaded for AI virtual try-on features)" under Personal Information
- "Height and body measurements (for fit estimation features)" under Personal Information
- "Device identifiers and in-app purchase transaction metadata" under Usage Data
- "Style preference data from swipe interactions (taste learning)" under Usage Data

**Section 2 (How We Use)** -- Add:
- "Generate AI virtual try-on images and videos using your uploaded photos"
- "Provide height and fit fact-checking based on your measurements"
- "Learn your style preferences through your interactions to personalize recommendations"
- "Process rewards points and credit redemptions"

**Section 3 (Information Sharing)** -- Add:
- "AI Processing Partners: Your photos may be sent to third-party AI services to generate virtual try-on results. These services process images according to their own privacy policies and do not retain your data beyond the processing session."

**Section 7 (Third-Party Services)** -- Fix:
- Remove "Stripe for premium features" (INCORRECT -- app uses RevenueCat/Apple IAP)
- Replace with:
  - "Subscription Management: RevenueCat and Apple In-App Purchases for premium subscription processing"
  - "AI Services: Third-party AI providers for virtual try-on image and video generation"
  - "Database & Authentication: Supabase for user accounts and data storage"

**New Section: AI Data & Photo Processing** (after Third-Party Services)
- Photos uploaded for AI try-on are processed by third-party AI services
- Generated try-on outputs are stored temporarily and can be deleted by the user at any time
- Azyah does not use uploaded photos for purposes other than generating the requested try-on result
- Users can request deletion of all uploaded photos and generated outputs by contacting support

**New Section: Data Retention**
- Account data: retained until user requests deletion
- AI try-on uploads and outputs: retained until deleted by user or 90 days after generation, whichever comes first
- Style preference and interaction data: retained for the duration of active account
- Analytics and usage logs: retained for up to 24 months
- Subscription transaction records: retained as required by applicable tax and financial regulations

**Section 11 (Contact Us)** -- Fix:
- Change email from `privacy@azyah.app` to `support@azyahstyle.com` (consistent with Settings page)

- Renumber all sections sequentially (1-13)

---

## D. Cookie Policy Page (New)

**File: `src/pages/CookiePolicy.tsx`** (new)

- Same design as Terms/Privacy: `GlassPanel variant="premium"`, same header with back button, same styling
- Short page covering:
  - What cookies are (brief)
  - Essential cookies (session, authentication)
  - Analytics cookies (usage tracking)
  - Preference cookies (style preferences, theme)
  - Affiliate tracking cookies (commission attribution)
  - How to manage cookies (browser settings)
  - Contact: support@azyahstyle.com
- Last Updated: February 17, 2026

**File: `src/App.tsx`** -- Add route:
- `<Route path="/cookies" element={<CookiePolicy />} />`

**File: `src/pages/Landing.tsx`** (line 914) -- Fix:
- Change the Cookie Policy button from a no-op to `onClick={() => navigate('/cookies')}`

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/pages/dashboard/Upgrade.tsx` | Glass redesign: stronger gradients, glow hero, glass pills, tappable cards, collapsible comparison, gradient CTA, shimmer animation. Zero backend changes. |
| `src/pages/Terms.tsx` | Add 5 sections (Subscriptions, AI Content, Rewards, UGC, Personalization), update date, add contact email |
| `src/pages/Privacy.tsx` | Remove Stripe, add AI/biometric/retention disclosures, fix contact email, update date |
| `src/pages/CookiePolicy.tsx` | New page with cookie categories and controls info |
| `src/App.tsx` | Add `/cookies` route |
| `src/pages/Landing.tsx` | Wire Cookie Policy button to navigate to `/cookies` |

---

## Technical Notes

- **RevenueCat/payment backend untouched**: The Upgrade page diff will show only className, JSX structure, and static content changes. All hooks (`useSubscription`, `usePremium`), IAP functions (`initIap`, `getProducts`, `purchaseProduct`, `restorePurchases`), purchase handlers, and state management remain byte-for-byte identical.
- **Collapsible component**: Already installed (`@radix-ui/react-collapsible`) and exported from `src/components/ui/collapsible.tsx`. Used for the comparison table toggle.
- **Shimmer animation**: Pure CSS keyframes, no JS re-renders. Applied via inline style or a `<style>` tag scoped to the component.
- **Glass styling**: Consistent with the app's existing `bg-white/50 backdrop-blur-xl border-white/20` pattern used across AI Studio, Feed nav, and Profile.
- **Auth gating**: The `/dashboard/upgrade` route is already wrapped in `<ProtectedRoute>` in App.tsx. No changes to routing or guards.
- **Deprecated PlanSelection.tsx**: Not touched. It references Stripe but is marked deprecated and unused.
