# Phase 2C-E: Claim Contract Specification

## 1. Overview
This document specifies the exact JSON claims contract used between the `generatePinToken` Cloud Function (Phase 2C-C) and the client-side `firebaseAuthService.ts` & `rbacService.ts` (Phase 2C-D).

## 2. Claim Schema Mapping
| Claim Key | Data Type | Source Field | Description |
|---|---|---|---|
| `cId` | string | `companyId` | Company Tenant ID |
| `aLvl` | string | `role` / `designation` (mapped via `mapRoleToAuthorityLevel`) | Canonical Authority Level (`A0_OWNER` to `A9_SUPPORT`, or `NONE` if terminated/suspended) |
| `rId` | string (optional) | `assignedRegionId` | Assigned Regional Area ID |
| `sId` | string (optional) | `assignedSiteId` | Assigned Site ID |
| `dId` | string (optional) | `departmentId` | Department ID |
| `pV` | number | `Date.now()` | Permissions Version (cache-buster for token refresh) |

## 3. Consistency Verification
- **Cloud Function (`functions/src/index.ts`)**: Mints custom claims matching exactly `cId`, `aLvl`, `rId`, `sId`, `dId`, `pV`.
- **Client Service (`src/services/firebaseAuthService.ts`)**: Reads `claims.aLvl`, `claims.rId`, `claims.sId`, `claims.dId`, `claims.pV` during `signInWithCustomToken` and `refreshSession`.
- **RBAC Service (`src/services/rbacService.ts`)**: Resolves authority level prioritizing Firebase token custom claims.
