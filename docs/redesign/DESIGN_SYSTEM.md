# Design System (proposed foundations)

Status: proposal. Visual wireframes will be shared as mockups for approval before any screen is rebuilt.

## Keep
- Brand colours already defined as tokens in `src/index.css`: `--azyah-maroon` (#7A143E, also `--primary`), `--azyah-ivory` (#F9F8F6), `--azyah-border` (#E5E3DF), with dark-mode values.
- shadcn/ui + Radix components in `src/components/ui/` (accessible primitives).
- The canvas interaction (`EnhancedInteractiveCanvas`) and the swipe card feel.

## Fix
| Issue | Evidence | Change |
|---|---|---|
| Three competing display serifs | `font-cormorant` ×61, `font-serif` ×38, `font-playfair` ×26 | One display face (proposed: Cormorant Garamond for headings only) + Inter for UI |
| Hard-coded colours | 21 `bg-[#…]`/`text-[#…]` | Replace with tokens |
| Two bottom-bar styles, glass effects with low contrast (`bg-white/50`) | `BottomNavigation.tsx` | One solid bar, WCAG AA contrast |
| Many card variants | ProductCard, MiniCard, SimilarItemCard, ClothingItemCard, ProductRecommendationCard… | Three cards: **ProductCard**, **OutfitCard**, **PersonCard**, each with the same action row |

## Tokens (to centralise in `src/index.css` + `tailwind.config.ts`)
- Colour: `primary` (maroon), `surface` (ivory), `ink` (near-black text), `muted`, `border`, `success`, `warning`, `danger`. Accent used sparingly: primary buttons, active tab, live indicator.
- Type scale: display 32/28, title 22, heading 18, body 15/16, caption 12. Body never below 14 px on mobile; inputs 16 px (avoids iOS zoom).
- Spacing: 4-px base (4, 8, 12, 16, 24, 32, 48). Page gutter 16 px mobile.
- Radius: 12 (cards), 999 (pills/chips), 20 (sheets).
- Motion: 150–250 ms ease-out for UI; no auto-hiding chrome; respect `prefers-reduced-motion`.
- Touch targets ≥ 44 × 44 px.

## Core components
Bottom tab bar / desktop rail · Mode switch (segmented control) · ProductCard / OutfitCard / PersonCard with one action row (Try On, Save, Share) · Bottom sheet (product, country, create) · Try-On stage (camera view, status pill, garment tray) · Empty / error / loading states (skeletons, retry) · Consent notice (camera, saving images).

## Brand name
Not changed. Name, logo, colours and SEO text should come from one config file (`src/config/brand.ts`, to create) so a rename later is a small change.
