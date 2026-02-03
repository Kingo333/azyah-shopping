
# Product Upload and Display Simplification — Complete Audit and Plan

## Executive Summary

This plan addresses 5 major change areas to simplify product management for brand/retailer users and streamline the shopper experience across **Swipe** and **List** view modes—while keeping the core flow and UI structure intact.

---

## Part 1: Current State Audit

### 1.1 Add Product Modal (`AddProductModal.tsx`)

**Current required/displayed fields:**

| Field                    | Required                      | Location (lines) |
| ------------------------ | ----------------------------- | ---------------- |
| Product Name             | Yes (required)                | 463-464          |
| Price                    | Yes (required)                | 469-470          |
| Currency                 | Yes (required)                | 474-483          |
| Description              | No                            | 488-490          |
| Category                 | Yes (required)                | 494-505          |
| Subcategory              | No                            | 508-519          |
| Gender                   | No                            | 522-533          |
| Stock Quantity           | No                            | 537-540          |
| SKU                      | No                            | 543-545          |
| Shop Now URL             | No                            | 548-552          |
| Product Images           | No                            | 556-611          |
| Size Chart (per product) | No                            | 614-704          |
| Virtual Try-On           | No (shown for brand/retailer) | 707-793          |

**Issues identified:**

* **Virtual Try-On section** (lines 707-793) must be removed from product upload.
* **Size Chart** (lines 614-704) should move to brand/retailer profile settings (universal for their products).
* **Stock Quantity** (lines 537-540) is not needed.
* **Product Name** is currently required but should be optional.

---

### 1.2 Edit Product Modal (`EditProductModal.tsx`)

**Similar structure to AddProductModal:**

* Stock Quantity field (lines 358-361)
* Size Chart upload (lines 432-433)
* Virtual Try-On section (lines 436-558)

**Issues identified:**

* Same removals and simplifications should be applied here as well.

---

### 1.3 Brand Product Detail Modal (`BrandProductDetailModal.tsx`)

**What shows when clicking a product in the brand/retailer catalog (lines 129-401):**

| Section              | Lines   | Should Remove?                                            |
| -------------------- | ------- | --------------------------------------------------------- |
| Size/Color Selector  | 298-314 | **Yes** — remove XS/S/M/L/XL + colors                     |
| Inventory Management | 340-372 | **Yes** — remove stock qty, SKU, category management view |
| Size Chart Upload    | 331-338 | **Yes** — moving to profile settings                      |
| Analytics            | 263-287 | Keep — valuable for brand/retailer                        |
| Pricing              | 226-261 | Keep                                                      |
| Description          | 316-328 | Keep                                                      |
| External URL         | 374-401 | Keep                                                      |

**Goal:** When a brand clicks a product in their catalog, it should feel like a **clean product preview + analytics**, not a full inventory/variant manager.

---

### 1.4 SwipeCard Component (`SwipeCard.tsx`)

**Current top-right buttons (lines 219-253):**

1. **AddToClosetButton** (line 222) — "Add to Dress Me/Closet" → **REMOVE**
2. **Virtual Try-On button** (lines 224-239) → Keep (but separate feature)
3. **Info button** (lines 241-252) → Keep but update content

**Info button behavior:**

* Calls `onProductClick(product)` which opens `PhotoCloseup` or `ProductDetailPage`
* Currently shows: multiple images, size chart, description, size/color selectors, and other details

**Updated intent for Info:**

* Multiple images gallery
* Description
* Size chart (fetched from brand/retailer profile)

---

### 1.5 ProductListView Component (`ProductListView.tsx`)

**Current "+ Closet" button (lines 185-210):**

* Adds product to wardrobe/Dress Me feature
* Should be **REMOVED**

---

### 1.6 MiniDiscover / MiniSwipeCard

**Current "Add to Closet" functionality (lines 118-128):**

* `handleAddToCloset` callback
* Should be **REMOVED**

---

### 1.7 PhotoCloseup Component (`PhotoCloseup.tsx`)

**Info modal content when clicking "i" button:**

