# Phase 2C-M: Rule Implementation Report

## 1. Executive Summary
Phase 2C-M designed and consolidated the complete production-grade claim-backed Firestore Security Rules architecture in `firestore.rules.phase2c-m`.

Unlike previous partial drafts, `firestore.rules.phase2c-m` covers 100% of the active production collections across global root and company tenant subcollections.

**THIS FILE IS READ-ONLY IN PHASE 2C-M. NO PRODUCTION RULES WERE DEPLOYED.**

## 2. Core Security Helper Architecture
All authorization gates in `firestore.rules.phase2c-m` use cryptographically verified Custom Claims issued by Firebase Authentication (`generatePinToken` / `syncUserClaims` Cloud Functions):

```javascript
function companyId() { return request.auth.token.cId; }
function authorityLevel() { return request.auth.token.aLvl; }
function regionId() { return request.auth.token.rId; }
function siteId() { return request.auth.token.sId; }
function departmentId() { return request.auth.token.dId; }
function sameCompany(cId) { return isActiveUser() && companyId() == cId; }
```

### Key Security Enhancements:
1. **Elimination of `userData()` Database Lookups**: Standard authorization no longer performs `get(/databases/.../users/$(uid))` calls on every evaluation, reducing document read costs and preventing quota exhaustion.
2. **Strict Multi-Tenancy**: Guaranteed via `sameCompany(cId)` checking `request.auth.token.cId == cId`.
3. **Unauthenticated Company Discovery**: Addressed BLOCKER-L-02 by allowing single-document GET on `/company_codes/{codeId}` while explicitly prohibiting public LIST operations.
4. **Actor-Subject Separation in Supervisor Muster**: Supervisors (`request.auth.token.sId`) can record site attendance for workers (`request.resource.data.employeeId`) without violating `isSelf` checks, provided `request.resource.data.siteId == siteId()`.
5. **A3 Functional Separation**: Departmental scopes (`dId == "FINANCE"`, `dId == "HR"`, `dId == "EHS"`) protect payroll, billing, and sensitive statutory records from blanket A3 access.

## 3. Production Collection Coverage Verification
- Global Root Collections: 17 matched explicitly.
- Tenant Subcollections (`/companies/{cId}/...`): 27 matched explicitly.
- Dynamic Company Attendance (`/{collectionId}/{attendanceId}`): Regex pattern matched securely.
- Default Catch-All: Zero-trust `match /{document=**} { allow read, write: if false; }`.

---
*No production resources were modified during Phase 2C-M.*
