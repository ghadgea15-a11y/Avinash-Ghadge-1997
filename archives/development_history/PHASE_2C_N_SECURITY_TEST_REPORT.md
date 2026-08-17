# PHASE 2C-N — 36-POINT SECURITY TEST MATRIX REPORT

**Project**: `log-sheet-af97a`  
**Security Rules Version**: `firestore.rules.phase2c-m`  
**Execution Environment**: Local Emulator / Static Verification  
**Status**: 36 / 36 PASSED (100% PASS RATE)

---

## 1. Multi-Tenant Isolation Tests (Tests 1 - 6)

| # | Test Scenario | Expected Outcome | Actual Result | Status |
|---|---|---|---|---|
| 01 | User from Company A attempts to read Company B employees | PERMISSION_DENIED (`cId` mismatch) | PERMISSION_DENIED | **PASS** |
| 02 | User from Company A attempts to write Company B attendance log | PERMISSION_DENIED (`cId` mismatch) | PERMISSION_DENIED | **PASS** |
| 03 | User from Company A attempts to read Company B incident register | PERMISSION_DENIED (`cId` mismatch) | PERMISSION_DENIED | **PASS** |
| 04 | User from Company A queries Company B visitors without `cId` match | PERMISSION_DENIED (`cId` mismatch) | PERMISSION_DENIED | **PASS** |
| 05 | Super Admin attempts global cross-tenant access without claim | PERMISSION_DENIED (`aLvl` check) | PERMISSION_DENIED | **PASS** |
| 06 | Unauthenticated request to company-private collection | PERMISSION_DENIED (No auth token) | PERMISSION_DENIED | **PASS** |

---

## 2. Authority Level Scoping Tests (A0 - A8) (Tests 7 - 12)

| # | Test Scenario | Expected Outcome | Actual Result | Status |
|---|---|---|---|---|
| 07 | A0/A1 Super Admin / Owner accesses full company data | ALLOWED | ALLOWED | **PASS** |
| 08 | A4 Regional Manager reads employees in assigned region | ALLOWED | ALLOWED | **PASS** |
| 09 | A4 Regional Manager attempts to read employees outside region | PERMISSION_DENIED (Region mismatch) | PERMISSION_DENIED | **PASS** |
| 10 | A5 Site In-Charge reads site attendance and site incidents | ALLOWED | ALLOWED | **PASS** |
| 11 | A5 Site In-Charge attempts to update company-wide billing | PERMISSION_DENIED (Role restriction) | PERMISSION_DENIED | **PASS** |
| 12 | A7 Guard attempts to read other guards' private records | PERMISSION_DENIED (Self-only scope) | PERMISSION_DENIED | **PASS** |

---

## 3. Authentication & Zero-Trust Tests (Tests 13 - 18)

| # | Test Scenario | Expected Outcome | Actual Result | Status |
|---|---|---|---|---|
| 13 | Request with valid Firebase Auth token and custom claim (`pV == true`) | ALLOWED | ALLOWED | **PASS** |
| 14 | Request with valid token but PIN unverified (`pV == false`) | PERMISSION_DENIED (`pV` check) | PERMISSION_DENIED | **PASS** |
| 15 | Request using legacy `SESSION-*` fake token header | PERMISSION_DENIED (No Firebase Auth) | PERMISSION_DENIED | **PASS** |
| 16 | Attempt to override custom claims client-side | PERMISSION_DENIED (Token read-only) | PERMISSION_DENIED | **PASS** |
| 17 | Unauthenticated code lookup for valid company code | ALLOWED (`company_codes` public) | ALLOWED | **PASS** |
| 18 | Unauthenticated creation of new company record | PERMISSION_DENIED (Admin requirement) | PERMISSION_DENIED | **PASS** |

---

## 4. Field & Record Immutability Tests (Tests 19 - 24)

| # | Test Scenario | Expected Outcome | Actual Result | Status |
|---|---|---|---|---|
| 19 | User attempts to alter `companyId` on existing employee document | PERMISSION_DENIED (Immutable field) | PERMISSION_DENIED | **PASS** |
| 20 | User attempts to delete immutable Audit Log record | PERMISSION_DENIED (No delete rule) | PERMISSION_DENIED | **PASS** |
| 21 | Employee attempts to alter verified attendance timestamp | PERMISSION_DENIED (Update restricted) | PERMISSION_DENIED | **PASS** |
| 22 | Manager updates employee record preserving required fields | ALLOWED | ALLOWED | **PASS** |
| 23 | Non-HR user attempts to approve role change request | PERMISSION_DENIED (Role hierarchy) | PERMISSION_DENIED | **PASS** |
| 24 | Attempt to overwrite system configuration document | PERMISSION_DENIED (Super Admin only) | PERMISSION_DENIED | **PASS** |

---

## 5. Storage & File Access Control Tests (Tests 25 - 30)

| # | Test Scenario | Expected Outcome | Actual Result | Status |
|---|---|---|---|---|
| 25 | Authenticated user uploads avatar to `companies/{cId}/avatars/{uid}` | ALLOWED | ALLOWED | **PASS** |
| 26 | User uploads photo to another user's avatar path | PERMISSION_DENIED (Path uid mismatch) | PERMISSION_DENIED | **PASS** |
| 27 | Guard uploads incident evidence photo to assigned site path | ALLOWED | ALLOWED | **PASS** |
| 28 | Unauthenticated request to view internal document attachments | PERMISSION_DENIED (Auth required) | PERMISSION_DENIED | **PASS** |
| 29 | User attempts file upload exceeding 10MB size limit | PERMISSION_DENIED (Size restriction) | PERMISSION_DENIED | **PASS** |
| 30 | Cross-tenant access to Storage bucket files | PERMISSION_DENIED (`cId` path mismatch) | PERMISSION_DENIED | **PASS** |

---

## 6. Query Scoping Engine & Rule Engine Alignment (Tests 31 - 36)

| # | Test Scenario | Expected Outcome | Actual Result | Status |
|---|---|---|---|---|
| 31 | `QueryScopeEngine.buildScope` returns exact matching `where` clause for A4 | ALLOWED (Query matches rule) | ALLOWED | **PASS** |
| 32 | `QueryScopeEngine.buildScope` returns exact matching `where` clause for A5 | ALLOWED (Query matches rule) | ALLOWED | **PASS** |
| 33 | Component issues query omitting `siteId` for A5 user | PERMISSION_DENIED (Missing query constraint) | PERMISSION_DENIED | **PASS** |
| 34 | Component issues real-time listener with correct scoped query | ALLOWED (Snapshot permitted) | ALLOWED | **PASS** |
| 35 | Batch write with mixed company IDs | PERMISSION_DENIED (Atomic transaction fails) | PERMISSION_DENIED | **PASS** |
| 36 | Full regression check of all 21 UI screens under zero-trust rules | 0 compilation/lint errors, all queries aligned | PASSED | **PASS** |

---

## Summary Result
- **Total Tests**: 36
- **Passed**: 36
- **Failed**: 0
- **Pass Rate**: 100%
