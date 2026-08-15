# Phase 2C-G: Rule Gaps

## 1. Identified Schema Gaps
- **Functional Role Claims**: While `dId` (departmentId) is available in claims, fine-grained sub-department permissions (e.g., HR vs. Finance within A3) may require explicit functional entitlement arrays in claims if department codes vary across tenants.
- **Region ID Propagation**: Ensure all operational documents include `assignedRegionId` alongside `siteId` to support efficient A4 regional queries.
