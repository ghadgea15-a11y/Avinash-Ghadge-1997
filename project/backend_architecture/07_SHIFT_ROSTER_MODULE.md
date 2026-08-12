# LOG SHEET MUSTER — PHASE 5: SHIFT & ROSTER MANAGEMENT MODULE (100% COMPLETE)
Enterprise-grade, production-ready Shift & Roster Management System for Log Sheet Muster. Seamlessly integrated with Employee Master, Attendance, Leave, Payroll, Sites, Departments, and System Core Engines.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All shift and roster collections are tenant-isolated under `/companies/{companyId}/`.

```
/companies/{cid}/shifts/{shiftId}
/companies/{cid}/shiftPatterns/{patternId}
/companies/{cid}/rosters/{rosterId}
/companies/{cid}/openShifts/{openShiftId}
/companies/{cid}/shiftSwapRequests/{swapRequestId}
/companies/{cid}/replacementShifts/{replacementId}
/companies/{cid}/rosterHistory/{historyId}
```

---

### 1.1 `shifts` (Master Shift Templates)
Defines working schedule configurations, shift types (Fixed, Split, Night, Flexi), grace times, break rules, and skill/site constraints.
* **Path:** `/companies/{companyId}/shifts/{shiftId}`
* **Document ID:** `SHIFT-{UUID}` or `SHIFT-MORNING-A`, `SHIFT-SPLIT-HOTEL`, `SHIFT-NIGHT-SEC`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `shiftId` | String | Yes | Unique identifier (e.g. `SHIFT-MORNING-A`) |
| `companyId` | String | Yes | Tenant isolation key |
| `name` | String | Yes | Display name (e.g., "Morning General Shift", "Split Hospitality Shift") |
| `code` | String | Yes | Short code for Muster Roll & Roster Grid (e.g., `M1`, `N`, `SP`, `FLX`) |
| `shiftType` | String | Yes | Enum: `'FIXED' \| 'SPLIT' \| 'NIGHT' \| 'FLEXIBLE' \| 'OPEN'` |
| `startTime` | String | Yes | 24-hr format `"HH:mm"` (e.g., `"08:00"`) |
| `endTime` | String | Yes | 24-hr format `"HH:mm"` (e.g., `"17:00"`) |
| `splitSlots` | Array<Map> | Optional | For Split shifts: `[{ slotNumber: 1, startTime: "10:00", endTime: "14:00" }, { slotNumber: 2, startTime: "18:00", endTime: "22:00" }]` |
| `isNightShift` | Boolean | Yes | True if shift crosses midnight (e.g. 22:00 to 06:00 next day) |
| `workHours` | Number | Yes | Gross expected working hours excluding unpaid breaks (e.g., 8.0) |
| `breakDurationMinutes` | Number | Yes | Total unpaid break time in minutes (e.g., 60) |
| `breakWindows` | Array<Map> | Optional | Configured break times: `[{ name: "Lunch", startTime: "12:30", endTime: "13:30", isPaid: false }]` |
| `gracePeriodInMinutes` | Number | Yes | Grace time allowed past `startTime` before marked Late (e.g., 15) |
| `gracePeriodOutMinutes` | Number | Yes | Grace time allowed before `endTime` before marked Early Exit (e.g., 10) |
| `halfDayMinHours` | Number | Yes | Minimum hours required for Half-Day attendance credit (e.g., 4.0) |
| `fullDayMinHours` | Number | Yes | Minimum hours required for Full-Day attendance credit (e.g., 7.5) |
| `overtimeThresholdMinutes` | Number | Yes | Delay in minutes past shift end before OT calculation begins (e.g., 30) |
| `maxOvertimeHours` | Number | Yes | Maximum allowed OT hours per shift (e.g., 4.0) |
| `nightShiftAllowance` | Number | Yes | Monetary or percentage bonus rate for night shifts (used in Payroll) |
| `requiredSkills` | Array<String> | Optional | List of required skills/certifications (e.g. `["Armed Guard", "First Aid"]`) |
| `allowedDepartmentIds` | Array<String> | Optional | Restrict shift to specific departments (empty = all) |
| `allowedDesignationIds` | Array<String> | Optional | Restrict shift to specific designations (empty = all) |
| `allowedSiteIds` | Array<String> | Optional | Restrict shift to specific site locations (empty = all) |
| `colorCode` | String | Yes | Color code for roster grid calendar (e.g. `#2196F3`) |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'INACTIVE'` |
| `isDeleted` | Boolean | Yes | Soft delete flag |
| `version` | Number | Yes | Optimistic locking counter |
| `createdBy` | String | Yes | `userId` |
| `createdAt` | Timestamp | Yes | Creation timestamp |
| `updatedBy` | String | Yes | `userId` |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

---

### 1.2 `shiftPatterns` (Rotation Cycle Rules)
Defines repeating shift rotation logic (e.g., 6 Days Morning -> 1 Day Off -> 6 Days Evening -> 1 Day Off -> 6 Days Night).
* **Path:** `/companies/{companyId}/shiftPatterns/{patternId}`
* **Document ID:** `PAT-{code}` (e.g. `PAT-3SHIFT-ROTATION`)

| Field Name | Type | Required | Description |
|---|---|---|---|
| `patternId` | String | Yes | Unique pattern ID |
| `companyId` | String | Yes | Tenant isolation key |
| `name` | String | Yes | Pattern name (e.g., "3-Shift Weekly Rotation", "24/7 Security 4-Team Rotation") |
| `cycleLengthDays` | Number | Yes | Length of cycle in days (e.g. `7`, `14`, `21`, `28`) |
| `sequence` | Array<Map> | Yes | Ordered array of shift assignments: `[{ dayIndex: 1, shiftId: "SHIFT-M1", isWeeklyOff: false }, ... { dayIndex: 7, shiftId: null, isWeeklyOff: true }]` |
| `autoRotate` | Boolean | Yes | True if auto-roster engine automatically rolls pattern forward |
| `rotationIntervalWeeks` | Number | Yes | Frequency of rotation in weeks (e.g., rotate every `1` week) |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'INACTIVE'` |
| `isDeleted` | Boolean | Yes | Soft delete flag |
| `version` | Number | Yes | Optimistic concurrency counter |

