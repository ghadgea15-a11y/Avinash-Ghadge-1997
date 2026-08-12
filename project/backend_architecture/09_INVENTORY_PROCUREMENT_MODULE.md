# LOG SHEET MUSTER — PHASE 7: ENTERPRISE INVENTORY & PROCUREMENT MANAGEMENT MODULE (100% COMPLETE)
Enterprise-grade, production-ready Inventory & Procurement Management System for Log Sheet Muster. Fully integrated with Employee Master, Departments, Sites, Branches, Regions, Asset Management (future-ready), Billing, and System Core Engines.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All inventory and procurement collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/suppliers/{supplierId}
/companies/{cid}/inventoryCategories/{categoryId}
/companies/{cid}/inventoryItems/{itemId}
/companies/{cid}/warehouses/{warehouseId}
/companies/{cid}/itemStockLevels/{levelId}
/companies/{cid}/purchaseRequisitions/{requisitionId}
/companies/{cid}/purchaseOrders/{poId}
/companies/{cid}/goodsReceipts/{grnId}
/companies/{cid}/stockTransactions/{txnId}
/companies/{cid}/materialRequests/{requestId}
/companies/{cid}/materialIssues/{issueId}
/companies/{cid}/stockTransfers/{transferId}
/companies/{cid}/stockAudits/{auditId}
```

---

### 1.1 `suppliers` (Vendor Master)
Master registry of approved suppliers, contact details, payment terms, tax IDs, and vendor evaluation ratings.
* **Path:** `/companies/{companyId}/suppliers/{supplierId}`
* **Document ID:** `SUPP-{UUID}` or `SUPP-{CODE}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `supplierId` | String | Yes | Unique Supplier ID |
| `companyId` | String | Yes | Tenant isolation key |
| `name` | String | Yes | Registered Business Name |
| `code` | String | Yes | Vendor Code (e.g. `VEND-IND-001`) |
| `category` | String | Yes | Primary supply category (e.g., `'UNIFORMS'`, `'EQUIPMENT'`, `'STATIONERY'`, `'HARDWARE'`) |
| `contactPerson` | String | Yes | Primary representative name |
| `phone` | String | Yes | Contact phone number |
| `email` | String | Yes | Official email address |
| `address` | Map | Yes | `{ street: String, city: String, state: String, postalCode: String, country: String }` |
| `gstinPanTaxId` | String | Yes | Tax Registration / GSTIN / TIN number |
| `bankDetails` | Map | Yes | `{ bankName: String, accountNumber: String, ifscCode: String, branch: String }` |
| `paymentTermsDays` | Number | Yes | Credit period allowed in days (e.g., `30`, `45`, `60`) |
| `rating` | Number | Optional | Performance rating (1.0 to 5.0) |
| `status` | String | Yes | Enum: `'PENDING_VERIFICATION' \| 'APPROVED' \| 'SUSPENDED' \| 'BLACK_LISTED'` |
| `isDeleted` | Boolean | Yes | Soft delete flag |
| `version` | Number | Yes | Optimistic locking counter |
| `createdByUserId` | String | Yes | `userId` |
| `createdAt` | Timestamp | Yes | Creation timestamp |

---

### 1.2 `inventoryCategories` (Item Taxonomies)
Hierarchy of material categories and subcategories with default tax codes and accounting GL codes.
* **Path:** `/companies/{companyId}/inventoryCategories/{categoryId}`
* **Document ID:** `CAT-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `categoryId` | String | Yes | Category ID |
| `companyId` | String | Yes | Tenant isolation key |
| `name` | String | Yes | Category Name (e.g., "Safety & PPE", "Uniforms & Badges", "IT Hardware") |
| `code` | String | Yes | Code (e.g. `PPE`, `UNIF`, `ITHW`) |
| `parentCategoryId` | String | Optional | Null if root category, else parent ID for subcategories |
| `defaultUom` | String | Yes | Standard Unit of Measurement (e.g. `PCS`, `KG`, `LTR`, `BOX`, `SET`) |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'INACTIVE'` |

---

