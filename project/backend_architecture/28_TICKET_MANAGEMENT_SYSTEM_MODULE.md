# LOG SHEET MUSTER — PHASE 27: ENTERPRISE TICKET MANAGEMENT SYSTEM MODULE (100% COMPLETE)

Enterprise-grade, production-ready Ticket Management System for Log Sheet Muster. Extends beyond HR to manage internal support tickets, site operations complaints, asset/equipment maintenance tickets, and security incident escalations with a configurable Priority Matrix, SLA tracking, multi-tier assignment, and automated resolution workflows.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All Ticket Management collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/systemTickets/{ticketId}
/companies/{cid}/systemTicketLogs/{logId}
/companies/{cid}/ticketPriorityMatrix/{matrixId}
```

### 1.1 `systemTickets` (Operational & Internal Support Tickets)
Primary document for managing operational complaints, IT/facility support requests, and site issue tickets.
* **Path:** `/companies/{companyId}/systemTickets/{ticketId}`
* **Document ID:** `TKT-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `ticketId` | String | Yes | Unique Ticket ID |
| `companyId` | String | Yes | Tenant isolation key |
| `ticketNumber` | String | Yes | Human-readable ID e.g., `TKT-20260726-0042` |
| `ticketType` | String | Yes | Enum: `'INTERNAL_SUPPORT' \| 'CLIENT_COMPLAINT' \| 'SITE_OPERATIONS' \| 'ASSET_MAINTENANCE' \| 'SECURITY_INCIDENT'` |
| `category` | String | Yes | E.g., `"UNIFORM_DEFECT"`, `"BIOMETRIC_OFFLINE"`, `"VEHICLE_BREAKDOWN"`, `"CLIENT_ESCALATION"` |
| `impact` | String | Yes | Enum: `'LOW' \| 'MEDIUM' \| 'HIGH' \| 'CRITICAL'` |
| `urgency` | String | Yes | Enum: `'LOW' \| 'MEDIUM' \| 'HIGH' \| 'CRITICAL'` |
| `priority` | String | Yes | Calculated from Impact x Urgency: `'P1_CRITICAL' \| 'P2_HIGH' \| 'P3_MEDIUM' \| 'P4_LOW'` |
| `subject` | String | Yes | Ticket title |
| `description` | String | Yes | Detailed problem description |
| `branchId` | String | Yes | Branch ID |
| `siteId` | String | Optional | Associated Site ID if applicable |
| `reportedByUserId` | String | Yes | User ID of reporter |
| `assignedDepartment` | String | Yes | Enum: `'OPERATIONS' \| 'IT_SUPPORT' \| 'ASSET_ADMIN' \| 'ACCOUNTS' \| 'SAFETY'` |
| `assignedToUserId` | String | Optional | Designated resolver User ID |
| `status` | String | Yes | Enum: `'OPEN' \| 'ASSIGNED' \| 'IN_PROGRESS' \| 'PENDING_VENDOR' \| 'RESOLVED' \| 'CLOSED' \| 'REOPENED'` |
| `slaDueDate` | Timestamp | Yes | Calculated target resolution timestamp |
| `isSlaBreached` | Boolean | Yes | Flag indicating if SLA was missed |
| `escalationLevel` | Number | Yes | Default: `0` (Level 0 = Specialist, 1 = Lead, 2 = Branch Head, 3 = VP) |
| `resolutionDetails` | String | Optional | Resolution summary provided upon fix |
| `rootCause` | String | Optional | Root cause analysis classification |
| `satisfactionScore` | Number | Optional | Rating 1 to 5 provided upon closure |
| `attachmentFileIds` | Array<String> | Optional | Attachments from Storage Module |
| `createdAt` | Timestamp | Yes | Creation timestamp |
| `updatedAt` | Timestamp | Yes | Last update timestamp |
| `closedAt` | Timestamp | Optional | Closure timestamp |

