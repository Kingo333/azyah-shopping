---
phase: 2
slug: architecture-decomposition-and-schema
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Build verification + visual AR test |
| **Config file** | vite.config.ts (existing) |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run dev` |
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
| 02-01-01 | 01 | 1 | ARCH-01 | build | `npm run build` | ✅ | ⬜ pending |
| 02-01-02 | 01 | 1 | ARCH-03, ARCH-04 | build + visual | `npm run build` | ✅ | ⬜ pending |
| 02-01-03 | 01 | 1 | PERF-01, PERF-02, PERF-03 | build | `npm run build` | ✅ | ⬜ pending |
| 02-02-01 | 02 | 1 | RETL-01, RETL-04 | build | `npm run build` | ✅ | ⬜ pending |
| 02-02-02 | 02 | 1 | RETL-02 | build + visual | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No additional test framework needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Product switching doesn't restart camera | ARCH-03, ARCH-04 | Requires live camera + switching between products | Open AR, switch products, verify camera stays active |
| Garment type dropdown in retailer UI | RETL-02 | Requires browser interaction | Navigate to BrandProductManager, verify dropdown exists |
| Existing products default to shirt | RETL-04 | Requires database state | Query event_brand_products, verify garment_type defaults |
| Stable frame rate on mobile | PERF-01,02,03 | Requires mobile device test | Open AR on phone, check for smooth rendering |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
