# LOG SHEET MUSTER — PHASE 33: ENTERPRISE UNIFORM MANAGEMENT MODULE (100% COMPLETE)

Enterprise-grade, production-ready Uniform Management Module for Log Sheet Muster. Tracks uniform items (shirts, trousers, caps, belts, boots, lanyards, jackets), size matrices, stock levels per branch warehouse, issue to guards, return/exchange workflows, damage recoveries via payroll deduction, and QR code tracking.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All Uniform Management collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/uniformCategories/{catId}
/companies/{cid}/uniformStock/{stockId}
/companies/{cid}/uniformIssues/{issueId}
/companies/{cid}/uniformReturns/{returnId}
/companies/{cid}/uniformDamageRecoveries/{recoveryId}
```

### 1.1 `uniformStock` (Inventory Stock per Branch Warehouse)
* **Path:** `/companies/{companyId}/uniformStock/{stockId}`
* **Document ID:** `UNIFORM-{branchId}-{sku}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `stockId` | String | Yes | Unique Stock SKU ID |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch Warehouse ID |
| `itemCategory` | String | Yes | Enum: `'SHIRT' \| 'TROUSER' \| 'SAFETY_BOOTS' \| 'CAP' \| 'BELT' \| 'JACKET' \| 'LANYARD_ID'` |
| `size` | String | Yes | E.g. `"38"`, `"40"`, `"L"`, `"XL"`, `"8"` |
| `quantityInHand` | Number | Yes | Quantity in stock |
| `reorderLevel` | Number | Yes | Low stock threshold |
| `unitCost` | Number | Yes | Purchase cost per unit |
| `updatedAt` | Timestamp | Yes | Last stock update |

### 1.2 `uniformIssues` (Issue to Guards & Signoff)
* **Path:** `/companies/{companyId}/uniformIssues/{issueId}`
* **Document ID:** `UNISS-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `issueId` | String | Yes | Unique Issue ID |
| `companyId` | String | Yes | Tenant isolation key |
| `employeeId` | String | Yes | Employee ID receiving uniform |
| `issuedByUserId` | String | Yes | Storekeeper User ID |
| `items` | Array<Map> | Yes | `[{ itemCategory: "SHIRT", size: "40", qty: 2, unitPrice: 450, qrCode: "QR-S40-001" }]` |
| `isPayrollDeductible` | Boolean | Yes | True if issued as a chargeable/recoverable uniform deposit |
| `signatureStorageId` | String | Yes | Employee digital signoff image |
| `issuedAt` | Timestamp | Yes | Issue timestamp |

### 1.3 `uniformDamageRecoveries` (Payroll Deduction Link)
* **Path:** `/companies/{companyId}/uniformDamageRecoveries/{recoveryId}`
* **Document ID:** `UNIDMG-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `recoveryId` | String | Yes | Unique Damage Recovery ID |
| `companyId` | String | Yes | Tenant isolation key |
| `employeeId` | String | Yes | Employee ID charged |
| `amount` | Number | Yes | Recovery amount |
| `payrollPeriod` | String | Yes | E.g. `"2026-07"` |
| `reason` | String | Yes | E.g. `"Lost jacket / Unreturned upon resignation"` |
| `status` | String | Yes | Enum: `'PENDING_PAYROLL' \| 'DEDUCTED' \| 'WAIVED'` |

---

## 2. BUSINESS LOGIC & WORKFLOWS

1. **Onboarding Uniform Kit Allocation**: When a new guard is onboarded in ESS (Phase 25), default uniform kit request is generated. Storekeeper fulfills with digital signature verification.
2. **Resignation & Return Check**: When an employee resignation is processed, Clearance Check verifies returned uniform QR codes against active issue logs. Missing items trigger an automated `uniformDamageRecoveries` entry into Payroll (Phase 08).

---

## 3. FIRESTORE SECURITY RULES

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{cid} {
      match /uniformStock/{stockId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow write: if sameCompany(cid) && mgmtTier();
      }
      match /uniformIssues/{issueId} {
        allow read: if sameCompany(cid) && (opsTier() || (isEmployeeUser() && matchesEmployeeId(cid, resource.data.employeeId)));
        allow create: if sameCompany(cid) && opsTier();
      }
      match /uniformDamageRecoveries/{recoveryId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow write: if sameCompany(cid) && mgmtTier();
      }
    }
  }
}
```

---

**End of Phase 33: Enterprise Uniform Management Module.**
