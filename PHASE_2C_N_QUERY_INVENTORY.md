# PHASE 2C-N — FIRESTORE QUERY INVENTORY & SCOPING AUDIT

**Target Environment**: Local / Emulator Validation  
**Firebase Project**: `log-sheet-af97a`  
**Status**: COMPLETE (Code & Scoping Alignment Verified)

---

## 1. Executive Summary

This inventory maps all Firestore query patterns across the Web application service layer (`QueryScopeEngine.ts`, `FirestoreService.ts`) and Android repositories against the Phase 2C-M claim-based security rules. Every query enforces tenant isolation (`companyId`) and authority-level scoping (`A0`-`A8`).

---

## 2. Collection Query Inventory & Scoping Matrix

| Collection Path | Scoping Engine Method | Authority Scoping Applied | Query Constraints (`where` clauses) | Security Rules Alignment |
|---|---|---|---|---|
| `companies/{cId}/employees` | `buildScope('EMPLOYEES')` | A0-A3: Global Company<br>A4: Regional (`assignedRegionId`)<br>A5-A6: Site (`assignedSiteId`)<br>A7-A8: Self (`authUid`) | `companyId == cId`<br>`assignedRegionId == rId`<br>`assignedSiteId == sId` | Aligned with `firestore.rules.phase2c-m` |
| `companies/{cId}/attendance` | `buildScope('ATTENDANCE')` | A0-A3: Global Company<br>A4: Regional (`assignedRegionId`)<br>A5-A6: Site (`assignedSiteId`)<br>A7-A8: Self (`employeeId`) | `companyId == cId`<br>`assignedRegionId == rId`<br>`assignedSiteId == sId`<br>`employeeId == eId` | Aligned with `firestore.rules.phase2c-m` |
| `companies/{cId}/incidents` | `buildScope('INCIDENTS')` | A0-A3: Global Company<br>A4: Regional (`assignedRegionId`)<br>A5-A6: Site (`assignedSiteId`)<br>A7-A8: Self (`reportedById`) | `companyId == cId`<br>`assignedRegionId == rId`<br>`assignedSiteId == sId`<br>`reportedById == uId` | Aligned with `firestore.rules.phase2c-m` |
| `companies/{cId}/visitors` | `buildScope('VISITORS')` | A0-A3: Global Company<br>A4: Regional (`assignedRegionId`)<br>A5-A6: Site (`assignedSiteId`) | `companyId == cId`<br>`assignedRegionId == rId`<br>`assignedSiteId == sId` | Aligned with `firestore.rules.phase2c-m` |
| `companies/{cId}/materials` | `buildScope('MATERIALS')` | A0-A3: Global Company<br>A4: Regional (`assignedRegionId`)<br>A5-A6: Site (`assignedSiteId`) | `companyId == cId`<br>`assignedRegionId == rId`<br>`assignedSiteId == sId` | Aligned with `firestore.rules.phase2c-m` |
| `companies/{cId}/leaves` | `buildScope('LEAVES')` | A0-A3: Global Company<br>A4: Regional (`assignedRegionId`)<br>A5-A6: Site (`assignedSiteId`)<br>A7-A8: Self (`employeeId`) | `companyId == cId`<br>`assignedRegionId == rId`<br>`assignedSiteId == sId`<br>`employeeId == eId` | Aligned with `firestore.rules.phase2c-m` |
| `companies/{cId}/assets` | `buildScope('ASSETS')` | A0-A3: Global Company<br>A4: Regional (`assignedRegionId`)<br>A5-A6: Site (`assignedSiteId`) | `companyId == cId`<br>`assignedRegionId == rId`<br>`assignedSiteId == sId` | Aligned with `firestore.rules.phase2c-m` |
| `companies/{cId}/patrols` | Direct query | A5-A6: Site (`siteId`) | `companyId == cId`<br>`siteId == sId` | Aligned with `firestore.rules.phase2c-m` |
| `companies/{cId}/checkpoints` | Direct query | A5-A6: Site (`siteId`) | `companyId == cId`<br>`siteId == sId` | Aligned with `firestore.rules.phase2c-m` |
| `companies/{cId}/shifts` | Direct query | A0-A3: Company level | `companyId == cId` | Aligned with `firestore.rules.phase2c-m` |
| `companies/{cId}/approval_requests` | Direct query | A0-A3: Company level | `companyId == cId` | Aligned with `firestore.rules.phase2c-m` |
| `companies/{cId}/vendors` | Direct query | A0-A3: Company level | `companyId == cId` | Aligned with `firestore.rules.phase2c-m` |
| `company_codes/{cId}` | Public lookup | Public read for registration code validation | Document ID lookup | Read permitted for unauthenticated code verification |

---

## 3. Scoping Engine Verification

1. **A0 - A3 (Global Authority)**: `QueryScopeEngine` returns zero extra filters beyond company boundaries, allowing broad company-wide visibility.
2. **A4 (Regional Authority)**: Constrains queries to `assignedRegionId == userSession.assignedRegionId`.
3. **A5 - A6 (Site Authority)**: Constrains queries to `assignedSiteId == userSession.assignedSiteId`.
4. **A7 - A8 (Individual Authority)**: Constrains queries to `employeeId` or `reportedById` matching current authenticated user.

---

## 4. Query & Security Rules Compatibility Summary

- Zero un-scoped queries remain in the application layer.
- All real-time snapshot listeners pass exact matching `where` clauses to satisfy rule constraints.
- Multi-tenant boundary checks strictly require matching custom claim `cId`.
