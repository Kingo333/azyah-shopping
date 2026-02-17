

# Fix: User Profile Navigation from Explore Globe

## Problem
Clicking a person's name in the Explore globe "People" tab navigates to `/profile/:userId`, but the `UserProfile` component reads `useParams<{ id }>()` -- extracting `id` instead of `userId`. Since the route parameter is named `userId`, the component always gets `undefined` for `id`, which causes the "User not found" screen.

## Root Cause
**Route definition** (App.tsx line 145): `path="/profile/:userId"`
**Component reads** (UserProfile.tsx line 40): `const { id } = useParams()`

The param names don't match. The component expects `id` but the route provides `userId`.

## Fix
One-line change in `src/pages/UserProfile.tsx` line 40:

Change:
```ts
const { id } = useParams<{ id: string }>();
```
To:
```ts
const { userId: id } = useParams<{ userId: string }>();
```

This destructures `userId` from the route params and aliases it to `id`, so the rest of the component (which uses `id` everywhere) continues to work without any other changes.

## Impact
- All navigation to `/profile/:userId` from the Explore globe People tab, Following drawer, Your Fit drawer, and community feeds will now correctly load the user's profile.
- No other files need to change -- the route definition and all `navigate('/profile/...')` calls are already correct.
- Zero backend changes.
