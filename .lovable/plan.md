
# Azyah UX Fix Pack - Implementation Plan

## Audit Summary

### Files Identified

| Component | File Path | Status |
|-----------|-----------|--------|
| AddYourFitModal (size dropdowns) | `src/components/profile/AddYourFitModal.tsx` | Select components already implemented correctly with Radix UI |
| YourFitDrawer | `src/components/explore/YourFitDrawer.tsx` | Uses AddYourFitModal |
| ProfileSettings (fit section) | `src/pages/ProfileSettings.tsx` | Opens AddYourFitModal via button (line 806) |
| Brand profile labels | `src/pages/BrandDetail.tsx` (line 350) | Shows "Marketing Agency" for non-fashion brands |
| Brand category selector | `src/components/brand/BrandCategorySelectorModal.tsx` | Contains "Marketing Agency" label |
| Try-On button on product cards | `src/pages/BrandDetail.tsx` (lines 69-77, 101-110) | Has "Try On" badge on explore product cards |
| Intro Carousel - Gallery slide | `src/pages/onboarding/IntroCarousel.tsx` (line 178) | "Earn points at salons" text |
| Intro Carousel - Swipe slide | `src/pages/onboarding/IntroCarousel.tsx` (line 64) | Current subtext needs update |
| Dashboard layout | `src/components/RoleDashboard.tsx` (lines 406-461) | Wardrobe before Trending Looks |
| Events thumbnail | `src/components/RoleDashboard.tsx` (lines 486-491) | Uses `featuredEvent.image_url` |
| Events query | `src/components/RoleDashboard.tsx` (lines 143-150) | Query missing `banner_image_url` |
| Auth screen | `src/pages/onboarding/SignUp.tsx` (lines 538, 632) | "(Clothing brands, agencies & studios)" text |
| Globe clustering | `src/components/globe/GlobeScene.tsx` | Country pins show count, drawer opens with list |

---

## Fix A1: Size Dropdowns Already Functional

**Finding:** The size dropdowns in `AddYourFitModal.tsx` are correctly implemented using Radix UI Select components (lines 165-209). The Select, SelectTrigger, SelectContent, and SelectItem components are properly imported and used.

**Root cause investigation needed:** If dropdowns aren't working, it may be a z-index conflict with the Dialog. The modal already has `className="max-w-md z-[70]"` and `overlayClassName="z-[70]"`.

**Potential fix:** Ensure SelectContent has proper z-index stacking. Update:

```text
File: src/components/profile/AddYourFitModal.tsx

Lines 169, 185, 201: Add className with z-index to SelectContent
FROM: <SelectContent>
TO:   <SelectContent className="z-[80]">
```

This ensures dropdown menus appear above the Dialog (z-70).

---

## Fix A2: Remove Weight Field

**File:** `src/components/profile/AddYourFitModal.tsx`

**Changes:**
1. Remove `weight` state variable (line 51)
2. Remove weight from measurements object (line 85)
3. Remove weight input JSX (lines 149-159)

```text
Line 51: DELETE
  const [weight, setWeight] = useState('');

Line 85: DELETE
  weight: weight ? parseFloat(weight) : undefined,

Lines 149-159: DELETE entire block
  {/* Weight - Optional */}
  <div className="space-y-2">
    <Label htmlFor="weight">Weight (kg) - optional</Label>
    <Input
      id="weight"
      type="number"
      placeholder="e.g., 60"
      value={weight}
      onChange={(e) => setWeight(e.target.value)}
    />
  </div>
```

**Also update:** `src/components/explore/YourFitDrawer.tsx` - Remove weight from UserMeasurements interface (line 31) but keep it optional in type to avoid breaking existing data.

---

## Fix B1: Brand Profile Labels

**Problem:** `src/pages/BrandDetail.tsx` line 350 shows "Marketing Agency" for non-fashion brands.

**Solution:** Since all brands have been migrated to fashion/clothing brands, update the label mapping:

