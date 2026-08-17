# Phase 2C-F.1: Legacy PIN Retirement Plan

## 1. Executive Summary
This document outlines the staging-to-production retirement path for the transitional `LEGACY_TRANSITIONAL` PIN fallback (`SESSION-*` tokens), ensuring 100% migration to Firebase Custom Token authentication.

## 2. Dependency & Code Path Mapping
- **PIN Login UI**: Invokes `authenticateUser` in `firebaseAuthService.ts`.
- **Primary Path**: Calls `generatePinToken` HTTPS Callable function -> `signInWithCustomToken(auth, token)`.
- **Transitional Fallback**: Previously caught cloud function errors and queried Firestore `employees` collection directly, returning `token: SESSION-[timestamp]-[id]` with `authMode: 'LEGACY_TRANSITIONAL'`.

## 3. Retirement Stages
- **Stage 1 (Current)**: Custom Token is primary; legacy fallback active for offline/transitional support.
- **Stage 2 (Pre-Enforcement)**: Legacy fallback logs warnings, requires explicit staging flag, and denies unauthenticated Firestore writes under strict rules.
- **Stage 3 (Full Retirement)**: Removal of legacy plaintext PIN verification code paths from `firebaseAuthService.ts`. All PIN logins must authenticate via Firebase Auth Custom Tokens.

## 4. Supervisor Muster Compatibility
- Supervisor (`A6`) authenticates via Firebase Auth.
- Attendance creation references Supervisor's `auth.uid` as actor, while workforce subject is stored in attendance records (`employeeId`), avoiding any conflict with `request.auth.uid`.
