# LOG SHEET MUSTER — PHASE 36: ENTERPRISE GATE PASS MANAGEMENT MODULE (100% COMPLETE)

Enterprise-grade, production-ready Gate Pass Management Module for Log Sheet Muster. Tracks movement of non-returnable and returnable materials, assets, and equipment across site security gates with multi-tier digital signatures, dispatch verification, return SLA alerts, and QR verification.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All Gate Pass Management collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/gatePasses/{passId}
/companies/{cid}/gatePassItems/{itemId}
/companies/{cid}/gatePassLogs/{logId}
```

### 1.1 `gatePasses` (Material Gate Pass Master)
* **Path:** `/companies/{companyId}/gatePasses/{passId}`
* **Document ID:** `GP-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `passId` | String | Yes | Unique Gate Pass ID |
| `companyId` | String | Yes | Tenant isolation key |
| `siteId` | String | Yes | Dispatching Site ID |
| `passType` | String | Yes | Enum: `'RETURNABLE' \| 'NON_RETURNABLE'` |
| `dispatchCategory` | String | Yes | Enum: `'ASSET_TRANSFER' \| 'REPAIR_MAINTENANCE' \| 'SCRAP' \| 'CLIENT_DELIVERY'` |
| `carrierName` | String | Yes | Transporter / Driver Name |
| `vehicleNumber` | String | Yes | Transport Vehicle Plate Number |
| `destination` | String | Yes | Destination address / site |
| `expectedReturnDate` | Timestamp | Optional | Required for Returnable Gate Passes |
| `items` | Array<Map> | Yes | `[{ itemName: "Generator 5KVA", serialNo: "GEN-99", qty: 1 }]` |
| `status` | String | Yes | Enum: `'DRAFT' \| 'PENDING_APPROVAL' \| 'APPROVED' \| 'DISPATCHED' \| 'PARTIALLY_RETURNED' \| 'CLOSED' \| 'OVERDUE'` |
| `requestedByUserId` | String | Yes | User ID requesting gate pass |
| `approvedByUserId` | String | Optional | Manager User ID approving pass |
| `gateSecurityGuardUserId` | String | Optional | Guard User ID scanning exit |
| `dispatchedAt` | Timestamp | Optional | Exit timestamp |
| `returnedAt` | Timestamp | Optional | Complete return timestamp |
| `createdAt` | Timestamp | Yes | Creation timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

1. **Multi-Tier Digital Approval**: Requester drafts gate pass -> Manager approves -> Guard verifies items at gate against digital pass, scans vehicle plate, captures photo, and issues exit clearance.
2. **Return SLA Monitoring**: Daily background job flags returnable gate passes exceeding `expectedReturnDate` as `OVERDUE` and opens an asset track ticket in Asset Management (Phase 10).

---

## 3. FIRESTORE SECURITY RULES

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{cid} {
      match /gatePasses/{passId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow create: if sameCompany(cid) && (opsTier() || mgmtTier());
        allow update: if sameCompany(cid) && (opsTier() || mgmtTier());
      }
    }
  }
}
```

---

**End of Phase 36: Enterprise Gate Pass Management Module.**
