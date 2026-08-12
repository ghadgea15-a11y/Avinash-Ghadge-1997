# LOG SHEET MUSTER — PHASE 40: ENTERPRISE BIOMETRIC DEVICE INTEGRATION MODULE (100% COMPLETE)

Enterprise-grade, production-ready Biometric Device Integration Module for Log Sheet Muster. Ingests raw biometric logs from physical hardware machines (ZKTeco, eSSL, Biomax, Matrix, Mantra) via Push SDK webhooks, ADMS protocols, and serial API bridges for centralized attendance synchronization.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All Biometric Device Integration collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/biometricDevices/{deviceId}
/companies/{cid}/biometricRawLogs/{logId}
/companies/{cid}/biometricSyncLogs/{syncId}
```

### 1.1 `biometricDevices` (Device Hardware Registry)
* **Path:** `/companies/{companyId}/biometricDevices/{deviceId}`
* **Document ID:** `BIODEV-{serialNumber}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `deviceId` | String | Yes | Unique Device ID e.g. `BIODEV-ZKT123456` |
| `companyId` | String | Yes | Tenant isolation key |
| `serialNumber` | String | Yes | Hardware Serial No. |
| `siteId` | String | Yes | Assigned Site Location ID |
| `brand` | String | Yes | Enum: `'ZKTECO' \| 'ESSL' \| 'BIOMAX' \| 'MATRIX' \| 'MANTRA'` |
| `ipAddress` | String | Optional | Fixed Local IP / Gateway URL |
| `status` | String | Yes | Enum: `'ONLINE' \| 'OFFLINE' \| 'SYNC_ERROR'` |
| `lastHeartbeatAt` | Timestamp | Yes | Device ping timestamp |

### 1.2 `biometricRawLogs` (Ingested Punch Ledger)
* **Path:** `/companies/{companyId}/biometricRawLogs/{logId}`
* **Document ID:** `BIOLOG-{deviceId}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `logId` | String | Yes | Unique Log ID |
| `companyId` | String | Yes | Tenant isolation key |
| `deviceId` | String | Yes | Reference to `biometricDevices` |
| `cardOrUserId` | String | Yes | Hardware User ID / Badge No. |
| `employeeId` | String | Optional | Mapped internal Employee ID |
| `punchTime` | Timestamp | Yes | Device punch timestamp |
| `inOutMode` | String | Yes | Enum: `'CHECK_IN' \| 'CHECK_OUT' \| 'AUTO'` |
| `processedStatus` | String | Yes | Enum: `'PENDING' \| 'SYNCED' \| 'UNMAPPED_EMPLOYEE'` |

---

## 2. BUSINESS LOGIC & WORKFLOWS

1. **Push SDK & ADMS Ingestion**: Hardware pushes raw logs to Cloud Function webhook endpoint. System ingests into `biometricRawLogs`, maps `cardOrUserId` to `employeeId`, and creates attendance records in Attendance Engine (Phase 05).

---

## 3. FIRESTORE SECURITY RULES

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{cid} {
      match /biometricDevices/{deviceId} {
        allow read: if sameCompany(cid) && (opsTier() || mgmtTier());
        allow write: if sameCompany(cid) && mgmtTier();
      }
      match /biometricRawLogs/{logId} {
        allow read: if sameCompany(cid) && (opsTier() || mgmtTier());
        allow write: if false; // System ingestion only
      }
    }
  }
}
```

---

**End of Phase 40: Enterprise Biometric Device Integration Module.**