```text
File: src/pages/BrandDetail.tsx

Line 155-156: Update condition to only show Salon label
FROM:
const isSalonOrAgency = brand?.category === 'salon' || brand?.category === 'agency' || brand?.category === 'studio';
const isFashionBrand = brand?.category === 'fashion_brand' || !brand?.category;

TO:
const isSalonOrAgency = brand?.category === 'salon';
const isFashionBrand = !isSalonOrAgency;

Line 350: Update label
FROM:
{brand.category === 'salon' ? 'Salon & Spa' : 'Marketing Agency'}

TO:
Salon & Spa
```

**Alternative (safer):** Show "Fashion Brand" for non-salon brands:

```text
Line 347-352: Update entire conditional block
FROM:
{isSalonOrAgency && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Briefcase className="h-4 w-4" />
    {brand.category === 'salon' ? 'Salon & Spa' : 'Marketing Agency'}
  </div>
)}

TO:
{isSalonOrAgency ? (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Briefcase className="h-4 w-4" />
    Salon & Spa
  </div>
) : (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <ShoppingBag className="h-4 w-4" />
    Fashion Brand
  </div>
)}
```

---

## Fix C: Remove Old Try-On Button from Explore Product Cards

**File:** `src/pages/BrandDetail.tsx`

**Changes:**
1. Remove "Try On" label badge (lines 69-77)
2. Remove Try On button from hover actions (lines 101-110)
3. Remove ProductTryOnModal import and usage (lines 19, 33, 122-126)

```text
Lines 69-77: DELETE entire block
{/* Try On label */}
{hasOutfit && (
  <div 
    className="absolute top-7 left-1.5 bg-accent text-white text-[9px] px-1.5 py-0.5 rounded-full opacity-90 cursor-pointer hover:opacity-100"
    onClick={(e) => { e.stopPropagation(); setTryOnModalOpen(true); }}
  >
    Try On
  </div>
)}

Lines 101-110: DELETE entire block
{hasOutfit && (
  <Button
    size="sm"
    variant="ghost"
    className="h-7 w-7 rounded-full bg-accent/90 hover:bg-accent backdrop-blur-sm"
    onClick={(e) => { e.stopPropagation(); setTryOnModalOpen(true); }}
  >
    <User className="h-4 w-4 text-white" />
  </Button>
)}

Lines 122-126: DELETE ProductTryOnModal component

Line 33: DELETE tryOnModalOpen state
  const [tryOnModalOpen, setTryOnModalOpen] = useState(false);

Line 19: DELETE import
  import ProductTryOnModal from '@/components/ProductTryOnModal';

Line 16, 32: DELETE useProductHasOutfit hook usage
```

---

## Fix D1: "Create, Collaborate, Inspire" Slide Copy

**File:** `src/pages/onboarding/IntroCarousel.tsx`

```text
Line 178: Update text
FROM:
<p className="text-xs text-muted-foreground">Earn points at salons</p>

TO:
<p className="text-xs text-muted-foreground">Earn points</p>
```

---

## Fix D2: "Your Style, Your Swipes" Subtext

**File:** `src/pages/onboarding/IntroCarousel.tsx`

```text
Line 64: Update subtitle
FROM:
subtitle: "Swipe right to save, left to pass. Your feed learns with every swipe.",

TO:
subtitle: "Swipe right to save, left to pass. Your feed learns your style and fit over time.",
```

---

## Fix E1: Dashboard Layout - Move Wardrobe Below Trending Looks

**File:** `src/components/RoleDashboard.tsx`

**Changes:** Swap the order of `ClosetOutfitsSection` (line 406) and "Trending Looks Section" (lines 408-461).

```text
Lines 405-461: Reorder sections

CURRENT ORDER:
{/* Wardrobe Data Section */}
<ClosetOutfitsSection />

{/* Trending Looks Section */}
<section className="px-4 pt-3">
  ...
</section>

NEW ORDER:
{/* Trending Looks Section */}
<section className="px-4 pt-3">
  ...
</section>

{/* Wardrobe Data Section */}
<ClosetOutfitsSection />
```

---

## Fix E2: Events Card Thumbnail Not Showing

