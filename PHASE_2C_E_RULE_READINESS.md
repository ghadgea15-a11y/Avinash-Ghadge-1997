# Phase 2C-E: Firestore Security Rules Readiness Audit

## 1. Overview
This document audits the readiness of existing Firestore collections for future claim-backed security rules enforcement (`request.auth.token.cId`, `request.auth.token.aLvl`, etc.).

## 2. A0-A9 Authority Scope Matrix
- **A0_OWNER / A1_DIRECTOR_CEO / A2_GENERAL_MANAGER / A3_OFFICIAL_STAFF**: Company-wide access (where `request.auth.token.cId == resource.data.companyId`).
- **A4_REGIONAL_AREA_MANAGER**: Regional scope (`request.auth.token.rId == resource.data.assignedRegionId`).
- **A5_SITE_IN_CHARGE / A6_SUPERVISOR**: Site scope (`request.auth.token.sId == resource.data.assignedSiteId`).
- **A7_SKILLED / A8_SEMI_SKILLED / A9_SUPPORT**: Self scope (`request.auth.uid == resource.data.authUid` or `request.auth.token.employeeId == resource.data.employeeId`).

## 3. Sensitive Collections Audit
1. `employees`: Restricted to company HR/Admin and self/supervisor.
2. `attendance_logs`: Writable by Supervisors (`A6`) for site workers; readable by site/region managers.
3. `payroll`: Restricted to `A3_OFFICIAL_STAFF` (Finance/HR) and `A0-A2`.
4. `leave_requests`: Employee-initiated, supervisor/HR approved.
5. `approval_requests`: Role-gated by authority level.

## 4. Exact Files Requiring Changes Before Rules Deployment
- `firestore.rules` (to be authored and deployed in future Phase 2C-E/F after client rollout stabilization).
