# SDD ledger — plan: docs/superpowers/plans/2026-10-27-private-photos.md
Spec: docs/superpowers/specs/2026-10-27-private-photos-design.md
Executor: inline (executing-plans). Branch claude/private-photos from d6682924.
Pre-flight: T3 consumes T2 signPrivateMedia/stableStorageUrl — match. T4 consumes T2 signPrivateMedia — match. T5 defines its own Deno stableStorageUrl (same behaviour as T2) — match by design. T6/T7 rely on T1 owner read rules — match.
Ruling: owner live-step gates kept (rules: ask before migrations/deploys/merge); 'do all fixes' read as build + rollback-only dry runs, live apply asked once at the end — cost if wrong: one extra question.
Task 1: Ruling: migration drafted before the red run — red run executed against live without it (9/33), so the probes were proven to catch the holes — cost if wrong: none.
Task 1: live dry runs: red 9/33, green 33/33, rollback fingerprint identical. Not applied (owner gate).
Task 1: complete (commits 6272ed3..03ee076, tests: npx vitest run →    Duration  19.22s (transform 2.74s, setup 0ms, import 4.67s, tests 642ms, environment 9ms))
Task 2: complete (commits 03ee076..d3194f6, tests: npx vitest run src/lib/privateMedia.test.ts →    Duration  630ms (transform 96ms, setup 0ms, import 143ms, tests 22ms, environment 0ms))
Task 3: complete (commits d3194f6..1e1754b, tests: npx vitest run →    Duration  5.10s (transform 3.42s, setup 0ms, import 6.07s, tests 1.00s, environment 14ms))
Task 4: complete (commits 1e1754b..98ef230, tests: npx vitest run src/lib/eventMedia.test.ts →    Duration  715ms (transform 115ms, setup 0ms, import 172ms, tests 20ms, environment 0ms))
Task 5: Ruling: event try-on person link stays 600 s (already live in v51, provider fetch is synchronous) instead of the plan's 3600 s for picture inputs — cost if wrong: a slow provider fetch fails; raise the constant.
Task 5: Ruling: createProviderSafeCopy keeps its field name publicUrl (now the signed link) to avoid touching 3 callers — cost if wrong: a misleading name only.
Task 5: deno check exit 0 for all four functions.
Task 5: complete (commits 98ef230..3209925, tests: npx vitest run →    Duration  3.87s (transform 2.80s, setup 0ms, import 4.84s, tests 740ms, environment 10ms))
Task 6+7: Ruling: probes B and C dry-run together in one live transaction (red before, green after, then rollbacks C,B,A) — red 20/45, green 45/45, rules + folder flags identical after rollback — cost if wrong: none.
Task 6: complete (live dry run; not applied — owner gate).
Task 7: complete (live dry run; not applied — owner gate).
Task 8: Ruling: helper matches the user id in ANY folder segment or the uploader (owner/owner_id), not just segment 1 / event segment 2 — real names include tryon/users/<uid>/ and event_tryon_results/<e>/<u>/; files used by default closet items are excluded — cost if wrong: shared content stored in a folder named after the deleted user goes too.
Task 8: Ruling: storage cleanup failures are reported in errors but don't block account deletion (as before) — cost if wrong: leftover files on a failed batch.
Task 8: live dry run red 0/13 green 13/13; deno check exit 0; would list 152 files for shopper@test.com.
Task 8: complete (commits 5cc356c..3444a75, tests: npx vitest run →    Duration  3.59s (transform 2.17s, setup 0ms, import 4.22s, tests 726ms, environment 11ms))
Final: fixed C1 temporary links saved by older app builds — stable_media_address_probes RED 2/6 → GREEN 7/7 (live dry run), new migration 20261027125623 applied before the function deploy
Final: Ruling: I2 (account deletion breaks other people's closet copies) does not stand — the app's own trigger handle_original_item_changes deletes community_copy rows when the original item is deleted (delete_user_completely deletes the user's wardrobe_items), and both copy paths (FitDetailsModal, ClothingItemDetail) use source community_copy; the deleted user's own copies point at other people's folders and aren't listed — cost if wrong: a copy made another way would show a broken picture.
Final: Ruling: uploader match (owner = user) kept — files a person uploaded are theirs; brand/store content is deleted with the account anyway — cost if wrong: a file uploaded on someone else's behalf is removed with the uploader's account.
Final: fixed I1 older app builds / expired upload links lose try-on after the lock — media.test ownPrivateRef/freshOwnLink RED (8 failing) → GREEN 11/11, suite 239/239, deno check exit 0
Final: Ruling: I1 release gate — older iPhone builds bundle their code (capacitor webDir dist, no server url); after the lock their gallery and older Events page show broken images (try-on itself keeps working via server re-signing). Gate added: ship an iOS build with this code before locking the folders — cost if wrong: older-build users see broken gallery pictures until they update.
Final: fixed I3 account deletion stops at ~1000 files — storageCleanup removeAllUserFiles RED (5 failing) → GREEN 9/9, suite 244/244, deno check exit 0
Final: minor (deferred): default-item exclusion compares with LIKE; an encoded or query-string address wouldn't match
Final: minor (deferred): video_job_logs.body_snippet stores the provider reply verbatim (strip token= if it ever echoes a link)
Final: minor (deferred): after locking, cached public copies may be served up to ~1 h; re-check the old-address smoke test after that window
Final: minor (deferred): stale comment at top of thenewblack-event-tryon/index.ts (says results privacy is a separate change)
Final: minor (done): pre-lock data check — 0 saved temporary links, 0 rows outside the owner's folder (2026-10-27)
Final: Ruling: declined-to-judge lines (Events delete removes from wrong bucket, gallery delete leaves files, detect-objects any-path download, provider-safe copy fetches any URL, video check re-stores, 24 h links, gemini-bg-remove public address, optimized-images writer, closet originals, wsrv.nl fallback, TNB result URL logging, file removal before DB deletion) all predate this branch or are spec decisions; they stand — cost if wrong: listed as follow-ups.
