# MASTER_BUSINESS_LOGIC.md

## Overview
This document defines the core business logic, schema specifications, and workflow engines for the operational gaps identified in Phase 2D. It strictly reuses the existing Firestore collections mapped in `FIRESTORE_MASTER_COLLECTIONS.md` and respects the established `QueryScopeEngine` and RBAC security boundaries.

---

## 1. A1 Director / CEO
### Executive KPIs & Organization-wide Metrics
- **Workflow**: Automated aggregation of enterprise-wide health metrics for executive review.
- **Firestore Collection**: `/companies/{company_id}/kpi_snapshots` (NEW) or Virtual/Aggregated on Client from existing collections.
- **Fields**: `date` (Timestamp), `total_active_employees` (Number), `open_incidents` (Number), `total_sla_breaches` (Number), `active_sites` (Number).
- **Statuses**: `PUBLISHED`.
- **Roles/Permissions**: `A0_OWNER`, `A1_DIRECTOR_CEO` (Read). System/Cloud Function (Write).
- **Scope**: Enterprise-wide (`cId`).
- **Approvals**: None (Automated).
- **Queries/Indexes**: `date` (DESC).

---

## 2. A2/A3 Department Dashboards
### Quality, MIS, IT, Commercial, Operations Office
- **Workflow**: Department-specific ticket, audit, and documentation tracking.
- **Firestore Collection**: `/companies/{company_id}/tasks` (for IT/Ops tickets) & `/companies/{company_id}/documents` (for Quality/MIS/Commercial reports).
- **Fields**: `department_tag` (String: "QUALITY", "MIS", "IT", "COMMERCIAL", "OPS"), `title` (String), `status` (String), `assigned_to` (String/UID), `payload` (Map).
- **Statuses/State Machine**: `PENDING` -> `IN_REVIEW` -> `APPROVED` | `REJECTED` | `RESOLVED`.
- **Roles/Permissions**: `QUALITY`, `MIS`, `IT`, `COMMERCIAL`, `OPERATIONS_OFFICE` (Read/Write assigned tags).
- **Scope**: Enterprise or Regional based on user's `aLvl` and `rId`.
- **Approvals**: Department Head signs off (transitions to `APPROVED`/`RESOLVED`).
- **Queries/Indexes**: `department_tag` + `status`.

---

## 3. A5 Site In-Charge
### Complaints Engine
- **Workflow**: Client or staff logs a formal grievance; Site In-Charge triages and resolves.
- **Firestore Collection**: `/companies/{company_id}/incident_reports`
- **Fields**: `type` (String: "COMPLAINT"), `site_id` (String), `reported_by` (String/UID), `description` (String), `sla_deadline` (Timestamp), `status` (String), `resolution_notes` (String).
- **Statuses/State Machine**: `OPEN` -> `IN_PROGRESS` -> `ESCALATED` | `RESOLVED`.
- **Roles/Permissions**: Any (Create), Site In-Charge (Update/Resolve), Manager (Read/Escalate).
- **Scope**: Site-bounded (`sId`).
- **Approvals**: Site In-Charge resolution sign-off.
- **Queries/Indexes**: `site_id` + `type` + `status`.

### Site Inspections Checklist
- **Workflow**: Routine facility observations and compliance checks.
- **Firestore Collection**: `/companies/{company_id}/daily_site_logs`
- **Fields**: `log_type` (String: "INSPECTION"), `site_id` (String), `date` (Timestamp), `inspector_id` (String/UID), `checklist_data` (Array of Maps: `{item, passed, notes}`), `score` (Number), `status` (String).
- **Statuses/State Machine**: `DRAFT` -> `SUBMITTED` -> `REVIEWED`.
- **Roles/Permissions**: Supervisor/Site In-Charge (Write), Manager (Read/Review).
- **Scope**: Site-bounded (`sId`).
- **Approvals**: Area Manager review (transitions to `REVIEWED`).
- **Queries/Indexes**: `site_id` + `log_type` + `date`.