---

### 1.3 `rosters` (Individual & Group Daily Roster Entries)
Defines the authoritative assigned shift for an employee on a specific calendar date.
* **Path:** `/companies/{companyId}/rosters/{rosterId}`
* **Document ID:** `ROSTER-{YYYYMMDD}-{employeeId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `rosterId` | String | Yes | `ROSTER-{YYYYMMDD}-{employeeId}` |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch ID |
| `siteId` | String | Yes | Site ID location |
| `departmentId` | String | Optional | Department ID |
| `designationId` | String | Optional | Designation ID |
| `employeeId` | String | Yes | Reference to `employees/{employeeId}` |
| `employeeUserId` | String | Yes | Reference to `users/{uid}` |
| `employeeCode` | String | Yes | Employee code (denormalized) |
| `employeeName` | String | Yes | Employee full name (denormalized) |
| `date` | String | Yes | Target date `"YYYY-MM-DD"` |
| `shiftId` | String | Optional | Reference to `shifts/{shiftId}` (null if `isWeeklyOff` or `isHoliday`) |
| `shiftCode` | String | Yes | Short code for grid (e.g. `"M1"`, `"N"`, `"WO"`, `"HO"`) |
| `startTime` | String | Optional | Planned shift start time `"HH:mm"` |
| `endTime` | String | Optional | Planned shift end time `"HH:mm"` |
| `isWeeklyOff` | Boolean | Yes | True if scheduled weekly off |
| `isHoliday` | Boolean | Yes | True if public/company holiday |
| `holidayName` | String | Optional | Holiday description |
| `isOvertimeShift` | Boolean | Yes | True if this is an extra OT shift assigned on off-day |
| `rosterSource` | String | Yes | Enum: `'AUTO_PATTERN' \| 'MANUAL_SUPERVISOR' \| 'HR_BULK' \| 'SWAP_REPLACEMENT' \| 'AI_OPTIMIZER'` |
| `isPublished` | Boolean | Yes | True if published and visible to employee |
| `publishedAt` | Timestamp | Optional | Timestamp when roster was published |
| `assignedByUserId` | String | Yes | `userId` who created/modified assignment |
| `isLocked` | Boolean | Yes | True if locked for attendance/payroll |
| `isDeleted` | Boolean | Yes | Soft delete flag |
| `version` | Number | Yes | Optimistic concurrency counter |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

---

### 1.4 `openShifts` (Unassigned Shift Slots)
Unassigned shift demand slots published for workers to claim or supervisors to assign relief.
* **Path:** `/companies/{companyId}/openShifts/{openShiftId}`
* **Document ID:** `OPEN-{YYYYMMDD}-{siteId}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `openShiftId` | String | Yes | Unique ID |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch ID |
| `siteId` | String | Yes | Site ID |
| `shiftId` | String | Yes | Reference to `shifts/{shiftId}` |
| `date` | String | Yes | Target date `"YYYY-MM-DD"` |
| `requiredSlots` | Number | Yes | Total unassigned worker slots required (e.g. `5`) |
| `claimedSlots` | Number | Yes | Slots currently claimed/assigned |
| `requiredSkill` | String | Optional | Mandatory skill tag |
| `hourlyBonusRate` | Number | Optional | Extra incentive pay per hour for open shift coverage |
| `status` | String | Yes | Enum: `'OPEN' \| 'PARTIALLY_FILLED' \| 'FILLED' \| 'CANCELLED'` |
| `createdByUserId` | String | Yes | `userId` |
| `createdAt` | Timestamp | Yes | Creation time |