### 1.3 `inventoryItems` (Item Master / SKU Registry)
Central SKU master holding product specifications, barcode/QR codes, reorder thresholds, UOM, and valuation rules.
* **Path:** `/companies/{companyId}/inventoryItems/{itemId}`
* **Document ID:** `ITEM-{SKU}` or `ITEM-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `itemId` | String | Yes | Item ID / SKU |
| `companyId` | String | Yes | Tenant isolation key |
| `skuCode` | String | Yes | Unique SKU Code (e.g. `SKU-SEC-UNIF-L`) |
| `name` | String | Yes | Item Name (e.g. "Security Guard Jacket - Large", "Walkie Talkie Battery 3.7V") |
| `description` | String | Optional | Detailed specification |
| `categoryId` | String | Yes | Reference to `inventoryCategories/{categoryId}` |
| `uom` | String | Yes | Primary Unit of Measurement (e.g. `"PCS"`, `"SET"`) |
| `secondaryUom` | String | Optional | Packaging unit (e.g. `"BOX"` containing 10 PCS) |
| `conversionFactor` | Number | Optional | Units per secondary UOM (e.g., 10) |
| `barcode` | String | Optional | EAN/UPC Barcode string |
| `qrCode` | String | Optional | Unique QR payload identifier |
| `isTrackedByBatch` | Boolean | Yes | True if batch number & manufacturing date required |
| `isTrackedBySerial` | Boolean | Yes | True if serial number tracking enforced (for IT assets/equipment) |
| `hasExpiryDate` | Boolean | Yes | True if item expires (first-aid kits, chemicals, batteries) |
| `shelfLifeDays` | Number | Optional | Expiry period in days from receipt |
| `minReorderLevel` | Number | Yes | Safety buffer quantity trigger for Low Stock alerts |
| `reorderQuantity` | Number | Yes | Standard reorder batch size |
| `maxStockLevel` | Number | Yes | Maximum store capacity limit |
| `standardCost` | Number | Yes | Standard purchase price per unit |
| `valuationMethod` | String | Yes | Enum: `'FIFO' \| 'WEIGHTED_AVERAGE' \| 'STANDARD_COST'` |
| `preferredSupplierId` | String | Optional | Reference to default `/suppliers/{id}` |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'INACTIVE' \| 'DISCONTINUED'` |
| `isDeleted` | Boolean | Yes | Soft delete flag |
| `version` | Number | Yes | Concurrency counter |

---

### 1.4 `warehouses` (Store & Depot Locations)
Physical store rooms, central warehouses, or site depots managing physical inventory stock.
* **Path:** `/companies/{companyId}/warehouses/{warehouseId}`
* **Document ID:** `WH-{branchId}-{siteId}` or `WH-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `warehouseId` | String | Yes | Warehouse ID |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch association |
| `siteId` | String | Optional | Site association (null for central central store) |
| `name` | String | Yes | Display Name (e.g., "Central Logistics Hub", "Site B Store Room") |
| `code` | String | Yes | Store code (e.g., `WH-CENTRAL`, `WH-SITE-B`) |
| `type` | String | Yes | Enum: `'CENTRAL_WAREHOUSE' \| 'SITE_STORE' \| 'TRANSIT_STORE' \| 'SCRAP_YARD'` |
| `address` | Map | Yes | Full physical location details |
| `storeKeeperUserIds` | Array<String> | Yes | Array of user IDs authorized to issue/receive materials |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'INACTIVE'` |

---

