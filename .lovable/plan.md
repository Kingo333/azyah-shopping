
App Store Compliance Fix Plan (Revised)

This plan addresses the 4 hard blockers and the most important medium-risk items before App Store submission. Changes are sequenced by rejection risk severity and kept minimal.

⸻

Blocker A: iOS Permission Strings (Info.plist)

Problem: The app uses camera (try-on / visual search) and photo library (wardrobe uploads, try-on, UGC posts) through web APIs (navigator.mediaDevices.getUserMedia, <input type="file">, etc.). On iOS, if the app requests these permissions without valid Info.plist purpose strings, Apple can reject under Guideline 2.5.1.

Fix: Add/confirm these keys in:

File: ios/App/App/Info.plist
	•	NSCameraUsageDescription
“Take photos for outfit posts, virtual try-on, and visual product search.”
	•	NSPhotoLibraryUsageDescription
“Select photos for your wardrobe, virtual try-on, and outfit posts.”
	•	NSPhotoLibraryAddUsageDescription
“Save try-on results and outfit images to your photo library.”

Notes (tiny tweak to avoid review confusion):
	•	Make sure your permission prompts happen only when needed (e.g., when user taps upload/try-on), not immediately on launch.

⸻

Blocker B: Real Account Deletion (Not Just Anonymization)

Problem: The current “Delete Account” flow in ProfileSettings.tsx anonymizes a row (email becomes deleted_xxx@azyah.com) but does not reliably:
	•	delete the Supabase auth user
	•	delete user data across tables (wardrobe, fits, swipes, etc.)
	•	delete user files in Supabase Storage

Apple expects in-app account deletion that results in actual deletion (Guideline 5.1.1). An “anonymize only” flow is a common rejection trigger.

Fix (minimal + correct): Implement a single server-side deletion path and call it from the app.

Step 1 — Create an Edge Function: delete-account

New File: supabase/functions/delete-account/index.ts

This function must:
	1.	Validate JWT and identify the caller
	2.	Delete/cleanup user-uploaded files (wardrobe/try-on/avatars/UGC assets that belong to the user)
	3.	Call the deletion RPC (if safe) OR perform scoped deletes per table
	4.	Delete the auth user using supabase.auth.admin.deleteUser(user.id)
	5.	Return success/failure

Important tweak:
Only use delete_user_completely(user.id) if you confirm it is safe and constrained (i.e., it cannot delete arbitrary users without being the same caller or admin). If it’s too powerful or unclear, keep it admin-only and do a safer “self-delete” sequence in the function.

Step 2 — Update the client “Delete Account” button

Edit File: src/pages/ProfileSettings.tsx
	•	Replace the local anonymization logic with a call to the delete-account edge function.
	•	Show a confirmation dialog with:
“This will permanently delete your account and uploaded content. This action cannot be undone.”

Additional tweak (review friendly):
	•	After success: sign out + return to landing/guest mode.
	•	Show a simple status message: “Deletion completed.”

⸻

Blocker C: Block User Feature (UGC Compliance)

Problem: Your app has public UGC (outfits/posts visible to others, including non-logged-in). Apple’s UGC expectations typically require:
	•	Report ✅ (you have)
	•	Block user ❌ (missing)

This is one of the most predictable rejection areas under UGC guideline expectations.

Fix (minimal and App Store compliant):

Database

Create blocked_users with a strict “own-blocks only” rule.

Migration:
	1.	Create table:

	•	id
	•	blocker_id (auth user id)
	•	blocked_id (auth user id)
	•	created_at
	•	Unique constraint (blocker_id, blocked_id)

	2.	Enable RLS:

	•	Users can SELECT/INSERT/DELETE only where blocker_id = auth.uid()

App Logic
	•	Create useBlockedUsers() hook that fetches list of blocked IDs.
	•	Apply filtering in UGC queries so blocked users’ content is not shown.

UI Entry Points (keep it minimal — 2 locations is enough)
	1.	UserProfile.tsx
Add “Block User” in a “…” menu when viewing someone else.
	2.	FitDetailsModal.tsx
Add “Block User” near the existing Report option.

Behavior:
	•	Block → instantly hides their content and shows “You blocked this user” where applicable
	•	Unblock available in settings or on user profile

