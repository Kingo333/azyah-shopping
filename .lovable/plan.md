

## Plan: Post Visibility Overhaul + "Post & Earn" Subtext

### What Changes

**1. Add "Post and earn" subtext to PostsSection**
Below the "Your posts" heading, add a small motivational line: *"Post and earn when people buy from your post."*

**2. Improve the visibility toggle in CreateStyleLinkPostModal**
Replace the simple Public on/off toggle with a clearer explanation:
- **Toggle ON (Public):** Label reads "Public" with subtext: *"Appears in Explore, Feed, and your profile for anyone to see."*
- **Toggle OFF (Followers only):** Label reads "Followers Only" with subtext: *"Only visible to mutual followers and on your profile."*

This replaces the old "private" concept. The key distinction:
- **Public (`public_explore`)**: Visible everywhere -- Explore, Feed (Swipe), and the poster's profile to all visitors.
- **Followers Only (`followers_only`)**: Visible only on the poster's profile and in feeds/drawers to users who share a **mutual follow** (both users follow each other).

**3. Add new visibility value `followers_only`**
- Update `useCreateStyleLinkPost.ts` type to include `'followers_only'` alongside `'public_explore'` and `'private'`.
- In `CreateStyleLinkPostModal`, when toggle is OFF, set visibility to `'followers_only'` instead of `'private'`.

**4. Update Feed (Swipe page) to show followers-only posts from mutual follows**
In `ProductMasonryGrid.tsx` (which fetches posts for the Feed):
- Continue fetching `public_explore` posts as-is (anyone can see).
- Add a second query: fetch `followers_only` posts where the `user_id` is someone the current user mutually follows.
- Merge both sets, sorted by `created_at` descending.

Mutual follow logic: User A and User B mutually follow each other if there exist rows in `follows` where (A follows B) AND (B follows A). This will be checked client-side by:
1. Fetching the current user's `following` list (already available via `useFollows`).
2. Fetching who follows the current user back (a new query for `follower_id` where `following_id = currentUser`).
3. The intersection = mutual follows.
4. Fetching `followers_only` posts from those mutual follow user IDs.

**5. Update Explore FollowingDrawer to show followers-only posts**
The Following drawer currently shows fits and brand products from followed users. Add a "Posts" section that shows `followers_only` posts from mutual follows, plus `public_explore` posts from all followed users.

**6. Update public profile view to respect followers-only visibility**
In `UserProfile.tsx`, when viewing someone else's profile:
- Show `public_explore` posts always.
- Show `followers_only` posts only if the viewer and profile owner mutually follow each other.
- Continue showing all posts for own profile.

**7. Update PostsSection (own profile) visibility badge**
Change the badge from "Private" to "Followers Only" for posts with `followers_only` visibility.

---

### Technical Details

| File | Changes |
|------|---------|
| `src/components/profile/PostsSection.tsx` | Add "Post and earn when people buy from your post." subtext below heading. Update "Private" badge to "Followers Only" for `followers_only` visibility. |
| `src/components/stylelink/CreateStyleLinkPostModal.tsx` | Update toggle: ON = "Public" (Explore, Feed, Profile), OFF = "Followers Only" (mutual followers + profile). Change `'private'` to `'followers_only'`. Add descriptive subtext for each state. |
| `src/hooks/useCreateStyleLinkPost.ts` | Add `'followers_only'` to the visibility type union. |
| `src/hooks/useMutualFollows.ts` | **New hook**: Returns the set of user IDs that the current user mutually follows (intersection of "I follow them" and "they follow me"). |
| `src/components/ProductMasonryGrid.tsx` | Fetch both `public_explore` posts AND `followers_only` posts from mutual follows. Merge and sort. |
| `src/components/explore/FollowingDrawer.tsx` | Add a posts section showing public + followers-only posts from followed/mutual users. |
| `src/pages/UserProfile.tsx` | When viewing another user's posts, also show `followers_only` posts if mutual follow exists. |

### Visibility Logic Summary

| Post Visibility | Shown in Explore | Shown in Feed | Shown on Profile (visitor) | Shown on Profile (owner) | Shown to Mutual Followers |
|----------------|-----------------|---------------|---------------------------|-------------------------|--------------------------|
| `public_explore` | Yes | Yes | Yes | Yes | Yes |
| `followers_only` | No | Only to mutual followers | Only to mutual followers | Yes | Yes |