### 1.5 `itemStockLevels` (Real-Time Store Balance per SKU)
Real-time stock balance, reserved stock, and bin locations for an item in a specific store room.
* **Path:** `/companies/{companyId}/itemStockLevels/{levelId}`
* **Document ID:** `STOCK-{warehouseId}-{itemId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `levelId` | String | Yes | `STOCK-{warehouseId}-{itemId}` |
| `companyId` | String | Yes | Tenant isolation key |
| `warehouseId` | String | Yes | Reference to `/warehouses/{id}` |
| `itemId` | String | Yes | Reference to `/inventoryItems/{id}` |
| `skuCode` | String | Yes | Denormalized SKU |
| `currentQuantity` | Number | Yes | Physical on-hand stock quantity |
| `reservedQuantity` | Number | Yes | Stock allocated to open Material Requests |
| `availableQuantity` | Number | Yes | Net available: `currentQuantity - reservedQuantity` |
| `inTransitQuantity` | Number | Yes | Quantity currently in transit from stock transfers |
| `binLocation` | String | Optional | Shelf/Rack identifier (e.g. `"RACK-A3-SHELF-2"`) |
| `lastAuditDate` | String | Optional | Date of last physical stock count `"YYYY-MM-DD"` |
| `updatedAt` | Timestamp | Yes | Timestamp of last stock balance update |

---

### 1.6 `purchaseRequisitions` (Internal Purchase Intent)
Internal material demand generated by site supervisors or storekeepers requesting procurement.
* **Path:** `/companies/{companyId}/purchaseRequisitions/{requisitionId}`
* **Document ID:** `PR-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `requisitionId` | String | Yes | Unique PR ID |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch ID |
| `siteId` | String | Yes | Target destination site |
| `warehouseId` | String | Yes | Destination store room |
| `requestedByUserId` | String | Yes | `userId` of requester |
| `lineItems` | Array<Map> | Yes | `[{ itemId: String, name: String, requestedQty: Number, uom: String, estimatedUnitPrice: Number, lineTotal: Number }]` |
| `totalEstimatedCost` | Number | Yes | Total estimated PR cost |
| `justification` | String | Yes | Reason for procurement request |
| `priority` | String | Yes | Enum: `'LOW' \| 'NORMAL' \| 'URGENT' \| 'EMERGENCY'` |
| `status` | String | Yes | Enum: `'SUBMITTED' \| 'APPROVED' \| 'REJECTED' \| 'PO_CREATED' \| 'CANCELLED'` |
| `approvalInstanceRef` | String | Yes | Approval Engine reference |
| `version` | Number | Yes | Counter |

---

### 1.7 `purchaseOrders` (Supplier Purchase Orders)
Legal PO document issued to an approved supplier for item procurement.
* **Path:** `/companies/{companyId}/purchaseOrders/{poId}`
* **Document ID:** `PO-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `poId` | String | Yes | PO Number (e.g. `PO-202607-0042`) |
| `companyId` | String | Yes | Tenant isolation key |
| `supplierId` | String | Yes | Reference to `/suppliers/{id}` |
| `supplierName` | String | Yes | Supplier business name (denormalized) |
| `requisitionId` | String | Optional | Linked PR reference ID |
| `warehouseId` | String | Yes | Destination receiving store |
| `lineItems` | Array<Map> | Yes | `[{ itemId: String, skuCode: String, name: String, orderedQty: Number, receivedQty: Number, unitPrice: Number, taxRate: Number, lineTotal: Number }]` |
| `subTotal` | Number | Yes | Net item cost |
| `taxTotal` | Number | Yes | Tax / GST sum |
| `grandTotal` | Number | Yes | Final PO total cost |
| `paymentTerms` | String | Yes | Payment terms |
| `expectedDeliveryDate` | String | Yes | Delivery target `"YYYY-MM-DD"` |
| `status` | String | Yes | Enum: `'DRAFT' \| 'PENDING_APPROVAL' \| 'APPROVED' \| 'SENT_TO_VENDOR' \| 'PARTIALLY_RECEIVED' \| 'FULLY_RECEIVED' \| 'CANCELLED'` |
| `approvalInstanceRef` | String | Yes | Approval Engine reference |
| `createdByUserId` | String | Yes | Buyer / Procurement Officer user ID |
| `version` | Number | Yes | Counter |

---

### 1.8 `goodsReceipts` (Goods Receipt Note - GRN)
Verification slip generated when physical items are delivered at store room, checking quality, batches, and serial numbers.
* **Path:** `/companies/{companyId}/goodsReceipts/{grnId}`
* **Document ID:** `GRN-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `grnId` | String | Yes | GRN Number (e.g. `GRN-202607-0105`) |
| `companyId` | String | Yes | Tenant isolation key |
| `poId` | String | Yes | Reference to `/purchaseOrders/{poId}` |
| `supplierId` | String | Yes | Reference to `/suppliers/{supplierId}` |
| `warehouseId` | String | Yes | Receiving store room ID |
| `deliveryChallanNumber` | String | Yes | Vendor invoice or delivery challan ID |
| `receivedDate` | String | Yes | Receipt date `"YYYY-MM-DD"` |
| `receivedItems` | Array<Map> | Yes | `[{ itemId: String, orderedQty: Number, receivedQty: Number, acceptedQty: Number, rejectedQty: Number, rejectionReason: String, batchNumber: String, expiryDate: String, serialNumbers: Array<String> }]` |
| `receivedByUserId` | String | Yes | Storekeeper user ID |
| `status` | String | Yes | Enum: `'INSPECTED_ACCEPTED' \| 'PARTIALLY_REJECTED' \| 'REJECTED'` |
| `version` | Number | Yes | Concurrency counter |

