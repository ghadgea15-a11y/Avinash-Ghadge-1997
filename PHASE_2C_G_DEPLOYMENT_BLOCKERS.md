# Phase 2C-G: Deployment Blockers

## 1. Active Blockers
- **BLOCKER-001 (Legacy Fallback)**: Full deprecation of `LEGACY_TRANSITIONAL` sessions is required before enabling strict claim-based rules in production.
- **BLOCKER-002 (Production Rules Deployment)**: `firestore.rules` draft (`firestore.rules.phase2c-g`) must undergo thorough staging verification before replacing production rules.

## 2. Status
No production deployment occurred. All rules and validations were conducted locally.
