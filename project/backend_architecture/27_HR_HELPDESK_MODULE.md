# LOG SHEET MUSTER — PHASE 26: ENTERPRISE HR HELPDESK MODULE (100% COMPLETE)

Enterprise-grade, production-ready HR Helpdesk Module for Log Sheet Muster. Provides employees with a structured ticketing system to submit HR queries (payroll discrepancies, PF/ESIC issues, document requests, grievances), backed by SLA tracking, escalation workflows, resolution histories, and automated notifications.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All HR Helpdesk collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/hrTickets/{ticketId}
/companies/{cid}/hrTicketComments/{commentId}
/companies/{cid}/hrSlaConfigs/{configId}
```

### 1.1 `hrTickets` (Employee Query & Issue Tickets)
Core ticketing document tracking employee HR inquiries, status, SLA deadlines, and resolution metadata.
* **Path:** `/companies/{companyId}/hrTickets/{ticketId}`
* **Document ID:** `HRT-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `ticketId` | String | Yes | Unique Ticket ID |
| `companyId` | String | Yes | Tenant isolation key |
| `employeeId` | String | Yes | Reference to Employee raising the query |
| `branchId` | String | Yes | Branch isolation |
| `category` | String | Yes | Enum: `'PAYROLL_QUERY' \| 'PF_ESIC' \| 'LEAVE_DISCREPANCY' \| 'DOCUMENT_REQUEST' \| 'GRIEVANCE' \| 'OTHER'` |
| `priority` | String | Yes | Enum: `'LOW' \| 'MEDIUM' \| 'HIGH' \| 'URGENT'` |
| `subject` | String | Yes | Short summary of issue |
| `description` | String | Yes | Detailed explanation |
| `attachmentFileIds` | Array<String> | Optional | File attachment IDs (Storage Module) |
| `status` | String | Yes | Enum: `'OPEN' \| 'IN_PROGRESS' \| 'PENDING_EMPLOYEE' \| 'ESCALATED' \| 'RESOLVED' \| 'CLOSED'` |
| `assignedToUserId` | String | Optional | HR Executive / Manager User ID |
| `slaDueDate` | Timestamp | Yes | Computed deadline based on priority SLA |
| `isSlaBreached` | Boolean | Yes | True if resolution exceeded `slaDueDate` |
| `escalationLevel` | Number | Yes | Default: `0` (Level 0 = HR Exec, 1 = HR Mgr, 2 = HR Head) |
| `resolutionSummary` | String | Optional | Final answer or resolution provided |
| `satisfactionRating` | Number | Optional | 1 to 5 scale feedback rating from employee |
| `createdAt` | Timestamp | Yes | Creation timestamp |
| `updatedAt` | Timestamp | Yes | Last status or assignment update |

### 1.2 `hrTicketComments` (Conversation Thread & Internal Notes)
Conversation history between employee and HR staff, including support for internal HR-only notes.
* **Path:** `/companies/{companyId}/hrTicketComments/{commentId}`
* **Document ID:** `HRTC-{ticketId}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `commentId` | String | Yes | Unique Comment ID |
| `companyId` | String | Yes | Tenant isolation key |
| `ticketId` | String | Yes | Reference to parent `hrTickets` |
| `authorUserId` | String | Yes | User ID of author (Employee or HR) |
| `authorRole` | String | Yes | Enum: `'EMPLOYEE' \| 'HR_EXEC' \| 'HR_MANAGER'` |
| `message` | String | Yes | Comment body |
| `attachmentFileIds` | Array<String> | Optional | Attachments linked to this comment |
| `isInternalNote` | Boolean | Yes | True if private note visible only to HR staff |
| `createdAt` | Timestamp | Yes | Timestamp |

### 1.3 `hrSlaConfigs` (Service Level Agreement Rules)
Configurable resolution timeframes based on ticket category and priority.
* **Path:** `/companies/{companyId}/hrSlaConfigs/{configId}`
* **Document ID:** `HRSLA-{category}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `configId` | String | Yes | E.g. `HRSLA-PAYROLL_QUERY` |
| `companyId` | String | Yes | Tenant isolation key |
| `category` | String | Yes | Category matching `hrTickets.category` |
| `lowPriorityHours` | Number | Yes | E.g. `72` |
| `mediumPriorityHours` | Number | Yes | E.g. `48` |
| `highPriorityHours` | Number | Yes | E.g. `24` |
| `urgentPriorityHours` | Number | Yes | E.g. `6` |
| `autoEscalateHours` | Number | Yes | Hours after breach before auto-escalation |
| `updatedAt` | Timestamp | Yes | Config updated timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

### 2.1 Ticket Lifecycle & SLA Calculation
1. Employee submits an `hrTicket` via Employee Self Service (Phase 25).
2. The system fetches `hrSlaConfigs` for the chosen category and computes `slaDueDate = createdAt + priorityHours`.
3. Auto-routes ticket to branch HR Executive or unassigned branch pool.
4. Notifications are dispatched to the assigned HR staff.

### 2.2 Escalation Workflow
1. A scheduled Cloud Function monitors open tickets where `now() > slaDueDate` and `isSlaBreached == false`.
2. Sets `isSlaBreached = true` and increments `escalationLevel = escalationLevel + 1`.
3. Re-assigns or alerts higher-tier HR Managers/HR Head.
4. Triggers an urgent notification in the Notification Engine (Phase 15).

### 2.3 Ticket Resolution & Closure
1. HR staff post resolution notes and mark status as `RESOLVED`.
2. Employee is notified to confirm or reopen within 48 hours.
3. Upon closure, employee can rate satisfaction (`1-5`).

---

## 3. FIRESTORE SECURITY RULES (HR HELPDESK)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper check
    function isHrTier() { return roleAtLeast(['companyOwner','admin','hr']); }

    match /companies/{cid} {
      match /hrTickets/{ticketId} {
        allow read: if sameCompany(cid) && (isHrTier() || (isEmployeeUser() && matchesEmployeeId(cid, resource.data.employeeId)));
        allow create: if sameCompany(cid) && isEmployeeUser() && matchesEmployeeId(cid, request.resource.data.employeeId);
        allow update: if sameCompany(cid) && (isHrTier() || (isEmployeeUser() && matchesEmployeeId(cid, resource.data.employeeId)));
      }

      match /hrTicketComments/{commentId} {
        allow read: if sameCompany(cid) && (
          isHrTier() || 
          (resource.data.isInternalNote == false && isEmployeeUser())
        );
        allow create: if sameCompany(cid) && (
          isHrTier() || 
          (request.resource.data.isInternalNote == false && isEmployeeUser())
        );
      }

      match /hrSlaConfigs/{configId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow write: if sameCompany(cid) && mgmtTier();
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (HR HELPDESK)

```json
{
  "indexes": [
    {
      "collectionGroup": "hrTickets",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "employeeId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "hrTickets",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "slaDueDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "hrTicketComments",
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

**End of Phase 26: Enterprise HR Helpdesk Module (100% Complete).**