**File:** `src/components/RoleDashboard.tsx`

**Problem:** The query fetches `image_url` but events table uses `banner_image_url`.

```text
Line 145: Query already includes '*' which should fetch all fields including banner_image_url

Line 488: Update image source
FROM:
src={featuredEvent.image_url || '/placeholder.svg'}

TO:
src={featuredEvent.banner_image_url || featuredEvent.image_url || '/placeholder.svg'}
```

---

## Fix F: Auth Screen Copy Cleanup

**File:** `src/pages/onboarding/SignUp.tsx`

```text
Lines 537-538: Remove agencies mention
FROM:
<p>
  Are you a brand?{' '}
  <span className="text-muted-foreground/80">(Clothing brands, agencies & studios)</span>
  {' '}

TO:
<p>
  Are you a brand?{' '}

Lines 631-632: Remove agencies mention (dark theme version)
FROM:
<p>
  Are you a brand?{' '}
  <span className="text-white/70">(Clothing brands, agencies & studios)</span>
  {' '}

TO:
<p>
  Are you a brand?{' '}
```

---

## Fix G: Globe Clustered Pin Behavior

**Current Implementation:** The globe already handles multiple brands per country correctly:
- Each country is represented by ONE pin regardless of brand count
- The pin shows `brandCount` in the tooltip (line 147): "X brand(s)"
- Clicking a pin opens `CountryDrawer` which lists all brands in that country
- CountryDrawer has tabs for "Brands" and "Products"

**No changes needed** - the system already works as specified:
1. Pin click opens country drawer
2. Drawer shows list of all brands in that country
3. User can select a specific brand to navigate

**Optional enhancement (if requested):** Add visual indicator for clustered pins (multiple brands):

```text
File: src/components/globe/GlobeScene.tsx

Line 86: Adjust pin size based on brand count
FROM:
const pinSize = isFeatured ? 0.04 : isActive ? 0.035 : 0.03;

TO:
const baseSize = isFeatured ? 0.04 : isActive ? 0.035 : 0.03;
const pinSize = baseSize + Math.min(brandCount * 0.002, 0.01); // Scale up slightly for more brands
```

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/components/profile/AddYourFitModal.tsx` | Add z-[80] to SelectContent, remove weight field |
| `src/components/explore/YourFitDrawer.tsx` | Keep weight optional in type (no functional change) |
| `src/pages/BrandDetail.tsx` | Remove Try-On badge/button, update category labels |
| `src/pages/onboarding/IntroCarousel.tsx` | Update "Earn points at salons" -> "Earn points", update swipe subtext |
| `src/components/RoleDashboard.tsx` | Reorder Wardrobe below Trending Looks, fix event thumbnail field |
| `src/pages/onboarding/SignUp.tsx` | Remove "(Clothing brands, agencies & studios)" text |

---

## Risk Assessment

| Change | Risk Level | Notes |
|--------|------------|-------|
| Size dropdown z-index | Low | CSS-only, no logic change |
| Remove weight field | Low | UI-only, backend column preserved |
| Brand labels | Low | Display text only |
| Remove Try-On | Low | Removing deprecated feature |
| Intro copy changes | Low | Static text updates |
| Dashboard reorder | Low | Component order swap |
| Event thumbnail | Low | Fallback chain for image |
| Auth copy | Low | Static text removal |
| Globe clustering | None | Already implemented correctly |

---

## Verification Checklist

After implementation:
- [ ] Size dropdowns open and select values properly in AddYourFitModal
- [ ] No weight field visible in fit modals
- [ ] Brand profiles show "Fashion Brand" or "Salon & Spa" (no "Marketing Agency")
- [ ] No "Try On" badges on brand product cards in Explore
- [ ] Gallery slide shows "Earn points" (not "at salons")
- [ ] Swipe slide shows soft fit mention in subtext
- [ ] Trending Looks appears above Wardrobe on dashboard
- [ ] Event cards show thumbnail images
- [ ] Auth screens have no mention of "agencies & studios"
- [ ] Globe pin clicks open country drawer with brand list
