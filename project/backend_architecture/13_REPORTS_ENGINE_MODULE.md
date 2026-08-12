# LOG SHEET MUSTER — PHASE 12: ENTERPRISE REPORTS ENGINE MODULE (100% COMPLETE)
Enterprise-grade, production-ready Reports Engine for Log Sheet Muster. Fully integrated across all company modules: Employee Master, Attendance, Leave, Shift & Roster, Payroll, Inventory & Procurement, Asset Management, Billing & Clients, Operations, Notifications, and System Core Engines.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All report collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/reportTemplates/{templateId}
/companies/{cid}/scheduledReports/{scheduledId}
/companies/{cid}/generatedReports/{reportId}
/companies/{cid}/reportSchedules/{scheduleId}
```

---

### 1.1 `reportTemplates` (Enterprise Report Catalog & Query Templates)
Catalog of system built-in and custom user-defined report templates with parameter definitions, default columns, and data source mappings.
* **Path:** `/companies/{companyId}/reportTemplates/{templateId}`
* **Document ID:** `RPT-TMPL-{CODE}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `templateId` | String | Yes | Template ID |
| `companyId` | String | Yes | Tenant isolation key |
| `reportCode` | String | Yes | Unique Code (e.g., `RPT-ATT-MUSTER`, `RPT-PAY-SLIP-SUMMARY`, `RPT-INV-VALUATION`) |
| `name` | String | Yes | Report Title (e.g. "Monthly Attendance Muster Roll Report", "Payroll Tax & Deduction Summary", "Client Receivables Aging Report") |
| `module` | String | Yes | Enum: `'ATTENDANCE' \| 'EMPLOYEE' \| 'LEAVE' \| 'ROSTER' \| 'PAYROLL' \| 'INVENTORY' \| 'ASSETS' \| 'BILLING' \| 'OPERATIONS' \| 'AUDIT'` |
| `description` | String | Yes | Detailed report overview |
| `supportedFormats` | Array<String> | Yes | `["PDF", "EXCEL_XLSX", "CSV", "JSON"]` |
| `requiredParameters` | Array<Map> | Yes | Array of parameter definitions: `[{ key: "period", type: "DATE_RANGE" \| "MONTH_PICKER", label: "Select Month", isMandatory: true }, { key: "siteId", type: "SITE_SELECT", label: "Site Location", isMandatory: false }]` |
| `defaultColumns` | Array<Map> | Yes | `[{ field: "employeeCode", headerName: "Emp Code", width: 120 }, { field: "presentDays", headerName: "Present", width: 80 }]` |
| `minimumRoleRequired` | String | Yes | Enum: `'companyOwner' \| 'admin' \| 'hr' \| 'manager' \| 'incharge' \| 'supervisor'` |
| `isSystemDefault` | Boolean | Yes | True for core built-in system reports |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'DEPRECATED'` |
| `version` | Number | Yes | Concurrency counter |

---

### 1.2 `scheduledReports` / `reportSchedules` (Automated Cron Report Dispatches)
Configures recurring automatic report generation (e.g. daily shift attendance summary sent to site client at 08:00 AM, monthly payroll summary to CFO).
* **Path:** `/companies/{companyId}/reportSchedules/{scheduleId}`
* **Document ID:** `RSCHED-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `scheduleId` | String | Yes | Unique Schedule ID |
| `companyId` | String | Yes | Tenant isolation key |
| `templateId` | String | Yes | Reference to `/reportTemplates/{templateId}` |
| `reportCode` | String | Yes | Report Code |
| `title` | String | Yes | Schedule Title (e.g. "Daily Site A Attendance Digest") |
| `frequency` | String | Yes | Enum: `'DAILY' \| 'WEEKLY' \| 'FORTNIGHTLY' \| 'MONTHLY' \| 'QUARTERLY'` |
| `cronExpression` | String | Yes | Standard 5-part cron syntax (e.g., `"0 8 * * *"` for 8:00 AM daily) |
| `parameters` | Map | Yes | `{ siteId: "SITE-001", branchId: "ALL", includeOt: true }` |
| `exportFormat` | String | Yes | Enum: `'PDF' \| 'EXCEL_XLSX' \| 'CSV'` |
| `recipientEmails` | Array<String> | Yes | Array of email addresses for auto-dispatch |
| `recipientUserIds` | Array<String> | Optional | Array of internal user IDs for FCM push notifications |
| `lastRunTimestamp` | Timestamp | Optional | Timestamp of last execution |
| `nextRunTimestamp` | Timestamp | Yes | Calculated next execution timestamp |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'PAUSED' \| 'FAILED'` |
| `createdByUserId` | String | Yes | Creator `userId` |

---

### 1.3 `generatedReports` (Archive of Rendered Output Files)
Execution log and document registry of generated PDF, Excel, and CSV files stored in Firebase Storage.
* **Path:** `/companies/{companyId}/generatedReports/{reportId}`
* **Document ID:** `GRPT-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `reportId` | String | Yes | Unique Generated Report ID |
| `companyId` | String | Yes | Tenant isolation key |
| `templateId` | String | Yes | Linked `/reportTemplates/{templateId}` |
| `reportCode` | String | Yes | Report Code |
| `title` | String | Yes | Report Instance Title |
| `format` | String | Yes | Enum: `'PDF' \| 'EXCEL_XLSX' \| 'CSV' \| 'JSON'` |
| `filterParameters` | Map | Yes | Filter values used during generation |
| `fileStoragePath` | String | Yes | Firebase Storage path (e.g. `companies/CID/reports/2026/07/RPT-ATT-0012.pdf`) |
| `fileDownloadUrl` | String | Yes | Signed CDN URL for client download |
| `fileSizeBytes` | Number | Yes | Output file size in bytes |
| `totalRecordCount` | Number | Yes | Total rows included in report output |
| `generationDurationMs` | Number | Yes | Time taken to execute and render in milliseconds |
| `triggeredBy` | String | Yes | Enum: `'MANUAL_USER' \| 'CRON_SCHEDULE' \| 'SYSTEM_EVENT'` |
| `requestedByUserId` | String | Yes | User ID or `"SYSTEM_CRON"` |
| `status` | String | Yes | Enum: `'GENERATING' \| 'COMPLETED' \| 'FAILED' \| 'EXPIRED'` |
| `errorMessage` | String | Optional | Error description if rendering failed |
| `createdAt` | Timestamp | Yes | Generation timestamp |
| `expiresAt` | Timestamp | Yes | Retention expiry timestamp (e.g. auto-cleanup after 90 days) |

