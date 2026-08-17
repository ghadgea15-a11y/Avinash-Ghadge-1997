# Phase 2C-D: Auth Client Audit Report

## 1. Current Email/Password Login
- Uses `signInWithEmailAndPassword` from `firebase/auth`.
- Falls back to creating reserved super admin accounts if matched.
- Queries `users/{uid}` in Firestore for user profile data (role, companyId, departmentId, approval statuses).
- Mints a `UserSession` object stored locally.

## 2. Current Google Login
- Uses `signInWithPopup` with `GoogleAuthProvider`.
- Checks `users/{uid}` in Firestore. If missing, prompts for company code and department via `completeGoogleRegistration`.

## 3. Current PIN Login
- Handled inside `authenticateUser` when `isPinMode` is true (or via employee ID / PIN inputs).
- Queries `companies/{companyId}/employees` where `employeeId == cleanInput`.
- Verifies plaintext `empData.pin` or `empData.password`.
- Manufactures a local session token `SESSION-[timestamp]-[id]` without a real Firebase Auth session.

## 4. Current Fake SESSION Implementation
- PIN login previously generated local strings like `SESSION-[timestamp]-[empDoc.id]` and did not authenticate against Firebase Auth.

## 5. Current UserSession Structure
Contains: `userId`, `employeeId`, `fullName`, `email`, `role`, `companyId`, `regionId`, `areaId`, `branchId`, `assignedSiteId`, `workforceCategory`, `authorityLevel`, `dataScope`, `avatarUrl`, `token`, `tokenExpiresAt`, `isBiometricEnabled`, `lastActiveAt`, `loginMode`, `accountStatus`, `emailVerified`, `departmentId`, `departmentName`, etc.

## 6. Current RbacService Authority Resolution
- Translates `session.role` or `session.authorityLevel` into canonical `AuthorityLevel` (`A0_OWNER` to `A9_SUPPORT`).

## 7. Current QueryScopeEngine Authority Resolution
- Resolves scope constraints (`COMPANY`, `SITE`, `SELF`) based on `RbacService.getAuthorityLevel(session)` and role checks.

## 8. Current Logout Flow
- Clears local session cache / storage via `SessionManager`.

## 9. Current Auth Persistence
- Standard Firebase Auth persistence (`indexedDBLocal` or browser local storage).

## 10. Current Token Refresh Behavior
- Uses standard Firebase ID token without explicit authority claims refresh hooks.

## 11. Current Web/Android Differences
- Both share the same backend concepts and Firebase project (`log-sheet-af97a`).

## 12. Exact Files Requiring Modification
- `src/types/index.ts` (Extend `UserSession` with `authMode`, `firebaseUid`, `permissionsVersion`, etc.)
- `src/services/firebaseAuthService.ts` (Add Custom Token PIN login flow calling `generatePinToken` and `signInWithCustomToken`, with legacy fallback)
- `src/services/rbacService.ts` (Prioritize custom claims `aLvl`, `cId`, `rId`, `sId`, `dId`, `pV` for authority and scope resolution)
- `src/services/queryScopeEngine.ts` (Ensure claim-backed authority is used)
- `src/App.tsx` or session manager if session initialization needs claim syncing.
