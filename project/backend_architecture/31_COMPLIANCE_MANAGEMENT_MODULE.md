# LOG SHEET MUSTER — PHASE 30: ENTERPRISE COMPLIANCE MANAGEMENT MODULE (100% COMPLETE)

Enterprise-grade, production-ready Compliance Management Module for Log Sheet Muster. Ensures 100% statutory legal compliance across Indian Labour Laws (PF, ESIC, LWF, Minimum Wages, Contract Labour Act, Bonus, Gratuity, PSARA Regulations), site safety audits, government inspector reviews, digital checklists, and automated compliance calendars.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All Compliance Management collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/complianceRegisters/{complianceId}
/companies/{cid}/auditChecklists/{checklistId}
/companies/{cid}/inspectionRecords/{inspectionId}
/companies/{cid}/complianceCalendarEvents/{eventId}
```

### 1.1 `complianceRegisters` (Statutory Compliance Master Register)
Master compliance ledger tracking statutory filings, PF/ESIC returns, Minimum Wage compliance, and PSARA state-level mandates.
* **Path:** `/companies/{companyId}/complianceRegisters/{complianceId}`
* **Document ID:** `CMPREG-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `complianceId` | String | Yes | Unique Compliance Register ID |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch handling compliance |
| `statutoryType` | String | Yes | Enum: `'PF_ECR_CHALLAN' \| 'ESIC_CHALLAN' \| 'PROFESSIONAL_TAX' \| 'LWF' \| 'MINIMUM_WAGES_RECON' \| 'PSARA_RETURNS' \| 'CONTRACT_LABOUR_RETURNS'` |
| `period` | String | Yes | E.g. `"2026-07"` |
| `dueDate` | Timestamp | Yes | Statutory filing deadline date |
| `filingDate` | Timestamp | Optional | Actual date filed |
| `challanNumber` | String | Optional | Bank/Government payment transaction ID |
| `totalAmountPaid` | Number | Optional | Total statutory remittance amount |
| `receiptStorageFileId` | String | Optional | Uploaded government filing receipt PDF |
| `status` | String | Yes | Enum: `'PENDING' \| 'FILED' \| 'OVERDUE' \| 'UNDER_AUDIT' \| 'NON_COMPLIANT'` |
| `remarks` | String | Optional | Compliance notes |
| `verifiedByUserId` | String | Optional | Compliance Officer User ID |
| `createdAt` | Timestamp | Yes | Creation timestamp |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

### 1.2 `auditChecklists` (Digital Site & Safety Audit Templates)
Customizable checklist templates for site safety audits, night patrol inspections, and PSARA compliance checks.
* **Path:** `/companies/{companyId}/auditChecklists/{checklistId}`
* **Document ID:** `AUDCHK-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `checklistId` | String | Yes | Unique Checklist Template ID |
| `companyId` | String | Yes | Tenant isolation key |
| `title` | String | Yes | E.g. `"Night Patrol Safety Audit"`, `"PSARA Guard Uniform & ID Check"` |
| `category` | String | Yes | Enum: `'SITE_SAFETY' \| 'GUARD_BEHAVIOR' \| 'UNIFORM_EQUIPMENT' \| 'STATUTORY_DISPLAY' \| 'FIRE_PREPAREDNESS'` |
| `items` | Array<Map> | Yes | List of audit items: `[{ itemId: "1", question: "Guards wearing complete uniform with badge?", isMandatory: true, weight: 10 }]` |
| `passingScore` | Number | Yes | Minimum passing score percentage e.g., 85 |
| `isActive` | Boolean | Yes | Active template flag |
| `createdAt` | Timestamp | Yes | Creation timestamp |

### 1.3 `inspectionRecords` (Completed Site Audits & Inspector Notes)
Records of physical site audits conducted by Field Officers or External Labor Inspectors, complete with geo-tagged photos and score calculations.
* **Path:** `/companies/{companyId}/inspectionRecords/{inspectionId}`
* **Document ID:** `INSP-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `inspectionId` | String | Yes | Unique Inspection ID |
| `companyId` | String | Yes | Tenant isolation key |
| `siteId` | String | Yes | Reference to Site |
| `branchId` | String | Yes | Branch ID |
| `checklistId` | String | Yes | Reference to `auditChecklists` |
| `inspectorUserId` | String | Yes | Field Officer / Inspector User ID |
| `inspectorType` | String | Yes | Enum: `'INTERNAL_AUDITOR' \| 'FIELD_OFFICER' \| 'GOVT_LABOUR_INSPECTOR' \| 'CLIENT_AUDITOR'` |
| `itemResults` | Array<Map> | Yes | Results for each checklist item `[{ itemId: "1", passed: true, remarks: "All good", photoStorageId: "IMG_123" }]` |
| `overallScore` | Number | Yes | Calculated percentage score |
| `result` | String | Yes | Enum: `'COMPLIANT' \| 'MINOR_NON_COMPLIANCE' \| 'MAJOR_NON_COMPLIANCE'` |
| `correctiveActions` | Array<Map> | Optional | Action items with target dates for remediation |
| `inspectionDate` | Timestamp | Yes | Inspection execution timestamp |
| `geoPoint` | Map | Yes | `{ latitude: 19.076, longitude: 72.877 }` |
| `createdAt` | Timestamp | Yes | Creation timestamp |

