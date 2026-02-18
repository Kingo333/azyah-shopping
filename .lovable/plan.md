
## Plan: Adjust "Slide to compare" position and reduce Azyah branding size

### Changes

**1. Move "Slide to compare" text lower (BeforeAfterSlider.tsx)**
- Change `bottom-[45%]` to `bottom-4` (back to original position, which places it just above the bottom of the slider image area -- right above where the Azyah logo sits below the slider)
- This puts it on the same horizontal line as the red navigation arrows

**2. Make Azyah branding slightly smaller (IntroCarousel.tsx)**
- Reduce the logo image from `h-6 w-6` to `h-5 w-5`
- Reduce the "Azyah" text from `text-lg` to `text-base`
- Reduce the gap/margin slightly (`mb-2` to `mb-1`)

### Technical Details

| File | Line(s) | Change |
|------|---------|--------|
| `src/components/BeforeAfterSlider.tsx` | 166 | `bottom-[45%]` -> `bottom-8` |
| `src/pages/onboarding/IntroCarousel.tsx` | 948 | Logo: `h-6 w-6` -> `h-5 w-5` |
| `src/pages/onboarding/IntroCarousel.tsx` | 950 | Text: `text-lg` -> `text-base` |
| `src/pages/onboarding/IntroCarousel.tsx` | 944 | Spacing: `mb-2` -> `mb-1` |
