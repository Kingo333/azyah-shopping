# Audit checklist (sessions 1–2)

_2026-10-27 (updated after owner decisions). Every line was re-checked with fresh evidence (Superpowers verification-before-completion: no "done" without proof)._
Legend: ✅ done and verified · 🟡 built and tested, waiting on an owner step · ⛔ blocked (reason given) · 👤 owner-only · ❓ owner decision needed

Branches: `claude/busy-hypatia-ipst1p` (PR #3, docs) · `claude/partner-and-event-lockdown` (partner/event fixes + follow-ups) · `claude/nav-v2` (Phase 2).

## 1. Kickoff, Step 1: skills
| # | Item | Status | Evidence |
|---|---|---|---|
| 1.1 | Superpowers skills present and used (brainstorming, writing-plans, TDD, systematic-debugging, verification) | ✅ | Plugin `superpowers@claude-plugins-official` v7.0.0. Used: brainstorming (mockups, nav design), writing-plans (2 plans), TDD (every change red → green), verification (this audit). Systematic-debugging: the one false alarm (probe NULL handling) was traced to its root cause before any change. |
| 1.2 | Supabase skills present and used (security checklist, migrations, advisors) | ✅ | Plugin `supabase@supabase-agent-skills` c9be0e9 (+ postgres-best-practices). Checklist applied (user_metadata never trusted, SECURITY DEFINER locked, UPDATE with WITH CHECK, storage upsert = INSERT+SELECT+UPDATE). Advisors run after every live change. |
| 1.3 | Skills came from the owner's setup script (`~/.claude/skills`) | ⛔ | Not there: `~/.claude/skills` only has blender-toolkit and reverse-engineer-anything. The skills come from installed plugins instead. Superpowers v7.0.0 = commit 2ce8aa1 not verified. |
| 1.4 | Supabase docs via `search_docs` | ✅ | MCP Supabase tools used throughout. |

## 2. Kickoff, Step 2: state
| # | Item | Status | Evidence |
|---|---|---|---|
| 2.1 | Read SESSION_STATE + the four docs (from branch busy-hypatia) | ✅ | Read at start of session 2. |
| 2.2 | Subscribe to PR #3 activity | ⛔ | `gh` (GitHub CLI) isn't installed; the app couldn't bind the PR. State read from the public GitHub API (open, draft). |
| 2.3 | SESSION_STATE kept updated after every step | ✅ | Committed after each step on PR #3's branch. |

## 3. Phase 1: security lockdown (S1–S4)
| # | Item | Status | Evidence |
|---|---|---|---|
| 3.1 | Re-read the migration adversarially | ✅ | Found and fixed S4b (users could edit their own credits) and S4c (negative wardrobe deduction); corrected S2 (admin already blocked by a CHECK; real escalation was shopper → brand) and S3 (admin row in `user_roles`). |
| 3.2 | Test before live (owner chose no Supabase branch) | ✅ | Rollback-only dry runs on live: 30/63 without the fix, 64/64 with it. |
| 3.3 | Probes: revoked RPCs denied, role change blocked, admin signup → shopper, fake redemption rejected, real redemption works | ✅ | All in `supabase/tests/security_lockdown_probes.sql`; 64/64. |
| 3.4 | Signup, account deletion, picture try-on credits, wardrobe enhance still work | ✅ | Probes "Flows" rows, 64/64. |
| 3.5 | Probe script committed | ✅ | PR #3 branch. |
| 3.6 | Report, then ask before production | ✅ | Owner approved. |
| 3.7 | Applied; advisors re-run | ✅ | Version 20261026170939; probes 64/64 on live; anon SECURITY DEFINER 173 → 155. Re-checked 2026-10-27: anon can't call `delete_user_completely`; 0 admin rows. |

## 4. Partner and events work (from the review)
| # | Item | Status | Evidence |
|---|---|---|---|
| 4.1 | Review written (login, products, events, The New Black) | ✅ | `PARTNER_AND_EVENTS_REVIEW.md`. |
| 4.2 | Archived products hidden; brand approval; who can create profiles/products | ✅ live | 20261026183904; probes 30/30 on live; 5 brands + 1 store approved. |
| 4.3 | Contact emails private | ✅ live | 20261026190151; probes 17/17 on live; 0 emails left on public rows. |
| 4.4 | Event try-on uses shopper credits + server checks | ✅ live | `thenewblack-event-tryon` v51; smoke test 200/401/401. A paid end-to-end try-on not run (no event is running). |
| 4.5 | Event photos private | ✅ live | 20261026192808; probes 14/14 on live; old public photo link returns 400. |
| 4.6 | Bulk upload saves as Pending; Publish from edit; edits reach shoppers | 🟡 | Branch `partner-and-event-lockdown`; tests 177/177, build passes. Needs owner phone test + merge. |
| 4.7 | Portals read/save the private email; "waiting for approval" banner | 🟡 | Same branch. |
| 4.8 | Events linked to real brands/products, guest brands, Partner Workspace, public event page | ❓→ later | Designed (review §3.3–3.4, owner decisions recorded); it's Phase 5 work, not started. |

## 5. Security follow-ups (session 2, this round)
| # | Item | Status | Evidence |
|---|---|---|---|
| 5.1 | S15: credits readable/creatable for any user, even logged out | ✅ live | `20261027080215` (owner approved 2026-10-27); post-apply probes 13/13 on live. |
| 5.2 | Admin partner approval (function + `/admin/partners` page) | ✅ function live / 🟡 page | Function live in `20261027080215`; the real admin account approved a test brand in the post-apply check. Page on the partner branch (needs merge). **shopper@test.com now has the admin role (live, owner approved)** alongside shopper; the app still shows it the shopper site (role lookup picks shopper; checked the way the app sorts). The page checks the admin role itself because the app's normal admin role locks accounts out of every page. |
| 5.3 | S14: 14 functions without a fixed search_path | ✅ live | `20261027080234`; post-apply: 0 left unpinned, share links and new share slugs still work; the advisor lint is gone. |
| 5.4 | Phase 1.3: wardrobe enhance → server key, then revoke from users | ✅ not needed | `deduct_wardrobe_credit` is already safe (own account, positive amounts only, live since 3.7). Changing the deployed function could undo Lovable-only changes, so left as is. |
| 5.5 | Phase 1.5: download the 41 live-only Edge Function sources | ⛔ | The MCP `get_edge_function` tool errors for every function. Owner can run `npx supabase login` then `npx supabase functions download <name>` (read-only). |
| 5.6 | Other public photo buckets (`ai-tryon-*`, `wardrobe*`, `tnb-video-inputs`) | ❓ | Needs AI Studio changes (where Live Cam lives) and the owner's phone test; not started. |
| 5.7 | S12 leaked-password protection, S13 Postgres security update | 👤 later (owner: not a priority now) | Supabase dashboard only: Authentication → Policies → turn on leaked-password protection; Settings → Infrastructure → upgrade Postgres (short downtime). |
| 5.8 | S10 UPDATE policies without WITH CHECK (posts, events) | ✅ lowered | Postgres reuses USING when WITH CHECK is missing, so rows can't be reassigned. Brands/retailers/products now have explicit WITH CHECK. Others: cleanup later. |

## 6. Phase 2: navigation
| # | Item | Status | Evidence |
|---|---|---|---|
| 6.1 | Brainstorming + mockups shown before building | ✅ | Mockups in chat; owner decisions: Globe unchanged, Your Fit hidden; owner then said "fix whatever is left" (questions skipped). |
| 6.2 | Written design + plan (writing-plans) | ✅ | `docs/superpowers/specs/2026-10-26-nav-v2-design.md`, `docs/superpowers/plans/2026-10-26-nav-v2.md` (branch nav-v2). |
| 6.3 | Lazy-load routes | 🟡 | Main bundle 4.39 MB → 0.70 MB (same build settings); a stale chunk reloads once. Branch nav-v2. |
| 6.4 | 4-tab bar behind a feature flag | 🟡 | Off for everyone; a device opts in with `?nav_v2=1`. Discover = feed + Globe (unchanged), Try on = today's AI Studio (Live Cam untouched), Community, Profile. |
| 6.5 | Old URLs redirect | 🟡 | With nav v2 on: `/feed`, `/forum`, `/fashion-feed`, `/dress-me/community` → `/community`; `/discover` → `/swipe`. Share, auth, AR, brand, portal links unchanged (tested). |
| 6.6 | Globe works as before | 🟡 | Only the Fit tab removed; `?tab=your-fit` opens Brands (tested). Everything else in `Explore.tsx` unchanged. |
| 6.7 | Your Fit hidden everywhere | 🟡 | Flag `your_fit = false`: Globe tab, Community tab, Profile pill, Settings section, onboarding step, dashboard button. |
| 6.8 | Tests | ✅ | nav-v2: 158/158 (24 new), Live Cam 31/31, build passes, no type errors in changed files. |
| 6.9 | Desktop left rail, public discovery routes (2.3), single `useRole()` (2.4) | ❓→ later | Not in this round; listed in the plan's non-goals. |

## 7. Working rules
| # | Rule | Status | Evidence |
|---|---|---|---|
| 7.1 | Branches only, never push to main | ✅ | `origin/main` still 228dcdf. |
| 7.2 | One draft PR per change | 🟡 | PR #3 exists. Partner and nav-v2 PRs not opened (`gh` missing): open from the links below. All three branches pushed 2026-10-27 (owner signed in via the Terminal panel). |
| 7.3 | Ask before migrations, Edge Function deploys, merges, money | ✅ | Every live step had an explicit owner yes. No Supabase branch created (no cost). |
| 7.4 | RunPod, Worker, live-cam functions untouched | ✅ | No changes. |
| 7.5 | Live Cam tests green | ✅ | 31/31 on every branch. |
| 7.6 | No secrets printed or committed; `mcp/index.ts` not committed | ✅ | Checked after every build. |
| 7.7 | Remind about RunPod top-up before any Live Cam test | 👤 | Balance was negative on Oct 25: top up before testing Try on. |

## 8. Open owner decisions (from the kickoff)
| # | Decision | Status |
|---|---|---|
| 8.1 | Test security fix on a branch | ✅ decided: no branch |
| 8.2 | Who gets Live Cam | ✅ decided: a shopper feature (as today; no change needed) |
| 8.3 | Approve partners manually | ✅ decided: yes |
| 8.4 | Hide cart/checkout and UGC collaborations | ✅ decided: keep cart; hide UGC. 🟡 Built on nav-v2 (`ugc_collab = false`): UGC tab gone from both bars, Collab button and portal Collabs tabs hidden; `/ugc` and data stay. |
| 8.5 | Kiosk engine | ❓ explained to owner 2026-10-27 (see KIOSK_MVP.md); decision pending |
| 8.6 | Globe People counts are wrong today (privacy rule hides other users' rows) | ✅ decided: fix. 🟡 Built on nav-v2: lookups `get_globe_people_counts` / `get_globe_people` (visible shoppers only, public fields only); post-apply probes 9/9 on live (`20261027080253`); the Globe uses it once nav-v2 is merged (until then the live Globe keeps the old reads). The tapped-country list had the same bug and is fixed too. |
| 8.7 | Give your account the admin role | ✅ done (live): shopper@test.com |

## 9. What's left, in order
1. ✅ Branches pushed.
2. ✅ Migrations 5.1, 5.3 and the Globe People lookup applied (2026-10-27). Advisors after: search_path lint gone; SECURITY DEFINER anon 150 → 151 / authenticated 157 → 160 (the new public Globe lookups and the admin function, intended); no ERRORs.
3. 👤 Open the two draft PRs, phone-test the Vercel previews (partner: pending/publish, settings email, events page; nav-v2: open the preview with `?nav_v2=1`), then merge (owner OK). Merge order: partner first, then nav-v2 (App.tsx conflict expected, I'll resolve it).
4. ❓ Decision 8.5 (kiosk engine).
5. 👤 Dashboard: leaked-password protection and Postgres upgrade.
6. Later phases: Discover search/modes (3), real Try On screen (4), Partner Workspace + events + kiosk (5), cleanup (6).
