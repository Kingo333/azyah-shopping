
## Two Profile Loading Performance Fixes

### The Real Problems Found

After reading both `src/pages/UserProfile.tsx` (the page you land on when clicking someone's post in the feed) and `src/pages/Profile.tsx` (your own profile in the bottom nav), there are clear, specific bottlenecks in both.

---

### Problem 1: Public Profile Page (`/profile/:userId`) — "Posts, Outfits, Items" page

**File:** `src/pages/UserProfile.tsx`

The profile data query has a hidden double-trip built into it:

```
Step 1: Query public_profiles table → wait for response
Step 2: If nothing found → query users_public table (fallback)
```

These two queries run **one after the other** in a single `queryFn`. Only after both potentially complete does React stop showing the full-screen "Loading profile..." spinner and render the page header.

Meanwhile, the three tab queries (posts, outfits, items) all have `enabled: !!id` so they start immediately — but the page still shows a full-screen blank spinner while the profile header query runs its double-trip, even though the tab data is already loading in the background.

**Fix:**
- Run both `public_profiles` and `users_public` queries simultaneously with `Promise.all` — pick whichever returns data.
- Show the profile header skeleton immediately (don't block the full page on profile loading — show a skeleton avatar and name placeholder instead of a white spinner screen). The tabs and content appear right away.

---

### Problem 2: Own Profile Page (`/profile`) — Bottom Nav Profile

**File:** `src/pages/Profile.tsx`

The `initializeProfile` function runs two awaits in sequence:

```typescript
await fetchUserProfile();   // Query 1: users table
await fetchFeaturedEvent(); // Query 2: retail_events table (with retailer join + date filter)
```

`fetchFeaturedEvent` queries `retail_events` joined with `retailers`, filtered by status and end date, ordered and limited. This join query can be slow — and right now the **entire page** stays in full-screen spinner mode until this secondary query completes, even though the profile header data is already back.

**Fix:**
- Run `fetchUserProfile()` and `fetchFeaturedEvent()` in **parallel** using `Promise.allSettled`.
- Render the page as soon as `fetchUserProfile` resolves — use a separate `eventLoading` state for the Events section only.
- The Events section shows a small skeleton while loading rather than blocking the whole page.

---

### What Changes

| File | Change | Effect |
|------|--------|--------|
| `src/pages/UserProfile.tsx` | Run `public_profiles` + `users_public` fallback in `Promise.all` simultaneously; replace full-screen spinner with inline header skeleton | Profile header appears faster; tabs load in parallel without waiting |
| `src/pages/Profile.tsx` | Change sequential `await` to `Promise.allSettled`; split `loading` into `profileLoading` + `eventLoading`; Events section gets its own skeleton | Profile page appears after just the users table query; Events section loads independently |

---

### Technical Details

**UserProfile.tsx — Parallel profile lookup:**
```typescript
// Before (sequential fallback):
const { data } = await supabase.from('public_profiles').select('*').eq('id', id).single();
if (data) return data;
const { data: fallback } = await supabase.from('users_public').select(...).eq('id', id).single();

// After (parallel):
const [profileResult, fallbackResult] = await Promise.all([
  supabase.from('public_profiles').select('*').eq('id', id).maybeSingle(),
  supabase.from('users_public').select('id, name, username, avatar_url').eq('id', id).maybeSingle(),
]);
return profileResult.data || { ...fallbackResult.data, country: null, bio: null, website: null };
```

Replace the full-screen loading state with an inline skeleton in the profile header so the page shell and tabs appear instantly.

**Profile.tsx — Parallel fetch + split loading state:**
```typescript
// Before:
await fetchUserProfile();
await fetchFeaturedEvent();

// After:
const [profileResult, eventResult] = await Promise.allSettled([
  fetchUserProfile(),
  fetchFeaturedEvent(),
]);
// profileLoading controls only the full-page spinner
// eventLoading controls only the Events section skeleton
```

No database changes. No new files. No schema changes required.
