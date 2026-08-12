# LOG SHEET MUSTER — PHASE 9: ENTERPRISE ASSET MANAGEMENT MODULE (100% COMPLETE)
Enterprise-grade, production-ready Asset Management System for Log Sheet Muster. Fully integrated with Employee Master, Sites, Branches, Warehouses & Inventory, Procurement (PO → Asset Conversion), Payroll (Asset Damage Recoveries), Notifications, and System Core Engines.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All asset management collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/assetCategories/{categoryId}
/companies/{cid}/assets/{assetId}
/companies/{cid}/assetAllocations/{allocationId}
/companies/{cid}/assetMaintenances/{maintenanceId}
/companies/{cid}/assetDepreciations/{depreciationId}
/companies/{cid}/assetDisposals/{disposalId}
/companies/{cid}/assetAudits/{auditId}
```

---

### 1.1 `assetCategories` (Asset Classification Master)
Taxonomy of enterprise physical and IT assets with default depreciation rates and maintenance interval rules.
* **Path:** `/companies/{companyId}/assetCategories/{categoryId}`
* **Document ID:** `ACAT-{UUID}` or `ACAT-{CODE}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `categoryId` | String | Yes | Category ID |
| `companyId` | String | Yes | Tenant isolation key |
| `name` | String | Yes | Category Name (e.g. "IT Hardware", "Vehicles", "Security Equipment", "Furniture") |
| `code` | String | Yes | Code (e.g., `ITHW`, `VEH`, `SECEQ`, `FURN`) |
| `depreciationMethod` | String | Yes | Enum: `'STRAIGHT_LINE' \| 'WRITTEN_DOWN_VALUE' \| 'NONE'` |
| `depreciationRateAnnual` | Number | Yes | Annual percentage rate (e.g., `15.0` for 15% per annum) |
| `usefulLifeYears` | Number | Yes | Expected asset lifespan in years (e.g., `3`, `5`, `10`) |
| `preventiveMaintenanceIntervalDays` | Number | Optional | Maintenance interval trigger in days (e.g. `90` days for bi-annual servicing) |
| `requiresInsurance` | Boolean | Yes | True if assets in this category require active insurance policy tracking |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'INACTIVE'` |
| `version` | Number | Yes | Concurrency counter |

---

### 1.2 `assets` (Asset Master Registry)
Central registry tracking physical assets, barcode/QR tags, serial numbers, financial acquisition details, warranty, maintenance status, and current location.
* **Path:** `/companies/{companyId}/assets/{assetId}`
* **Document ID:** `AST-{TAG}` or `AST-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `assetId` | String | Yes | Unique Asset ID |
| `companyId` | String | Yes | Tenant isolation key |
| `assetTag` | String | Yes | Unique physical asset tag / barcode ID (e.g. `AST-2026-0089`) |
| `name` | String | Yes | Asset Name (e.g. "Metal Detector Scanner X300", "Dell Latitude 5420 Laptop") |
| `categoryId` | String | Yes | Reference to `/assetCategories/{categoryId}` |
| `serialNumber` | String | Optional | Manufacturer serial number |
| `barcode` | String | Optional | Barcode representation string |
| `qrCode` | String | Optional | QR payload string for mobile tablet scanning |
| `purchaseOrderId` | String | Optional | Reference to `/purchaseOrders/{poId}` if procured via Procurement |
| `purchaseDate` | String | Yes | Acquisition date `"YYYY-MM-DD"` |
| `purchaseCost` | Number | Yes | Original purchase price |
| `currentValue` | Number | Yes | Net Book Value (Purchase Cost minus accumulated depreciation) |
| `salvageValue` | Number | Yes | Estimated scrap / residual value at end of useful life |
| `supplierId` | String | Optional | Reference to `/suppliers/{supplierId}` |
| `warrantyExpiryDate` | String | Optional | Expiry date of manufacturer warranty `"YYYY-MM-DD"` |
| `amcContractId` | String | Optional | Reference to Annual Maintenance Contract |
| `currentBranchId` | String | Yes | Assigned Branch ID |
| `currentSiteId` | String | Optional | Assigned Site ID location |
| `currentWarehouseId` | String | Optional | Current store location (if in store / unallocated) |
| `assignedEmployeeId` | String | Optional | Assigned custodian employee ID |
| `allocationStatus` | String | Yes | Enum: `'UNALLOCATED_STORE' \| 'ALLOCATED_EMPLOYEE' \| 'ALLOCATED_SITE' \| 'IN_MAINTENANCE' \| 'DISPOSED'` |
| `condition` | String | Yes | Enum: `'EXCELLENT' \| 'GOOD' \| 'FAIR' \| 'DAMAGED' \| 'SCRAP'` |
| `isUnderAmc` | Boolean | Yes | True if covered under active AMC contract |
| `nextMaintenanceDueDate` | String | Optional | Target date for next scheduled servicing `"YYYY-MM-DD"` |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'UNDER_REPAIR' \| 'SCRAPPED' \| 'SOLD' \| 'LOST'` |
| `isDeleted` | Boolean | Yes | Soft delete flag |
| `version` | Number | Yes | Optimistic concurrency counter |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

---

### 1.3 `assetAllocations` (Asset Allocation & Handover Chain)
Tracks history of asset issues, site deployments, employee custodian handovers, digital signatures, and returns.
* **Path:** `/companies/{companyId}/assetAllocations/{allocationId}`
* **Document ID:** `ALLOC-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `allocationId` | String | Yes | Allocation Record ID |
| `companyId` | String | Yes | Tenant isolation key |
| `assetId` | String | Yes | Reference to `/assets/{assetId}` |
| `assetTag` | String | Yes | Denormalized Asset Tag |
| `allocationType` | String | Yes | Enum: `'EMPLOYEE_CUSTODIAN' \| 'SITE_DEPLOYMENT' \| 'WAREHOUSE_STORE'` |
| `employeeId` | String | Optional | Receiving custodian employee ID |
| `employeeUserId` | String | Optional | Receiving user ID |
| `siteId` | String | Optional | Receiving site location ID |
| `warehouseId` | String | Optional | Target store location ID |
| `issueDate` | String | Yes | Issue date `"YYYY-MM-DD"` |
| `expectedReturnDate` | String | Optional | Target return date if temporary deployment |
| `actualReturnDate` | String | Optional | Actual return date `"YYYY-MM-DD"` |
| `handoverSignatureUrl` | String | Optional | URL of digital signature / token from mobile app |
| `returnCondition` | String | Optional | Condition upon return |
| `damageReported` | Boolean | Yes | True if returned damaged |
| `damageRecoveryAmount` | Number | Optional | Chargeable amount passed to Payroll for deduction |
| `status` | String | Yes | Enum: `'ACTIVE_ALLOCATED' \| 'RETURNED' \| 'TRANSFERRED' \| 'DAMAGED'` |
| `issuedByUserId` | String | Yes | Storekeeper / Asset Admin `userId` |
| `version` | Number | Yes | Concurrency counter |

