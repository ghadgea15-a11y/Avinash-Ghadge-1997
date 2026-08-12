# LOG SHEET MUSTER — PHASE 11: ENTERPRISE OPERATIONS MANAGEMENT MODULE (100% COMPLETE)
Enterprise-grade, production-ready Operations Management System for Log Sheet Muster. Fully integrated with Employee Master, Sites, Attendance, Shift & Roster, Assets, Visitor & Gate Pass Management, Incident Escalation, Notifications, and System Core Engines.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All operations management collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/siteOperations/{opId}
/companies/{cid}/patrolRoutes/{routeId}
/companies/{cid}/patrolLogs/{patrolLogId}
/companies/{cid}/incidentReports/{incidentId}
/companies/{cid}/siteChecklists/{checklistId}
/companies/{cid}/checklistSubmissions/{submissionId}
/companies/{cid}/visitorLogs/{visitorId}
/companies/{cid}/siteHandovers/{handoverId}
```

---

### 1.1 `siteOperations` (Site Post Orders & Operational Master)
Operational configurations, standing post orders, emergency protocols, and mandatory guard post assignments per site.
* **Path:** `/companies/{companyId}/siteOperations/{opId}`
* **Document ID:** `SOP-{siteId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `opId` | String | Yes | `SOP-{siteId}` |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch ID |
| `siteId` | String | Yes | Reference to `/sites/{siteId}` |
| `siteName` | String | Yes | Denormalized site name |
| `postOrders` | Array<Map> | Yes | Array of operational instructions: `[{ postName: "Gate 1 Main Entry", requiredGuardCount: 2, instructions: "Check visitor badges and vehicle stickers", shiftId: "SHIFT-M1" }]` |
| `emergencyContacts` | Array<Map> | Yes | Local police, fire, hospital, and account manager numbers: `[{ title: "Local Police Control", phone: "+919876543210" }]` |
| `geoFenceBoundary` | Map | Yes | Operational site polygon coordinates `{ centerLat: Number, centerLng: Number, radiusMeters: Number, polygonPoints: Array }` |
| `isPatrolRequired` | Boolean | Yes | True if mandatory guard patrol routes are active for site |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'SUSPENDED'` |
| `version` | Number | Yes | Concurrency counter |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

---

### 1.2 `patrolRoutes` (Guard Tour Patrol Route Definitions)
Defines guard patrol routes, sequence of physical QR/NFC checkpoints, geo-fenced tolerance, and expected completion duration.
* **Path:** `/companies/{companyId}/patrolRoutes/{routeId}`
* **Document ID:** `PROUTE-{siteId}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `routeId` | String | Yes | Unique Route ID |
| `companyId` | String | Yes | Tenant isolation key |
| `siteId` | String | Yes | Reference to `/sites/{siteId}` |
| `routeName` | String | Yes | Name (e.g. "Perimeter Fence Night Patrol", "Building A Floor 1 to 4 Route") |
| `checkpoints` | Array<Map> | Yes | Ordered array of QR/NFC checkpoints: `[{ checkpointId: "CP-01", name: "North West Gate QR", qrPayload: "QR-NW-GATE-01", nfcTagId: "NFC-7A39B", lat: 18.5204, lng: 73.8567, sequenceOrder: 1, maxDelayMinutes: 15 }]` |
| `estimatedDurationMinutes` | Number | Yes | Expected route completion time in minutes (e.g. `45`) |
| `frequencyPerShift` | Number | Yes | Mandatory patrol rounds required per shift (e.g. `3`) |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'INACTIVE'` |
| `version` | Number | Yes | Concurrency counter |

---

### 1.3 `patrolLogs` (Guard Tour Execution & GPS Scan Logs)
Real-time tracking log of active guard patrol rounds, GPS coordinates, checkpoint QR scan timestamps, and missed checkpoint alerts.
* **Path:** `/companies/{companyId}/patrolLogs/{patrolLogId}`
* **Document ID:** `PLOG-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `patrolLogId` | String | Yes | Unique Patrol Log ID |
| `companyId` | String | Yes | Tenant isolation key |
| `siteId` | String | Yes | Reference to `/sites/{siteId}` |
| `routeId` | String | Yes | Reference to `/patrolRoutes/{routeId}` |
| `guardEmployeeId` | String | Yes | Performing guard employee ID |
| `guardUserId` | String | Yes | Performing guard user ID |
| `shiftId` | String | Yes | Reference to active `/shifts/{shiftId}` |
| `startTime` | Timestamp | Yes | Patrol start time |
| `endTime` | Timestamp | Optional | Patrol completion time |
| `scannedCheckpoints` | Array<Map> | Yes | `[{ checkpointId: "CP-01", scannedAt: Timestamp, lat: Number, lng: Number, verificationMethod: "QR_SCAN" \| "NFC_TAP" \| "GPS_PASS", isVerified: Boolean }]` |
| `totalCheckpoints` | Number | Yes | Expected checkpoint count |
| `scannedCount` | Number | Yes | Actual completed scan count |
| `missedCount` | Number | Yes | Count of missed checkpoints |
| `completionStatus` | String | Yes | Enum: `'IN_PROGRESS' \| 'COMPLETED_FULL' \| 'COMPLETED_MISSED' \| 'ABANDONED'` |
| `remarks` | String | Optional | Guard notes |
| `version` | Number | Yes | Concurrency counter |

---

### 1.4 `incidentReports` (Field Security & Safety Incident Tracking)
Captures operational security incidents, safety hazards, equipment damage, medical emergencies, media evidence, and resolution workflows.
* **Path:** `/companies/{companyId}/incidentReports/{incidentId}`
* **Document ID:** `INC-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `incidentId` | String | Yes | Unique Incident ID (e.g. `INC-20260726-0012`) |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch ID |
| `siteId` | String | Yes | Site location ID |
| `title` | String | Yes | Incident title summary |
| `category` | String | Yes | Enum: `'SECURITY_BREACH' \| 'FIRE_HAZARD' \| 'EQUIPMENT_DAMAGE' \| 'MEDICAL_EMERGENCY' \| 'UNAUTHORIZED_ENTRY' \| 'THEFT_LOSS' \| 'OTHER'` |
| `severity` | String | Yes | Enum: `'LOW' \| 'MEDIUM' \| 'HIGH' \| 'CRITICAL_EMERGENCY'` |
| `incidentTimestamp` | Timestamp | Yes | Date and time incident occurred |
| `reportedByEmployeeId` | String | Yes | Reporter employee ID |
| `reportedByUserId` | String | Yes | Reporter user ID |
| `description` | String | Yes | Detailed narrative of occurrence |
| `gpsLocation` | Map | Yes | `{ lat: Number, lng: Number }` |
| `mediaUrls` | Array<String> | Optional | Storage URLs of uploaded photo/video/audio evidence |
| `involvedPersons` | Array<Map> | Optional | `[{ name: String, phone: String, role: "WITNESS" \| "VICTIM" \| "SUSPECT" }]` |
| `status` | String | Yes | Enum: `'OPEN_REPORTED' \| 'UNDER_INVESTIGATION' \| 'ACTION_TAKEN' \| 'RESOLVED' \| 'CLOSED'` |
| `investigatedByUserId` | String | Optional | Supervisor / Area Manager user ID |
| `resolutionSummary` | String | Optional | Corrective action taken |
| `resolvedAt` | Timestamp | Optional | Resolution timestamp |
| `version` | Number | Yes | Counter |

---

### 1.5 `siteChecklists` & `checklistSubmissions` (Operational Task Checklists)
Recurring daily/shift operational checklists for site supervisors (e.g. "Opening Gate Check", "Fire Extinguisher Pressure Inspection").
* **Path:** `/companies/{companyId}/siteChecklists/{checklistId}` & `/checklistSubmissions/{submissionId}`
* **Document ID:** `CHK-{siteId}-{code}` and `CSUB-{YYYYMMDD}-{UUID}`

| Collection | Field Name | Type | Required | Description |
|---|---|---|---|---|
| `siteChecklists` | `checklistId` | String | Yes | Unique Checklist Template ID |
| | `companyId` | String | Yes | Tenant isolation key |
| | `siteId` | String | Yes | Target site location ID |
| | `title` | String | Yes | Title (e.g. "Daily Site Safety & Post Inspection Checklist") |
| | `frequency` | String | Yes | Enum: `'DAILY_PER_SHIFT' \| 'DAILY_ONCE' \| 'WEEKLY' \| 'MONTHLY'` |
| | `items` | Array<Map> | Yes | `[{ itemId: "ITEM-01", questionText: "Are all emergency exits clear of obstruction?", responseType: "YES_NO" \| "TEXT" \| "PHOTO", isMandatory: true }]` |
| | `status` | String | Yes | Enum: `'ACTIVE' \| 'INACTIVE'` |
| `checklistSubmissions` | `submissionId` | String | Yes | Unique Submission Record ID |
| | `companyId` | String | Yes | Tenant isolation key |
| | `checklistId` | String | Yes | Reference to `/siteChecklists/{id}` |
| | `siteId` | String | Yes | Site location ID |
| | `submittedByUserId` | String | Yes | Supervisor `userId` |
| | `shiftId` | String | Yes | Reference to `/shifts/{id}` |
| | `responses` | Array<Map> | Yes | `[{ itemId: "ITEM-01", answer: "YES", photoUrl: String, remarks: String }]` |
| | `scorePercentage` | Number | Yes | Calculated compliance percentage score (0-100%) |
| | `submittedAt` | Timestamp | Yes | Submission server timestamp |

---

### 1.6 `visitorLogs` (Visitor Entry & Gate Pass Management)
Tracks site visitors, contractor temporary entries, vehicle pass numbers, host approvals, and exit clock-outs.
* **Path:** `/companies/{companyId}/visitorLogs/{visitorId}`
* **Document ID:** `VIS-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `visitorId` | String | Yes | Unique Visitor Log ID |
| `companyId` | String | Yes | Tenant isolation key |
| `siteId` | String | Yes | Site location ID |
| `gateNumber` | String | Yes | Entry gate identifier (e.g., `"Gate 1 Main Entrance"`) |
| `visitorName` | String | Yes | Visitor full name |
| `phone` | String | Yes | Mobile number |
| `idProofType` | String | Yes | Enum: `'AADHAAR' \| 'DRIVING_LICENSE' \| 'PASSPORT' \| 'VOTER_ID' \| 'OTHER'` |
| `idProofNumber` | String | Yes | ID document number |
| `visitorPhotoUrl` | String | Optional | Photo captured at gate via mobile camera |
| `purpose` | String | Yes | Purpose of visit |
| `hostEmployeeId` | String | Yes | Employee host receiving visitor |
| `vehicleNumber` | String | Optional | Vehicle registration number |
| `gatePassCode` | String | Yes | Unique 6-digit PIN or QR code for gate exit verification |
| `entryTime` | Timestamp | Yes | Clock-in entry time |
| `exitTime` | Timestamp | Optional | Clock-out exit time |
| `status` | String | Yes | Enum: `'INSIDE_SITE' \| 'EXITED' \| 'DENIED_ENTRY'` |
| `loggedByGuardUserId` | String | Yes | Security guard user ID at gate |
| `version` | Number | Yes | Concurrency counter |

---

### 1.7 `siteHandovers` (Shift-to-Shift Operational Handover Logs)
Digital handover log filled by outgoing supervisor handing over site responsibility, keys, asset counts, and active issues to incoming supervisor.
* **Path:** `/companies/{companyId}/siteHandovers/{handoverId}`
* **Document ID:** `HOVER-{YYYYMMDD}-{siteId}-{shiftId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `handoverId` | String | Yes | Unique Handover ID |
| `companyId` | String | Yes | Tenant isolation key |
| `siteId` | String | Yes | Site location ID |
| `outgoingShiftId` | String | Yes | Ending shift ID |
| `incomingShiftId` | String | Yes | Starting shift ID |
| `outgoingSupervisorUserId` | String | Yes | Handing-over supervisor user ID |
| `incomingSupervisorUserId` | String | Yes | Receiving supervisor user ID |
| `guardCountHandover` | Map | Yes | `{ expectedGuards: 12, presentGuards: 12, shortGuards: 0 }` |
| `keysAssetsChecked` | Boolean | Yes | True if site keys and assets physically verified |
| `pendingIssuesNotes` | String | Yes | Important notes or open incidents for next shift |
| `handoverStatus` | String | Yes | Enum: `'SUBMITTED' \| 'ACCEPTED_CONFIRMED' \| 'DISPUTED'` |
| `timestamp` | Timestamp | Yes | Server timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOW ENGINE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   OPERATIONS AUTOMATION ARCHITECTURE                     │
├─────────────────┬──────────────────┬─────────────────┬───────────────────┤
│ 1. Guard Patrol │ 2. Critical      │ 3. Gate Pass &  │ 4. Shift Handover │
│ QR Monitoring   │ Incident & SOS   │ Visitor Access  │ & Compliance      │
│ & Missed Alerts │ Escalation Engine│ Workflow Engine │ Audit Engine      │
└────────┬────────┴────────┬─────────┴────────┬────────┴─────────┬─────────┘
         │                 │                  │                  │
         └─────────────────┴────────┬─────────┴──────────────────┘
                                    ▼
                [ Real-Time Field Operations Dispatch Engine ]
                - Evaluates live Guard Patrol scans against `patrolRoutes` timer.
                - If checkpoint scan delayed > 15 mins, fires CRITICAL FCM alert
                  to Site Supervisor & Operations Manager.
                - Critical Incident Reports (`severity == 'CRITICAL_EMERGENCY'`)
                  trigger immediate SMS/FCM broadcast to Regional Ops Team.
                - Visitor Exit Code verification prevents unauthorized departures.
                - Daily Checklist compliance scores feed into Site Performance Reports.
```

---

### 2.1 Guard Tour Patrol Tracking & Delay Alerts
* Guard scans checkpoint QR/NFC tag on mobile app during active patrol.
* Cloud Function `processCheckpointScan`:
  * Verifies guard's current GPS location against `checkpoint.lat/lng` within 50m tolerance.
  * Records entry in `/patrolLogs.scannedCheckpoints`.
  * If route completed, marks `completionStatus = 'COMPLETED_FULL'`.
* **Missed Patrol Patrol Watchdog (Cloud Scheduler):**
  * Evaluates active `/patrolLogs` in `'IN_PROGRESS'` state every 10 minutes.
  * If elapsed time > `estimatedDurationMinutes + 15 mins` and checkpoints remain unscanned:
    * Updates status to `'COMPLETED_MISSED'`.
    * Triggers high-priority push notification to Site Supervisor.

---

### 2.2 Critical Incident Escalation Workflow
1. Guard / Supervisor files `/incidentReports` on mobile app with photo evidence and GPS coordinates.
2. If `severity == 'CRITICAL_EMERGENCY'`:
   * Cloud Function `escalateCriticalIncident`:
     * Broadcasts FCM push alert to Site Incharge, Operations Manager, and Company Owner.
     * Auto-creates an emergency audit trail in `/auditLogs`.
3. Operations Manager investigates, inputs `resolutionSummary`, and transitions status to `'RESOLVED'`.

---

## 3. FIRESTORE SECURITY RULES (OPERATIONS MODULE)

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
    function mgmtTier()  { return roleAtLeast(['companyOwner','admin','hr','manager','ops']); }
    function opsTier()   { return roleAtLeast(['companyOwner','admin','hr','manager','incharge','supervisor','ops']); }

    match /companies/{cid} {

      // --- SITE OPERATIONS MASTER ---
      match /siteOperations/{opId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && mgmtTier();
      }

      // --- PATROL ROUTES & LOGS ---
      match /patrolRoutes/{routeId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && opsTier();
      }

      match /patrolLogs/{patrolLogId} {
        allow read: if sameCompany(cid) && opsTier();
        allow create, update: if sameCompany(cid) && isSignedIn();
        allow delete: if false;
      }

      // --- INCIDENT REPORTS ---
      match /incidentReports/{incidentId} {
        allow read: if sameCompany(cid);
        allow create: if sameCompany(cid) && isSignedIn();
        allow update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }

      // --- CHECKLISTS & SUBMISSIONS ---
      match /siteChecklists/{checklistId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && opsTier();
      }

      match /checklistSubmissions/{subId} {
        allow read: if sameCompany(cid) && opsTier();
        allow create, update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }

      // --- VISITOR LOGS ---
      match /visitorLogs/{visitorId} {
        allow read: if sameCompany(cid) && opsTier();
        allow create, update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }

      // --- SITE HANDOVERS ---
      match /siteHandovers/{handoverId} {
        allow read: if sameCompany(cid) && opsTier();
        allow create, update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (OPERATIONS MODULE)

```json
{
  "indexes": [
    {
      "collectionGroup": "patrolLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "siteId", "order": "ASCENDING" },
        { "fieldPath": "completionStatus", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "incidentReports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "siteId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "incidentTimestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "incidentReports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "severity", "order": "ASCENDING" },
        { "fieldPath": "incidentTimestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "visitorLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "siteId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "entryTime", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "checklistSubmissions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "siteId", "order": "ASCENDING" },
        { "fieldPath": "submittedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 5. ERROR HANDLING & VALIDATION CODES

| Error Code | Message | Resolution |
|---|---|---|
| `ERR_PATROL_GPS_OUT_OF_BOUNDS` | QR scan GPS location is outside acceptable checkpoint radius tolerance. | Guard must physically scan checkpoint at designated post. |
| `ERR_INVALID_EXIT_GATE_PASS` | Invalid Gate Pass PIN/QR code or visitor has already exited. | Verify visitor exit PIN code at gate. |
| `ERR_INCIDENT_CLOSED` | Cannot modify an incident report in CLOSED state. | Open new incident report if additional details arise. |

---

**End of Phase 11: Enterprise Operations Management Module (100% Complete).**
