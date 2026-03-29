---
phase: 1
slug: coordinate-pipeline-and-stability
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual visual verification + browser console |
| **Config file** | none — AR coordinate validation is visual/geometric |
| **Quick run command** | `npm run dev` then open AR page |
| **Full suite command** | `npm run build` (type-check + build) |
| **Estimated runtime** | ~15 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` to verify no type errors
- **After every plan wave:** Visual AR test on dev server
- **Before `/gsd:verify-work`:** Full build + visual AR verification
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | COORD-01 | visual + build | `npm run build` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | COORD-02 | visual + build | `npm run build` | ✅ | ⬜ pending |
| 01-01-03 | 01 | 1 | COORD-03 | visual + build | `npm run build` | ✅ | ⬜ pending |
| 01-02-01 | 02 | 1 | COORD-04 | build | `npm run build` | ✅ | ⬜ pending |
| 01-02-02 | 02 | 1 | COORD-05 | visual + build | `npm run build` | ✅ | ⬜ pending |
| 01-03-01 | 03 | 2 | ARCH-02 | visual + build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework needed — Phase 1 fixes are geometric/math corrections verified by build + visual inspection.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Model appears at correct body position (no L/R flip) | COORD-01 | Requires camera + human body | Open AR, verify model aligns with shoulders |
| Model position consistent across aspect ratios | COORD-02 | Requires multiple devices/window sizes | Resize browser, verify no offset drift |
| Model depth doesn't float in/out | COORD-03 | Requires visual depth perception | Move toward/away from camera, check model stays anchored |
| WASM version pinned | COORD-04 | Build verification | Check import URL contains specific version |
| Resize doesn't break placement | COORD-05 | Requires window resize during tracking | Resize while tracking active, verify model stays aligned |
| Smooth tracking without jitter | ARCH-02 | Requires real-time pose tracking | Move slowly, verify no jitter; move fast, verify no lag |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
