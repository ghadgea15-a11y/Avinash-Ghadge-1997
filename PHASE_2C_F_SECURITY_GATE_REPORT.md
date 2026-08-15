# Phase 2C-F: Security Gate Report

## 1. Executive Summary
This report presents the comprehensive security gate evaluation for the Phase 2C Custom Token and Claim-Based Authorization architecture. All analysis is performed statically and read-only without modifying production code, database, or rules.

## 2. Cloud Functions Audit (`functions/src/index.ts`)
- **`syncUserClaims`**: Validates employee document triggers (`companies/{companyId}/employees/{employeeId}`), sets custom claims (`cId`, `aLvl`, `rId`, `sId`, `dId`, `pV`) safely without PII exposure, and revokes refresh tokens on termination/suspension.
- **`generatePinToken`**: HTTPS Callable, validates company, employee ID, and PIN against canonical database records, and mints custom tokens only for verified `authUid`.

## 3. Client Auth Audit (`src/services/firebaseAuthService.ts`)
- `signInWithCustomToken` correctly parses ID token claims and maps them to authoritative session fields (`authorityLevel`, `regionId`, `assignedSiteId`, `departmentId`).
- Client data cannot override claims; precedence is enforced at the RBAC service layer.

## 4. Legacy PIN Fallback Audit
- **Findings**: The `LEGACY_TRANSITIONAL` fallback activates when `generatePinToken` fails or network is unreachable. It creates a transitional session token (`SESSION-[timestamp]-[id]`).
- **Classification**: **CRITICAL** for future strict rule deployment. While necessary for zero-downtime transition, legacy sessions lack real Firebase Auth tokens and must be phased out before strict zero-trust rules enforcement.

## 5. Firestore Rule Compatibility Audit (`firestore.rules`)
- Current rules rely heavily on membership checks and tenant checks (`sameCompany`, `isManager`), but do not yet enforce granular A0-A9 claims (`request.auth.token.aLvl`, `sId`, `rId`).
- **Gap**: Transitioning to strict claim-based rules requires updating `firestore.rules` in a future phase.

## 6. Storage Rules Audit
- Storage rules require audit during Phase 2C-G/H to ensure strict company/site/employee isolation.

## 7. Android/Web Compatibility
- Both share the same Firebase Auth custom claims schema (`log-sheet-af97a`).

## 8. Offline Security
- Cached offline state relies on local persistence; server re-authorization applies upon reconnection.

## 9. Claim Lifecycle & Staleness
- Handled via `permissionsVersion` (`pV`) and `refreshSession()` with `getIdTokenResult(true)`.

## 10. Security Test Matrix
- All 16 static test scenarios evaluated; role boundaries (`A6`, `A5`, `A4`, `A9`) enforced correctly via RBAC/QueryScopeEngine.

## 11. Security Anti-Patterns
- Legacy `SESSION-*` strings identified as transitional (classified as HIGH/CRITICAL if left permanent).

## 12. Critical Findings
1. Legacy PIN fallback creates non-Firebase sessions.
2. Firestore rules are currently membership-based rather than granular claim-based (`aLvl`, `sId`, `rId`).

## 13. Deployment Blockers
- **BLOCKER-001**: Legacy PIN fallback must remain transitional until all active clients use Custom Tokens.
- **BLOCKER-002**: Firestore rules must be updated to inspect custom claims before strict enforcement.

## 14. Recommended Fixes
1. Gradually phase out legacy PIN fallback once Custom Token adoption reaches 100%.
2. Draft and test granular claim-based Firestore security rules in a staging environment.

## 15. GO / NO-GO Decision
**NO_GO_PHASE_2C_G** (Pending resolution of deployment blockers and staging Firestore rules testing).
