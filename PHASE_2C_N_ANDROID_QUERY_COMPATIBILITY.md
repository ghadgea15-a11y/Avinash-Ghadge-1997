# PHASE 2C-N — ANDROID QUERY COMPATIBILITY AUDIT REPORT

**Target Backend**: `log-sheet-af97a`  
**Shared Platform**: Web + Android Unified Backend  
**Status**: VERIFIED & COMPATIBLE

---

## 1. Executive Summary

An audit of the Android Kotlin client code (`/android/app/src/main/java/com/enterprise/logsheetmuster/`) was performed to verify query compatibility with the Phase 2C-M claim-based Firestore Security Rules (`firestore.rules.phase2c-m`).

The Android app communicates directly with Firestore using the shared security rules and custom claims model (`cId`, `aLvl`, `rId`, `sId`, `dId`, `pV`).

---

## 2. Android Repository Scoping & Query Mapping

| Android Repository / Class | Collection Queried | Scoping Logic Applied | Query Parameters | Claim & Rule Alignment |
|---|---|---|---|---|
| `AuthRepositoryImpl.kt` | `company_codes/{companyId}` | Public Document Get | `doc(companyId)` | Matches `allow read: if true;` rule |
| `AuthRepositoryImpl.kt` | `companies/{companyId}/employees` | Filter by `authUid` | `.whereEqualTo("authUid", uid)` | Matches self-read rule for employees |
| `AttendanceRepository.kt` | `companies/{companyId}/attendance` | Site / Employee filter | `.whereEqualTo("siteId", siteId)` or `.whereEqualTo("employeeId", empId)` | Matches site-level (A5/A6) & self (A7/A8) rules |
| `PatrolRepository.kt` | `companies/{companyId}/patrols` | Site filter | `.whereEqualTo("siteId", siteId)` | Matches site-level patrol rule |
| `IncidentRepository.kt` | `companies/{companyId}/incidents` | Site / ReportedBy filter | `.whereEqualTo("siteId", siteId)` | Matches site-level incident rule |
| `VisitorRepository.kt` | `companies/{companyId}/visitors` | Site filter | `.whereEqualTo("siteId", siteId)` | Matches site-level visitor gate pass rule |

---

## 3. Compatibility Findings

1. **Custom Claims Propagation**: The Android client uses Firebase Auth SDK to refresh ID tokens automatically, providing `request.auth.token.cId` and `request.auth.token.aLvl` on every Firestore operation.
2. **Tenant Isolation**: All queries in Android repositories prepend `companies/{companyId}/` pathing, ensuring strict cross-tenant separation.
3. **No Legacy PIN Bypass**: The Android client authentication flow exclusively uses Firebase Auth Custom Tokens and standard email/password authentication. No fake session or local PIN bypass logic exists in Android code.

---

## 4. Conclusion

The Android application is 100% compatible with the `firestore.rules.phase2c-m` security ruleset. No breaking query mismatches or missing claim issues were identified.
