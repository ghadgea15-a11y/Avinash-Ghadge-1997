# LOG SHEET MUSTER — PHASE 29: ENTERPRISE DOCUMENT EXPIRY MANAGEMENT MODULE (100% COMPLETE)

Enterprise-grade, production-ready Document Expiry Management Module for Log Sheet Muster. Tracks critical expiration lifecycles across Employee compliance documents, Vendor trade licenses, Site/Company operational licenses (PSARA, Fire Safety), Vehicle Fleet RCs/insurances, and Asset calibration certificates with automated multi-tier alert schedules and renewal approval workflows.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All Document Expiry Management collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/complianceDocuments/{documentId}
/companies/{cid}/documentRenewalRequests/{requestId}
/companies/{cid}/documentAlertConfigs/{configId}
```

### 1.1 `complianceDocuments` (Master Document Expiry Registry)
Central registry for tracking all time-sensitive compliance and operational documents across employees, vendors, assets, sites, and company licenses.
* **Path:** `/companies/{companyId}/complianceDocuments/{documentId}`
* **Document ID:** `DOC-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `documentId` | String | Yes | Unique Document ID |
| `companyId` | String | Yes | Tenant isolation key |
| `entityType` | String | Yes | Enum: `'COMPANY_LICENSE' \| 'EMPLOYEE' \| 'VENDOR' \| 'SITE' \| 'ASSET' \| 'VEHICLE'` |
| `entityId` | String | Yes | Reference ID (e.g. `employeeId`, `vendorId`, `assetId`, `vehicleId`, `siteId`, or `companyId`) |
| `documentCategory` | String | Yes | E.g. `"PSARA_LICENSE"`, `"ARMS_LICENSE"`, `"DRIVING_LICENSE"`, `"WORK_PERMIT"`, `"VEHICLE_INSURANCE"`, `"GST_CERTIFICATE"`, `"CALIBRATION_CERT"` |
| `documentNumber` | String | Yes | Official Registration or Serial Number |
| `issuingAuthority` | String | Yes | E.g., `"State Police Dept"`, `"RTO Mumbai"`, `"GST Authority"` |
| `issueDate` | Timestamp | Yes | Date of issue |
| `expiryDate` | Timestamp | Yes | Expiration timestamp |
| `fileStorageId` | String | Yes | PDF/Image reference in Firebase Storage Module |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'EXPIRING_SOON' \| 'EXPIRED' \| 'RENEWAL_IN_PROGRESS' \| 'ARCHIVED'` |
| `alertLeadDays` | Array<Number> | Yes | Days before expiry to trigger alerts e.g. `[60, 30, 15, 7, 1]` |
| `lastAlertSentAt` | Timestamp | Optional | Timestamp of last sent notification |
| `verifiedByUserId` | String | Yes | HR / Compliance Admin User ID |
| `createdAt` | Timestamp | Yes | Creation timestamp |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

### 1.2 `documentRenewalRequests` (Renewal Submission & Approval Workflow)
Workflow documents tracking active renewal submissions, uploaded renewed proofs, cost tracking, and admin approvals.
* **Path:** `/companies/{companyId}/documentRenewalRequests/{requestId}`
* **Document ID:** `DREN-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `requestId` | String | Yes | Unique Renewal Request ID |
| `companyId` | String | Yes | Tenant isolation key |
| `documentId` | String | Yes | Reference to parent `complianceDocuments` |
| `submittedByUserId` | String | Yes | User ID submitting the renewed document |
| `newDocumentNumber` | String | Optional | Updated registration number if changed |
| `newIssueDate` | Timestamp | Yes | New issue date |
| `newExpiryDate` | Timestamp | Yes | New expiration date |
| `newFileStorageId` | String | Yes | Uploaded renewed proof file ID |
| `renewalCost` | Number | Optional | Expense incurred for renewal |
| `status` | String | Yes | Enum: `'PENDING_APPROVAL' \| 'APPROVED' \| 'REJECTED'` |
| `reviewedByUserId` | String | Optional | HR/Legal Admin User ID |
| `rejectionReason` | String | Optional | Reason if rejected |
| `createdAt` | Timestamp | Yes | Submission timestamp |
| `updatedAt` | Timestamp | Yes | Last review timestamp |

