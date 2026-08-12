# LOG SHEET MUSTER — PHASE 22: ENTERPRISE BACKUP & DISASTER RECOVERY MODULE (100% COMPLETE)

Enterprise-grade, production-ready Backup & Disaster Recovery (BDR) Engine for Log Sheet Muster. Ensures continuous data protection, point-in-time recovery capabilities, automated daily snapshots, and compliance with data retention policies.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All backup metadata and schedules are multi-tenant and strictly isolated under `/companies/{companyId}/`. The actual backup data is securely exported and stored in Google Cloud Storage (Coldline/Archive tiers) via Firestore Export functionality.

```
/companies/{cid}/backupSchedules/{scheduleId}
/companies/{cid}/backupLogs/{logId}
/companies/{cid}/dataRetentionPolicies/{policyId}
```

### 1.1 `backupSchedules` (Automated Export Configurations)
Defines the frequency and scope of automated Firestore backups for the tenant.
* **Path:** `/companies/{companyId}/backupSchedules/{scheduleId}`
* **Document ID:** `BSCHED-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `scheduleId` | String | Yes | Unique Schedule ID |
| `companyId` | String | Yes | Tenant isolation key |
| `frequency` | String | Yes | Enum: `'HOURLY' \| 'DAILY' \| 'WEEKLY' \| 'MONTHLY'` |
| `scope` | String | Yes | Enum: `'FULL_DATABASE' \| 'SPECIFIC_COLLECTIONS'` |
| `targetCollections` | Array<String> | Optional | E.g., `["musterRolls", "payrollRuns"]` if partial |
| `storageBucketUri` | String | Yes | GCS destination bucket |
| `isActive` | Boolean | Yes | True if the automated schedule is running |
| `createdByUserId` | String | Yes | Admin `userId` who configured it |
| `updatedAt` | Timestamp | Yes | Last modified timestamp |

### 1.2 `backupLogs` (Audit Trail of Backup Execution)
A continuous log of all automated and manual backup jobs, tracking success, failure, and execution time.
* **Path:** `/companies/{companyId}/backupLogs/{logId}`
* **Document ID:** `BLOG-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `logId` | String | Yes | Unique Log ID |
| `companyId` | String | Yes | Tenant isolation key |
| `scheduleId` | String | Optional | Reference to automated schedule (null if manual) |
| `jobType` | String | Yes | Enum: `'AUTOMATED' \| 'MANUAL_EXPORT' \| 'RECOVERY_IMPORT'` |
| `status` | String | Yes | Enum: `'IN_PROGRESS' \| 'SUCCESS' \| 'FAILED'` |
| `exportedBytes` | Number | Optional | Total size of the backup |
| `gcsObjectPath` | String | Optional | Path to the exported data |
| `errorMessage` | String | Optional | Reason for failure |
| `startedAt` | Timestamp | Yes | Job start time |
| `completedAt` | Timestamp | Optional | Job completion time |

### 1.3 `dataRetentionPolicies` (Compliance & Storage Lifecycle)
Defines how long specific types of data (e.g., Attendance vs. Audit Logs) must be retained before being archived or hard-deleted to comply with labor laws and GDPR/DPDP requirements.
* **Path:** `/companies/{companyId}/dataRetentionPolicies/{policyId}`
* **Document ID:** `RETENTION-POLICY`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `policyId` | String | Yes | `RETENTION-POLICY` |
| `companyId` | String | Yes | Tenant isolation key |
| `attendanceRetentionDays` | Number | Yes | E.g., `1825` (5 years) |
| `payrollRetentionDays` | Number | Yes | E.g., `2555` (7 years) |
| `auditLogRetentionDays` | Number | Yes | E.g., `365` (1 year) |
| `actionOnExpiry` | String | Yes | Enum: `'ARCHIVE_TO_GCS' \| 'HARD_DELETE'` |
| `updatedByUserId` | String | Yes | Admin `userId` |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

### 2.1 Automated Cloud Storage Backups
* Google Cloud Scheduler triggers a daily Pub/Sub event.
* A Cloud Function intercepts this event, reads `backupSchedules`, and triggers the `firestore.exportDocuments` Admin API.
* The system writes an `IN_PROGRESS` record to `backupLogs`, which is updated to `SUCCESS` upon completion of the long-running operation.

### 2.2 Data Retention & Pruning
* A weekly automated Cloud Function scans historical data (e.g., `/musterRolls`) against `dataRetentionPolicies`.
* Expired records are securely archived to GCS and then hard-deleted from active Firestore collections to reduce costs and maintain query performance.

### 2.3 Point-In-Time Recovery (PITR)
* Alongside scheduled exports, Firestore PITR is enabled at the GCP project level, allowing granular recovery to any microsecond within the past 7 days without relying strictly on scheduled batch exports.

---

## 3. FIRESTORE SECURITY RULES (BACKUP & DISASTER RECOVERY)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ...
    match /companies/{cid} {
      match /backupSchedules/{scheduleId} {
        allow read: if sameCompany(cid) && ownerTier();
        allow write: if sameCompany(cid) && ownerTier();
      }

      match /backupLogs/{logId} {
        allow read: if sameCompany(cid) && ownerTier();
        allow write: if false; // System generated by Cloud Functions
      }

      match /dataRetentionPolicies/{policyId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow write: if sameCompany(cid) && ownerTier();
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (BACKUP & DISASTER RECOVERY)

```json
{
  "indexes": [
    {
      "collectionGroup": "backupLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "jobType", "order": "ASCENDING" },
        { "fieldPath": "startedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "backupSchedules",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

**End of Phase 22: Enterprise Backup & Disaster Recovery Module (100% Complete).**
