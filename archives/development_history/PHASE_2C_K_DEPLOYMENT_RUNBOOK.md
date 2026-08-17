# Phase 2C-K: Production Deployment Runbook (Design Only)

## 1. Overview
This runbook details the step-by-step procedures, execution order, post-deployment smoke tests, and rollback strategies for the FUTURE controlled deployment of Phase 2C Custom Token and Zero-Trust Claim-Based Rules. **THIS RUNBOOK IS FOR DESIGN ONLY; NO DEPLOYMENT COMMANDS ARE EXECUTED IN THIS PHASE.**

## 2. Pre-Deployment Readiness Check
Before initiating Phase 2C-L deployment:
1. Confirm git working directory is clean.
2. Confirm `npm run build` passes cleanly with zero errors.
3. Confirm backup export of production Firestore rules, Storage rules, and database indexes.
4. Confirm target Firebase Project ID is strictly `log-sheet-af97a`.

## 3. Recommended Deployment Order
1. **Cloud Functions Deployment**:
   ```bash
   firebase deploy --only functions:syncUserClaims,functions:generatePinToken --project log-sheet-af97a
   ```
2. **Firestore Security Rules Deployment**:
   ```bash
   firebase deploy --only firestore:rules --project log-sheet-af97a
   ```
3. **Firebase Storage Rules Deployment**:
   ```bash
   firebase deploy --only storage --project log-sheet-af97a
   ```
4. **Web App Frontend Release**:
   Deploy built assets (`dist/`) via GitHub Actions / Hosting pipeline.

## 4. Post-Deployment Verification & Smoke Tests
- Test Custom Token PIN login flow via `generatePinToken` for test accounts (`A0`, `A3`, `A6`, `A9`).
- Verify custom claim propagation in ID token results (`cId`, `aLvl`, `sId`, `rId`, `dId`, `pV`).
- Verify Supervisor Muster attendance creation at authorized site.
- Verify cross-site access denial for `A6` supervisor attempting to query another site.
- Verify ground worker (`A9`) denial when attempting to query global employee directory or payroll.

## 5. Rollback Plan & Failure Criteria
- **Trigger Conditions**: Any authentication failure during smoke tests, unexpected `PERMISSION_DENIED` errors for legitimate `A0-A6` managers, or broken Supervisor Muster.
- **Rollback Steps**:
  1. Restore previous `firestore.rules` via `firebase deploy --only firestore:rules`.
  2. Restore previous `storage.rules` via `firebase deploy --only storage`.
  3. Revert frontend deployment if necessary.

## 6. Safety Confirmation
- **Production Status**: UNCHANGED. No commands executed during Phase 2C-K.
