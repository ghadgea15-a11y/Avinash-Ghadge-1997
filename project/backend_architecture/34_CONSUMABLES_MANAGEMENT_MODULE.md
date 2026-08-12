# LOG SHEET MUSTER — PHASE 34: ENTERPRISE CONSUMABLES MANAGEMENT MODULE (100% COMPLETE)

Enterprise-grade, production-ready Consumables Management Module for Log Sheet Muster. Controls inventory lifecycles of office supplies, housekeeping chemicals, sanitizer, visitor badges, log registers, batteries, and torchlights across site locations and branch offices with reorder automation.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All Consumables Management collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/consumablesMaster/{consumableId}
/companies/{cid}/consumableStock/{stockId}
/companies/{cid}/consumableIssues/{issueId}
/companies/{cid}/consumableReorders/{reorderId}
```

### 1.1 `consumablesMaster` (Item Catalog)
* **Path:** `/companies/{companyId}/consumablesMaster/{consumableId}`
* **Document ID:** `CONM-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `consumableId` | String | Yes | Unique Consumable Master ID |
| `companyId` | String | Yes | Tenant isolation key |
| `name` | String | Yes | E.g. `"Visitor Register 200 Pages"`, `"AA Batteries 10 Pack"`, `"Sanitizer 5L"` |
| `category` | String | Yes | Enum: `'LOG_REGISTERS' \| 'STATIONERY' \| 'CLEANING_CHEMICALS' \| 'BATTERIES_TORCH' \| 'FIRST_AID_REFILLS'` |
| `unitOfMeasure` | String | Yes | Enum: `'PIECE' \| 'PACK' \| 'LITER' \| 'BOX'` |
| `reorderThreshold` | Number | Yes | Minimum stock across company before reorder alert |

### 1.2 `consumableIssues` (Site Material Dispatch)
* **Path:** `/companies/{companyId}/consumableIssues/{issueId}`
* **Document ID:** `CONISS-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `issueId` | String | Yes | Unique Issue ID |
| `companyId` | String | Yes | Tenant isolation key |
| `siteId` | String | Yes | Destination Site ID |
| `issuedByUserId` | String | Yes | Storekeeper User ID |
| `receivedByUserId` | String | Yes | Site Supervisor User ID |
| `items` | Array<Map> | Yes | `[{ consumableId: "CONM-001", quantity: 5, unitPrice: 120 }]` |
| `issuedAt` | Timestamp | Yes | Issue timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

1. **Auto Purchase Request Generation**: When site consumption brings branch `quantityInHand` below `reorderThreshold`, a Purchase Requisition is auto-created in Procurement Engine (Phase 09).
2. **Site Material Register**: Field supervisors verify received items against dispatch digital challan on Android app.

---

## 3. FIRESTORE SECURITY RULES

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{cid} {
      match /consumablesMaster/{consumableId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow write: if sameCompany(cid) && mgmtTier();
      }
      match /consumableIssues/{issueId} {
        allow read: if sameCompany(cid) && (opsTier() || mgmtTier());
        allow create: if sameCompany(cid) && opsTier();
      }
    }
  }
}
```

---

**End of Phase 34: Enterprise Consumables Management Module.**