---

### 1.5 `shiftSwapRequests` (Peer-to-Peer & Supervisor Shift Swaps)
Tracks requests by employees to exchange assigned shift slots with a colleague.
* **Path:** `/companies/{companyId}/shiftSwapRequests/{swapRequestId}`
* **Document ID:** `SWAP-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `swapRequestId` | String | Yes | Unique Swap ID |
| `companyId` | String | Yes | Tenant isolation key |
| `requesterEmployeeId` | String | Yes | Employee initiating swap |
| `requesterRosterId` | String | Yes | Reference to requester's `/rosters/{id}` |
| `requesterDate` | String | Yes | Requester's shift date `"YYYY-MM-DD"` |
| `targetEmployeeId` | String | Yes | Peer colleague receiving swap request |
| `targetRosterId` | String | Yes | Reference to target's `/rosters/{id}` |
| `targetDate` | String | Yes | Peer's shift date `"YYYY-MM-DD"` |
| `reason` | String | Yes | Reason for swap |
| `status` | String | Yes | Enum: `'PENDING_PEER' \| 'PENDING_MANAGER' \| 'APPROVED' \| 'REJECTED' \| 'CANCELLED'` |
| `peerAcceptedAt` | Timestamp | Optional | Timestamp when colleague accepted |
| `approvedByUserId` | String | Optional | Manager/Supervisor user ID who gave final approval |
| `approvedAt` | Timestamp | Optional | Approval timestamp |
| `version` | Number | Yes | Concurrency counter |

---

### 1.6 `replacementShifts` (Emergency Relief / Absentee Cover)
Tracks emergency shift cover when an assigned worker is absent or takes emergency leave.
* **Path:** `/companies/{companyId}/replacementShifts/{replacementId}`
* **Document ID:** `REPL-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `replacementId` | String | Yes | Unique ID |
| `companyId` | String | Yes | Tenant isolation key |
| `originalEmployeeId` | String | Yes | Absent employee ID |
| `replacementEmployeeId` | String | Yes | Assigned relief employee ID |
| `rosterId` | String | Yes | Target `/rosters/{id}` record |
| `date` | String | Yes | Shift date `"YYYY-MM-DD"` |
| `shiftId` | String | Yes | Shift ID |
| `reason` | String | Yes | Enum: `'UNANNOUNCED_ABSENCE' \| 'EMERGENCY_LEAVE' \| 'SICK_OFF' \| 'SURGE_DEMAND'` |
| `assignedByUserId` | String | Yes | Supervisor/Incharge who assigned relief |
| `status` | String | Yes | Enum: `'ASSIGNED' \| 'CONFIRMED' \| 'COMPLETED' \| 'NO_SHOW'` |
| `createdAt` | Timestamp | Yes | Creation timestamp |

---

