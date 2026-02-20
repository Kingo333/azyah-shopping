
## Two Changes: Email Replacement + Legal Consent Checkbox on Signup

### Change 1: Replace `support@azyahstyle.com` → `team@azyahstyle.com`

Four files contain the old email address:

| File | Occurrences |
|------|-------------|
| `src/pages/Terms.tsx` | 1 |
| `src/pages/Privacy.tsx` | 3 |
| `src/pages/CookiePolicy.tsx` | 1 |
| `src/pages/ProfileSettings.tsx` | 2 (href + display text) |

All 7 instances will be swapped from `support@azyahstyle.com` → `team@azyahstyle.com`.

---

### Change 2: Legal Consent Checkbox on Shopper Signup

The signup form in `src/pages/onboarding/SignUp.tsx` has a two-step flow:
1. **Initial screen** – "Continue with email" button
2. **Email-entry screen** – email → then either password (returning user) or username + password fields (new user)

The checkbox should only appear at **account creation** time (i.e., when `showUsernameFields` is `true` for new shoppers). It should **not** appear for returning users logging in, nor for brand/retailer signups (they have separate account creation flows which can get the same treatment if needed later).

**What to add in `src/pages/onboarding/SignUp.tsx`:**

1. Add a `termsAccepted` boolean state, defaulting to `false`.
2. In the `showUsernameFields` block (after the country + referral fields, before the submit button), add a checkbox row:

```
☐  By creating an account, I agree to the
   Terms of Service · Privacy Policy · Cookie Policy
```

Each policy name links to `/terms`, `/privacy`, `/cookies` respectively (opened in a new tab so users don't lose their form state).

3. Add `termsAccepted` as an additional condition that must be `true` for the submit button to be enabled. The existing disabled logic:
```ts
disabled={loading || checkingEmail || checkingUsername || (showUsernameFields && !isUsernameAvailable)}
```
becomes:
```ts
disabled={loading || checkingEmail || checkingUsername || (showUsernameFields && (!isUsernameAvailable || !termsAccepted))}
```

4. The checkbox is styled with the existing `Checkbox` component from `@radix-ui/react-checkbox` (already imported via `@/components/ui/checkbox`).

---

### Technical Details

| File | Changes |
|------|---------|
| `src/pages/Terms.tsx` | Replace `support@azyahstyle.com` → `team@azyahstyle.com` (1 place) |
| `src/pages/Privacy.tsx` | Replace `support@azyahstyle.com` → `team@azyahstyle.com` (3 places) |
| `src/pages/CookiePolicy.tsx` | Replace `support@azyahstyle.com` → `team@azyahstyle.com` (1 place) |
| `src/pages/ProfileSettings.tsx` | Replace `support@azyahstyle.com` → `team@azyahstyle.com` (2 places: href and display text) |
| `src/pages/onboarding/SignUp.tsx` | Add `termsAccepted` state; add checkbox with links to `/terms`, `/privacy`, `/cookies`; gate submit button on `termsAccepted` when `showUsernameFields` is true |

No database changes are required. The checkbox is purely a frontend gate — Supabase already handles the `signUp()` call when the user proceeds.
