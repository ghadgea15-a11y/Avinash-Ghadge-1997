# LOG SHEET MUSTER — PHASE 24: ENTERPRISE VENDOR PORTAL MODULE (100% COMPLETE)

Enterprise-grade, production-ready Vendor Portal Module for Log Sheet Muster. This module provides a secure, self-service platform for suppliers and vendors to manage purchase orders, submit invoices, track payments, and review their performance.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All Vendor Portal collections are multi-tenant and strictly isolated under `/companies/{companyId}/`. Existing collections (Vendors, Purchase Orders, Goods Receipt Notes) from the Procurement module are extended to support vendor access.

```
/companies/{cid}/vendorInvoices/{invoiceId}
/companies/{cid}/vendorPerformanceMetrics/{metricId}
```

### 1.1 RBAC Extension: Vendor Users
Vendor login utilizes the core authentication system, assigning users a `vendorUser` role mapped to their company and vendor organization.
* **Path:** `/companies/{companyId}/users/{userId}` (Existing Collection)
* **Vendor-Specific Fields:**
  * `role`: `'vendorUser'`
  * `vendorId`: `String` (Links to `/companies/{cid}/vendors/{vendorId}`)

### 1.2 `vendorInvoices` (Vendor Invoice Submission)
Allows vendors to submit their invoices electronically against approved Purchase Orders and track the payment lifecycle.
* **Path:** `/companies/{companyId}/vendorInvoices/{invoiceId}`
* **Document ID:** `VINV-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `invoiceId` | String | Yes | Unique Vendor Invoice ID |
| `companyId` | String | Yes | Tenant isolation key |
| `vendorId` | String | Yes | Reference to Vendor |
| `poId` | String | Yes | Reference to Purchase Order |
| `submittedByUserId` | String | Yes | Vendor User ID |
| `invoiceNumber` | String | Yes | Vendor's own invoice reference number |
| `invoiceDate` | Timestamp | Yes | Date on the invoice |
| `totalAmount` | Number | Yes | Total billed amount |
| `taxAmount` | Number | Yes | Tax component |
| `attachmentFileId` | String | Yes | Reference to uploaded PDF (Storage Module) |
| `status` | String | Yes | Enum: `'SUBMITTED' \| 'IN_REVIEW' \| 'APPROVED' \| 'REJECTED' \| 'PAID'` |
| `rejectionReason` | String | Optional | Notes from Finance if rejected |
| `paymentReference` | String | Optional | Transaction ID once paid |
| `createdAt` | Timestamp | Yes | Creation timestamp |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

### 1.3 `vendorPerformanceMetrics` (Supplier SLA & Quality Tracking)
System-calculated metrics tracking a vendor's delivery timeliness, defect rates, and overall SLA adherence.
* **Path:** `/companies/{companyId}/vendorPerformanceMetrics/{metricId}`
* **Document ID:** `VPERF-{vendorId}-{YYYYMM}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `metricId` | String | Yes | Unique Metric ID |
| `companyId` | String | Yes | Tenant isolation key |
| `vendorId` | String | Yes | Reference to Vendor |
| `period` | String | Yes | e.g., `"2026-07"` |
| `onTimeDeliveryScore` | Number | Yes | 0-100 percentage |
| `qualityAcceptanceScore` | Number | Yes | 0-100 percentage (based on GRN rejections) |
| `totalOrders` | Number | Yes | Orders fulfilled in period |
| `overallRating` | String | Yes | Enum: `'EXCELLENT' \| 'GOOD' \| 'AVERAGE' \| 'POOR'` |
| `computedAt` | Timestamp | Yes | Timestamp of calculation |

---

## 2. BUSINESS LOGIC & WORKFLOWS

### 2.1 Purchase Order & GRN Visibility
* **Order Tracking:** Vendor users can view `/purchaseOrders` where `vendorId` matches their profile and status is `>= APPROVED`.
* **Receipt Status:** Vendors can view `/goodsReceiptNotes` linked to their POs to see how many items were accepted vs. rejected by the warehouse.

### 2.2 Invoice Submission Workflow
1. Vendor reviews a completed or partially fulfilled Purchase Order.
2. Vendor uploads a PDF invoice and submits a `vendorInvoices` record.
3. System triggers a Notification to the Finance/Procurement manager.
4. Finance reviews the invoice against the GRN (3-way matching).
5. If valid, status changes to `APPROVED`, and upon payment, `PAID`. Vendor receives real-time status updates via the portal.

### 2.3 Automated Performance Scoring
* A scheduled Cloud Function analyzes PO expected delivery dates vs. GRN actual received dates to calculate the `onTimeDeliveryScore`.
* GRN accepted vs. rejected quantities drive the `qualityAcceptanceScore`.
* This data feeds into vendor selection logic for future procurements.

---

## 3. FIRESTORE SECURITY RULES (VENDOR PORTAL)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function for Vendor Access
    function isVendorUser(cid) {
      return sameCompany(cid) && request.auth != null && get(/databases/$(database)/documents/companies/$(cid)/users/$(request.auth.uid)).data.role == 'vendorUser';
    }
    
    function matchesVendorId(cid, targetVendorId) {
      return get(/databases/$(database)/documents/companies/$(cid)/users/$(request.auth.uid)).data.vendorId == targetVendorId;
    }

    match /companies/{cid} {
      match /vendorInvoices/{invoiceId} {
        allow read: if sameCompany(cid) && (mgmtTier() || (isVendorUser(cid) && matchesVendorId(cid, resource.data.vendorId)));
        allow create: if isVendorUser(cid) && matchesVendorId(cid, request.resource.data.vendorId);
        allow update: if sameCompany(cid) && mgmtTier(); // Finance approves/pays
      }

      match /vendorPerformanceMetrics/{metricId} {
        allow read: if sameCompany(cid) && (mgmtTier() || (isVendorUser(cid) && matchesVendorId(cid, resource.data.vendorId)));
        allow write: if false; // Computed automatically by Cloud Functions
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (VENDOR PORTAL)

```json
{
  "indexes": [
    {
      "collectionGroup": "vendorInvoices",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "vendorId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "vendorPerformanceMetrics",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "vendorId", "order": "ASCENDING" },
        { "fieldPath": "period", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

**End of Phase 24: Enterprise Vendor Portal Module (100% Complete).**