---

### 1.4 `assetMaintenances` (Service & AMC Repair Logs)
Records scheduled preventive maintenance, breakdown repairs, AMC service calls, and spare parts cost.
* **Path:** `/companies/{companyId}/assetMaintenances/{maintenanceId}`
* **Document ID:** `MNT-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `maintenanceId` | String | Yes | Repair Ticket ID |
| `companyId` | String | Yes | Tenant isolation key |
| `assetId` | String | Yes | Reference to `/assets/{assetId}` |
| `type` | String | Yes | Enum: `'PREVENTIVE_SCHEDULED' \| 'BREAKDOWN_REPAIR' \| 'AMC_SERVICING' \| 'CALIBRATION'` |
| `serviceVendorSupplierId` | String | Optional | External service vendor ID |
| `scheduledDate` | String | Yes | Target maintenance date `"YYYY-MM-DD"` |
| `completionDate` | String | Optional | Completion timestamp date |
| `issueDescription` | String | Yes | Problem / maintenance requirements description |
| `actionTaken` | String | Optional | Service summary executed |
| `partsCost` | Number | Yes | Spare parts cost |
| `laborCost` | Number | Yes | Technician labor cost |
| `totalCost` | Number | Yes | Total repair cost: `partsCost + laborCost` |
| `status` | String | Yes | Enum: `'SCHEDULED' \| 'IN_PROGRESS' \| 'COMPLETED' \| 'CANCELLED'` |
| `loggedByUserId` | String | Yes | `userId` |

---

### 1.5 `assetDepreciations` (Financial Depreciation Ledger)
Periodic financial depreciation postings tracking monthly/annual written down value and accumulated depreciation.
* **Path:** `/companies/{companyId}/assetDepreciations/{depreciationId}`
* **Document ID:** `DEP-{YYYYMM}-{assetId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `depreciationId` | String | Yes | Depreciation ID |
| `companyId` | String | Yes | Tenant isolation key |
| `assetId` | String | Yes | Reference to `/assets/{assetId}` |
| `fiscalPeriod` | String | Yes | Fiscal month `"YYYY-MM"` |
| `openingBookValue` | Number | Yes | Book value before period depreciation |
| `depreciationAmount` | Number | Yes | Calculated depreciation expense for period |
| `accumulatedDepreciation` | Number | Yes | Total historical depreciation to date |
| `closingBookValue` | Number | Yes | Ending Net Book Value |
| `calculationMethod` | String | Yes | Enum: `'STRAIGHT_LINE' \| 'WRITTEN_DOWN_VALUE'` |
| `postedAt` | Timestamp | Yes | Server calculation timestamp |

---

### 1.6 `assetDisposals` (Decommissioning & Scrap Write-offs)
Tracks formal asset write-off, scrap sale, auction, or disposal authorization.
* **Path:** `/companies/{companyId}/assetDisposals/{disposalId}`
* **Document ID:** `DISP-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `disposalId` | String | Yes | Disposal ID |
| `companyId` | String | Yes | Tenant isolation key |
| `assetId` | String | Yes | Reference to `/assets/{assetId}` |
| `disposalType` | String | Yes | Enum: `'SCRAP' \| 'SALE' \| 'DONATION' \| 'LOST_STOLEN_WRITE_OFF'` |
| `bookValueAtDisposal` | Number | Yes | Net book value at time of disposal |
| `saleAmount` | Number | Yes | Revenue generated from sale / scrap |
| `gainLossAmount` | Number | Yes | `saleAmount - bookValueAtDisposal` (Gain or Loss) |
| `disposalReason` | String | Yes | Justification |
| `status` | String | Yes | Enum: `'PENDING_APPROVAL' \| 'APPROVED_DISPOSED' \| 'REJECTED'` |
| `approvalInstanceRef` | String | Yes | Approval Engine reference |
| `approvedByUserId` | String | Optional | Admin `userId` |

---

### 1.7 `assetAudits` (Physical Barcode / QR Scan Audits)
Periodic physical audit execution where auditors scan asset tags at sites/warehouses and record physical count variances.
* **Path:** `/companies/{companyId}/assetAudits/{auditId}`
* **Document ID:** `AAUD-{YYYYMM}-{siteId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `auditId` | String | Yes | Audit ID |
| `companyId` | String | Yes | Tenant isolation key |
| `siteId` | String | Optional | Site location audited |
| `warehouseId` | String | Optional | Store room audited |
| `auditDate` | String | Yes | Audit date `"YYYY-MM-DD"` |
| `scannedAssets` | Array<Map> | Yes | `[{ assetId: String, assetTag: String, scanStatus: "FOUND" \| "MISPLACED" \| "MISSING", physicalCondition: String, remarks: String }]` |
| `totalExpected` | Number | Yes | Total expected asset count |
| `totalFound` | Number | Yes | Count found at location |
| `totalMissing` | Number | Yes | Count missing / misplaced |
| `status` | String | Yes | Enum: `'IN_PROGRESS' \| 'COMPLETED' \| 'DISCREPANCY_FLAGGED'` |
| `auditedByUserId` | String | Yes | Auditor `userId` |

---

## 2. BUSINESS LOGIC & WORKFLOW AUTOMATION

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   ASSET MANAGEMENT LIFECYCLE ENGINE                      │
├─────────────────┬──────────────────┬─────────────────┬───────────────────┤
│ 1. Procurement  │ 2. Allocation &  │ 3. Maintenance  │ 4. Depreciation,  │
│ Conversion      │ Handover Workflow│ & Service AMC   │ Audit & Disposal  │
│ (PO → Asset)    │ (Mobile Signature│ Automation      │ Engine            │
└────────┬────────┴────────┬─────────┴────────┬────────┴─────────┬─────────┘
         │                 │                  │                  │
         └─────────────────┴────────┬─────────┴──────────────────┘
                                    ▼
                      [ Asset State Lifecycle Engine ]
                      UNALLOCATED_STORE → ALLOCATED_EMPLOYEE / SITE 
                                        → IN_MAINTENANCE 
                                        → DISPOSED
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
              [ Payroll Integration ]  [ Notification Engine ]
              - Charges damaged asset  - Alerts on Warranty/AMC Expiry
              - Deducts recovery from  - Servicing due push alerts
                monthly payslip        - Low stock / missing asset alerts
```

---

### 2.1 Procurement PO to Asset Conversion Workflow
* When a Goods Receipt Note (`/goodsReceipts`) is approved for an item flagged as `isTrackedBySerial = true` or tagged as capital equipment:
  1. System auto-generates `/assets` documents with generated `assetTag` (Barcode/QR).
  2. Sets `purchaseCost = GRN unit price`, `currentValue = purchaseCost`, `allocationStatus = 'UNALLOCATED_STORE'`.
  3. Increments store asset count and notifies Store Keeper to attach physical barcode label.

---

### 2.2 Custodian Allocation & Return Workflow
1. **Issue:** Asset Admin assigns asset to Employee Custodian or Site Location.
2. **Handover:** Custodian receives FCM push alert and verifies condition → signs digital acknowledgment via mobile app (`handoverSignatureUrl`).
3. **Return & Damage Recovery:**
   * When returned, Storekeeper inspects condition.
   * If `damageReported == true`: Storekeeper inputs `damageRecoveryAmount`.
   * System creates a pending `/reimbursements` or `/salaryAdvances` recovery line item routed directly to the Payroll Engine for monthly salary deduction.

---

### 2.3 Scheduled Preventive Maintenance & AMC Trigger
* Daily scheduled Cloud Function `checkAssetMaintenanceSchedules`:
  * Evaluates `assets.nextMaintenanceDueDate` and active AMC contracts.
  * When `nextMaintenanceDueDate <= Today + 7 Days`:
    * Auto-creates a scheduled `/assetMaintenances` ticket (`status = 'SCHEDULED'`).
    * Triggers FCM push alert to Maintenance Supervisor and Site Incharge.

---

## 3. FIRESTORE SECURITY RULES (ASSET MODULE)

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
    function opsTier()   { return roleAtLeast(['companyOwner','admin','hr','manager','incharge','supervisor','storekeeper']); }

    match /companies/{cid} {

      // --- ASSET CATEGORIES ---
      match /assetCategories/{catId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && mgmtTier();
      }

      // --- ASSET MASTER ---
      match /assets/{assetId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && opsTier();
      }

      // --- ASSET ALLOCATIONS ---
      match /assetAllocations/{allocId} {
        allow read: if sameCompany(cid) && (
          opsTier() || request.auth.uid == resource.data.employeeUserId
        );
        allow create, update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }

      // --- ASSET MAINTENANCES ---
      match /assetMaintenances/{mntId} {
        allow read: if sameCompany(cid) && opsTier();
        allow create, update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }

      // --- ASSET DEPRECIATIONS ---
      match /assetDepreciations/{depId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow write: if false; // Cloud Functions exclusively
      }

      // --- ASSET DISPOSALS ---
      match /assetDisposals/{dispId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow create, update: if sameCompany(cid) && mgmtTier();
        allow delete: if false;
      }

      // --- ASSET AUDITS ---
      match /assetAudits/{auditId} {
        allow read: if sameCompany(cid) && opsTier();
        allow create, update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (ASSET MODULE)

```json
{
  "indexes": [
    {
      "collectionGroup": "assets",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "allocationStatus", "order": "ASCENDING" },
        { "fieldPath": "currentSiteId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "assets",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "assignedEmployeeId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "assetAllocations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "assetId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "assetMaintenances",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "scheduledDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "assetAudits",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "auditDate", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 5. ERROR HANDLING & VALIDATION CODES

| Error Code | Message | Resolution |
|---|---|---|
| `ERR_ASSET_ALREADY_ALLOCATED` | Asset is currently allocated to another employee or site location. | Process Return of existing allocation before re-assigning. |
| `ERR_ASSET_IN_MAINTENANCE` | Cannot allocate an asset currently under active repair or servicing. | Complete maintenance ticket before releasing asset to store. |
| `ERR_BARCODE_TAG_DUPLICATE` | Physical asset tag barcode already registered in company asset registry. | Use a unique barcode asset tag identifier. |
| `ERR_ASSET_DISPOSED` | Operations blocked. Asset is marked as DISPOSED / SCRAPPED. | Decommissioned assets cannot be allocated or serviced. |

---

**End of Phase 9: Enterprise Asset Management Module (100% Complete).**