### SLA Monitors
- **Workflow**: Tracking operations against contractual deadlines.
- **Firestore Collection**: Virtual (Derived from `/tasks` and `/incident_reports` where `sla_deadline` exists).
- **Statuses/State Machine**: `ON_TRACK` -> `AT_RISK` -> `BREACHED`.
- **Scope**: Site-bounded (`sId`).
- **Queries/Indexes**: `site_id` + `sla_deadline` (ASC) + `status` (excluding closed states).

---

## 4. A6 Supervisor
### Shift Handover Register
- **Workflow**: Outgoing supervisor transfers authority, inventory, and notes to incoming supervisor.
- **Firestore Collection**: `/companies/{company_id}/daily_site_logs`
- **Fields**: `log_type` (String: "HANDOVER"), `site_id` (String), `date` (Timestamp), `outgoing_supervisor_id` (String), `incoming_supervisor_id` (String), `inventory_status` (Map), `notes` (String), `status` (String).
- **Statuses/State Machine**: `INITIATED` -> `ACCEPTED` | `DISPUTED`.
- **Roles/Permissions**: Supervisor (Write).
- **Scope**: Site-bounded (`sId`).
- **Approvals**: Incoming supervisor must accept (transitions to `ACCEPTED`).
- **Queries/Indexes**: `site_id` + `log_type` + `status`.

### Safety Observations (BBS)
- **Workflow**: Logging unsafe behaviors or conditions proactively (Behavior-Based Safety).
- **Firestore Collection**: `/companies/{company_id}/incident_reports`
- **Fields**: `type` (String: "BBS_OBSERVATION"), `site_id` (String), `behavior_category` (String), `description` (String), `action_taken` (String), `status` (String).
- **Statuses/State Machine**: `RECORDED` -> `ACTION_REQUIRED` -> `CLOSED`.
- **Roles/Permissions**: Supervisor (Write), EHS/Manager (Read/Review).
- **Scope**: Site-bounded (`sId`).
- **Approvals**: EHS Officer review for critical observations.
- **Queries/Indexes**: `site_id` + `type` + `status`.

### Team Productivity Tracker
- **Workflow**: Real-time ratio of tasks completed vs. assigned per shift.
- **Firestore Collection**: Virtual (Aggregated from `/tasks` bounded by current shift `date`).
- **Scope**: Site-bounded (`sId`).

---

## 5. A5/A6 (Assigner) & A7-A9 (Assignee)
### Task Allocation & Work Completion
- **Workflow**: Supervisor assigns task -> Ground staff performs work & uploads proof -> Supervisor verifies.
- **Firestore Collection**: `/companies/{company_id}/tasks`
- **Fields**: `site_id` (String), `assigned_to` (String/UID), `created_by` (String/UID), `title` (String), `description` (String), `due_date` (Timestamp), `completion_notes` (String), `photo_url` (String), `status` (String).
- **Statuses/State Machine**: `TODO` -> `IN_PROGRESS` -> `PENDING_VERIFICATION` -> `COMPLETED` | `CANCELLED`.
- **Roles/Permissions**: Supervisor (Create/Assign/Verify), Ground Staff (Read Own/Update to `PENDING_VERIFICATION`).
- **Scope**: Site-bounded (`sId`). Ground Staff is bounded by `assigned_to == employeeId`.
- **Approvals**: Supervisor verification (transitions `PENDING_VERIFICATION` -> `COMPLETED`).
- **Queries/Indexes**: `site_id` + `assigned_to` + `status`.

### Supervisor Instructions
- **Workflow**: Top-down communication to shift workers.
- **Firestore Collection**: `/companies/{company_id}/announcements`
- **Fields**: `target_audience` (String: e.g., "SITE_SIT-001"), `message` (String), `priority` (String: "NORMAL", "URGENT"), `created_by` (String/UID), `expires_at` (Timestamp).
- **Statuses/State Machine**: `ACTIVE` -> `EXPIRED`.
- **Roles/Permissions**: Supervisor/Site In-Charge (Write), Ground Staff (Read).
- **Scope**: Site-bounded (`target_audience == site_id`).
- **Approvals**: None.
- **Queries/Indexes**: `target_audience` + `expires_at`.
