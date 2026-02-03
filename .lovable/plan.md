

# Brand & Retailer Portal Cleanup Plan

## Issues to Address

Based on my exploration, there are 4 distinct changes needed:

### 1. Move Bulk Upload Button Outside Modal
**Current State:** The "Bulk Upload" toggle is inside the `AddProductModal` (lines 611-620). Users click "Add Product" first, then can toggle to bulk mode.

**Desired State:** Add a separate "Add Multiple Products" button **next to** the "Add Product" button in both:
- `BrandPortal.tsx` (lines 686-702) 
- `RetailerPortal.tsx` (lines 507-513)

### 2. Remove "Import from Website" Button
**Current State:** `BrandPortalHeader.tsx` (lines 85-94) shows an "Import from Website" button that displays a "Coming Soon" toast.

**Desired State:** Remove this button entirely since the feature is no longer planned.

### 3. Fix Product Detail Modal Layout (Image Cutting into Text)
**Current State:** `BrandProductDetailModal.tsx` uses a 2-column grid layout with the `EnhancedProductGallery`. Looking at the screenshot, the main image from the gallery (which has `aspect-[3/4]` and `min-h-[400px]`) is cutting into/overlapping the text on the right side.

**Root Cause:** The `EnhancedProductGallery` component has very tall min-heights (`min-h-[400px] md:min-h-[500px] lg:min-h-[600px]`) that don't work well in a constrained modal dialog.

**Desired State:** The modal should display a clean, properly proportioned layout where the image gallery doesn't overflow into the product information.

### 4. Remove Partner Services Tab
**Current State:** `BrandPortal.tsx` includes a "partner-services" tab (lines 482) and `ServicesMarketplace` component (lines 656-661) for fashion brands.

**Desired State:** Remove the Partner Services tab and marketplace entirely since it's no longer needed.

---

## Technical Implementation

### File: `src/pages/BrandPortal.tsx`

1. **Add "Add Multiple Products" button** next to the existing "Add Product" button:
   - Add a new button at lines 686-702 that opens `AddProductModal` with `isEventContext={true}` to directly show bulk mode
   - Alternatively, add a new prop `initialBulkMode` to the modal

2. **Remove partner-services tab configuration:**
   - Remove from `getTabsConfig()` at line 482
   - Remove `<TabsContent value="partner-services">` at lines 656-661
   - Remove `ServicesMarketplace` import at line 28

### File: `src/pages/RetailerPortal.tsx`

1. **Add "Add Multiple Products" button** next to the existing "Add Product" button (lines 507-513)

### File: `src/components/BrandPortalHeader.tsx`

1. **Remove "Import from Website" button** (lines 85-94)
2. **Remove unused imports:** `Globe` icon (line 9)
3. **Remove `handleImportFromWebsite` function** (lines 49-54)
4. **Remove `onImportFromWebsite` prop** (lines 21, 26-27) - though it's already unused

### File: `src/components/BrandProductDetailModal.tsx`

1. **Simplify the layout** to prevent image overflow:
   - Remove `EnhancedProductGallery` (which has complex sizing)
   - Use a simpler image gallery directly in the modal that respects the modal's constraints
   - Apply `max-h-[50vh]` or similar constraint to the image container
   - Use `object-contain` for proper image display without cutting off

### File: `src/components/AddProductModal.tsx`

1. **Add `initialBulkMode` prop** so the modal can be opened directly in bulk mode
   - This allows the external "Add Multiple Products" button to open the modal directly in bulk mode

---

## Detailed Code Changes

### BrandPortal.tsx Changes

**At lines 479-485 (tab config):**
Remove `partner-services`:
```typescript
return [
  { value: 'products', label: 'Products' },
  { value: 'collabs', label: 'Collabs' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'settings', label: 'Settings' }
];
```

**At lines 686-702 (Add Product button area):**
Add "Add Multiple Products" button:
```tsx
<Button onClick={() => setIsAddProductModalOpen(true)} className="gap-2 bg-primary hover:bg-primary/90">
  <Plus className="h-4 w-4" />
  Add Product
</Button>
<Button variant="outline" onClick={() => setIsBulkAddModalOpen(true)} className="gap-2">
  <Upload className="h-4 w-4" />
  Add Multiple
</Button>
```

**Remove import and TabsContent for ServicesMarketplace**

### RetailerPortal.tsx Changes

**At lines 507-513 (Add Product button):**
Add second button for bulk upload similar to BrandPortal.

### BrandPortalHeader.tsx Changes

**Remove lines 85-94 entirely** (Import from Website button)
**Remove line 49-54** (handleImportFromWebsite function)
**Remove `Globe` from imports** (line 9)
**Clean up unused props**

### BrandProductDetailModal.tsx Changes

Replace `EnhancedProductGallery` with a simpler, constrained image display:
```tsx
<div className="relative">
  {/* Main Image - constrained to modal */}
  <div className="aspect-[4/5] max-h-[60vh] overflow-hidden rounded-lg bg-muted">
    <img
      src={mediaUrls[selectedImage] || '/placeholder.svg'}
      alt={product.title}
      className="w-full h-full object-contain"
    />
  </div>
  
  {/* Thumbnails */}
  {mediaUrls.length > 1 && (
    <div className="flex gap-2 mt-3 overflow-x-auto">
      {mediaUrls.map((url, idx) => (
        <button
          key={idx}
          onClick={() => setSelectedImage(idx)}
          className={`flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden ${
            selectedImage === idx ? 'border-primary' : 'border-border'
          }`}
        >
          <img src={url} alt="" className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  )}
</div>
```

### AddProductModal.tsx Changes

**Add `initialBulkMode` prop:**
```typescript
interface AddProductModalProps {
  // ... existing props
  initialBulkMode?: boolean;
}
```

**Initialize state with prop:**
```typescript
const [showBulkMode, setShowBulkMode] = useState(initialBulkMode || false);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/BrandPortal.tsx` | Add bulk upload button, remove partner-services tab & ServicesMarketplace |
| `src/pages/RetailerPortal.tsx` | Add bulk upload button |
| `src/components/BrandPortalHeader.tsx` | Remove "Import from Website" button and related code |
| `src/components/BrandProductDetailModal.tsx` | Replace gallery with constrained image display |
| `src/components/AddProductModal.tsx` | Add `initialBulkMode` prop |

