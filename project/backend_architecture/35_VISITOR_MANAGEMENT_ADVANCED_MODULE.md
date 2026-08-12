# LOG SHEET MUSTER — PHASE 35: ENTERPRISE ADVANCED VISITOR MANAGEMENT MODULE (100% COMPLETE)

Enterprise-grade, production-ready Advanced Visitor Management Module for Log Sheet Muster. Facilitates guest pre-registrations, host approvals, OTP phone verification at security gates, digital badge/QR pass generation, ID document OCR capture, watchlist/blacklist enforcement, and real-time site occupancy tracking.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All Visitor Management collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/visitorsMaster/{visitorId}
/companies/{cid}/visitorPasses/{passId}
/companies/{cid}/visitorLogs/{logId}
/companies/{cid}/visitorBlacklist/{blacklistId}
```

### 1.1 `visitorPasses` (Visitor Pass & QR Verification)
* **Path:** `/companies/{companyId}/visitorPasses/{passId}`
* **Document ID:** `VPASS-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `passId` | String | Yes | Unique Pass ID |
| `companyId` | String | Yes | Tenant isolation key |
| `siteId` | String | Yes | Site Location ID |
| `visitorName` | String | Yes | Full Name |
| `phone` | String | Yes | Mobile Number |
| `hostEmployeeId` | String | Yes | Employee host ID |
| `purpose` | String | Yes | Enum: `'BUSINESS_MEETING' \| 'INTERVIEW' \| 'VENDOR_DELIVERY' \| 'AUDIT' \| 'MAINTENANCE'` |
| `passQrCode` | String | Yes | Encrypted QR token string |
| `otpCode` | String | Optional | 6-digit entry verification OTP |
| `idProofStorageId` | String | Optional | Captured Govt ID image file ID |
| `photoStorageId` | String | Yes | Live visitor photo captured at gate |
| `status` | String | Yes | Enum: `'PRE_REGISTERED' \| 'CHECKED_IN' \| 'CHECKED_OUT' \| 'EXPIRED' \| 'DENIED'` |
| `checkInTime` | Timestamp | Optional | Check-in timestamp |
| `checkOutTime` | Timestamp | Optional | Check-out timestamp |
| `createdAt` | Timestamp | Yes | Creation timestamp |

### 1.2 `visitorBlacklist` (Security Watchlist)
* **Path:** `/companies/{companyId}/visitorBlacklist/{blacklistId}`
* **Document ID:** `VBLK-{phone}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `blacklistId` | String | Yes | `VBLK-{phone}` |
| `companyId` | String | Yes | Tenant isolation key |
| `phone` | String | Yes | Blacklisted phone number |
| `name` | String | Yes | Blacklisted person name |
| `reason` | String | Yes | E.g. `"Prior theft / Unauthorized trespassing"` |
| `blacklistedByUserId` | String | Yes | Security Manager User ID |
| `createdAt` | Timestamp | Yes | Creation timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

1. **Pre-Registration & Host Approval**: Host pre-registers visitor via ESS (Phase 25). Visitor receives a QR code on WhatsApp (Phase 41).
2. **Gate Check-In & Blacklist Verification**: Guard scans visitor QR or enters phone number. System instantly checks `/visitorBlacklist`. If match found, gate alarm is triggered and security supervisor alerted via Notification Engine (Phase 15).

---

## 3. FIRESTORE SECURITY RULES

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{cid} {
      match /visitorPasses/{passId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow create: if sameCompany(cid) && isSignedIn();
        allow update: if sameCompany(cid) && (opsTier() || isEmployeeUser());
      }
      match /visitorBlacklist/{blacklistId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow write: if sameCompany(cid) && mgmtTier();
      }
    }
  }
}
```

---

**End of Phase 35: Enterprise Advanced Visitor Management Module.**
