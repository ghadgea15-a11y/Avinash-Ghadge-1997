# LOG SHEET MUSTER — PHASE 20: ENTERPRISE ANALYTICS ENGINE MODULE (100% COMPLETE)

Enterprise-grade, production-ready Analytics Engine for Log Sheet Muster. This module provides deep time-series data aggregation, KPI goal tracking, and automated actionable insights (anomalies, trends) across operations, finance, and human resources.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All analytics collections are multi-tenant and strictly isolated under `/companies/{companyId}/`. This data is heavily read-optimized for rendering complex charts and data visualizations.

```
/companies/{cid}/analyticsAggregations/{aggId}
/companies/{cid}/analyticsGoals/{goalId}
/companies/{cid}/analyticsInsights/{insightId}
```

### 1.1 `analyticsAggregations` (Time-Series Business Metrics)
Pre-computed daily, weekly, or monthly aggregations of core business metrics (e.g., Overtime Costs, Attendance Fill Rates, Incident Frequencies) used to power historical charts and trend lines.
* **Path:** `/companies/{companyId}/analyticsAggregations/{aggId}`
* **Document ID:** `AGG-{metricCode}-{period}-{YYYYMMDD}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `aggId` | String | Yes | Unique Aggregation ID |
| `companyId` | String | Yes | Tenant isolation key |
| `metricCode` | String | Yes | E.g., `ATTENDANCE_FILL_RATE`, `OVERTIME_COST`, `INCIDENT_COUNT`, `ATTRITION_RATE` |
| `period` | String | Yes | Enum: `'DAILY' \| 'WEEKLY' \| 'MONTHLY' \| 'QUARTERLY'` |
| `startDate` | String | Yes | ISO Date (e.g., `2026-07-01`) |
| `endDate` | String | Yes | ISO Date (e.g., `2026-07-31`) |
| `value` | Number | Yes | Computed metric value |
| `dimensions` | Map | Yes | Drill-down data `{ branchId: "BR-1", siteId: "SITE-12" }` |
| `previousPeriodValue` | Number | Optional | Used for % change calculations |
| `computedAt` | Timestamp | Yes | Server timestamp of calculation |

### 1.2 `analyticsGoals` (KPI Targets & Performance Tracking)
Management-defined targets for specific metrics. The engine compares real-time and aggregated data against these goals.
* **Path:** `/companies/{companyId}/analyticsGoals/{goalId}`
* **Document ID:** `GOAL-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `goalId` | String | Yes | Unique Goal ID |
| `companyId` | String | Yes | Tenant isolation key |
| `metricCode` | String | Yes | Reference to metric (e.g., `ATTENDANCE_FILL_RATE`) |
| `targetValue` | Number | Yes | The numeric goal to reach |
| `comparator` | String | Yes | Enum: `'GREATER_THAN_EQUAL' \| 'LESS_THAN_EQUAL'` |
| `period` | String | Yes | Timeframe of the goal |
| `dimensions` | Map | Optional | E.g., `{ branchId: "BR-1" }` if specific to a branch |
| `status` | String | Yes | Enum: `'ON_TRACK' \| 'AT_RISK' \| 'FAILED' \| 'ACHIEVED'` |
| `createdAt` | Timestamp | Yes | Creation timestamp |
| `createdByUserId` | String | Yes | Admin/Owner User ID |

### 1.3 `analyticsInsights` (Automated Anomalies & Trend Detections)
System-generated intelligent observations (e.g., "Overtime costs at Site A have increased by 40% compared to last month").
* **Path:** `/companies/{companyId}/analyticsInsights/{insightId}`
* **Document ID:** `INSIGHT-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `insightId` | String | Yes | Unique Insight ID |
| `companyId` | String | Yes | Tenant isolation key |
| `type` | String | Yes | Enum: `'ANOMALY' \| 'TREND' \| 'PREDICTION' \| 'GOAL_ALERT'` |
| `metricCode` | String | Yes | Associated metric |
| `severity` | String | Yes | Enum: `'INFO' \| 'WARNING' \| 'CRITICAL'` |
| `title` | String | Yes | E.g., "Abnormal Attrition Rate Detected" |
| `description` | String | Yes | Detailed explanation of the insight |
| `dataPayload` | Map | Yes | `{ current: 15, baseline: 5, variancePercentage: 200 }` |
| `isActioned` | Boolean | Yes | True if reviewed/dismissed by management |
| `generatedAt` | Timestamp | Yes | Timestamp of generation |

---

## 2. BUSINESS LOGIC & WORKFLOWS

### 2.1 Background Aggregation Workers
* Cloud Scheduler triggers daily/weekly/monthly aggregation jobs.
* Workers query transactional collections (e.g., `/musterRolls`, `/payrollRuns`) to compute `value` and upsert into `/analyticsAggregations`.
* Ensures dashboards load instantly without running heavy queries on raw data.

### 2.2 Insight Generation & Goal Evaluation
* Following aggregation, the engine evaluates the new `analyticsAggregations` against `analyticsGoals`.
* If a goal is missed, or a significant variance (e.g., > 20% deviation from a 3-month moving average) is detected, the engine generates an `analyticsInsights` record.
* Critical insights optionally trigger a Notification (integrating with Phase 15).

---

## 3. FIRESTORE SECURITY RULES (ANALYTICS ENGINE)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ...
    match /companies/{cid} {
      match /analyticsAggregations/{aggId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow write: if false; // Computed strictly via Cloud Functions
      }

      match /analyticsGoals/{goalId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow write: if sameCompany(cid) && ownerTier();
      }

      match /analyticsInsights/{insightId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow update: if sameCompany(cid) && mgmtTier(); // Allow marking as actioned
        allow create, delete: if false; // System generated
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (ANALYTICS ENGINE)

```json
{
  "indexes": [
    {
      "collectionGroup": "analyticsAggregations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "metricCode", "order": "ASCENDING" },
        { "fieldPath": "startDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "analyticsGoals",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "metricCode", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "analyticsInsights",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "isActioned", "order": "ASCENDING" },
        { "fieldPath": "generatedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

**End of Phase 20: Enterprise Analytics Engine Module (100% Complete).**
