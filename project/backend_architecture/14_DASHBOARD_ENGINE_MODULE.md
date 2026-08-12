# LOG SHEET MUSTER — PHASE 13: ENTERPRISE DASHBOARD ENGINE MODULE (100% COMPLETE)
Enterprise-grade, production-ready Dashboard Engine for Log Sheet Muster. Fully integrated across all company modules: Employee Master, Attendance, Leave, Shift & Roster, Payroll, Inventory, Assets, Billing & Clients, Operations, Reports, and System Core Engines.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All dashboard collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/dashboardLayouts/{layoutId}
/companies/{cid}/dashboardWidgets/{widgetId}
/companies/{cid}/dashboardSnapshots/{snapshotId}
/companies/{cid}/dashboardAlerts/{alertId}
```

---

### 1.1 `dashboardLayouts` (Role-Based & User-Customizable Dashboard Layouts)
Defines customizable grid layouts, widget positions, refresh intervals, and visibility settings per user role or individual user.
* **Path:** `/companies/{companyId}/dashboardLayouts/{layoutId}`
* **Document ID:** `DASH-LAYOUT-{role}` or `DASH-LAYOUT-{userId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `layoutId` | String | Yes | Layout ID |
| `companyId` | String | Yes | Tenant isolation key |
| `targetRole` | String | Optional | Role association (e.g. `'companyOwner'`, `'admin'`, `'hr'`, `'ops'`, `'finance'`, `'supervisor'`) |
| `targetUserId` | String | Optional | Specific user override `userId` |
| `title` | String | Yes | Layout Title (e.g., "Executive Operations & HR Dashboard", "Site Supervisor Tactical Dashboard") |
| `gridWidgets` | Array<Map> | Yes | Widget positioning array: `[{ widgetId: "WIDGET-ATT-LIVE", positionX: 0, positionY: 0, widthSpan: 6, heightSpan: 4, refreshRateSeconds: 60 }]` |
| `isDefault` | Boolean | Yes | True if default layout for role |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'INACTIVE'` |
| `version` | Number | Yes | Concurrency counter |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

---

### 1.2 `dashboardWidgets` (KPI & Interactive Visual Widget Master Catalog)
Registry of system widgets available for inclusion in executive and site dashboards with data aggregation endpoints and parameters.
* **Path:** `/companies/{companyId}/dashboardWidgets/{widgetId}`
* **Document ID:** `WIDGET-{CODE}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `widgetId` | String | Yes | Widget ID |
| `companyId` | String | Yes | Tenant isolation key |
| `widgetCode` | String | Yes | Unique Code (e.g. `WIDGET-ATT-STRENGTH`, `WIDGET-BILL-RECEIVABLES`, `WIDGET-OPS-INCIDENTS`, `WIDGET-INV-LOW-STOCK`) |
| `title` | String | Yes | Display Title |
| `category` | String | Yes | Enum: `'ATTENDANCE' \| 'PAYROLL' \| 'INVENTORY' \| 'ASSETS' \| 'BILLING' \| 'OPERATIONS' \| 'COMPLIANCE'` |
| `visualizationType` | String | Yes | Enum: `'METRIC_CARD' \| 'LINE_CHART' \| 'BAR_CHART' \| 'DONUT_PIE' \| 'DATA_TABLE' \| 'LIVE_MAP'` |
| `dataSourceType` | String | Yes | Enum: `'REALTIME_COLLECTION' \| 'PRE_COMPUTED_SNAPSHOT' \| 'AGGREGATED_STREAM'` |
| `supportedRoles` | Array<String> | Yes | Allowed user roles |
| `defaultRefreshIntervalSeconds` | Number | Yes | Auto-refresh frequency (e.g., `30`, `60`, `300`) |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'DEPRECATED'` |

---

### 1.3 `dashboardSnapshots` (Pre-Computed Real-Time Analytic Aggregations)
Pre-calculated hourly/daily performance counters ensuring sub-100ms dashboard rendering for high-volume enterprise sites.
* **Path:** `/companies/{companyId}/dashboardSnapshots/{snapshotId}`
* **Document ID:** `DSNAP-{YYYYMMDD}-{branchId}-{siteId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `snapshotId` | String | Yes | Unique Snapshot ID |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch association |
| `siteId` | String | Optional | Site location association |
| `snapshotDate` | String | Yes | Date `"YYYY-MM-DD"` |
| `snapshotHour` | Number | Optional | Hour (0-23) for hourly snapshots |
| `attendanceMetrics` | Map | Yes | `{ totalScheduledGuards: Number, totalPresent: Number, totalAbsent: Number, totalLateMarks: Number, totalOtHours: Number, fillRatePercentage: Number }` |
| `financialMetrics` | Map | Yes | `{ totalMonthlyBilled: Number, totalCollected: Number, totalOverdueOutstanding: Number }` |
| `inventoryAssetMetrics` | Map | Yes | `{ lowStockSkuCount: Number, assetsInMaintenanceCount: Number }` |
| `operationsMetrics` | Map | Yes | `{ openIncidentsCount: Number, criticalIncidentsCount: Number, patrolCompletionPercentage: Number }` |
| `computedAt` | Timestamp | Yes | Server calculation timestamp |

---

### 1.4 `dashboardAlerts` (Actionable Live Executive & Supervisor Feed)
High-priority operational action items displayed at the top of executive/supervisor dashboards requiring immediate manual intervention.
* **Path:** `/companies/{companyId}/dashboardAlerts/{alertId}`
* **Document ID:** `DALERT-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `alertId` | String | Yes | Alert ID |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch ID |
| `siteId` | String | Optional | Site location ID |
| `alertType` | String | Yes | Enum: `'CRITICAL_INCIDENT' \| 'SHORT_MANPOWER_POST' \| 'OVERDUE_INVOICE' \| 'LOW_STOCK_REORDER' \| 'PATROL_MISSED'` |
| `severity` | String | Yes | Enum: `'INFO' \| 'WARNING' \| 'HIGH_PRIORITY' \| 'CRITICAL_EMERGENCY'` |
| `title` | String | Yes | Summary title |
| `message` | String | Yes | Detailed alert text |
| `actionLink` | Map | Yes | `{ module: String, docId: String, actionType: String }` |
| `targetRole` | String | Yes | Target role clearance |
| `isAcknowledged` | Boolean | Yes | True if supervisor acknowledged alert |
| `acknowledgedByUserId` | String | Optional | User ID |
| `createdAt` | Timestamp | Yes | Creation timestamp |

---

## 2. BUSINESS LOGIC & DASHBOARD REAL-TIME ENGINE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   REAL-TIME DASHBOARD ENGINE ARCHITECTURE               │
├─────────────────┬──────────────────┬─────────────────┬───────────────────┤
│ 1. Real-Time    │ 2. Pre-Computed  │ 3. Actionable   │ 4. Role-Based     │
│ Firestore Stream│ Snapshot Worker  │ Alert Feed      │ Security & Data   │
│ Ingestion       │ Engine           │ Generator       │ Isolation         │
└────────┬────────┴────────┬─────────┴────────┬────────┴─────────┬─────────┘
         │                 │                  │                  │
         └─────────────────┴────────┬─────────┴──────────────────┘
                                    ▼
                [ High-Performance Executive Dashboard Engine ]
                - Renders customizable grid layouts for Owner, HR, Ops, Finance.
                - Streams live muster-roll attendance counters (`totalPresent`, `fillRate`).
                - Aggregates daily operational snapshots via Cloud Scheduled Worker.
                - Displays real-time alert feed for short-staffed posts and SOS incidents.
```

---

## 3. FIRESTORE SECURITY RULES (DASHBOARD ENGINE)

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

      // --- DASHBOARD LAYOUTS & WIDGETS ---
      match /dashboardLayouts/{layoutId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && mgmtTier();
      }

      match /dashboardWidgets/{widgetId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && mgmtTier();
      }

      // --- DASHBOARD SNAPSHOTS ---
      match /dashboardSnapshots/{snapId} {
        allow read: if sameCompany(cid) && opsTier();
        allow write: if false; // Cloud Functions exclusively
      }

      // --- DASHBOARD ALERTS ---
      match /dashboardAlerts/{alertId} {
        allow read: if sameCompany(cid) && opsTier();
        allow create, update: if sameCompany(cid) && opsTier();
        allow delete: if sameCompany(cid) && ownerTier();
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (DASHBOARD ENGINE)

```json
{
  "indexes": [
    {
      "collectionGroup": "dashboardSnapshots",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "siteId", "order": "ASCENDING" },
        { "fieldPath": "snapshotDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "dashboardAlerts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "isAcknowledged", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 5. ERROR HANDLING & VALIDATION CODES

| Error Code | Message | Resolution |
|---|---|---|
| `ERR_WIDGET_UNAUTHORIZED` | User role lacks authorization for widget metrics (e.g. Guard viewing Billing Financials). | Remove unauthorized widget from layout. |
| `ERR_SNAPSHOT_STALE` | Pre-computed analytics snapshot is out of date. | Trigger immediate snapshot recalculation background job. |

---

**End of Phase 13: Enterprise Dashboard Engine Module (100% Complete).**
