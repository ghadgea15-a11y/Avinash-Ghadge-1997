# Phase 2C-M: Query Compatibility Audit Report

## 1. Executive Summary
This report analyzes all frontend Firestore queries across `src/services/firestoreService.ts`, `QueryScopeEngine.ts`, and screen components against the claim-backed rules defined in `firestore.rules.phase2c-m`.

In Firestore Security Rules, collection list queries must be explicitly constrained by the client so that Firestore can verify statically that every potential matching document satisfies the security rule.

## 2. Query Compatibility Audit by Module

### A. Employee List Queries (`/companies/{cId}/employees`)
- **Current Query**: Uses `QueryScopeEngine.buildScope(session, 'EMPLOYEES')`.
  - For `A5_SITE_IN_CHARGE` and `A6_SUPERVISOR`: Adds `where('assignedSiteId', '==', session.assignedSiteId)`.
  - For `A4_REGIONAL_AREA_MANAGER`: Currently returns empty constraints (global scope) because `assignedRegionId` is not populated on all historical documents.
- **Rule Requirement**: `A4` rules check `resource.data.assignedRegionId == regionId() || resource.data.assignedRegionId == null`.
- **Status**: **INCOMPATIBLE FOR A4 REGIONAL MANAGERS**.
- **Impact**: When `A4` regional managers query employees without an explicit `where('assignedRegionId', '==', regionId)` clause, Firestore rule evaluation will reject the query.

### B. Attendance Logs Queries (`/companies/{cId}/attendance_logs`)
- **Current Query**: Uses `QueryScopeEngine.buildScope(session, 'ATTENDANCE')`.
  - For `A5` / `A6`: Adds `where('siteId', '==', session.assignedSiteId)`.
  - For `A7–A9`: Adds `where('employeeId', '==', session.employeeId)`.
  - For `A4`: Returns empty constraints (global company scope).
- **Rule Requirement**: Rules require `resource.data.assignedRegionId == regionId()` or `siteId == siteId()`.
- **Status**: **INCOMPATIBLE FOR A4 REGIONAL MANAGERS**.
- **Impact**: `A4` queries for attendance without `where('assignedRegionId', '==', regionId)` will be rejected by Firestore.

### C. Operational Site Logs (`incidents`, `visitors`, `materials`)
- **Current Query**: Uses `QueryScopeEngine.buildScope(session, domain)`.
  - For `A5` / `A6`: Adds `where('siteId', '==', session.assignedSiteId)`.
  - For `A4`: Returns empty constraints.
- **Rule Requirement**: Regional scope validation checks `resource.data.assignedRegionId == regionId()`.
- **Status**: **INCOMPATIBLE FOR A4 REGIONAL MANAGERS**.

### D. Leave Requests (`/companies/{cId}/leave_requests`)
- **Current Query**: `QueryScopeEngine.buildScope(session, 'LEAVES')` returns empty constraints for `A5` / `A6` site managers because `leave_requests` documents do not currently index `siteId`.
- **Rule Requirement**: `isSiteManager(resource.data.siteId)`.
- **Status**: **INCOMPATIBLE FOR A5/A6 SITE MANAGERS**.
- **Impact**: `A5`/`A6` managers attempting to query leave requests for their site without a `siteId` index or query filter will trigger `PERMISSION_DENIED`.

### E. Approval Requests (`/companies/{cId}/approval_requests` & Root)
- **Current Query**: Queries by `companyId` or `uid`.
- **Rule Requirement**: `resource.data.companyId == companyId()` or `resource.data.uid == request.auth.uid`.
- **Status**: **COMPATIBLE**.

### F. Unauthenticated Company Code Discovery (`/company_codes/{codeId}`)
- **Current Query**: `getDoc(doc(db, 'company_codes', code))` executed during login before Firebase Authentication sign-in.
- **Rule Requirement**: `allow get: if true;` for single document lookup.
- **Status**: **COMPATIBLE** in `firestore.rules.phase2c-m` (BLOCKER-L-02 RESOLVED).

## 3. Summary of Required Frontend Changes
To make 100% of frontend queries compatible with strict claim-backed Firestore rules, `QueryScopeEngine.ts` and `firestoreService.ts` must be updated to:
1. Ensure `assignedRegionId` filters are attached for `A4` regional manager queries.
2. Ensure `siteId` filters are attached for `A5`/`A6` leave request and operational queries.
3. Ensure employee master records store `assignedRegionId` upon creation or update.

---
*No production resources were modified during Phase 2C-M.*
