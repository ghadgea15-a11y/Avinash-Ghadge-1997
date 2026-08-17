# Blockers & Schema Gaps

## 1. Identified Schema Gaps
- **Region ID propagation**: Some operational documents in legacy collections may lack `assignedRegionId`, requiring future backfilling or dynamic traversal.
- **Functional Staff Claims**: Fine-grained distinction within `A3_OFFICIAL_STAFF` (HR vs. Finance vs. EHS) relies on department identifiers (`dId`), which should be standardized across all tenant profiles.

## 2. Status
Read-only review completed. No production database or rule mutations performed.
