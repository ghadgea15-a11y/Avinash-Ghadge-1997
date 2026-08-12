# LOG SHEET MUSTER — PHASE 23: ENTERPRISE CLIENT PORTAL MODULE (100% COMPLETE)

Enterprise-grade, production-ready Client Portal Module for Log Sheet Muster. This module provides a dedicated, secure interface for clients to view attendance, manage contracts, access invoices, and raise service requests/complaints.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All Client Portal collections are multi-tenant and strictly isolated under `/companies/{companyId}/`. Existing collections (Invoices, Contracts, Sites) are reused with scoped RBAC.

```
/companies/{cid}/clientServiceRequests/{requestId}
/companies/{cid}/clientComplaints/{complaintId}
```

### 1.1 RBAC Extension: Client Users
Client login utilizes the core authentication system, but assigns users a specific `clientUser` role mapped to their company and client organization.
* **Path:** `/companies/{companyId}/users/{userId}` (Existing Collection)
* **Client-Specific Fields:**
  * `role`: `'clientUser'`
  * `clientId`: `String` (Links to `/companies/{cid}/clients/{clientId}`)
  * `allowedSiteIds`: `Array<String>` (Optional: Restrict access to specific sites)

### 1.2 `clientServiceRequests` (Additional Manpower / Service Modifications)
Clients can request ad-hoc guard deployments, temporary events, or changes in service scope.
* **Path:** `/companies/{companyId}/clientServiceRequests/{requestId}`
* **Document ID:** `SRQ-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `requestId` | String | Yes | Unique Request ID |
| `companyId` | String | Yes | Tenant isolation key |
| `clientId` | String | Yes | Reference to Client |
| `siteId` | String | Yes | Reference to Site |
| `requestedByUserId` | String | Yes | Client User ID |
| `requestType` | String | Yes | Enum: `'AD_HOC_MANPOWER' \| 'SCOPE_CHANGE' \| 'EQUIPMENT' \| 'OTHER'` |
| `description` | String | Yes | Details of the request |
| `status` | String | Yes | Enum: `'PENDING' \| 'REVIEWING' \| 'APPROVED' \| 'REJECTED' \| 'FULFILLED'` |
| `targetDate` | Timestamp | Optional | Date service is needed |
| `assignedToUserId` | String | Optional | Internal Ops Manager ID |
| `createdAt` | Timestamp | Yes | Creation timestamp |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

### 1.3 `clientComplaints` (Incident / Grievance Reporting)
Clients can log complaints regarding guard performance, uniform issues, or process violations.
* **Path:** `/companies/{companyId}/clientComplaints/{complaintId}`
* **Document ID:** `CMP-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `complaintId` | String | Yes | Unique Complaint ID |
| `companyId` | String | Yes | Tenant isolation key |
| `clientId` | String | Yes | Reference to Client |
| `siteId` | String | Yes | Reference to Site |
| `reportedByUserId` | String | Yes | Client User ID |
| `category` | String | Yes | Enum: `'GUARD_BEHAVIOR' \| 'UNIFORM' \| 'ABSENTEEISM' \| 'BILLING' \| 'OTHER'` |
| `severity` | String | Yes | Enum: `'LOW' \| 'MEDIUM' \| 'HIGH' \| 'CRITICAL'` |
| `description` | String | Yes | Complaint details |
| `attachments` | Array<String> | Optional | File IDs (photos/documents) |
| `status` | String | Yes | Enum: `'OPEN' \| 'INVESTIGATING' \| 'RESOLVED' \| 'CLOSED'` |
| `resolutionNotes` | String | Optional | How the issue was resolved |
| `createdAt` | Timestamp | Yes | Creation timestamp |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

### 2.1 Client Dashboard & Data Visibility
* **Attendance Visibility:** Clients can view aggregated attendance and muster rolls ONLY for sites they own (`clientId` match) or sites specifically assigned to their user profile (`allowedSiteIds`).
* **Contract & Billing:** Clients have read-only access to `/clientContracts` and `/invoices` where the `clientId` matches their profile. They can download invoice PDFs via the Storage Module.
* **Payment Status:** Integration with the Billing module allows clients to view invoice statuses (`'PAID'`, `'OVERDUE'`).

### 2.2 Service Request Workflow
1. Client submits a `clientServiceRequests`.
2. System triggers a Notification to the regional Ops Manager.
3. Ops Manager reviews, quotes a price (if ad-hoc), and marks as `APPROVED`.
4. Client is notified via email/push, and the request transitions to `FULFILLED` once operations deploy the resources.

### 2.3 Complaint Escalation
1. Client raises a `clientComplaints`.
2. High/Critical complaints instantly notify Branch Managers and trigger an Audit Log.
3. Operations team investigates, updates `resolutionNotes`, and resolves.
4. Client receives a notification to confirm closure.

---

## 3. FIRESTORE SECURITY RULES (CLIENT PORTAL)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function for Client Access
    function isClientUser(cid) {
      return sameCompany(cid) && request.auth != null && get(/databases/$(database)/documents/companies/$(cid)/users/$(request.auth.uid)).data.role == 'clientUser';
    }
    
    function matchesClientId(cid, targetClientId) {
      return get(/databases/$(database)/documents/companies/$(cid)/users/$(request.auth.uid)).data.clientId == targetClientId;
    }

    match /companies/{cid} {
      match /clientServiceRequests/{requestId} {
        allow read: if sameCompany(cid) && (opsTier() || (isClientUser(cid) && matchesClientId(cid, resource.data.clientId)));
        allow create: if isClientUser(cid) && matchesClientId(cid, request.resource.data.clientId);
        allow update: if sameCompany(cid) && opsTier(); // Only Ops can update status
      }

      match /clientComplaints/{complaintId} {
        allow read: if sameCompany(cid) && (opsTier() || (isClientUser(cid) && matchesClientId(cid, resource.data.clientId)));
        allow create: if isClientUser(cid) && matchesClientId(cid, request.resource.data.clientId);
        allow update: if sameCompany(cid) && opsTier(); // Only Ops can resolve
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (CLIENT PORTAL)

```json
{
  "indexes": [
    {
      "collectionGroup": "clientServiceRequests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "clientComplaints",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

**End of Phase 23: Enterprise Client Portal Module (100% Complete).**