Files:
	•	New: migration
	•	New: src/hooks/useBlockedUsers.ts
	•	Edit: src/pages/UserProfile.tsx
	•	Edit: src/components/FitDetailsModal.tsx
	•	Edit: UGC feed query layer (where fits/posts are loaded)

⸻

Blocker D: Terms Placeholder Fix

Problem: Terms page contains placeholder strings like [Insert Jurisdiction] and [Insert Location]. Apple may treat this as incomplete app content.

Fix: Replace placeholders with final legal jurisdiction text.

File: src/pages/Terms.tsx

Tweak (avoid wrong assumption):
	•	Don’t hardcode “Dubai, UAE” unless you’re sure. Replace with your actual business jurisdiction (UAE, or country of incorporation).

⸻

Medium Risk A: AI Disclosure Labels (Try-on Only)

Problem: AI try-on results appear without a clear “AI-generated” notice. Apple can flag this as misleading or unclear, especially when photos are involved.

Fix: Add a visible disclaimer in try-on result surfaces:

Add text under results:
	•	“AI-generated preview — results may not reflect actual fit.”
	•	Add optional small link: “Learn more” → privacy/AI disclosure section

Files (tweak list):
	1.	AiTryOnModal.tsx
	2.	ProductTryOnModal.tsx
	3.	Any try-on results screen/component

✅ Removed mention of hidden beauty feature.

⸻

Medium Risk B: “Shop Now” External Link Disclosure

Problem: “Shop Now” opens external retailer websites. Apple expects clarity that users are leaving the app.

Fix (minimal):
	•	In your most visible product detail surfaces (not 25 files), add:
	•	small text: “Opens in Safari” or “Opens retailer website”
	•	keep the external-link icon

Recommended target files (minimal):
	•	PhotoCloseup.tsx
	•	The main product detail modal/page used by shoppers (your primary one)

⸻

Medium Risk C: Support Contact Visible In-App

Problem: Reviewers commonly look for an obvious support path inside the app.

Fix:
	•	Add a “Contact Support” row in ProfileSettings.tsx:
	•	mailto:support@azyahstyle.com (or your real support email)
	•	Also ensure App Store Connect has a Support URL (even a simple page).

⸻

Analytics/Tracking SDK Check (No Code Changes)

Current findings (as stated by your AI):
	•	No Firebase, GA SDK, Segment, Mixpanel, Amplitude, AppsFlyer, Adjust, Branch, OneSignal
	•	window.gtag references appear to be placeholder only
	•	No SKAdNetwork IDs, no IDFA usage detected
	•	RevenueCat present (subscriptions) but not “tracking” by itself

Conclusion: ATT prompt is likely not required right now.

Tweak (important):
Before submitting, confirm there is:
	•	no injected GA script in index.html
	•	no attribution SDK in iOS native layer (Podfile, AppDelegate, Capacitor plugins)

⸻

Implementation Order (Revised)

Priority  | Item                           | Scope
----------|--------------------------------|------------------------------
1 (block) | Info.plist permission strings  | 1 file
2 (block) | Terms placeholder fix          | 1 file
3 (block) | Delete-account edge function   | 1 new function + 1 UI edit
4 (block) | Block user (DB + filter + UI)  | 1 migration + 3–5 edits
5 (med)   | AI try-on disclosure labels    | 2–3 files
6 (med)   | Shop Now “opens externally”    | 1–2 files
7 (med)   | Support contact in settings    | 1 file


⸻

Quick Approval Notes (what I’d approve as-is vs tweak)

✅ Approve as-is:
	•	Info.plist strings
	•	Terms placeholder removal
	•	Block user requirement (since you have public UGC)

⚠️ Must tweak before approving:
	•	Account deletion: confirm whether delete_user_completely is safe for self-delete. If not, keep it admin-only and implement a safe self-delete sequence in the edge function.

✅ Remove mention:
	•	Any beauty consultant feature is hidden, so points or a mention of beauty consultant is removed from also upgrade to premium.

⸻

If you want, paste the actual delete_user_completely RPC code (or the migration file content) and I’ll tell you exactly whether it’s safe to use for user self-deletion, and what tables/storage paths you must delete to satisfy Apple.