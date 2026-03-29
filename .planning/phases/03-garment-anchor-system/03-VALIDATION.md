---
phase: 3
slug: garment-anchor-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (to be installed in Wave 0) |
| **Config file** | vitest.config.ts (Wave 0 creates) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run && npm run build` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run full suite + build
- **Before `/gsd:verify-work`:** Full suite must be green + visual AR test
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-00-01 | 00 | 0 | (infra) | build | `npm run build` | ✅ | ⬜ pending |
| 03-01-01 | 01 | 1 | ANCH-01,03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | ANCH-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | ANCH-08,09,10 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | ANCH-04 | unit+visual | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | ANCH-05 | unit+visual | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | ANCH-06,07 | unit+visual | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | VIS-05 | build+visual | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install vitest as dev dependency
- [ ] Create vitest.config.ts
- [ ] Create test stubs for anchor strategies

*Wave 0 setup enables automated testing for all anchor strategy tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Shirt anchors correctly on real person | ANCH-04 | Requires live camera | Open AR with shirt product, verify shoulder-to-hip anchoring |
| Abaya drapes shoulder-to-ankle | ANCH-05 | Requires live camera | Open AR with abaya product, verify full-body coverage |
| Abaya degrades gracefully when ankles hidden | ANCH-08 | Requires partial body framing | Stand close to camera hiding ankles, verify abaya still renders |
| Pants anchor hip-to-ankle | ANCH-06 | Requires live camera | Open AR with pants product, verify hip-level anchoring |
| Headwear/necklace at correct position | ANCH-07 | Requires live camera | Test with accessory products |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