### 1.7 `rosterHistory` (Immutable Audit Log Diffs)
* **Path:** `/companies/{companyId}/rosterHistory/{historyId}`
* **Document ID:** `RHIST-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `historyId` | String | Yes | Unique ID |
| `companyId` | String | Yes | Tenant isolation key |
| `rosterId` | String | Yes | Reference to roster entry |
| `employeeId` | String | Yes | Target employee ID |
| `modifiedByUserId` | String | Yes | User who edited roster |
| `modifiedByRole` | String | Yes | Role tier (`supervisor`, `hr`, `manager`) |
| `action` | String | Yes | Enum: `'CREATE' \| 'AUTO_GENERATE' \| 'MANUAL_SWAP' \| 'REPLACEMENT_ASSIGN' \| 'BULK_OVERRIDE' \| 'PUBLISH' \| 'LOCK'` |
| `beforeState` | Map | Optional | State before modification |
| `afterState` | Map | Yes | State after modification |
| `reason` | String | Yes | Explanation for change |
| `timestamp` | Timestamp | Yes | Server timestamp |

---

## 2. BUSINESS LOGIC & SHIFT ROSTER ENGINE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    SHIFT & ROSTER MANAGEMENT ENGINE                      │
├─────────────────┬──────────────────┬─────────────────┬───────────────────┤
│ 1. Shift        │ 2. Auto-Roster   │ 3. Swap / Relief│ 4. Validation &   │
│ Master Setup    │ Generator &      │ Workflow Engine │ Rest Period       │
│ (Fixed/Split/N) │ Rotation Rules   │ (Peer & Mgr)    │ Compliance Engine │
└────────┬────────┴────────┬─────────┴────────┬────────┴─────────┬─────────┘
         │                 │                  │                  │
         └─────────────────┴────────┬─────────┴──────────────────┘
                                    ▼
                 [ Server-Side Roster Generation Cloud Function ]
                 - Validates Minimum Rest Hours (e.g. 11 hrs between shifts)
                 - Enforces Max Consecutive Working Days (e.g. max 6 days)
                 - Prevents Overlapping Shift Assignments
                 - Matches Employee Skills & Site Entitlements
                 - Integrates Approved Leaves & Weekly Offs
                                    │
                                    ▼
                          [ Roster State Lifecycle ]
                   DRAFT → PUBLISHED → LOCKED (for Payroll)
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
              [ Attendance Engine ]   [ Notification Engine ]
              - Feeds expected IN/OUT - Alerts Employee of Shifts
              - Evaluates Late/Early  - Push Alerts for Swaps
```

---

### 2.1 Shift Types & Execution Rules
1. **Fixed Shift:** Standard fixed clock-in / clock-out times (e.g. `09:00` to `18:00`). Late/Early Exit evaluated directly against fixed times + grace minutes.
2. **Split Shift:** Shift broken into multiple daily work slots (e.g. Morning `10:00 - 14:00` and Evening `18:00 - 22:00` for hotel/restaurant staff). Requires 2 punch-in/out sets per day. Total work hours aggregated across slots.
3. **Night Shift:** Shift starting on Day T and ending on Day T+1 (e.g. `22:00` to `06:00`). Logical `workDate` assigned to Day T. Night shift allowance flag passed to Payroll.
4. **Flexible Shift:** Core hours + flexi band (e.g., must complete 8 hours between `07:00` and `20:00`). Late mark evaluated only if gross daily duration < required work hours.
5. **Open Shift:** Unassigned capacity slot published to site pool. Workers claim via mobile app or supervisor assigns manually.

---

### 2.2 Auto-Roster Generation & Rotation Engine
* **Execution:** Scheduled or manual Cloud Function `generateMonthlyRoster`:
  * Takes `companyId`, `branchId`, `siteId`, `monthYear`, and `patternId`.
  * Fetches active employee list for the site/department.
  * Applies `shiftPattern.sequence` iteratively across days of the month.
  * Checks `leaveRequests` status `APPROVED`: if leave exists on date T, roster automatically marks `shiftId = null`, `isWeeklyOff = false`, `shiftCode = 'LV'`.
  * Checks company `holidayCalendar`: if public holiday, marks `isHoliday = true`, `shiftCode = 'HO'`.
  * Outputs records to `/rosters` with `isPublished = false` (Draft status).
* **AI & Optimization Ready Parameters:** The schema includes `requiredSkills`, `maxConsecutiveDays`, `minRestHoursBetweenShifts`, and `siteCapacityDemand`, enabling future plug-and-play AI optimization algorithms (e.g. Google OR-Tools constraint solvers) without database schema migration.

---

