# LOG SHEET MUSTER — PHASE 15: ENTERPRISE AUDIT & ACTIVITY LOGS MODULE (100% COMPLETE)
Enterprise-grade, immutable Audit & Activity Logging System for Log Sheet Muster. Fully integrated across all 14 previous modules: Employee Master, Attendance, Leave, Shift & Roster, Payroll, Inventory, Assets, Billing & Clients, Operations, Reports, Dashboards, Notifications, and System Core Engines.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All audit collections are multi-tenant and strictly isolated under `/companies/{companyId}/`. All records are append-only and strictly immutable (`allow write: if false;` for client SDKs).

```
/companies/{cid}/auditLogs/{logId}
/companies/{cid}/dataChangeHistory/{changeId}
/companies/{cid}/securityEventLogs/{eventId}
/companies/{cid}/userSessionLogs/{sessionId}
```

---

### 1.1 `auditLogs` (Immutable Operational & Administrative Audit Ledger)
Central immutable audit record generated whenever an administrative, financial, operational, or data modification action is taken in the system.
* **Path:** `/companies/{companyId}/auditLogs/{logId}`
* **Document ID:** `AUD-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `logId` | String | Yes | Unique Audit Log ID |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Optional | Branch ID if location-specific |
| `siteId` | String | Optional | Site ID if location-specific |
| `actorUserId` | String | Yes | User ID of person performing action (or `"SYSTEM_CLOUD_FUNCTION"`) |
| `actorEmployeeCode` | String | Optional | Denormalized employee code |
| `actorName` | String | Yes | Denormalized full user name |
| `actorRole` | String | Yes | Role at time of action (`'companyOwner'`, `'admin'`, `'hr'`, `'manager'`, `'incharge'`, `'supervisor'`, `'guard'`) |
| `module` | String | Yes | Target module: `'EMPLOYEE' \| 'ATTENDANCE' \| 'LEAVE' \| 'ROSTER' \| 'PAYROLL' \| 'INVENTORY' \| 'ASSETS' \| 'BILLING' \| 'OPERATIONS' \| 'REPORTS' \| 'NOTIFICATIONS' \| 'SECURITY'` |
| `actionType` | String | Yes | Action performed: `'CREATE' \| 'UPDATE' \| 'DELETE' \| 'APPROVE' \| 'REJECT' \| 'LOCK' \| 'UNLOCK' \| 'EXPORT' \| 'BULK_IMPORT'` |
| `targetCollection` | String | Yes | Target Firestore collection path (e.g. `"payrollRuns"`, `"musterRolls"`) |
| `targetDocumentId` | String | Yes | Target document ID |
| `summary` | String | Yes | Human-readable action description (e.g., "Finance Manager approved July 2026 Payroll Run PR-202607") |
| `ipAddress` | String | Yes | Client IP address |
| `userAgent` | String | Yes | Client browser / mobile app user-agent string |
| `deviceInfo` | Map | Yes | `{ platform: "ANDROID_TABLET" \| "WEB" \| "ANDROID_PHONE", deviceId: String, appVersion: String }` |
| `gpsCoordinates` | Map | Optional | `{ lat: Number, lng: Number }` if performed from mobile field device |
| `timestamp` | Timestamp | Yes | Immutable server timestamp |

---

### 1.2 `dataChangeHistory` (Granular Field-Level Mutation Diffs)
Field-by-field diff history tracking exact state transitions for sensitive records (e.g., salary updates, employee bank details changes, stock adjustments).
* **Path:** `/companies/{companyId}/dataChangeHistory/{changeId}`
* **Document ID:** `DIFF-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `changeId` | String | Yes | Unique Change ID |
| `companyId` | String | Yes | Tenant isolation key |
| `auditLogId` | String | Yes | Reference to parent `/auditLogs/{logId}` |
| `targetCollection` | String | Yes | Collection name |
| `targetDocumentId` | String | Yes | Target Document ID |
| `fieldChanges` | Array<Map> | Yes | `[{ fieldName: "baseSalary", previousValue: 25000, newValue: 28000, dataType: "NUMBER" }, { fieldName: "bankAccountNumber", previousValue: "****1234", newValue: "****5678", dataType: "STRING" }]` |
| `modifiedByUserId` | String | Yes | User ID |
| `timestamp` | Timestamp | Yes | Server timestamp |

---