| Feature                 | Lines   | Status                                        |
| ----------------------- | ------- | --------------------------------------------- |
| Multiple Images Gallery | 358-403 | Keep                                          |
| Description             | 407-416 | Keep                                          |
| Size Chart button       | 481-491 | Keep (but source from brand/retailer profile) |
| "+ Closet" button       | 439-480 | **REMOVE**                                    |
| Like/Save buttons       | 418-438 | Keep                                          |

---

## Part 2: Changes Required

### 2.1 Remove Virtual Try-On From Product Upload

**Files affected:**

* `src/components/AddProductModal.tsx` (lines 707-793)
* `src/components/EditProductModal.tsx` (lines 436-558)

**Remove entirely:**

* “Virtual Try-On” UI section
* Any uploads tied to it
* The `useProductOutfits` hook import/usage (if only used for this section)

---

### 2.2 Move Size Chart to Profile Settings (Universal Size Chart)

**Database changes:**
Add `size_chart_url` column to both `brands` and `retailers` tables:

```sql
ALTER TABLE brands ADD COLUMN size_chart_url TEXT;
ALTER TABLE retailers ADD COLUMN size_chart_url TEXT;
```

**Files affected:**

1. `src/components/BrandSettingsForm.tsx` — add size chart upload section
2. `src/components/RetailerSettingsForm.tsx` — add size chart upload section
3. `src/components/AddProductModal.tsx` — remove per-product size chart (lines 614-704)
4. `src/components/EditProductModal.tsx` — remove per-product size chart (lines 432-433)
5. `src/components/BrandProductDetailModal.tsx` — remove size chart editing (lines 331-338)
6. `src/components/PhotoCloseup.tsx` — fetch size chart from brand/retailer profile
7. `src/types/index.ts` — add `size_chart_url` to Brand/Retailer types

---

### 2.3 Simplify Product Detail Modal (Brand/Retailer View)

**Remove from `BrandProductDetailModal.tsx`:**

1. Size/Color Selector (lines 298-314)
2. Inventory Management section (lines 340-372)
3. Size chart editing section (lines 331-338)

**Keep:**

* Image gallery
* Pricing section
* Analytics section
* Description
* External URL section

---

### 2.4 Simplify Add/Edit Product Forms

#### Changes to `AddProductModal.tsx`

| Field          | Current     | New                       |
| -------------- | ----------- | ------------------------- |
| Product Name   | Required    | Optional                  |
| Stock Quantity | Shown       | Remove                    |
| Size Chart     | Per-product | Remove (moved to profile) |
| Virtual Try-On | Shown       | Remove                    |

**Add “Add Multiple Products” button:**

* Add a new button next to “Add Product” called **Add Multiple Products**
* It opens bulk upload mode so brands can upload many images first and fill details later
* This already exists as `isEventContext` mode — expose it for normal product upload flow too

**Minimum input for fast upload (keep only the essentials):**

* Image(s)
* Price
* Currency
  Optional but recommended:
* Shop URL
* Product Name (optional; can be added later)

**Key logic change:**

* If Product Name is blank, display name should fall back to **brand page name** or brand display name.

#### Changes to `EditProductModal.tsx`

* Remove Stock Quantity
* Remove Size Chart section
* Remove Virtual Try-On section

---

### 2.5 Remove “Add to Closet / Dress Me” Buttons (Discovery Only)

**Files affected:**

1. `src/components/SwipeCard.tsx` — remove `AddToClosetButton` (lines 57-119, 222)
2. `src/components/ProductListView.tsx` — remove "+ Closet" button (lines 185-210)
3. `src/components/MiniDiscover.tsx` — remove closet functionality
4. `src/components/PhotoCloseup.tsx` — remove "+ Closet" button (lines 439-480)

---

### 2.6 Update Info Button Content (Swipe View)

**What “i” should show (final):**

1. Additional images (gallery)
2. Product description
3. Size chart (from brand/retailer profile)

**What to remove from “i”:**

* Size/color selectors
* Inventory/stock details
* Anything that belongs to internal catalog operations

---

## Part 3: Implementation Plan

### Phase 1: Database Migration (Add size_chart_url to profiles)

1. Create SQL migration to add `size_chart_url` column to `brands` and `retailers`

### Phase 2: Update Settings Forms

