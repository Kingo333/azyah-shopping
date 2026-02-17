
The plan is to address the layout issues and visual preferences on the `Upgrade` page as requested. Specifically, I will fix the "BEST VALUE" badge from being cut off on the Yearly plan card by removing the `overflow-hidden` property and adjusting the padding. I will also remove the decorative `Sparkles` icon from the "Unlock Azyah Premium" hero section to ensure it looks professional and "emoji-free" as per the user's request.

### 1. Fix Layout Cutoff for Plan Cards
- **Problem**: The Yearly and Monthly plan cards have `overflow-hidden`, which cuts off the "BEST VALUE" badge because it is positioned partially outside the card boundary (`-translate-y-1/2`).
- **Solution**: Remove `overflow-hidden` from the plan card container. This will allow the absolutely positioned badge to render fully while maintaining the rounded corners of the card itself.
- **Adjustment**: Increase the top padding (`pt-5` to `pt-6`) of the Yearly card content to ensure there is clear visual separation between the "Yearly" text and the floating badge.

### 2. Remove "Sparkle" Decorations
- **Problem**: The user feels the `Sparkles` icon looks too much like an emoji and wants it removed from the "Unlock Azyah Premium" section.
- **Solution**: Remove the `Sparkles` icon and its containing `div` from the Hero section.
- **Secondary Fix**: Replace the `Sparkles` icon in the feature list (specifically for AI Try-On) with a `Sparkle` (singular) icon or a `Wand2` (Magic Wand) icon to maintain a premium feel without looking like a "sparkle emoji" set. I will use `Sparkle` as it's more subtle.

### Technical Details
- **File**: `src/pages/dashboard/Upgrade.tsx`
- **Plan Card Style**: Change `overflow-hidden` to `overflow-visible` (or just remove it since it's the default for most divs, but I'll explicitly remove the class).
- **Hero Section**: Remove lines 275-277.
- **Feature List**: Update `AI Try-On` icon to `Sparkle`.

### Verify Results
- Ensure the "BEST VALUE" badge is fully visible on mobile view.
- Verify the "Unlock Azyah Premium" title is clean and centered without any icons above it.
- Confirm that removing `overflow-hidden` doesn't affect the glassmorphism effect (it shouldn't as the background is applied to the container itself).

```text
File: src/pages/dashboard/Upgrade.tsx
- Line 22: Update AI Try-On icon to <Sparkle />
- Lines 275-277: Remove icon container
- Line 299: Remove 'overflow-hidden' from Yearly card
- Line 308: Increase 'pt-5' to 'pt-6'
- Line 329: Remove 'overflow-hidden' from Monthly card
```