### 1.2 `systemTicketLogs` (Audit & Activity Timeline)
Tracks every state change, re-assignment, comment, attachment addition, or SLA escalation for complete operational transparency.
* **Path:** `/companies/{companyId}/systemTicketLogs/{logId}`
* **Document ID:** `TKTLOG-{ticketId}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `logId` | String | Yes | Unique Log ID |
| `companyId` | String | Yes | Tenant isolation key |
| `ticketId` | String | Yes | Reference to `systemTickets` |
| `actorUserId` | String | Yes | User ID who performed the action |
| `action` | String | Yes | Enum: `'CREATED' \| 'ASSIGNED' \| 'STATUS_CHANGED' \| 'COMMENTED' \| 'ESCALATED' \| 'RESOLVED' \| 'REOPENED'` |
| `previousStatus` | String | Optional | Prior ticket status |
| `newStatus` | String | Optional | Updated ticket status |
| `notes` | String | Optional | Comment or reason for change |
| `attachmentFileIds` | Array<String> | Optional | Uploaded files |
| `createdAt` | Timestamp | Yes | Timestamp of log entry |

### 1.3 `ticketPriorityMatrix` (Matrix Configuration)
Maps combinations of `impact` and `urgency` to assigned `priority` levels and SLA resolution targets in hours.
* **Path:** `/companies/{companyId}/ticketPriorityMatrix/{matrixId}`
* **Document ID:** `PRIO-MATRIX`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `matrixId` | String | Yes | `PRIO-MATRIX` |
| `companyId` | String | Yes | Tenant isolation key |
| `p1ResolutionHours` | Number | Yes | E.g. `2` hours for Critical |
| `p2ResolutionHours` | Number | Yes | E.g. `8` hours for High |
| `p3ResolutionHours` | Number | Yes | E.g. `24` hours for Medium |
| `p4ResolutionHours` | Number | Yes | E.g. `72` hours for Low |
| `autoAssignmentRules` | Map | Yes | Department auto-assignment mapping rules |
| `updatedAt` | Timestamp | Yes | Last updated timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

### 2.1 Priority Calculation & Auto-Assignment
1. When a ticket is created with `impact` and `urgency`, the backend evaluates the Priority Matrix:
   * `CRITICAL + CRITICAL` -> `P1_CRITICAL` (SLA: 2 Hours)
   * `HIGH + HIGH` -> `P2_HIGH` (SLA: 8 Hours)
   * `MEDIUM + MEDIUM` -> `P3_MEDIUM` (SLA: 24 Hours)
   * `LOW + LOW` -> `P4_LOW` (SLA: 72 Hours)
2. `slaDueDate` is automatically computed as `now() + resolutionHours`.
3. Auto-routes ticket based on `assignedDepartment` and branch location.

### 2.2 Escalation Matrix & SLA Monitoring
1. Automated Cloud Scheduler checks open `systemTickets` every 15 minutes.
2. If `now() > slaDueDate` and `status` is not `RESOLVED` or `CLOSED`:
   * `isSlaBreached` is set to `true`.
   * `escalationLevel` is incremented.
   * Ticket is re-assigned to the next escalation tier (e.g. Branch Manager or Operations Head).
   * High-priority alert notification sent via Notification Engine (Phase 15).

### 2.3 Resolution & Quality Assurance Workflow
1. Resolver submits `resolutionDetails` and sets `status = RESOLVED`.
2. Reporter receives notification and can accept (transitions to `CLOSED` with optional `satisfactionScore`) or reject (transitions to `REOPENED` with escalation).

---

## 3. FIRESTORE SECURITY RULES (TICKET MANAGEMENT SYSTEM)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{cid} {
      match /systemTickets/{ticketId} {
        allow read: if sameCompany(cid) && (
          opsTier() || 
          resource.data.reportedByUserId == request.auth.uid ||
          resource.data.assignedToUserId == request.auth.uid
        );
        allow create: if sameCompany(cid) && isSignedIn();
        allow update: if sameCompany(cid) && (
          opsTier() || 
          resource.data.reportedByUserId == request.auth.uid ||
          resource.data.assignedToUserId == request.auth.uid
        );
      }

      match /systemTicketLogs/{logId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow create: if sameCompany(cid) && isSignedIn();
        allow update, delete: if false; // Immutable audit log
      }

      match /ticketPriorityMatrix/{matrixId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow write: if sameCompany(cid) && mgmtTier();
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (TICKET MANAGEMENT SYSTEM)

```json
{
  "indexes": [
    {
      "collectionGroup": "systemTickets",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "assignedDepartment", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "systemTickets",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "slaDueDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "systemTicketLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "ticketId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

**End of Phase 27: Enterprise Ticket Management System Module (100% Complete).**
