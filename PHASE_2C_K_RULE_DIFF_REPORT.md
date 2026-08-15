# Phase 2C-K: Rule Diff & Security Audit Report

## 1. Overview
This document compares existing production rules with Phase 2C-G claim-backed rules (`firestore.rules.phase2c-g`) and storage rules (`storage.rules`). All evaluations are static and read-only. **NO PRODUCTION RULES WERE MODIFIED.**

## 2. Firestore Rules Comparison Summary

| Collection Path | Existing Production Behavior (`firestore.rules`) | Proposed Zero-Trust Behavior (`firestore.rules.phase2c-g`) | Security Impact & Risk Level |
|---|---|---|---|
| `/companies/{cId}` | Public `get` allowed for code lookup; `list` allowed if `sameCompany()` via `users/{uid}` membership doc. | `get` allowed if `request.auth.token.cId == cId`. `list` restricted to `A0-A3`. Zero client lookup queries needed. | **HIGH IMPACT (LOW RISK)**: Eliminates Firestore document lookups (`exists()` / `get()`) in rules. |
| `/companies/{cId}/employees/{eId}` | Read/write allowed for `isManager()` based on `users/{uid}` profile data. | Read restricted to `A0-A3` or matching `rId`/`sId` in token or self (`employeeId == token.employeeId`). Write restricted to `A0-A3`. | **CRITICAL SECURITY IMPROVEMENT**: Prevents site supervisors or ground workers from viewing full employee directories across other sites. |
| `/companies/{cId}/attendance_logs/{id}` | Read/create allowed for `sameCompany()`; update for `isManager()`. | Read allowed for self, site manager (`sId`), region manager (`rId`), or `A0-A3`. Create allowed for `A6` supervisor matching `sId` with actor/subject separation. | **CRITICAL SECURITY IMPROVEMENT**: Enforces site-level bounds for supervisors while permitting delegated muster attendance. |
| `/companies/{cId}/payroll/{id}` | Read/write allowed for `isCompanyAdmin()`. | Read/write restricted to `A0-A2` or `A3` with `dId == 'FINANCE'` or self pay stub. | **HIGH IMPACT**: Protects sensitive financial data from non-finance staff. |
| `/companies/{cId}/leave_requests/{id}` | Read/create for `sameCompany()`; update for `isManager()`. | Read/update allowed for matching site/region manager or self; create for authenticated tenant employee. | **MEDIUM IMPACT**: Prevents cross-site leave request tampering. |

## 3. Storage Rules Comparison Summary
- `storage.rules` paths (`/companies/{cid}/employees/{eid}/profile/...`) use `claims().companyId` and `claims().role`.
- In Phase 2C-G/L, storage rules helper functions map `claims().cId` and `claims().aLvl` to ensure zero-trust file isolation across company and site boundaries.

## 4. Statement of Safety
- **Production `firestore.rules`**: UNCHANGED
- **Production `storage.rules`**: UNCHANGED