---

## 2. BUSINESS LOGIC & REPORT GENERATION ENGINE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     ENTERPRISE REPORTS ENGINE ARCHITECTURE               │
├─────────────────┬──────────────────┬─────────────────┬───────────────────┤
│ 1. Parameter    │ 2. Query         │ 3. Document     │ 4. Storage &      │
│ Ingestion &     │ Aggregation &    │ Renderer        │ Distribution      │
│ Role Validation │ Isolation        │ (PDF/Excel/CSV) │ (CDN/Email/FCM)   │
└────────┬────────┴────────┬─────────┴────────┬────────┴─────────┬─────────┘
         │                 │                  │                  │
         └─────────────────┴────────┬─────────┴──────────────────┘
                                    ▼
                  [ Async Cloud Function Report Engine ]
                  - Ingests filter parameters (Date Range, Site, Branch).
                  - Enforces role-based data visibility (Branch/Site limits).
                  - Executes high-performance stream query on target collection.
                  - Renders PDF with vector headers, company logo & page numbers.
                  - Generates Excel sheet with formatted headers & formulas.
                  - Uploads output to `/generatedReports` in Cloud Storage.
                  - Emails signed download links to schedule recipients.
```

---

### 2.1 Core System Reports Catalog
1. **Attendance Module:** `RPT-ATT-MUSTER` (Muster Roll Matrix), `RPT-ATT-DAILY` (Daily Clock-In Exceptions), `RPT-ATT-OVERTIME` (OT Audit Log).
2. **Payroll Module:** `RPT-PAY-SUMMARY` (Monthly Salary Sheet), `RPT-PAY-TAX-PF` (PF & ESI Compliance Register), `RPT-PAY-SLIP-ZIP` (Bulk Payslip Archive).
3. **Inventory & Assets:** `RPT-INV-VALUATION` (Stock Valuation & Reorder Alerts), `RPT-AST-REGISTER` (Asset Location & Custodian Register).
4. **Billing & Operations:** `RPT-BIL-OUTSTANDING` (Client Receivables Aging), `RPT-OPS-INCIDENT` (Security & Safety Incident Log), `RPT-OPS-PATROL` (Guard Tour Patrol Verification Digest).

---

## 3. FIRESTORE SECURITY RULES (REPORTS ENGINE)

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
    function mgmtTier()  { return roleAtLeast(['companyOwner','admin','hr','manager','finance']); }
    function opsTier()   { return roleAtLeast(['companyOwner','admin','hr','manager','incharge','supervisor','ops']); }

    match /companies/{cid} {

      // --- REPORT TEMPLATES ---
      match /reportTemplates/{templateId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && mgmtTier();
      }

      // --- REPORT SCHEDULES ---
      match /reportSchedules/{scheduleId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow create, update, delete: if sameCompany(cid) && mgmtTier();
      }

      // --- GENERATED REPORTS ---
      match /generatedReports/{reportId} {
        allow read: if sameCompany(cid) && (
          opsTier() || request.auth.uid == resource.data.requestedByUserId
        );
        allow create: if sameCompany(cid) && isSignedIn();
        allow update: if sameCompany(cid) && mgmtTier();
        allow delete: if sameCompany(cid) && ownerTier();
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (REPORTS ENGINE)

```json
{
  "indexes": [
    {
      "collectionGroup": "generatedReports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "requestedByUserId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "generatedReports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "reportCode", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "reportSchedules",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "nextRunTimestamp", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 5. ERROR HANDLING & VALIDATION CODES

| Error Code | Message | Resolution |
|---|---|---|
| `ERR_REPORT_QUERY_TIMEOUT` | Selected date range contains too many records for synchronous generation. | Reduce date range or trigger background async scheduled generation. |
| `ERR_UNAUTHORIZED_REPORT_ROLE` | User role lacks clearance for target report category (e.g. Supervisor accessing Payroll Summary). | Escalate clearance requirement to HR / Finance Manager. |
| `ERR_EXPIRED_REPORT_LINK` | Download link has expired. | Re-generate report output or request fresh download URL. |

---

**End of Phase 12: Enterprise Reports Engine Module (100% Complete).**
