# LOG SHEET MUSTER — PHASE 17: ENTERPRISE SECURITY FOUNDATION MODULE (100% COMPLETE)

Enterprise-grade, production-ready Security Foundation Module for Log Sheet Muster. Provides robust defense mechanisms including IP allowlisting, device blocking, API key management, and Multi-Factor Authentication (MFA) enforcement policies across all modules.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All security collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/securityPolicies/{policyId}
/companies/{cid}/ipAllowlists/{ipId}
/companies/{cid}/blockedDevices/{deviceId}
/companies/{cid}/apiKeys/{keyId}
```

### 1.1 `securityPolicies` (MFA, Passwords & Session Policies)
Defines company-wide or role-specific security enforcement rules.
* **Path:** `/companies/{companyId}/securityPolicies/{policyId}`
* **Document ID:** `SEC-POL-GLOBAL` or `SEC-POL-{role}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `policyId` | String | Yes | Policy ID |
| `companyId` | String | Yes | Tenant isolation key |
| `targetRole` | String | Optional | Target role (if null, applies globally) |
| `requireMfa` | Boolean | Yes | Enforce Multi-Factor Authentication |
| `passwordPolicy` | Map | Yes | `{ minLength: 12, requireSpecialChar: true, expiryDays: 90 }` |
| `sessionTimeoutMinutes` | Number | Yes | Idle timeout before forced logout |
| `maxFailedLogins` | Number | Yes | Account lockout threshold |
| `updatedByUserId` | String | Yes | Admin `userId` |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

### 1.2 `ipAllowlists` (Geofenced & IP-Restricted Access)
Restricts login or administrative access to specific static IP ranges (e.g., branch office networks).
* **Path:** `/companies/{companyId}/ipAllowlists/{ipId}`
* **Document ID:** `IP-ALLOW-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `ipId` | String | Yes | Unique ID |
| `companyId` | String | Yes | Tenant isolation key |
| `ipAddress` | String | Yes | IPv4 or IPv6 Address / CIDR Block |
| `description` | String | Yes | e.g. "Mumbai HQ Network" |
| `restrictedToRoles` | Array<String> | Optional | Roles that MUST login from this IP |
| `isActive` | Boolean | Yes | Toggle status |
| `addedByUserId` | String | Yes | Admin `userId` |
| `createdAt` | Timestamp | Yes | Creation timestamp |

### 1.3 `blockedDevices` (Fraud Prevention & Device Bans)
Blocklists specific mobile devices (by IMEI/Device ID) from accessing the system due to security violations, geo-spoofing, or termination.
* **Path:** `/companies/{companyId}/blockedDevices/{deviceId}`
* **Document ID:** `BLOCK-DEV-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `deviceId` | String | Yes | Unique Device ID / UUID / IMEI hash |
| `companyId` | String | Yes | Tenant isolation key |
| `reason` | String | Yes | Enum: `'GEO_SPOOFING' \| 'STOLEN_DEVICE' \| 'TERMINATED_EMPLOYEE' \| 'MALICIOUS_ACTIVITY'` |
| `deviceModel` | String | Optional | Device model metadata |
| `blockedByUserId` | String | Yes | Admin `userId` |
| `blockedAt` | Timestamp | Yes | Timestamp of ban |

### 1.4 `apiKeys` (External System Integrations)
Managed API keys for external systems (e.g., Client ERPs, Biometric Sync scripts) to access the Log Sheet Muster APIs securely.
* **Path:** `/companies/{companyId}/apiKeys/{keyId}`
* **Document ID:** `API-KEY-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `keyId` | String | Yes | Key ID |
| `companyId` | String | Yes | Tenant isolation key |
| `keyName` | String | Yes | E.g. "TATA ERP Sync Key" |
| `hashedKey` | String | Yes | Bcrypt hash of the actual API key (never store plain text) |
| `keyPrefix` | String | Yes | First 4 chars for identification (e.g., `LSM-`) |
| `scopes` | Array<String> | Yes | Allowed API scopes (e.g., `["attendance:read", "billing:write"]`) |
| `expiresAt` | Timestamp | Yes | Key expiration date |
| `isRevoked` | Boolean | Yes | True if manually revoked |
| `createdByUserId` | String | Yes | Admin `userId` |
| `createdAt` | Timestamp | Yes | Creation timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

### 2.1 Access Control Middleware
* **API Gateway / Cloud Functions:** On every sensitive request, the backend extracts the client IP and device ID.
* It cross-references `ipAllowlists` and `blockedDevices`. If a match fails/succeeds appropriately, access is denied with a `403 Forbidden`.
* **Security Auditing:** A failed attempt automatically logs an entry in `securityEventLogs` (from Phase 15).

### 2.2 API Key Authentication
* Third-party ERPs send the API Key in the `Authorization: Bearer` header.
* The system looks up the key by prefix, verifies the bcrypt hash, checks `expiresAt` and `isRevoked`, and validates the requested `scopes`.

---

## 3. FIRESTORE SECURITY RULES (SECURITY FOUNDATION)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ...
    match /companies/{cid} {
      match /securityPolicies/{policyId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && ownerTier();
      }

      match /ipAllowlists/{ipId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow write: if sameCompany(cid) && ownerTier();
      }

      match /blockedDevices/{deviceId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow write: if sameCompany(cid) && ownerTier();
      }

      match /apiKeys/{keyId} {
        allow read: if sameCompany(cid) && ownerTier();
        allow write: if sameCompany(cid) && ownerTier();
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (SECURITY FOUNDATION)

```json
{
  "indexes": [
    {
      "collectionGroup": "ipAllowlists",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "apiKeys",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "isRevoked", "order": "ASCENDING" },
        { "fieldPath": "expiresAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

**End of Phase 17: Enterprise Security Foundation Module (100% Complete).**
