# Phase 2C-I: Legacy Authentication Inventory

## 1. Overview
This inventory catalogs legacy authentication and fallback paths identified across the codebase and outlines their retirement status.

## 2. Legacy Auth Paths Found & Retired
| File Path | Function / Block | Legacy Behavior | Replacement | Retirement Status |
|---|---|---|---|---|
| `src/services/firebaseAuthService.ts` | `authenticateUser` (TATA mock offline check) | Bypassed cloud function for TATA company | Enforce `generatePinToken` for all companies | **RETIRED** |
| `src/services/firebaseAuthService.ts` | `authenticateUser` (Catch block fallback) | Queried Firestore `employees` collection and compared plaintext `empData.pin === passwordOrPin`, issuing `SESSION-[timestamp]-[id]` | Require `generatePinToken` -> `signInWithCustomToken`; throw error if unavailable | **RETIRED** |

## 3. Conclusion
All client-side plaintext PIN verification and `SESSION-*` session generation paths have been completely removed. Firebase Custom Token authentication via `generatePinToken` is now strictly enforced as the sole PIN login mechanism.