### 2.3 Rest Period & Compliance Rules Engine
* **Minimum Rest Period Rule:** Standard statutory rule requiring at least `11 hours` of rest between the end of one shift and the start of the next shift. Roster generator blocks assigning a Morning Shift (`07:00`) immediately following a Night Shift (`22:00 - 06:00`).
* **Max Consecutive Work Days Rule:** Enforces maximum `6 consecutive work days` before mandatory Weekly Off (`WO`).
* **Double Shift Prevention:** System blocks creating two active roster records for the same employee on the same date unless explicitly flagged as `isOvertimeShift = true`.

---

### 2.4 Shift Swap Workflow (Peer-to-Peer & Manager Approval)
1. **Initiate:** Employee A requests to swap shift on Date X with Employee B on Date Y via mobile app.
2. **Peer Acceptance:** Employee B receives FCM push notification → clicks "Accept Swap" (`status = 'PENDING_MANAGER'`).
3. **Manager Approval:** Supervisor/Manager reviews skill match and rest period compliance → clicks "Approve".
4. **Execution:** Transactional Cloud Function `executeShiftSwap`:
   * Swaps `shiftId`, `startTime`, `endTime` between Employee A's and Employee B's `/rosters` records.
   * Logs transaction to `/rosterHistory`.
   * Triggers push notification to both employees with updated shift schedules.

---

### 2.5 Replacement / Relief Shift Workflow (Emergency Cover)
* When an employee is marked `ABSENT` or files an emergency leave on shift date T:
  1. Supervisor opens "Site Relief Finder".
  2. System filters available employees on `Weekly Off` or off-shift at the site with matching `requiredSkills` and no rest-period violation.
  3. Supervisor selects relief worker → system creates `replacementShifts` record and updates target `/rosters` entry as `isOvertimeShift = true`.
  4. Relief worker receives urgent high-priority FCM notification.

---

### 2.6 Proxy Shift Management for Non-Smartphone Staff
* Field workers without mobile devices have shifts created, rotated, and swapped by Supervisors or HR Managers using the "Site Shift Grid" on tablet/desktop.
* Every proxy modification records `assignedByUserId = supervisor.uid` and logs an audit record in `/rosterHistory`.

---

## 3. INTEGRATION WITH ATTENDANCE, LEAVE & PAYROLL

1. **Attendance Integration:**
   * Daily Attendance Engine reads published `/rosters/{YYYYMMDD-employeeId}` to determine expected `startTime`, `endTime`, `gracePeriodInMinutes`, and `shiftType`.
   * Raw punches (`/attendancePunches`) are evaluated against the assigned roster to flag `isLate`, `isEarlyExit`, and `totalWorkMinutes`.
2. **Leave Integration:**
   * Approved `/leaveRequests` immediately override `/rosters` for the approved date range, preventing false "Absent" flags.
3. **Payroll Integration:**
   * Monthly Payroll Engine reads `/rosters` and `/musterRolls` to calculate Night Shift allowances, Overtime shift pay, and Weekly Off / Holiday worked premiums.

---

## 4. REPORTS, DASHBOARD WIDGETS & AUDIT LOGS

### 4.1 Reports Generated
1. **Monthly Shift Roster Matrix:** 31-day visual schedule grid per site/department.
2. **Shift Coverage Gap Report:** Highlights unassigned or under-staffed shift slots across site locations.
3. **Roster vs. Actual Variance Report:** Compares planned shift rosters against actual attendance punches to detect late arrivals, early exits, and unannounced absences.
4. **Shift Swap & Relief Audit Log:** History of all peer swaps, proxy changes, and emergency replacements.

### 4.2 Dashboard Widgets (Mobile & Tablet)
* **My Upcoming Shifts Widget:** Displays next 7 days of assigned shifts with clock times and site locations for workers.
* **Site Shift Coverage Gauge:** `[ Morning Shift: 45/45 Filled | Night Shift: 12/15 (3 Relief Required) ]`
* **Pending Shift Swaps Badge:** `[ 2 Shift Swap Requests Awaiting Approval ]`

---

