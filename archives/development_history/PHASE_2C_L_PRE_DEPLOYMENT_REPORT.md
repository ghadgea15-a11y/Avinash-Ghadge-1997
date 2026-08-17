# Phase 2C-L: Pre-Deployment Audit & Safety Report

## 1. Environment & Target Verification
- **Target Project ID**: `log-sheet-af97a`
- **Config File (`firebase-applet-config.json`)**: `log-sheet-af97a`
- **Firebase RC (`.firebaserc`)**: `log-sheet-af97a`
- **Proposed Rules Source**: `firestore.rules.phase2c-g`
- **Production Rules Source**: `firestore.rules`

## 2. Rule Diff & Compatibility Analysis

### A. Omitted Production Collections in `firestore.rules.phase2c-g`
The proposed `firestore.rules.phase2c-g` draft includes rules only for `employees`, `attendance_logs`, `payroll`, and `leave_requests` under `/companies/{companyId}`. It omits the following production-critical collections, causing them to fall back to `match /{document=**} { allow read, write: if false; }`:
1. `/users/{uid}` (User profile resolution & session management)
2. `/company_codes/{codeId}` and `/companyCodes/{codeId}` (Unauthenticated company code verification)
3. `/companies/{companyId}/sites/{siteId}` (Site master data & site selector)
4. `/companies/{companyId}/approval_requests/{requestId}` (Workflow approvals)
5. `/companies/{companyId}/incident_reports`, `/visitor_logs`, `/material_movement_logs`
6. `/companies/{companyId}/inventory`, `/assets`, `/notifications`, `/audit_logs`

### B. Unauthenticated Public Lookup Blocking
- `firestore.rules.phase2c-g` specifies:
  `allow get: if sameCompany(companyId) || request.auth.token.companyId == companyId;`
- Unauthenticated users attempting to verify company codes on the login screen prior to signing in will receive `PERMISSION_DENIED`.

### C. Query Scope Constraints
- Ground workers, site managers (`A5`/`A6`), and regional managers (`A4`) executing top-level collection queries without exact `siteId` or `assignedRegionId` equality clauses will be rejected by Firestore security rules.

## 3. Decision
Due to query incompatibility and omitted production collection paths in `firestore.rules.phase2c-g`, proceeding with deployment would break core production workflows.

**STATUS: NO_GO_PHASE_2C_L**
