# Phase 2C-M: Frontend Query Fix Plan

## 1. Overview
This fix plan details the precise code updates required in `src/services/queryScopeEngine.ts` and `src/services/firestoreService.ts` to ensure all client-side Firestore queries comply with the claim-backed security constraints in `firestore.rules.phase2c-m`.

**NOTE: THIS PLAN IS DESIGNED FOR FUTURE CONTROLLED EXECUTION. NO APPLICATION SOURCE CODE WAS MODIFIED IN PHASE 2C-M.**

## 2. Incompatible Query Remediation Specs

### Item 1: Regional Area Manager (`A4`) Scope Engine Update
- **File**: `src/services/queryScopeEngine.ts`
- **Function**: `QueryScopeEngine.buildScope(session, collectionType)`
- **Current Problem**: `A4_REGIONAL_AREA_MANAGER` is currently listed in `isGlobal` override list, returning no query constraints.
- **Required Fix**:
  ```typescript
  // Regional Area Manager
  if (authority === 'A4_REGIONAL_AREA_MANAGER' && session.assignedRegionId) {
    if (['EMPLOYEES'].includes(collectionType)) {
      constraints.push(where('assignedRegionId', '==', session.assignedRegionId));
    } else if (['ATTENDANCE', 'INCIDENTS', 'VISITORS', 'MATERIALS', 'LEAVES'].includes(collectionType)) {
      constraints.push(where('assignedRegionId', '==', session.assignedRegionId));
    }
    return constraints;
  }
  ```
- **Risk**: Low. Requires backfilling `assignedRegionId` on existing employee documents or allowing `assignedRegionId == null` fallback in rules for legacy data.

### Item 2: Site Manager Leave Requests Scope
- **File**: `src/services/queryScopeEngine.ts`
- **Function**: `QueryScopeEngine.buildScope(session, 'LEAVES')`
- **Current Problem**: `LEAVES` collection queries for `A5` / `A6` do not append `where('siteId', '==', session.assignedSiteId)`.
- **Required Fix**:
  ```typescript
  if (['A5_SITE_IN_CHARGE', 'A6_SUPERVISOR'].includes(authority) && session.assignedSiteId) {
    if (['EMPLOYEES'].includes(collectionType)) {
      constraints.push(where('assignedSiteId', '==', session.assignedSiteId));
    } else if (['ATTENDANCE', 'INCIDENTS', 'VISITORS', 'MATERIALS', 'LEAVES'].includes(collectionType)) {
      constraints.push(where('siteId', '==', session.assignedSiteId));
    }
    return constraints;
  }
  ```
- **Risk**: Low. Ensures site managers only request and receive leave applications originating from their assigned site.

### Item 3: Employee Creation & Update Region Mapping
- **File**: `src/services/firestoreService.ts`
- **Function**: `saveEmployee(companyId, employeeData)`
- **Current Problem**: Employee creation form saves `assignedSiteId`, but does not automatically populate `assignedRegionId` derived from the site master document.
- **Required Fix**: Look up the parent site record or populate `assignedRegionId` during employee creation so regional query constraints match.
- **Risk**: Low. Standard data normalization.

## 3. Recommended Sequence of Execution for Next Phase
1. Apply `QueryScopeEngine.ts` updates in a local feature branch.
2. Backfill `assignedRegionId` on test site/employee documents if missing.
3. Test all dashboard list views (`A0` to `A9`) using local Firebase Emulator.
4. Verify `npm run build` passes with code 0.

---
*No production resources or source files were modified during Phase 2C-M.*