## 5. FIRESTORE SECURITY RULES (SHIFT & ROSTER MODULE)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function claims() { return request.auth.token; }
    function isSignedIn() { return request.auth != null; }
    function companyId() { return claims().companyId; }
    function role() { return claims().role; }
    function sameCompany(cid) { return isSignedIn() && companyId() == cid; }
    function hasBranch(bid) { return bid in claims().branchIds; }
    function roleAtLeast(list) { return role() in list; }

    function hrTier()   { return roleAtLeast(['companyOwner','admin','hr']); }
    function mgmtTier() { return roleAtLeast(['companyOwner','admin','hr','manager']); }
    function opsTier()  { return roleAtLeast(['companyOwner','admin','hr','manager','incharge','supervisor']); }

    match /companies/{cid} {

      // --- MASTER SHIFTS & PATTERNS ---
      match /shifts/{shiftId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && hrTier();
      }

      match /shiftPatterns/{patternId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && hrTier();
      }

      // --- ROSTERS ---
      match /rosters/{rosterId} {
        allow read: if sameCompany(cid) && (
          opsTier() || 
          request.auth.uid == resource.data.employeeUserId
        );
        allow create, update: if sameCompany(cid) && opsTier() && resource.data.isLocked == false;
        allow delete: if false; // Soft delete only
      }

      // --- OPEN SHIFTS ---
      match /openShifts/{openShiftId} {
        allow read: if sameCompany(cid);
        allow create, update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }

      // --- SHIFT SWAP REQUESTS ---
      match /shiftSwapRequests/{swapId} {
        allow read: if sameCompany(cid) && (
          opsTier() || 
          request.auth.uid == resource.data.requesterEmployeeId || 
          request.auth.uid == resource.data.targetEmployeeId
        );
        allow create: if sameCompany(cid) && (
          request.auth.uid == request.resource.data.requesterEmployeeId || opsTier()
        );
        allow update: if sameCompany(cid) && (
          opsTier() || 
          request.auth.uid == resource.data.targetEmployeeId || 
          request.auth.uid == resource.data.requesterEmployeeId
        );
        allow delete: if false;
      }

      // --- REPLACEMENT SHIFTS ---
      match /replacementShifts/{replacementId} {
        allow read: if sameCompany(cid) && opsTier();
        allow create, update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }

      // --- ROSTER HISTORY (AUDIT TRAIL) ---
      match /rosterHistory/{histId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow write: if false; // Written exclusively by Cloud Functions
      }
    }
  }
}
```

---

## 6. FIRESTORE COMPOSITE INDEXES (SHIFT & ROSTER MODULE)

```json
{
  "indexes": [
    {
      "collectionGroup": "shifts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "rosters",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "siteId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" },
        { "fieldPath": "isPublished", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "rosters",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "employeeUserId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "openShifts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "siteId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "shiftSwapRequests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "requesterDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "replacementShifts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 7. ERROR HANDLING & VALIDATION CODES

| Error Code | Message | Resolution |
|---|---|---|
| `ERR_ROSTER_LOCKED` | Roster entry for this period is locked by HR. | Request roster unlock from HR Admin. |
| `ERR_REST_PERIOD_VIOLATION` | Assigned shift violates minimum 11-hour rest period rule. | Reassign worker to a later shift or select different relief worker. |
| `ERR_MAX_CONSECUTIVE_DAYS` | Assigning shift exceeds maximum 6 consecutive work days limit. | Schedule mandatory Weekly Off (`WO`). |
| `ERR_SKILL_MISMATCH` | Employee lacks mandatory skill required for this shift slot. | Select worker with matching skill certifications. |
| `ERR_SHIFT_OVERLAP` | Employee already assigned to another active shift on this date. | Remove existing assignment before reassigning. |
| `ERR_SWAP_EXPIRED` | Shift swap request date has already passed. | Select an upcoming shift date for swap. |

---

## CROSS-MODULE CONNECTIVITY (Shift & Roster Module ⇄ System Core)

1. **Shift ⇄ Employee Module:** Pulls skills, department, designation, branch, site, and employment grade from `/employees/{id}`.
2. **Shift ⇄ Attendance Module:** Daily Attendance Engine reads `/rosters` to evaluate clock times, late marks, early exits, and night shifts.
3. **Shift ⇄ Leave Module:** Approved leaves automatically override `/rosters` to prevent false absences and disable shift swap requests on leave days.
4. **Shift ⇄ Payroll Module:** Shift parameters (night allowance, overtime multipliers, holiday shift rates) feed directly into monthly payroll calculation.
5. **Shift ⇄ Notification Engine:** Sends high-priority FCM notifications for roster publications, shift swaps, and emergency relief assignments.

---

**End of Phase: Enterprise Shift & Roster Management Module (100% Complete).**
Awaiting your approval before proceeding to the Payroll Module.
