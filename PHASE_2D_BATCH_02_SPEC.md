# PHASE 2D-BATCH-02: BUSINESS LOGIC GAP SPECIFICATION

## Overview
An exhaustive audit of the master documentation (`FIRESTORE_MASTER_COLLECTIONS.md`, `ARCHITECTURE.md`, `FIREBASE_ARCHITECTURE.md`) was conducted to define missing workflows for dashboards A1–A9. The requested master logic documents (`MASTER_BUSINESS_LOGIC.md`, `MASTER_DATABASE_DICTIONARY.md`, `MASTER_WORKFLOW_ENGINE.md`, `MASTER_PROJECT_RULES.md`, `MASTER_FIREBASE_STANDARDS.md`) **DO NOT EXIST** in the current project repository.

Therefore, any workflow lacking explicit schema definitions, approval flows, fields, or permissions in the available master documentation has been strictly classified as **BUSINESS LOGIC REQUIRED**.

---

## 1. A1 Director / CEO Dashboard
### Gaps: Executive KPIs, Organization-wide metrics
- **Workflow**: Executive Dashboard Aggregation.
- **Collection**: N/A
- **Fields**: N/A
- **Roles & Permissions**: A0_OWNER, A1_DIRECTOR_CEO.
- **Scope**: Enterprise-wide (`sameCompany(cId)`).
- **Status**: **BUSINESS LOGIC REQUIRED**.
- **Reason**: There is no defined KPI schema, aggregation engine specification, or target collections for metrics such as profitability, overall SLA compliance, or enterprise attrition in the master database dictionary.

---

## 2. A2/A3 Official & Corporate Dashboards
### Gaps: Quality / MIS / IT / Commercial / Operations Office
- **Workflow**: Department-specific data processing.
- **Collection**: N/A
- **Fields**: N/A
- **Roles & Permissions**: QUALITY, MIS, IT, COMMERCIAL.
- **Scope**: Enterprise / Regional depending on role.
- **Status**: **BUSINESS LOGIC REQUIRED**.
- **Reason**: `FIRESTORE_MASTER_COLLECTIONS.md` defines generic `documents` and `contracts`, but there is zero business logic defined for Quality Audits, IT Helpdesk Tickets (differentiated from site maintenance), or MIS reporting structures. 

---

## 3. A5 Site In-Charge Dashboard
### Gap 1: Complaints Engine
- **Workflow**: Undefined.
- **Collection**: Partially maps to `/companies/{company_id}/incident_reports`.
- **Status**: **BUSINESS LOGIC REQUIRED**. We lack the exact fields, approval flows, resolution SLA times, and specialized RBAC permissions required for formal complaint management as opposed to standard safety incidents.

### Gap 2: Work Status Tracker
- **Workflow**: Task Lifecycle Management.
- **Collection**: `/companies/{company_id}/tasks`
- **Fields**: `site_id`, `status`, `assigned_to`. (Further schema details missing).
- **Roles & Permissions**: Any Employee (Write), Assigned Worker (Update), Manager (Read).
- **Queries/Indexes**: `site_id` + `status` + `assigned_to`.
- **Scope**: Site-bounded (`sId`).
- **Status**: **PARTIALLY FUNCTIONAL** (Schema exists but specific UI fields/approval flows are undocumented). **BUSINESS LOGIC REQUIRED** for the exact state machine and transitions.

### Gap 3: Site Inspection Checklists
- **Workflow**: Routine observation logging.
- **Collection**: `/companies/{company_id}/daily_site_logs`
- **Fields**: `site_id`, `date`, `checklist_data` (exact structure undefined).
- **Roles & Permissions**: Supervisor (Write), Manager (Read).
- **Queries/Indexes**: `site_id` + `date`.
- **Scope**: Site-bounded (`sId`).
- **Status**: **BUSINESS LOGIC REQUIRED**. The structure of the checklists, scoring mechanics, and required questions are undefined.

### Gap 4: SLA Monitors
- **Status**: **BUSINESS LOGIC REQUIRED**. No operational SLA tracking schemas exist beyond generic contract file structures (`/companies/{company_id}/contracts`).

---

## 4. A6 Supervisor Dashboard
### Gap 1: Daily Task Allocation
- **Workflow**: Task Assignment.
- **Collection**: `/companies/{company_id}/tasks`
- **Roles**: Supervisor (Create/Assign), Ground Staff (Update).
- **Queries/Indexes**: `site_id`, `assigned_to`, `status`.
- **Status**: **BUSINESS LOGIC REQUIRED** (Specific task types, priority levels, and assignment UI flows are not defined).

### Gap 2: Shift Handover Register
- **Status**: **BUSINESS LOGIC REQUIRED**. No schema exists in `FIRESTORE_MASTER_COLLECTIONS.md` for handovers, inventory transfer per shift, or digital sign-offs.

### Gap 3: Safety Observations (BBS)
- **Status**: **BUSINESS LOGIC REQUIRED**. Unclear if this uses `incident_reports`, `daily_site_logs`, or requires a new `safety_observations` schema. Behavior-Based Safety fields are entirely undefined.

### Gap 4: Team Productivity Tracker
- **Status**: **BUSINESS LOGIC REQUIRED**. No productivity metrics calculation rules exist.

---

## 5. A7–A9 Ground Workforce Dashboards
### Gap: Assigned Tasks & Work Completion
- **Workflow**: Viewing and closing assigned work.
- **Collection**: `/companies/{company_id}/tasks`
- **Fields**: `site_id`, `status`, `assigned_to`.
- **Roles**: Employee (Read Own, Update Status).
- **Scope**: Employee-bounded (`employeeId == assigned_to`).
- **Queries/Indexes**: `assigned_to` + `status`.
- **Status**: **BUSINESS LOGIC REQUIRED**. State definitions for "In Progress", "Blocked", "Completed", and photo-proof requirements are undefined.

### Gap: Supervisor Instructions
- **Workflow**: Top-down communication.
- **Collection**: `/companies/{company_id}/announcements`
- **Fields**: `target_audience`, `created_at`.
- **Roles**: HR/Admin/Supervisor (Write), All Employees (Read).
- **Status**: **BUSINESS LOGIC REQUIRED**. Unclear how audience targeting maps to specific shift workers versus all site workers.

---
## Conclusion
All gaps specified by the user lack fundamental schema structures, state machines, and approval flows in the current master repository. The system is structurally prepared (via `QueryScopeEngine` and RBAC), but implementing these features would require fabricating undocumented business logic, which violates the strict Phase 2 continuation rules.
