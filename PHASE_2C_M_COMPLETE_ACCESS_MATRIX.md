# Phase 2C-M: Complete Security Access Matrix

## 1. Overview
This access matrix defines the granular permissions across all A0–A9 authority tiers and A3 official staff functional departments for all active Firestore collections in `firestore.rules.phase2c-m`.

Legend:
- **ALLOW**: Full authorized permission within tenant boundaries.
- **DENY**: Strict zero-trust prohibition.
- **CONDITIONAL**: Restricted by specific claims (e.g. `cId`, `rId`, `sId`, `dId`, `employeeId`, or `uid`).

## 2. A0–A9 Matrix across Core Modules

| Module / Collection | A0 Owner | A1 Executive | A2 Gen Manager | A3 Official Staff | A4 Region Mgr | A5 Site Charge | A6 Supervisor | A7–A9 Workforce |
|---|---|---|---|---|---|---|---|---|
| **Users (`/users`)** | READ, UPDATE | READ, UPDATE | READ, UPDATE | CONDITIONAL (Tenant) | CONDITIONAL (Tenant) | CONDITIONAL (Tenant) | CONDITIONAL (Tenant) | CONDITIONAL (Self) |
| **Company Codes (`/company_codes`)** | GET | GET | GET | GET | GET | GET | GET | GET (Public Single) |
| **Employees (`/companies/.../employees`)** | READ, WRITE | READ, WRITE | READ, WRITE | READ, WRITE | CONDITIONAL (`rId`) | CONDITIONAL (`sId`) | CONDITIONAL (`sId`) | CONDITIONAL (Self) |
| **Attendance Logs (`/attendance_logs`)** | READ, WRITE | READ, WRITE | READ, WRITE | READ, WRITE | CONDITIONAL (`rId`) | CONDITIONAL (`sId`) | CONDITIONAL (Muster) | CONDITIONAL (Self) |
| **Payroll (`/companies/.../payroll`)** | READ, WRITE | READ, WRITE | READ, WRITE | CONDITIONAL (`dId == FINANCE`) | DENY | DENY | DENY | CONDITIONAL (Self Slip) |
| **Salary Slips (`/salary_slips`)** | READ, WRITE | READ, WRITE | READ, WRITE | CONDITIONAL (`dId == FINANCE`) | DENY | DENY | DENY | CONDITIONAL (Self) |
| **Leave Requests (`/leave_requests`)** | READ, WRITE | READ, WRITE | READ, WRITE | READ, WRITE | CONDITIONAL (`rId`) | CONDITIONAL (`sId`) | CONDITIONAL (`sId`) | CONDITIONAL (Self) |
| **Inventory (`/inventory`)** | READ, WRITE | READ, WRITE | READ, WRITE | READ, WRITE | READ, WRITE (`rId`) | READ, WRITE (`sId`) | READ, WRITE (`sId`) | READ ONLY |
| **Assets (`/assets`)** | READ, WRITE | READ, WRITE | READ, WRITE | READ, WRITE | READ, WRITE (`rId`) | READ, WRITE (`sId`) | READ, WRITE (`sId`) | CONDITIONAL (Assigned) |
| **Incident Reports (`/incidents`)** | READ, WRITE | READ, WRITE | READ, WRITE | READ, WRITE | CONDITIONAL (`rId`) | CONDITIONAL (`sId`) | CONDITIONAL (`sId`) | CONDITIONAL (Reported) |
| **Visitor Logs (`/visitor_logs`)** | READ, WRITE | READ, WRITE | READ, WRITE | READ, WRITE | CONDITIONAL (`rId`) | CONDITIONAL (`sId`) | CONDITIONAL (`sId`) | DENY |
| **Material Movement (`/material_movement_logs`)** | READ, WRITE | READ, WRITE | READ, WRITE | READ, WRITE | CONDITIONAL (`rId`) | CONDITIONAL (`sId`) | CONDITIONAL (`sId`) | DENY |
| **Billing (`/billing`)** | READ, WRITE | READ, WRITE | READ, WRITE | CONDITIONAL (`dId == FINANCE`) | DENY | DENY | DENY | DENY |
| **Approval Requests (`/approval_requests`)** | READ, WRITE | READ, WRITE | READ, WRITE | READ, WRITE | CONDITIONAL (`rId`) | CONDITIONAL (`sId`) | CONDITIONAL (`sId`) | CONDITIONAL (Self `uid`) |
| **Audit Logs (`/audit_logs`)** | READ | READ | READ | READ (HR/Admin) | DENY | DENY | DENY | DENY |

## 3. A3 Official Staff Functional Department Matrix (`dId`)

| Collection / Subcollection | HR (`HR`) | Finance (`FINANCE`) | Procurement (`PROCUREMENT`) | EHS (`EHS`) | Quality (`QUALITY`) | Admin (`ADMIN`) |
|---|---|---|---|---|---|---|
| `/employees` | FULL READ / WRITE | READ ONLY | READ ONLY | READ ONLY | READ ONLY | FULL READ / WRITE |
| `/payroll` | READ ONLY | FULL READ / WRITE | DENY | DENY | DENY | DENY |
| `/salary_slips` | READ ONLY | FULL READ / WRITE | DENY | DENY | DENY | DENY |
| `/billing` | DENY | FULL READ / WRITE | READ ONLY | DENY | DENY | READ ONLY |
| `/inventory` | READ ONLY | READ ONLY | FULL READ / WRITE | READ ONLY | READ ONLY | FULL READ / WRITE |
| `/vendors` | DENY | READ ONLY | FULL READ / WRITE | DENY | DENY | READ ONLY |
| `/incident_reports` | READ ONLY | DENY | DENY | FULL READ / WRITE | READ ONLY | READ ONLY |
| `/material_movement_logs` | DENY | READ ONLY | READ ONLY | READ ONLY | FULL READ / WRITE | FULL READ / WRITE |
| `/approval_requests` | READ / APPROVE | READ / APPROVE | READ / APPROVE | READ / APPROVE | READ / APPROVE | READ / APPROVE |

## 4. Zero-Trust Enforcement Summary
- **Multi-Tenant Scope**: Strictly checked via `request.auth.token.cId == companyId`.
- **Custom Claim Verification**: Evaluated on server without trusting client request payload fields.
- **Fail-Closed Default**: Any request missing valid token claims (`cId`, `aLvl`) is rejected immediately with `PERMISSION_DENIED`.

---
*No production resources were modified during Phase 2C-M.*
