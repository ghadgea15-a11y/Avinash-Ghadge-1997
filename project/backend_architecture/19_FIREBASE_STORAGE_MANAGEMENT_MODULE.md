# LOG SHEET MUSTER — PHASE 18: ENTERPRISE FIREBASE STORAGE MANAGEMENT MODULE (100% COMPLETE)

Enterprise-grade, production-ready Firebase Storage Management Module for Log Sheet Muster. This module provides metadata tracking, access control, and quota management for all binary assets uploaded to Firebase Storage (e.g., employee KYC documents, site incident photos, payslip PDFs, and client invoices).

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All storage metadata collections are multi-tenant and strictly isolated under `/companies/{companyId}/`. While the actual files reside in Firebase Storage, Firestore maintains the searchable metadata, ownership, and access controls.

```
/companies/{cid}/storageFiles/{fileId}
/companies/{cid}/storageQuotas/{quotaId}
/companies/{cid}/storageAccessLogs/{logId}
```

### 1.1 `storageFiles` (Centralized File Metadata Registry)
Tracks all files uploaded across the system, linking them to their respective modules (Employees, Incidents, Reports).
* **Path:** `/companies/{companyId}/storageFiles/{fileId}`
* **Document ID:** `FILE-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `fileId` | String | Yes | Unique File ID |
| `companyId` | String | Yes | Tenant isolation key |
| `fileName` | String | Yes | Original file name (e.g., `aadhar_card_front.jpg`) |
| `fileSizeBytes` | Number | Yes | Size of the file in bytes |
| `mimeType` | String | Yes | MIME type (e.g., `image/jpeg`, `application/pdf`) |
| `storagePath` | String | Yes | Exact Firebase Storage path (e.g., `companies/{cid}/employees/{empId}/aadhar.jpg`) |
| `downloadUrl` | String | Yes | Signed or public CDN URL |
| `module` | String | Yes | Enum: `'EMPLOYEE' \| 'INCIDENT' \| 'REPORT' \| 'BILLING' \| 'COMPANY_ASSET'` |
| `referenceId` | String | Yes | ID of the parent document (e.g., `empId`, `incidentId`) |
| `uploadedByUserId` | String | Yes | User ID of the uploader |
| `uploadedAt` | Timestamp | Yes | Upload timestamp |
| `isPublic` | Boolean | Yes | True if the file URL is publicly accessible without auth |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'ARCHIVED' \| 'DELETED'` |

### 1.2 `storageQuotas` (Tenant Storage Consumption Limits)
Tracks the total storage consumed by a tenant to enforce subscription-based limits and billing.
* **Path:** `/companies/{companyId}/storageQuotas/{quotaId}`
* **Document ID:** `QUOTA-MASTER`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `quotaId` | String | Yes | `QUOTA-MASTER` |
| `companyId` | String | Yes | Tenant isolation key |
| `allocatedBytes` | Number | Yes | Maximum storage allowed per subscription tier |
| `usedBytes` | Number | Yes | Current total bytes consumed |
| `fileCount` | Number | Yes | Total number of active files |
| `alertThresholdPercentage` | Number | Yes | E.g., `90` (Triggers alert when 90% full) |
| `lastUpdated` | Timestamp | Yes | Last recalculation timestamp |

### 1.3 `storageAccessLogs` (File Access & Download Audit)
Audit trail tracking who downloaded or accessed sensitive documents (e.g., KYC documents, signed contracts).
* **Path:** `/companies/{companyId}/storageAccessLogs/{logId}`
* **Document ID:** `FALOG-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `logId` | String | Yes | Unique Log ID |
| `companyId` | String | Yes | Tenant isolation key |
| `fileId` | String | Yes | Reference to `/storageFiles/{fileId}` |
| `accessedByUserId` | String | Yes | User ID who accessed the file |
| `accessType` | String | Yes | Enum: `'DOWNLOAD' \| 'VIEW' \| 'SHARE'` |
| `ipAddress` | String | Yes | Client IP address |
| `accessedAt` | Timestamp | Yes | Timestamp of access |

---

## 2. BUSINESS LOGIC & WORKFLOWS

### 2.1 Storage Quota Enforcement
* **Upload Trigger:** Before a client uploads a file, a Cloud Function checks `storageQuotas`. If `usedBytes + newFileBytes > allocatedBytes`, the upload is rejected.
* **Quota Recalculation:** Cloud Functions listen to `storageFiles` `onCreate` and `onDelete` events to atomically increment or decrement `usedBytes` and `fileCount` in `storageQuotas`.

### 2.2 Secure Document Access
* Highly sensitive documents (like Employee KYC) have `isPublic: false`.
* To view these, the client requests a short-lived Signed URL from a Cloud Function.
* The Cloud Function verifies the user's role/permissions, generates the Signed URL, and simultaneously creates a record in `storageAccessLogs`.

---

## 3. FIRESTORE SECURITY RULES (STORAGE MANAGEMENT)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ...
    match /companies/{cid} {
      match /storageFiles/{fileId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow create: if sameCompany(cid) && isSignedIn();
        allow update: if sameCompany(cid) && mgmtTier();
        allow delete: if sameCompany(cid) && mgmtTier();
      }

      match /storageQuotas/{quotaId} {
        allow read: if sameCompany(cid) && ownerTier();
        allow write: if false; // Only updated by Cloud Functions
      }

      match /storageAccessLogs/{logId} {
        allow read: if sameCompany(cid) && ownerTier();
        allow write: if false; // Only updated by Cloud Functions
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (STORAGE MANAGEMENT)

```json
{
  "indexes": [
    {
      "collectionGroup": "storageFiles",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "module", "order": "ASCENDING" },
        { "fieldPath": "uploadedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "storageAccessLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "fileId", "order": "ASCENDING" },
        { "fieldPath": "accessedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

**End of Phase 18: Enterprise Firebase Storage Management Module (100% Complete).**