2. Add Size Chart upload component to `BrandSettingsForm.tsx`
3. Add Size Chart upload component to `RetailerSettingsForm.tsx`

### Phase 3: Simplify Product Upload

4. Update `AddProductModal.tsx`:

   * Make Product Name optional
   * Remove Stock Quantity field
   * Remove Size Chart section
   * Remove Virtual Try-On section
   * Add **Add Multiple Products** mode toggle/button

5. Update `EditProductModal.tsx`:

   * Remove Stock Quantity field
   * Remove Size Chart section
   * Remove Virtual Try-On section

### Phase 4: Simplify Brand/Retailer Product View

6. Update `BrandProductDetailModal.tsx`:

   * Remove size/color selector
   * Remove inventory management section
   * Remove size chart editing
   * Keep analytics + pricing + description + external URL

### Phase 5: Remove “Add to Closet” Buttons from Discovery Cards

7. Update `SwipeCard.tsx`:

   * Remove `AddToClosetButton` component and any usage

8. Update `ProductListView.tsx`:

   * Remove "+ Closet" button from product cards
   * Remove `useAddProductToWardrobe` import if no longer used

9. Update `MiniDiscover.tsx`:

   * Remove closet-related handlers/callbacks

10. Update `PhotoCloseup.tsx`:

* Remove "+ Closet" button

### Phase 6: Update Info Modal Content

11. Update `PhotoCloseup.tsx`:

* Fetch size chart from brand/retailer profile (not product)
* Keep only: images + description + size chart + like/save

12. Update `ProductDetailPage.tsx` (if used):

* Remove size/color selectors
* Keep only: images + description + size chart

---

## Part 4: File Changes Summary

| File                                         | Changes                                                                                   |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **SQL Migration**                            | Add `size_chart_url` to brands and retailers                                              |
| `src/components/BrandSettingsForm.tsx`       | Add size chart upload section                                                             |
| `src/components/RetailerSettingsForm.tsx`    | Add size chart upload section                                                             |
| `src/components/AddProductModal.tsx`         | Remove: Virtual Try-On, Size Chart, Stock Qty. Make name optional. Add bulk upload button |
| `src/components/EditProductModal.tsx`        | Remove: Virtual Try-On, Size Chart, Stock Qty                                             |
| `src/components/BrandProductDetailModal.tsx` | Remove: Size/Color selector, Inventory Management, Size chart editing                     |
| `src/components/SwipeCard.tsx`               | Remove: AddToClosetButton component + usage                                               |
| `src/components/ProductListView.tsx`         | Remove: "+ Closet" button                                                                 |
| `src/components/MiniDiscover.tsx`            | Remove: closet functionality                                                              |
| `src/components/PhotoCloseup.tsx`            | Remove: "+ Closet" button. Fetch size chart from profile                                  |
| `src/types/index.ts`                         | Add `size_chart_url` to Brand/Retailer types                                              |

---

## Part 5: Impact Analysis

### How Products Display in Different Contexts

| Context                  | Brand/Retailer      | Shopper                      | Changes                                     |
| ------------------------ | ------------------- | ---------------------------- | ------------------------------------------- |
| Swipe View               | N/A                 | Sees product + swipe actions | Remove Closet button; Info simplified       |
| List View                | N/A                 | Sees product grid/list       | Remove Closet button                        |
| Product Catalog (Portal) | Click to view       | N/A                          | Modal simplified (no size/colors/inventory) |
| Info Button (“i”)        | N/A                 | Views details                | Show only: images, description, size chart  |
| Add Product              | Brand/Retailer only | N/A                          | Simplified form + bulk option               |
| Edit Product             | Brand/Retailer only | N/A                          | Simplified form                             |

### Size Chart Flow Change

**Before:** Each product has its own size chart
**After:** Each brand/retailer has **one** size chart applied to all their products

---

## Technical Notes

* Size chart is currently stored in `products.attributes.size_chart` (JSON)
* After moving, size chart should be fetched from the product’s **brand** or **retailer** relationship using `brand_id` / `retailer_id`
* The existing `SizeChartUpload` component can be reused inside settings forms
* Existing per-product size charts can remain in the DB but will not be editable going forward; new/updated UI uses brand/retailer `size_chart_url`

---
