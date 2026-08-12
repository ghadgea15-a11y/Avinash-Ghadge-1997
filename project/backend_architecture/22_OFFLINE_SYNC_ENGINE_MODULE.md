# LOG SHEET MUSTER — PHASE 21: ENTERPRISE OFFLINE SYNC ENGINE MODULE (100% COMPLETE)

Enterprise-grade, production-ready Offline Sync Engine for Log Sheet Muster. Designed to support mobile field apps working in remote areas without internet access, ensuring data consistency, conflict resolution, and synchronization tracking once connectivity is restored.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All offline sync tracking collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/syncMutationQueues/{mutationId}
/companies/{cid}/deviceSyncStates/{deviceId}
/companies/{cid}/syncConflictLogs/{conflictId}
```

### 1.1 `syncMutationQueues` (Pending / Failed Mutations)
While the Firestore SDK handles automatic offline persistence, this collection provides an explicit queue for complex, multi-document transactions (e.g., clocking in, updating inventory, and raising an incident simultaneously) that require server-side orchestration when the device comes back online.
* **Path:** `/companies/{companyId}/syncMutationQueues/{mutationId}`
* **Document ID:** `MUT-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `mutationId` | String | Yes | Unique Mutation ID |
| `companyId` | String | Yes | Tenant isolation key |
| `deviceId` | String | Yes | Originating Device ID |
| `userId` | String | Yes | User who generated the mutation |
| `mutationType` | String | Yes | Enum: `'BATCH_ATTENDANCE' \| 'COMPLEX_INCIDENT' \| 'ROSTER_OVERRIDE'` |
| `payload` | Map | Yes | Serialized JSON representation of the operations |
| `localTimestamp` | Timestamp | Yes | Time mutation occurred on the device |
| `status` | String | Yes | Enum: `'PENDING' \| 'PROCESSED' \| 'FAILED_CONFLICT' \| 'FAILED_VALIDATION'` |
| `processedAt` | Timestamp | Optional | Server time when processed |

### 1.2 `deviceSyncStates` (Device Health & Sync Tracking)
Tracks the last known synchronization time of every field device, allowing admins to see if a device at a remote site is out of sync or offline for too long.
* **Path:** `/companies/{companyId}/deviceSyncStates/{deviceId}`
* **Document ID:** `SYNC-DEV-{deviceId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `deviceId` | String | Yes | Unique Device ID |
| `companyId` | String | Yes | Tenant isolation key |
| `assignedUserId` | String | Yes | User currently logged into the device |
| `lastOnlineAt` | Timestamp | Yes | Last heartbeat received by the server |
| `lastSyncCompletedAt` | Timestamp | Yes | Last successful full sync |
| `pendingMutationsCount` | Number | Yes | Number of mutations waiting to sync |
| `appVersion` | String | Yes | App version running on the device |
| `batteryLevel` | Number | Optional | Last reported battery level |
| `connectionType` | String | Optional | `'WIFI' \| 'CELLULAR' \| 'NONE'` |

### 1.3 `syncConflictLogs` (Conflict Resolution Audit)
Logs instances where the server rejected or merged an offline mutation due to concurrent modifications (e.g., two supervisors edited the same muster roll while offline).
* **Path:** `/companies/{companyId}/syncConflictLogs/{conflictId}`
* **Document ID:** `SCONF-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `conflictId` | String | Yes | Unique Conflict ID |
| `companyId` | String | Yes | Tenant isolation key |
| `mutationId` | String | Yes | Reference to the failed mutation |
| `targetCollection` | String | Yes | e.g., `"musterRolls"` |
| `targetDocumentId` | String | Yes | ID of the document with the conflict |
| `serverState` | Map | Yes | The document state on the server at conflict time |
| `clientState` | Map | Yes | The document state proposed by the client |
| `resolutionStrategy` | String | Yes | Enum: `'SERVER_WINS' \| 'CLIENT_WINS' \| 'MANUAL_MERGE'` |
| `resolvedByUserId` | String | Optional | Admin User ID if manually resolved |
| `resolvedAt` | Timestamp | Yes | Timestamp of resolution |

---

## 2. BUSINESS LOGIC & WORKFLOWS

### 2.1 Sync Orchestration
* Field devices write complex transactions to their local `syncMutationQueues`.
* Upon reconnecting, the Firestore SDK syncs this queue to the server.
* A Cloud Function (`onWrite` to `syncMutationQueues`) intercepts `PENDING` mutations and processes the payload transactionally.

### 2.2 Conflict Resolution Engine
* If the Cloud Function detects a mismatch in `updatedAt` timestamps (Server > Client Local Time), it flags a conflict.
* By default, Log Sheet Muster applies a `'SERVER_WINS'` strategy for critical financial data (Payroll), but logs it to `syncConflictLogs`.
* Non-critical data (like Supervisor Notes) may be merged.

---

## 3. FIRESTORE SECURITY RULES (OFFLINE SYNC)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ...
    match /companies/{cid} {
      match /syncMutationQueues/{mutationId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow create: if sameCompany(cid) && request.resource.data.userId == request.auth.uid;
        allow update, delete: if false; // Processed exclusively by Cloud Functions
      }

      match /deviceSyncStates/{deviceId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow write: if sameCompany(cid) && request.resource.data.assignedUserId == request.auth.uid;
      }

      match /syncConflictLogs/{conflictId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow update: if sameCompany(cid) && mgmtTier(); // To resolve manual conflicts
        allow create, delete: if false; // System generated
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (OFFLINE SYNC)

```json
{
  "indexes": [
    {
      "collectionGroup": "syncMutationQueues",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "localTimestamp", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "deviceSyncStates",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "lastOnlineAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "syncConflictLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "resolutionStrategy", "order": "ASCENDING" },
        { "fieldPath": "resolvedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

**End of Phase 21: Enterprise Offline Sync Engine Module (100% Complete).**