### 1.3 `documentAlertConfigs` (Alert & Notification Settings)
Company-wide and category-specific rules determining notification channels (Push, Email, WhatsApp) and recipients for expiring documents.
* **Path:** `/companies/{companyId}/documentAlertConfigs/{configId}`
* **Document ID:** `DOC-ALERT-CONFIG`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `configId` | String | Yes | `DOC-ALERT-CONFIG` |
| `companyId` | String | Yes | Tenant isolation key |
| `notifyEmployee` | Boolean | Yes | True to send push/email to employee for personal docs |
| `notifyVendor` | Boolean | Yes | True to notify vendor for trade docs via Vendor Portal |
| `complianceAdminUserIds` | Array<String> | Yes | Central compliance manager user IDs |
| `branchManagerEscalationDays` | Number | Yes | Days before expiry to escalate to Branch Manager (e.g. 7) |
| `updatedAt` | Timestamp | Yes | Config update timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

### 2.1 Automated Expiry Scan Engine
1. Daily Cloud Scheduler executes a background scan across `/complianceDocuments`.
2. Evaluates `daysUntilExpiry = ceil((expiryDate - now()) / 86400)`.
3. If `daysUntilExpiry <= 0`:
   * Status transitions to `EXPIRED`.
   * Automatically disables employee deployment eligibility in Shift Roster (Phase 07) if `category == 'PSARA_LICENSE'` or `'ARMS_LICENSE'`.
4. If `daysUntilExpiry` matches any value in `alertLeadDays`:
   * Status transitions to `EXPIRING_SOON`.
   * Dispatches high-priority multi-channel notifications via Notification Engine (Phase 15).

### 2.2 Renewal & Verification Workflow
1. User (Employee via ESS, Vendor via Vendor Portal, or Ops Manager) submits a `documentRenewalRequests` with the new file proof.
2. Compliance Admin receives a task to inspect `newFileStorageId`.
3. Upon approval:
   * Parent `complianceDocuments` record is updated with `newIssueDate`, `newExpiryDate`, and status restored to `ACTIVE`.
   * Shift Roster deployment blocks are automatically cleared.
   * Document renewal expense is optionally forwarded to Expense Claims (Phase 25).

---

## 3. FIRESTORE SECURITY RULES (DOCUMENT EXPIRY MANAGEMENT)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{cid} {
      match /complianceDocuments/{documentId} {
        allow read: if sameCompany(cid) && (
          mgmtTier() || opsTier() || 
          (isEmployeeUser() && resource.data.entityId == get(/databases/$(database)/documents/companies/$(cid)/users/$(request.auth.uid)).data.employeeId) ||
          (isVendorUser() && resource.data.entityId == get(/databases/$(database)/documents/companies/$(cid)/users/$(request.auth.uid)).data.vendorId)
        );
        allow write: if sameCompany(cid) && mgmtTier();
      }

      match /documentRenewalRequests/{requestId} {
        allow read: if sameCompany(cid) && (
          mgmtTier() || opsTier() || 
          request.auth.uid == resource.data.submittedByUserId
        );
        allow create: if sameCompany(cid) && isSignedIn();
        allow update: if sameCompany(cid) && mgmtTier(); // Only HR/Legal Admin can approve
      }

      match /documentAlertConfigs/{configId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow write: if sameCompany(cid) && mgmtTier();
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (DOCUMENT EXPIRY MANAGEMENT)

```json
{
  "indexes": [
    {
      "collectionGroup": "complianceDocuments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "expiryDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "complianceDocuments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "entityType", "order": "ASCENDING" },
        { "fieldPath": "entityId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "documentRenewalRequests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

**End of Phase 29: Enterprise Document Expiry Management Module (100% Complete).**