---

### 1.9 `stockTransactions` (Immutable Inventory Ledger)
Universal immutable audit ledger capturing every single stock entry, issue, transfer, scrap, or adjustment.
* **Path:** `/companies/{companyId}/stockTransactions/{txnId}`
* **Document ID:** `STXN-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `txnId` | String | Yes | Unique Transaction ID |
| `companyId` | String | Yes | Tenant isolation key |
| `warehouseId` | String | Yes | Target store location ID |
| `itemId` | String | Yes | Reference to `/inventoryItems/{id}` |
| `skuCode` | String | Yes | Denormalized SKU |
| `transactionType` | String | Yes | Enum: `'STOCK_IN_GRN' \| 'STOCK_OUT_ISSUE' \| 'TRANSFER_OUT' \| 'TRANSFER_IN' \| 'MATERIAL_RETURN' \| 'SCRAP_DAMAGE' \| 'AUDIT_ADJUSTMENT'` |
| `quantity` | Number | Yes | Always positive number representing movement volume |
| `direction` | String | Yes | Enum: `'INBOUND' \| 'OUTBOUND'` |
| `previousQuantity` | Number | Yes | Store stock balance before transaction |
| `newQuantity` | Number | Yes | Store stock balance after transaction |
| `batchNumber` | String | Optional | Batch reference |
| `serialNumbers` | Array<String> | Optional | Serial numbers array |
| `referenceDocType` | String | Yes | Enum: `'GOODS_RECEIPT' \| 'MATERIAL_ISSUE' \| 'STOCK_TRANSFER' \| 'STOCK_AUDIT'` |
| `referenceDocId` | String | Yes | ID of linked source document |
| `performedByUserId` | String | Yes | User who triggered transaction |
| `timestamp` | Timestamp | Yes | Server timestamp |

---

### 1.10 `materialRequests` (Employee/Site Material Request)
Requests filed by field staff or site supervisors asking store room to issue materials or PPE.
* **Path:** `/companies/{companyId}/materialRequests/{requestId}`
* **Document ID:** `MREQ-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `requestId` | String | Yes | Request ID |
| `companyId` | String | Yes | Tenant isolation key |
| `siteId` | String | Yes | Site location ID |
| `warehouseId` | String | Yes | Target issuing store |
| `requestedByEmployeeId` | String | Yes | Employee ID |
| `requestedByUserId` | String | Yes | User ID |
| `items` | Array<Map> | Yes | `[{ itemId: String, requestedQty: Number, approvedQty: Number, uom: String }]` |
| `purpose` | String | Yes | Usage reason |
| `status` | String | Yes | Enum: `'SUBMITTED' \| 'SUPERVISOR_APPROVED' \| 'PARTIALLY_ISSUED' \| 'FULLY_ISSUED' \| 'REJECTED'` |
| `approvalInstanceRef` | String | Yes | Approval Engine reference |
| `version` | Number | Yes | Counter |

---