### 1.4 `complianceCalendarEvents` (Automated Statutory Due Date Tracker)
Recurring compliance schedule mapping statutory due dates (e.g. PF ECR on 15th, ESIC on 15th, PT on 30th) to ensure zero penalty non-compliance.
* **Path:** `/companies/{companyId}/complianceCalendarEvents/{eventId}`
* **Document ID:** `CMPEVT-{YYYYMM}-{statutoryType}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `eventId` | String | Yes | Unique Event ID |
| `companyId` | String | Yes | Tenant isolation key |
| `statutoryType` | String | Yes | Matches `complianceRegisters.statutoryType` |
| `title` | String | Yes | E.g. `"Monthly PF ECR Filing & Challan Remittance"` |
| `dueDate` | Timestamp | Yes | Target completion date |
| `assignedToUserId` | String | Yes | Assigned Compliance Manager User ID |
| `status` | String | Yes | Enum: `'UPCOMING' \| 'IN_PROGRESS' \| 'COMPLETED' \| 'OVERDUE'` |
| `reminderSent` | Boolean | Yes | Flag indicating if advance alert was dispatched |
| `createdAt` | Timestamp | Yes | Creation timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

### 2.1 Automated Compliance Calendar & Alert Engine
1. On the 1st of every month, a Cloud Function auto-populates `complianceCalendarEvents` for all active company branches based on state statutory rules.
2. Advance notifications (7 days, 3 days, 1 day prior) are dispatched to Compliance Officers and Branch Managers.
3. If `dueDate` passes without `status == 'COMPLETED'`, the event automatically transitions to `OVERDUE` and escalates to the VP of HR and Legal.

### 2.2 Site Inspection & Non-Compliance Remediation
1. Field Officers conduct audits on mobile devices via the Android app using `auditChecklists`.
2. Photos and GPS location are captured and stored in `inspectionRecords`.
3. If an audit yields `MAJOR_NON_COMPLIANCE` (e.g. guard working without ID or below minimum wage):
   * Auto-generates a High Priority Support Ticket in Ticket Management System (Phase 27).
   * Assigns a corrective action task to the Site Incharge with a 24-hour remediation window.

---

## 3. FIRESTORE SECURITY RULES (COMPLIANCE MANAGEMENT)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{cid} {
      match /complianceRegisters/{complianceId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow write: if sameCompany(cid) && mgmtTier();
      }

      match /auditChecklists/{checklistId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow write: if sameCompany(cid) && mgmtTier();
      }

      match /inspectionRecords/{inspectionId} {
        allow read: if sameCompany(cid) && (mgmtTier() || opsTier());
        allow create: if sameCompany(cid) && opsTier(); // Field Officers can submit
        allow update: if sameCompany(cid) && mgmtTier();
      }

      match /complianceCalendarEvents/{eventId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow write: if sameCompany(cid) && mgmtTier();
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (COMPLIANCE MANAGEMENT)

```json
{
  "indexes": [
    {
      "collectionGroup": "complianceRegisters",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "dueDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "inspectionRecords",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "siteId", "order": "ASCENDING" },
        { "fieldPath": "inspectionDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "complianceCalendarEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "dueDate", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

**End of Phase 30: Enterprise Compliance Management Module (100% Complete).**
