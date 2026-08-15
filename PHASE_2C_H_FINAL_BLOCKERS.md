# Phase 2C-H: Final Blockers

## 1. Active Production Blockers
| ID | Severity | Description | Resolution Path |
|---|---|---|---|
| **BLOCKER-001** | CRITICAL | Legacy `SESSION-*` fallback active in client code. | Deprecate and remove legacy PIN fallback once 100% of staging clients successfully adopt Custom Tokens. |
| **BLOCKER-002** | HIGH | Production `firestore.rules` currently uses membership checks rather than strict A0–A9 claims (`aLvl`, `sId`, `rId`). | Deploy `firestore.rules.phase2c-g` to production after staging verification. |

## 2. Statement
No production resources were modified during Phase 2C-H.