### 1.11 `materialIssues` (Material Issue Slip / Consumption)
Issued slip generated when storekeeper hands over material to employee, automatically reducing `itemStockLevels`.
* **Path:** `/companies/{companyId}/materialIssues/{issueId}`
* **Document ID:** `MISS-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `issueId` | String | Yes | Issue Slip ID |
| `companyId` | String | Yes | Tenant isolation key |
| `materialRequestId` | String | Yes | Linked Material Request ID |
| `warehouseId` | String | Yes | Source issuing warehouse ID |
| `issuedToEmployeeId` | String | Yes | Receiver employee ID |
| `issuedToEmployeeUserId` | String | Yes | Receiver user ID |
| `issuedItems` | Array<Map> | Yes | `[{ itemId: String, issuedQty: Number, batchNumber: String, serialNumbers: Array<String> }]` |
| `issuedByUserId` | String | Yes | Storekeeper user ID |
| `issuedAt` | Timestamp | Yes | Issue timestamp |

---

### 1.12 `stockTransfers` (Inter-Warehouse Stock Transfer)
Manages movement of inventory stock between store locations or site depots.
* **Path:** `/companies/{companyId}/stockTransfers/{transferId}`
* **Document ID:** `STX-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `transferId` | String | Yes | Transfer ID |
| `companyId` | String | Yes | Tenant isolation key |
| `sourceWarehouseId` | String | Yes | Source store |
| `destinationWarehouseId` | String | Yes | Receiving store |
| `transferItems` | Array<Map> | Yes | `[{ itemId: String, transferQty: Number, batchNumber: String, serialNumbers: Array<String> }]` |
| `status` | String | Yes | Enum: `'INITIATED' \| 'IN_TRANSIT' \| 'RECEIVED_CONFIRMED' \| 'CANCELLED'` |
| `dispatchedByUserId` | String | Yes | Source storekeeper ID |
| `receivedByUserId` | String | Optional | Destination storekeeper ID |
| `version` | Number | Yes | Concurrency counter |

---

### 1.13 `stockAudits` (Physical Inventory Audit & Adjustments)
Physical stock reconciliation cycle comparing system stock with physical counts and posting variance adjustments.
* **Path:** `/companies/{companyId}/stockAudits/{auditId}`
* **Document ID:** `AUDIT-{YYYYMM}-{warehouseId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `auditId` | String | Yes | Audit ID |
| `companyId` | String | Yes | Tenant isolation key |
| `warehouseId` | String | Yes | Warehouse room audited |
| `auditDate` | String | Yes | Audit date `"YYYY-MM-DD"` |
| `auditItems` | Array<Map> | Yes | `[{ itemId: String, systemQty: Number, physicalQty: Number, varianceQty: Number, varianceValue: Number, reasonCode: String }]` |
| `totalVarianceValue` | Number | Yes | Financial value of total variance |
| `status` | String | Yes | Enum: `'IN_PROGRESS' \| 'PENDING_APPROVAL' \| 'APPROVED_ADJUSTED' \| 'REJECTED'` |
| `auditedByUserId` | String | Yes | Internal auditor user ID |
| `approvedByUserId` | String | Optional | Admin / Operations Manager ID |

---

## 2. BUSINESS LOGIC & WORKFLOW ENGINE

```
┌──────────────────────────────────────────────────────────────────────────┐
│             INVENTORY & PROCUREMENT AUTOMATION ARCHITECTURE              │
├─────────────────┬──────────────────┬─────────────────┬───────────────────┤
│ 1. Procurement  │ 2. Store Goods   │ 3. Material     │ 4. Audit & Stock  │
│ Cycle (PR → PO) │ Receipt (GRN)    │ Request & Issue │ Transfer Engine   │
└────────┬────────┴────────┬─────────┴────────┬────────┴─────────┬─────────┘
         │                 │                  │                  │
         └─────────────────┴────────┬─────────┴──────────────────┘
                                    ▼
               [ Transactional Stock Execution Engine ]
               - Every Goods Receipt (GRN) automatically INCREASES store stock.
               - Every Material Issue slip automatically DECREASES store stock.
               - Inter-Store Transfer updates Source (decrease) and Dest (increase).
               - Generates immutable ledger records in `/stockTransactions`.
               - Evaluates `availableQuantity` vs `minReorderLevel`.
               - Sends FCM low-stock alerts to Procurement & Store Keepers.
