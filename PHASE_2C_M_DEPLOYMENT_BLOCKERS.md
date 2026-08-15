# Phase 2C-M: Deployment Blockers & Pre-Deployment Checklist

## 1. Current Phase Status
- **Phase 2C-M Status**: **COMPLETED (READ-ONLY ARCHITECTURE & DESIGN)**
- **Production Status**: **UNCHANGED**
  - Production `firestore.rules`: **UNCHANGED**
  - Production Firestore Data: **UNCHANGED**
  - Production Firebase Auth Users: **UNCHANGED**
  - Production Cloud Functions: **UNCHANGED**
  - Production Storage Rules & Buckets: **UNCHANGED**

## 2. Preconditions for Future Phase 2C-N Controlled Review / Deployment
Before deploying `firestore.rules.phase2c-m` to production `log-sheet-af97a`:

1. **Frontend Query Scope Fixes**:
   - Apply the fixes detailed in `PHASE_2C_M_QUERY_FIX_PLAN.md` to `src/services/queryScopeEngine.ts` to ensure `assignedRegionId` is attached for `A4` queries, and `siteId` is attached for `A5`/`A6` leave queries.
2. **Backfill `assignedRegionId` on Employees**:
   - Verify that all active employee records in Firestore store their `assignedRegionId` derived from their assigned site master record.
3. **Controlled Staging Testing**:
   - Execute a full end-to-end smoke test on a staging project or local emulator using all test accounts (`A0`, `A1`, `A3_HR`, `A3_FINANCE`, `A4`, `A5`, `A6`, `A9`).
4. **Build Code Verification**:
   - Confirm `npm run build` passes with zero errors.

## 3. Final Production Readiness Decision

**READY_FOR_PHASE_2C_N_CONTROLLED_REVIEW**

---
*No production resources were modified during Phase 2C-M.*
