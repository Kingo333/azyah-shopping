
## Add "Public Profile" Visibility Toggle in Profile Settings

### What This Does

A single new collapsible section — **"Privacy & Visibility"** — will be added to `ProfileSettings.tsx`. It contains one toggle switch that controls the `preferences.visible_on_globe` field (already used by the Globe). Turning this on means the user appears on:

1. **The Globe** (Explore page — already wired to `visible_on_globe`)
2. **The Fashion Leaderboard** (Rewards page — currently shows everyone; will be filtered)

Turning it off hides the user from both places silently.

---

### The Two Problems Being Solved

**Problem A — The toggle only exists deep inside the Globe drawer**

Right now the only way to toggle globe visibility is to open the Explore page, tap your country, go to the Shoppers tab, and find the toggle in "Your Content". Most users will never find it there. It needs to live in **Profile Settings** where users look for privacy controls.

**Problem B — The Leaderboard ignores visibility preference**

`MinimizedLeaderboard.tsx` queries `public_profiles` and includes every user. The `public_profiles` view does not expose the `preferences` column, so the leaderboard cannot currently filter by `visible_on_globe`. There are two ways to fix this:

- Option 1: Add `preferences` to the `public_profiles` view (requires a DB migration)
- Option 2: Query the `users` table directly with a filter (no DB change needed)

**Option 2 is chosen** — the leaderboard already has auth-gated access and querying the `users` table with a `preferences` filter is safe and avoids any schema migration.

---

### Files Changed

| File | What Changes |
|------|-------------|
| `src/pages/ProfileSettings.tsx` | Add new "Privacy & Visibility" collapsible section with a `Switch` toggle for `visible_on_globe`; load/save from `users.preferences` |
| `src/components/MinimizedLeaderboard.tsx` | Filter leaderboard query to only include users where `preferences->>'visible_on_globe' != 'false'` (i.e., default is visible) |

---

### Technical Details

**ProfileSettings.tsx changes:**

1. Add state: `visibilityOpen` (collapsible), `isVisibleOnGlobe` (boolean, default `true`), `savingVisibility` (loading state)

2. In `loadUserProfile`, read `(data.preferences as any)?.visible_on_globe !== false` and set it to the state variable.

3. Add a `saveVisibility` function that updates `users.preferences` with `{ ...existingPrefs, visible_on_globe: isVisibleOnGlobe }` — same pattern already used in `CountryDrawer.tsx`.

4. Add a new collapsible section between "Shopping Preferences" and "Your Fit / Measurements" with:
   - Icon: `Eye` / `EyeOff` from lucide-react (already imported in the file via CountryDrawer; needs to be added to ProfileSettings import)
   - Title: **"Privacy & Visibility"**
   - The toggle row:
     ```
     [Eye icon]  Show on Globe & Leaderboard     [Switch]
     ```
   - Subtext below the toggle:
     > "When on, your profile appears on the Explore globe and in the Fashion Leaderboard on Rewards. Turn off to browse privately."
   - A Save button (same pattern as other sections)

**MinimizedLeaderboard.tsx changes:**

The current query:
```typescript
let userQuery = supabase.from('public_profiles').select('*');
```

Change to query the `users` table directly and filter out hidden users:
```typescript
let userQuery = supabase
  .from('users')
  .select('id, name, username, avatar_url, country, preferences')
  .or('preferences->visible_on_globe.is.null,preferences->visible_on_globe.eq.true');
```

This keeps users who have never set the preference (null = default visible) and users who explicitly set it to true. Users who set it to false are excluded.

The `LeaderboardUser` interface and scoring logic don't change — the shape of `id, name, avatar_url, country` is the same from both tables.

---

### What the User Sees

**In Profile Settings** — a new "Privacy & Visibility" section appears in the collapsible list, after Shopping Preferences. It has a single clear toggle with explanatory subtext so the user understands exactly what "public" controls.

**In Rewards Leaderboard** — users who have turned off their globe/public visibility will no longer appear in the list. Users who are visible will continue to appear as before.

**In the Globe** — no change; it already correctly reads `visible_on_globe` from the `users` table.

The Globe drawer toggle still works too — since both the drawer and the settings page write to the same `users.preferences.visible_on_globe` field, they stay in sync automatically. The settings page will simply be a more discoverable place to find the same control.