```

---

### 2.1 Low Stock & Automatic Reorder Alerts
* Whenever a material issue or transfer reduces `itemStockLevels.availableQuantity`:
  * If `availableQuantity <= minReorderLevel`:
    * Trigger high-priority notification to Store Keeper & Procurement Officer.
    * System auto-drafts a `/purchaseRequisitions` document with `requestedQty = item.reorderQuantity`.

---

### 2.2 Material Request & Issue Workflow
1. **Request:** Field employee creates `/materialRequests` for uniform/PPE items.
2. **Approval:** Site Supervisor approves request (`status = 'SUPERVISOR_APPROVED'`).
3. **Fulfillment:** Store Keeper views pending requests on tablet → scans Barcode/QR on item → issues quantity.
4. **Execution:** Transactional Cloud Function `executeMaterialIssue`:
   * Decreases `currentQuantity` in `/itemStockLevels`.
   * Inserts outbound record in `/stockTransactions`.
   * Updates `/materialRequests` status to `'FULLY_ISSUED'`.

---

### 2.3 Goods Receipt Note (GRN) Stock In Invariant
* Store keeper inspects incoming shipment against PO:
  * Creates `/goodsReceipts` entry specifying `acceptedQty` and `rejectedQty`.
  * For accepted items, Cloud Function `processGoodsReceipt`:
    * Increases `currentQuantity` in `/itemStockLevels`.
    * Inserts inbound ledger entry in `/stockTransactions`.
    * Updates `/purchaseOrders` `receivedQty`. If all line items received, sets PO status to `'FULLY_RECEIVED'`.

---

## 3. FIRESTORE SECURITY RULES (INVENTORY & PROCUREMENT)

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
    function opsTier()   { return roleAtLeast(['companyOwner','admin','hr','manager','incharge','supervisor','storekeeper','procurement']); }

    match /companies/{cid} {

      // --- SUPPLIERS ---
      match /suppliers/{supplierId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && mgmtTier();
      }

      // --- INVENTORY CATEGORIES & ITEMS ---
      match /inventoryCategories/{catId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && mgmtTier();
      }

      match /inventoryItems/{itemId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && mgmtTier();
      }

      // --- WAREHOUSES & STOCK LEVELS ---
      match /warehouses/{whId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && mgmtTier();
      }

      match /itemStockLevels/{levelId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && opsTier();
      }

      // --- REQUISITIONS & PURCHASE ORDERS ---
      match /purchaseRequisitions/{prId} {
        allow read: if sameCompany(cid) && opsTier();
        allow create, update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }

      match /purchaseOrders/{poId} {
        allow read: if sameCompany(cid) && opsTier();
        allow create, update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }

      // --- GOODS RECEIPTS & TRANSACTIONS ---
      match /goodsReceipts/{grnId} {
        allow read: if sameCompany(cid) && opsTier();
        allow create, update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }

      match /stockTransactions/{txnId} {
        allow read: if sameCompany(cid) && opsTier();
        allow write: if false; // Cloud Functions exclusively
      }

      // --- MATERIAL REQUESTS & ISSUES ---
      match /materialRequests/{reqId} {
        allow read: if sameCompany(cid);
        allow create: if sameCompany(cid) && isSignedIn();
        allow update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }

      match /materialIssues/{issueId} {
        allow read: if sameCompany(cid) && opsTier();
        allow create, update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }

      // --- STOCK TRANSFERS & AUDITS ---
      match /stockTransfers/{stxId} {
        allow read: if sameCompany(cid) && opsTier();
        allow create, update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }

      match /stockAudits/{auditId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow create, update: if sameCompany(cid) && mgmtTier();
        allow delete: if false;
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (INVENTORY & PROCUREMENT)

```json
{
  "indexes": [
    {
      "collectionGroup": "inventoryItems",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "categoryId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "itemStockLevels",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "warehouseId", "order": "ASCENDING" },
        { "fieldPath": "availableQuantity", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "purchaseOrders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "expectedDeliveryDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "materialRequests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "siteId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "stockTransactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "warehouseId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 5. ERROR HANDLING & VALIDATION CODES

| Error Code | Message | Resolution |
|---|---|---|
| `ERR_INSUFFICIENT_STOCK` | Store room stock is lower than requested issue quantity. | Initiate Stock Transfer or create Purchase Requisition. |
| `ERR_BARCODE_NOT_FOUND` | Scanned Barcode/QR code does not match any SKU in item master. | Register SKU barcode in Item Master before issuing. |
| `ERR_EXPIRED_BATCH` | Selected inventory batch has passed its expiry date. | Quarantined item batch. Select a non-expired batch. |
| `ERR_PO_ALREADY_RECEIVED` | Goods Receipt cannot be posted for a fully received Purchase Order. | Check PO receipt history. |
| `ERR_UNAUTHORIZED_STORE_KEEPER` | User is not an authorized storekeeper for this warehouse. | Request storekeeper assignment from Operations Manager. |

---

**End of Phase: Enterprise Inventory & Procurement Management Module (100% Complete).**
Awaiting your approval before proceeding to Phase 8: Asset Management Module.
