

# Optimize Edit Try-On Modal + Increase 3D Upload Limit

## Problem
The "Edit Try-On" modal (lines 351-742 in `BrandProductManager.tsx`) is dense and overwhelming — it crams product preview, outfit image upload, force-reupload checkbox, 3D model upload, garment type selector, validation feedback, and action buttons into one scrollable dialog. The 3D model upload also caps at ~10MB implicitly (no explicit check, but outfit images are capped at 10MB), and needs to support 50MB files.

## Changes (single file: `src/components/BrandProductManager.tsx`)

### A. Restructure Modal into Tabs/Sections
Replace the current side-by-side layout with a cleaner **tabbed layout** using two tabs:
1. **Image Try-On** — outfit image upload, preview, force-reupload option
2. **3D AR Model** — garment type selector, GLB upload, validation feedback

This halves the visible content at any given time. The product image thumbnail + brand info stays as a compact header above the tabs.

### B. Increase 3D File Size Limit to 50MB
- Currently there's no explicit size check for GLB files (outfit images have a 10MB check at line 419)
- Add explicit validation: allow up to 50MB for `.glb`/`.gltf` files
- Show clear error if file exceeds 50MB

### C. UI Polish
- Compact the product preview (smaller image, inline with title)
- Remove the legacy BitStudio force-reupload checkbox (lines 388-399) since the system now uses The New Black — this is dead UI
- Cleaner upload areas with drag-and-drop styling consistent with `EventTryOnModal`
- Move Save/Cancel buttons into each tab context so the user flow is linear

## Technical Details

**File**: `src/components/BrandProductManager.tsx` (lines ~349-742)

- Add `Tabs, TabsList, TabsTrigger, TabsContent` from `@/components/ui/tabs`
- Split modal content into two `TabsContent` blocks
- Add `file.size > 50 * 1024 * 1024` guard in the GLB upload handler (around line 598)
- Remove the `forceReupload` checkbox block (lines 388-399) and related state if unused elsewhere
- Reduce product preview image from `h-64` to a small `w-16 h-16` thumbnail in a compact header row

