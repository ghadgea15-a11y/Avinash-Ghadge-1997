# Phase 2C-F.1: Production Deployment Blockers

| ID | Severity | Description | Mitigation |
|---|---|---|---|
| **BLOCKER-001** | CRITICAL | Legacy `SESSION-*` PIN fallback bypasses Firebase Auth session validation. | Phase out transitional fallback once Custom Token deployment is fully verified in staging. |
| **BLOCKER-002** | HIGH | Firestore rules (`firestore.rules`) are currently tenant/membership based and do not yet enforce granular A0-A9 custom claims (`aLvl`, `sId`, `rId`). | Deploy claim-validated Firestore rules (`firestore.rules.phase2c-g.draft`) after final staging verification. |
| **BLOCKER-003** | MEDIUM | A3 Official Staff functional permissions require fine-grained module entitlement checks beyond basic authority level. | Implement functional role claim mapping in Cloud Functions. |
