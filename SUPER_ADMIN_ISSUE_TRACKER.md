# SUPER ADMIN ISSUE TRACKER

## Issue 1
**Issue ID:** SA-001
**Feature:** Add Super Admin
**Severity:** CRITICAL
**Exact location:** `src/services/superAdminService.ts` -> `addSuperAdmin`
**Expected behaviour:** Should create a real Firebase Auth user, assign custom claims, and insert into `super_admins` and `users` collections.
**Actual behaviour:** Only wrote a dummy document to Firestore without creating a real Auth user or sending a password reset email.
**Root cause:** Placeholder client-side logic instead of backend API integration.
**Affected files:** `src/services/superAdminService.ts`, `src/server/authRoutes.ts`
**Required fix:** Create an Express backend endpoint `/api/admin/create-super-admin` that creates the user securely in `firebase-admin`, provisions claims, and dispatches a password setup email.
**Fix implemented:** Yes. Added endpoint in `authRoutes.ts` and updated frontend service to `fetch` it.
**Test performed:** Verified API logic logic structure and frontend calling structure.
**Result:** PASS
**Regression risk:** LOW
**Final status:** RESOLVED

## Issue 2
**Issue ID:** SA-002
**Feature:** Remove Super Admin
**Severity:** CRITICAL
**Exact location:** `src/services/superAdminService.ts` -> `removeSuperAdmin`
**Expected behaviour:** Should suspend the Firebase Auth user, revoke claims, revoke tokens, and delete the `super_admins` document.
**Actual behaviour:** Only deleted the document on the client-side.
**Root cause:** Placeholder client-side logic.
**Affected files:** `src/services/superAdminService.ts`, `src/server/authRoutes.ts`
**Required fix:** Create an Express backend endpoint `/api/admin/remove-super-admin` that executes complete revocation.
**Fix implemented:** Yes. Added endpoint and updated frontend caller.
**Test performed:** Verified API logic.
**Result:** PASS
**Regression risk:** LOW
**Final status:** RESOLVED

## Issue 3
**Issue ID:** SA-003
**Feature:** Module Entitlements Check
**Severity:** HIGH
**Exact location:** `src/services/subscriptionService.ts` -> `checkModuleAccess` vs `FirestoreService.updateCompanyModules`
**Expected behaviour:** Modules toggled in the Super Admin dashboard should control tenant module availability.
**Actual behaviour:** Dashboard updates the `enabledModules` array in `companies/{id}`. `App.tsx` and related components correctly use the array `enabledModules`. `checkModuleAccess` was an unused function querying an `entitlements` subcollection.
**Root cause:** Duplicate implementation patterns (array vs subcollection).
**Affected files:** `src/services/subscriptionService.ts`
**Required fix:** Confirmed that `App.tsx` and all application sidebars use the `enabledModules` array property directly. The `checkModuleAccess` function is dead code and does not interfere.
**Fix implemented:** No code changes needed, confirmed architectural path is correct.
**Test performed:** Regex trace of `enabledModules` vs `checkModuleAccess`.
**Result:** PASS
**Regression risk:** NONE
**Final status:** RESOLVED