### 1.3 `securityEventLogs` (Security & Privilege Incident Ledger)
Security-focused event stream tracking failed login attempts, privilege escalation, unauthorized access blocks, geofence spoofing, and API token breaches.
* **Path:** `/companies/{companyId}/securityEventLogs/{eventId}`
* **Document ID:** `SEC-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `eventId` | String | Yes | Unique Security Event ID |
| `companyId` | String | Yes | Tenant isolation key |
| `eventType` | String | Yes | Enum: `'FAILED_LOGIN_ATTEMPT' \| 'UNAUTHORIZED_ACCESS_DENIED' \| 'PRIVILEGE_ESCALATION_ATTEMPT' \| 'GEOFENCE_SPOOF_DETECTED' \| 'MULTIPLE_FAILED_PINS' \| 'TOKEN_EXPIRED_FORCED_LOGOUT'` |
| `severity` | String | Yes | Enum: `'LOW' \| 'MEDIUM' \| 'HIGH' \| 'CRITICAL_SECURITY_BREACH'` |
| `targetUserId` | String | Optional | Target user ID involved |
| `attemptedEmail` | String | Optional | Email input during failed login |
| `ipAddress` | String | Yes | Originating IP address |
| `deviceInfo` | Map | Yes | Device metadata |
| `details` | Map | Yes | Extended forensic payload `{ reason: String, requestPath: String, clientLat: Number, clientLng: Number }` |
| `isAlertTriggered` | Boolean | Yes | True if immediate security alert dispatched to Admin |
| `timestamp` | Timestamp | Yes | Server timestamp |

---

### 1.4 `userSessionLogs` (Authentication Session & Geolocation Tracking)
Tracks user login sessions, active web/tablet connections, refresh token lifecycles, and explicit logouts.
* **Path:** `/companies/{companyId}/userSessionLogs/{sessionId}`
* **Document ID:** `SESS-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `sessionId` | String | Yes | Unique Session ID |
| `companyId` | String | Yes | Tenant isolation key |
| `userId` | String | Yes | User ID |
| `employeeCode` | String | Optional | Employee Code |
| `loginTimestamp` | Timestamp | Yes | Session start time |
| `logoutTimestamp` | Timestamp | Optional | Session end time (null if active session) |
| `authProvider` | String | Yes | Enum: `'FIREBASE_AUTH_PASSWORD' \| 'PHONE_OTP' \| 'BIOMETRIC_DEVICE'` |
| `ipAddress` | String | Yes | Session IP |
| `deviceType` | String | Yes | Enum: `'ANDROID_PHONE' \| 'ANDROID_TABLET' \| 'WEB'` |
| `status` | String | Yes | Enum: `'ACTIVE_SESSION' \| 'LOGGED_OUT' \| 'FORCE_TERMINATED_SECURITY'` |

---

## 2. FIRESTORE SECURITY RULES (AUDIT & ACTIVITY LOGS)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function claims() { return request.auth.token; }
    function isSignedIn() { return request.auth != null; }
    function companyId() { return claims().companyId; }
    function role() { return claims().role; }
    function sameCompany(cid) { return isSignedIn() && companyId() == cid; }
    function roleAtLeast(list) { return role() in list; }

    function ownerTier() { return roleAtLeast(['companyOwner','admin']); }
    function mgmtTier()  { return roleAtLeast(['companyOwner','admin','hr','manager']); }

    match /companies/{cid} {

      // --- AUDIT LOGS (IMMUTABLE - WRITE ONLY VIA CLOUD FUNCTIONS/ADMIN SDK) ---
      match /auditLogs/{logId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow write: if false; // Cloud Functions exclusively
      }

      match /dataChangeHistory/{changeId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow write: if false; // Cloud Functions exclusively
      }

      match /securityEventLogs/{eventId} {
        allow read: if sameCompany(cid) && ownerTier();
        allow write: if false; // Cloud Functions exclusively
      }

      match /userSessionLogs/{sessId} {
        allow read: if sameCompany(cid) && (
          request.auth.uid == resource.data.userId || mgmtTier()
        );
        allow write: if false; // Cloud Functions exclusively
      }
    }
  }
}
```

---

## 3. FIRESTORE COMPOSITE INDEXES (AUDIT & ACTIVITY LOGS)

```json
{
  "indexes": [
    {
      "collectionGroup": "auditLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "module", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "auditLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "actorUserId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "securityEventLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "severity", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "userSessionLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "loginTimestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 4. ERROR HANDLING & VALIDATION CODES

| Error Code | Message | Resolution |
|---|---|---|
| `ERR_AUDIT_LOG_IMMUTABLE` | Operation blocked. Audit logs are strictly append-only and cannot be modified or deleted. | Audit records are non-repudiable legal compliance logs. |
| `ERR_UNAUTHORIZED_AUDIT_ACCESS` | User role lacks clearance to inspect system audit trail or security logs. | Requires Owner/Admin role clearance. |

---

**End of Phase 15: Enterprise Audit & Activity Logs Module (100% Complete).**
