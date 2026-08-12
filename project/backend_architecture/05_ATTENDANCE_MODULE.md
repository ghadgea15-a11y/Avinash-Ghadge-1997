# LOG SHEET MUSTER — PHASE 3: ATTENDANCE MODULE (100% COMPLETE)
Enterprise-grade, production-ready Attendance Management System for Log Sheet Muster, built directly on Phase 1 (Foundation) and Phase 2 (Employee Module).

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All attendance data is multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/shifts/{shiftId}
/companies/{cid}/rosters/{rosterId}
/companies/{cid}/attendancePunches/{punchId}
/companies/{cid}/attendance/{attendanceId}
/companies/{cid}/attendanceCorrections/{correctionId}
/companies/{cid}/musterRolls/{musterRollId}
/companies/{cid}/attendanceHistory/{historyId}
```

---

### 1.1 `shifts` (Collection)
Defines working schedules, grace periods, half-day thresholds, and overtime parameters.
*   **Path:** `/companies/{companyId}/shifts/{shiftId}`
*   **Document ID:** `SHIFT-{UUID}` or `SHIFT-MORNING`, `SHIFT-NIGHT`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `shiftId` | String | Yes | Unique Shift Identifier |
| `companyId` | String | Yes | Tenant isolation key |
| `name` | String | Yes | Human-readable name (e.g. "General Day Shift", "Night Security Shift") |
| `code` | String | Yes | Short code for Muster Roll (e.g. "G", "N1", "E") |
| `startTime` | String | Yes | 24-hr format "HH:mm" (e.g., "09:00", "22:00") |
| `endTime` | String | Yes | 24-hr format "HH:mm" (e.g., "18:00", "06:00") |
| `isNightShift` | Boolean | Yes | True if shift crosses midnight (e.g. 22:00 to 06:00 next day) |
| `breakDurationMinutes` | Number | Yes | Total break time in minutes (e.g. 60) |
| `gracePeriodInMinutes` | Number | Yes | Minutes allowed past startTime before marked Late (e.g. 15) |
| `gracePeriodOutMinutes` | Number | Yes | Minutes allowed before endTime before marked Early Exit (e.g. 10) |
| `halfDayMinHours` | Number | Yes | Minimum working hours required for Half-Day credit (e.g. 4.0) |
| `fullDayMinHours` | Number | Yes | Minimum working hours required for Full-Day credit (e.g. 7.5) |
| `overtimeMinMinutes` | Number | Yes | Threshold before OT calculation starts (e.g. 30) |
| `maxOvertimeHours` | Number | Yes | Cap on OT per shift for safety/statutory compliance (e.g. 4.0) |
| `flexibleHours` | Boolean | Yes | True if shift uses total hours instead of strict clock times |
| `allowedSites` | Array<String> | Optional | List of `siteId`s where this shift is valid (empty = all) |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'INACTIVE'` |
| `isDeleted` | Boolean | Yes | Soft delete flag |
| `version` | Number | Yes | Optimistic locking counter |
| `createdBy` | String | Yes | `userId` |
| `createdAt` | Timestamp | Yes | Creation timestamp |
| `updatedBy` | String | Yes | `userId` |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

---

### 1.2 `rosters` (Shift Assignments)
Maps employees to shifts and sites for specific date ranges or weekly schedules.
*   **Path:** `/companies/{companyId}/rosters/{rosterId}`
*   **Document ID:** `ROSTER-{employeeId}-{YYYYMMDD}` or `ROSTER-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `rosterId` | String | Yes | Unique ID |
| `companyId` | String | Yes | Tenant isolation key |
| `employeeId` | String | Yes | Reference to `employees/{employeeId}` |
| `linkedUserId` | String | Yes | Reference to `users/{uid}` |
| `branchId` | String | Yes | Reference to branch |
| `siteId` | String | Yes | Assigned site location |
| `shiftId` | String | Yes | Reference to `shifts/{shiftId}` |
| `date` | String | Yes | ISO Date `"YYYY-MM-DD"` |
| `isWeeklyOff` | Boolean | Yes | True if this date is the employee's scheduled day off |
| `isHoliday` | Boolean | Yes | True if date is a declared company/site holiday |
| `holidayName` | String | Optional | Name of holiday if `isHoliday == true` |
| `createdBy` | String | Yes | `userId` |
| `createdAt` | Timestamp | Yes | Creation timestamp |
| `updatedBy` | String | Yes | `userId` |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

---

### 1.3 `attendancePunches` (Raw Punch Events)
Immutable raw records of all raw check-in / check-out actions captured via mobile, kiosk, QR, or proxy.
*   **Path:** `/companies/{companyId}/attendancePunches/{punchId}`
*   **Document ID:** `PUNCH-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `punchId` | String | Yes | Unique Punch ID |
| `companyId` | String | Yes | Tenant isolation key |
| `employeeId` | String | Yes | Reference to `employees/{employeeId}` |
| `linkedUserId` | String | Yes | Reference to `users/{uid}` |
| `branchId` | String | Yes | Branch ID |
| `siteId` | String | Yes | Site ID where punch occurred |
| `punchType` | String | Yes | Enum: `'IN' \| 'OUT' \| 'BREAK_IN' \| 'BREAK_OUT'` |
| `timestamp` | Timestamp | Yes | Server timestamp of punch |
| `clientTimestamp` | Timestamp | Yes | Device timestamp at time of capture (for offline sync) |
| `workDate` | String | Yes | Assigned logical work date `"YYYY-MM-DD"` (handles night shifts) |
| `captureMethod` | String | Yes | Enum: `'SELF_MOBILE' \| 'PROXY_SUPERVISOR' \| 'INCHARGE_GATE' \| 'QR_SCAN' \| 'MANUAL_HR' \| 'BULK_ENTRY'` |
| `geoPoint` | GeoPoint | Optional | `{ latitude, longitude }` |
| `geoAccuracyMeters` | Number | Optional | GPS accuracy in meters |
| `geofenceStatus` | String | Yes | Enum: `'INSIDE' \| 'OUTSIDE' \| 'NOT_REQUIRED'` |
| `distanceFromSiteMeters` | Number | Optional | Distance from assigned site center in meters |
| `selfieStoragePath` | String | Optional | Storage path to captured photo in GCS |
| `faceMatchScore` | Number | Optional | Score from 0.0 to 1.0 if face verification was executed |
| `qrPayloadHash` | String | Optional | HMAC signature hash of scanned QR code |
| `capturedByUserId` | String | Yes | `userId` who performed the punch (self or supervisor) |
| `deviceId` | String | Yes | Unique hardware identifier or Android ID |
| `offlineSync` | Map | Yes | `{ isOfflineCaptured: Boolean, localId: String, syncedAt: Timestamp }` |

---

### 1.4 `attendance` (Aggregated Daily Attendance Records)
The compiled daily record resulting from punches or manual/bulk entry. Consumed by Payroll & Reports.
*   **Path:** `/companies/{companyId}/attendance/{attendanceId}`
*   **Document ID:** `ATT-{YYYYMMDD}-{employeeId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `attendanceId` | String | Yes | `ATT-{YYYYMMDD}-{employeeId}` |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch ID |
| `siteId` | String | Yes | Site ID |
| `employeeId` | String | Yes | Reference to `employees/{employeeId}` |
| `employeeUserId` | String | Yes | Reference to `users/{uid}` |
| `employeeCode` | String | Yes | Denormalized for fast reporting |
| `employeeName` | String | Yes | Denormalized full name |
| `date` | String | Yes | Work Date `"YYYY-MM-DD"` |
| `shiftId` | String | Yes | Reference to `shifts/{shiftId}` |
| `shiftCode` | String | Yes | Short code (e.g. "G", "N") |
| `checkInTime` | Timestamp | Optional | First IN punch timestamp |
| `checkOutTime` | Timestamp | Optional | Last OUT punch timestamp |
| `checkInLocation` | GeoPoint | Optional | Coordinates of check-in |
| `checkOutLocation` | GeoPoint | Optional | Coordinates of check-out |
| `status` | String | Yes | Enum: `'PRESENT' \| 'ABSENT' \| 'HALF_DAY' \| 'ON_LEAVE' \| 'WEEKLY_OFF' \| 'HOLIDAY' \| 'LATE' \| 'EARLY_EXIT'` |
| `attendanceCode` | String | Yes | Short code for Muster Roll: `'P' \| 'A' \| 'HD' \| 'L' \| 'WO' \| 'HO' \| 'C-OFF'` |
| `isLate` | Boolean | Yes | True if checkIn > shift.startTime + gracePeriod |
| `lateMinutes` | Number | Yes | Total minutes late (0 if on time) |
| `isEarlyExit` | Boolean | Yes | True if checkOut < shift.endTime - gracePeriodOut |
| `earlyExitMinutes` | Number | Yes | Total early exit minutes (0 if on time) |
| `totalWorkMinutes` | Number | Yes | Net working duration in minutes (excluding breaks) |
| `overtimeMinutes` | Number | Yes | Computed overtime minutes past `overtimeMinMinutes` threshold |
| `overtimeStatus` | String | Yes | Enum: `'NONE' \| 'PENDING_APPROVAL' \| 'APPROVED' \| 'REJECTED'` |
| `captureMethod` | String | Yes | Primary method: `'SELF_MOBILE' \| 'PROXY_SUPERVISOR' \| 'INCHARGE_GATE' \| 'QR_SCAN' \| 'MANUAL_HR' \| 'BULK'` |
| `isLocked` | Boolean | Yes | True if month/period is locked for Payroll |
| `isCorrected` | Boolean | Yes | True if modified via Attendance Correction workflow |
| `latestCorrectionId` | String | Optional | Reference to `attendanceCorrections/{correctionId}` |
| `isDeleted` | Boolean | Yes | Soft delete flag (default `false`) |
| `version` | Number | Yes | Optimistic locking counter |
| `createdAt` | Timestamp | Yes | Document creation time |
| `updatedAt` | Timestamp | Yes | Last calculation/modification time |

---

### 1.5 `attendanceCorrections` (Correction & Regularization Requests)
Tracks requests by employees or supervisors to adjust missed or wrong punches.
*   **Path:** `/companies/{companyId}/attendanceCorrections/{correctionId}`
*   **Document ID:** `CORR-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `correctionId` | String | Yes | Unique ID |
| `companyId` | String | Yes | Tenant isolation key |
| `attendanceId` | String | Yes | Reference to `attendance/{attendanceId}` |
| `employeeId` | String | Yes | Reference to employee |
| `requestedByUserId` | String | Yes | User who created correction request |
| `reason` | String | Yes | Reason for correction (e.g. "Forgot to punch out", "Client site visit") |
| `requestedCheckIn` | Timestamp | Optional | Proposed corrected checkIn time |
| `requestedCheckOut` | Timestamp | Optional | Proposed corrected checkOut time |
| `requestedStatus` | String | Yes | Proposed status (e.g. `'PRESENT'`) |
| `status` | String | Yes | Enum: `'SUBMITTED' \| 'PENDING_L1' \| 'APPROVED' \| 'REJECTED' \| 'CANCELLED'` |
| `approvalInstanceRef` | String | Yes | Workflow engine instance reference |
| `approvedByUserId` | String | Optional | Approver `userId` |
| `approvalComment` | String | Optional | Remarks from approver |
| `approvedAt` | Timestamp | Optional | Timestamp of approval/rejection |
| `version` | Number | Yes | Counter |

---

### 1.6 `musterRolls` (Monthly Locked Summaries)
Statutory monthly attendance ledger per employee for payroll processing and government compliance (Form 12 / Form 25).
*   **Path:** `/companies/{companyId}/musterRolls/{musterRollId}`
*   **Document ID:** `MUSTER-{YYYYMM}-{employeeId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `musterRollId` | String | Yes | `MUSTER-{YYYYMM}-{employeeId}` |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch ID |
| `siteId` | String | Yes | Site ID |
| `employeeId` | String | Yes | Reference to employee |
| `employeeCode` | String | Yes | Employee code |
| `employeeName` | String | Yes | Employee full name |
| `monthYear` | String | Yes | `"YYYY-MM"` (e.g., `"2026-07"`) |
| `dailyAttendance` | Map | Yes | `{ "01": "P", "02": "P", "03": "WO", "04": "A", ... "31": "P" }` |
| `totalDays` | Number | Yes | Total days in month |
| `totalPresent` | Number | Yes | Days marked PRESENT |
| `totalAbsent` | Number | Yes | Days marked ABSENT |
| `totalHalfDays` | Number | Yes | Days marked HALF_DAY |
| `totalOnLeave` | Number | Yes | Paid leave days |
| `totalWeeklyOffs` | Number | Yes | Weekly off days |
| `totalHolidays` | Number | Yes | Public holiday days |
| `payableDays` | Number | Yes | Total days computed for Salary Calculation |
| `totalOvertimeHours` | Number | Yes | Approved overtime hours in month |
| `totalLateDays` | Number | Yes | Number of late arrival instances |
| `isLocked` | Boolean | Yes | True if locked by HR |
| `lockedByUserId` | String | Optional | HR `userId` who locked the muster |
| `lockedAt` | Timestamp | Optional | Timestamp of lock |
| `reopenedByUserId` | String | Optional | Admin `userId` if reopened |
| `reopenedAt` | Timestamp | Optional | Timestamp of reopen |

---

### 1.7 `attendanceHistory` (Immutable Audit Diffs)
*   **Path:** `/companies/{companyId}/attendanceHistory/{historyId}`
*   **Document ID:** `HIST-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `historyId` | String | Yes | Unique ID |
| `companyId` | String | Yes | Tenant isolation key |
| `attendanceId` | String | Yes | Reference to attendance record |
| `employeeId` | String | Yes | Reference to employee |
| `modifiedByUserId` | String | Yes | User who made edit |
| `modifiedByRole` | String | Yes | Role tier of user |
| `action` | String | Yes | Enum: `'AUTO_PUNCH' \| 'MANUAL_CORRECTION' \| 'BULK_OVERRIDE' \| 'LOCK' \| 'REOPEN'` |
| `beforeState` | Map | Yes | Snapshot of record before edit |
| `afterState` | Map | Yes | Snapshot of record after edit |
| `reason` | String | Yes | Mandatory explanation for manual modifications |
| `timestamp` | Timestamp | Yes | Server timestamp |

---

## 2. CAPTURE MODES & WORKFLOW ARCHITECTURE

Log Sheet Muster supports 6 distinct attendance capture mechanisms to accommodate diverse field environments (factories, construction sites, corporate offices, security posts).

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          ATTENDANCE CAPTURE MODES                         │
├───────────────┬───────────────────┬──────────────┬──────────────┬─────────┤
│ 1. Self App   │ 2. Proxy / Kiosk  │ 3. Gate QR   │ 4. Incharge  │ 5. Bulk │
│ (Mobile GPS+  │ (Supervisor for   │ (Dynamic QR  │ (Manual Site │ (Grid / │
│   Selfie)     │  Non-Smartphone)  │  Scan)       │  Entry)      │  Swipe) │
└───────┬───────┴─────────┬─────────┴──────┬───────┴──────┬───────┴────┬────┘
        │                 │                │              │            │
        └─────────────────┴───────┬────────┴──────────────┴────────────┘
                                  ▼
                     [ Raw Punch Event Created ]
                                  │
                                  ▼
                 [ Shift & Policy Engine Evaluation ]
                 - Night Shift Day Mapping (WorkDate)
                 - Geofence & Grace Period Check
                 - Late / Early Exit / Half Day Calculation
                 - Overtime Computation
                                  │
                                  ▼
                [ Daily Attendance Record (Aggregated) ]
                                  │
                     ┌────────────┴────────────┐
                     ▼                         ▼
            [ Standard Punch ]      [ Discrepancy / Alert ]
                     │                         │
                     │                         ▼
                     │            [ Approval Workflow Engine ]
                     │            - Attendance Correction
                     │            - Overtime Approval
                     │                         │
                     └────────────┬────────────┘
                                  ▼
                     [ Muster Roll Consolidation ]
                                  │
                                  ▼
                     [ Monthly Attendance Lock ]
                                  │
                                  ▼
                       [ Payroll Calculation ]
```

### 2.1 Self Attendance (Mobile Device)
*   **Target:** Staff with smartphones (Managers, Field Engineers, Office Staff).
*   **Flow:**
    1. Employee taps "Clock In" in mobile app.
    2. CameraX captures live selfie (compressed on-device to <300KB JPEG).
    3. FusedLocationProvider obtains current GPS coordinates + accuracy radius.
    4. Client calculates distance from assigned `site.geoPoint`. If distance > `site.geofenceRadiusMeters`, `geofenceStatus` flagged as `'OUTSIDE'`.
    5. Punch record written to `/attendancePunches` with `captureMethod: 'SELF_MOBILE'`.
    6. Cloud Function `onPunchCreated` updates or creates the daily `/attendance` summary.

### 2.2 Supervisor Proxy Attendance (Non-Smartphone Staff)
*   **Target:** Field workers, security guards, labor crews without smartphones.
*   **Flow:**
    1. Supervisor opens "Team Attendance" on tablet or mobile.
    2. Displays assigned worker roster for current shift/site.
    3. Supervisor captures worker's selfie or selects worker and taps "Mark In".
    4. Punch is submitted with `capturedByUserId = supervisor.uid` and `captureMethod: 'PROXY_SUPERVISOR'`.
    5. System verifies supervisor belongs to the site/branch before accepting the proxy batch.

### 2.3 QR Code Attendance (Site Kiosk / Gate)
*   **Target:** High-throughput entry gates or static site kiosks.
*   **Flow:**
    1. Gate kiosk displays dynamic QR code generated via HMAC signature (`HMAC(siteSecret, siteId + timestampBucket)`).
    2. Employee scans QR code using Log Sheet Muster mobile app.
    3. App validates QR payload with Cloud Function `validateQrAttendance`.
    4. On valid HMAC and matching geofence, punch recorded with `captureMethod: 'QR_SCAN'`.

### 2.4 Incharge Gate Entry & Manual Attendance
*   **Target:** Gatekeepers or Site Incharges logging visitors, daily wagers, or contract workers.
*   **Flow:**
    1. Incharge selects employee/contractor code or scans physical barcode badge.
    2. Incharge records entry/exit time.
    3. Punch created with `captureMethod: 'INCHARGE_GATE'`.

### 2.5 Bulk Attendance Entry
*   **Target:** Site Supervisors managing large shifts (e.g. 50+ workers at a construction site).
*   **Flow:**
    1. Supervisor opens "Bulk Attendance Grid" for `siteId` + `date`.
    2. Pre-populated with default roster list (`PRESENT` toggle by default).
    3. Supervisor marks exceptions (`ABSENT`, `HALF_DAY`, `LEAVE`), enters overtime hours if applicable.
    4. Taps "Submit Bulk Sheet" → transactional Cloud Function writes punches and updates `/attendance` in batch (max 500 operations per batch transaction).

### 2.6 Offline Attendance Sync (Store and Forward)
*   **Target:** Basements, underground sites, remote locations without internet.
*   **Flow:**
    1. Local SQLite / Room DB stores punch locally with `localId` and monotonic `clientSeq`.
    2. App UI instantly shows "Clocked In (Pending Sync)".
    3. Android `WorkManager` monitors network state (`NetworkType.CONNECTED`).
    4. Upon connectivity restoration, `SyncWorker` transmits queued punches in chronological order with original `clientTimestamp`.
    5. Cloud Function evaluates `workDate` based on `clientTimestamp` and shift rules, preventing time-tampering via server time validation checks.

---

## 3. SHIFT & POLICY BUSINESS LOGIC ENGINE

### 3.1 Night Shift & Date Resolution Logic
Shifts spanning across midnight (e.g., Start: `22:00` Day 1, End: `06:00` Day 2):
*   **Logical Work Date (`workDate`):** Determined by the shift start date. If a punch occurs at `01:30 AM` on July 26th for a night shift starting at `22:00` on July 25th, `workDate` is assigned as `"2026-07-25"`.
*   **Rule Engine Algorithm:**
    ```typescript
    function calculateWorkDate(punchTime: Date, shift: Shift): string {
      if (!shift.isNightShift) {
        return formatDateToYYYYMMDD(punchTime);
      }
      // If punch occurs in early morning hours before shift end + cutoff buffer
      const punchHour = punchTime.getHours();
      const shiftEndHour = parseInt(shift.endTime.split(':')[0]);
      if (punchHour <= shiftEndHour + 2) {
        // Belongs to previous calendar day's shift
        const prevDay = new Date(punchTime);
        prevDay.setDate(prevDay.getDate() - 1);
        return formatDateToYYYYMMDD(prevDay);
      }
      return formatDateToYYYYMMDD(punchTime);
    }
    ```

### 3.2 Late Coming Rules
*   If `checkInTime > shift.startTime + gracePeriodInMinutes`:
    *   `isLate` set to `true`.
    *   `lateMinutes` = `checkInTime - shift.startTime`.
    *   `status` set to `'LATE'` (or `'PRESENT'` with `isLate: true`, based on company preference).
    *   **3-Late Penalty Rule (Configurable in Company Settings):** Accumulating 3 late entries in a month automatically converts 1 day into `HALF_DAY` or deducts 0.5 Casual Leave.

### 3.3 Early Exit Rules
*   If `checkOutTime < shift.endTime - gracePeriodOutMinutes`:
    *   `isEarlyExit` set to `true`.
    *   `earlyExitMinutes` = `shift.endTime - checkOutTime`.

### 3.4 Half Day & Absenteeism Rules
*   **Total Work Minutes =** `(checkOutTime - checkInTime) - breakDurationMinutes`.
*   If `totalWorkMinutes < shift.halfDayMinHours * 60`: Status = `'ABSENT'`.
*   If `shift.halfDayMinHours * 60 <= totalWorkMinutes < shift.fullDayMinHours * 60`: Status = `'HALF_DAY'`, `attendanceCode = 'HD'`.
*   If `totalWorkMinutes >= shift.fullDayMinHours * 60`: Status = `'PRESENT'`, `attendanceCode = 'P'`.

### 3.5 Overtime (OT) Calculation Rules
*   Overtime calculation starts only if `totalWorkMinutes > (shiftWorkHours * 60) + shift.overtimeMinMinutes`.
*   `overtimeMinutes` = `totalWorkMinutes - (shiftWorkHours * 60)`.
*   Capped at `shift.maxOvertimeHours * 60`.
*   Requires Supervisor/HR approval if `companySettings.overtimePolicy.requireApproval == true`.

### 3.6 Weekly Off (WO) & Holiday (HOL) Rules
*   If employee punches on a scheduled `isWeeklyOff == true` or `isHoliday == true`:
    *   Status = `'PRESENT'`.
    *   Generates a Compensatory Off (`C-OFF`) credit in the employee's Leave balance or flags all hours as Double Overtime (based on company OT policy).
*   **Sandwich Rule (Configurable):** If an employee is `ABSENT` on the working day immediately preceding AND following a Weekly Off/Holiday, the Weekly Off/Holiday is automatically converted to `ABSENT` (unpaid day).

### 3.7 Attendance Locking & Reopening Workflow
1.  **Monthly Locking:** On the 1st of every month (or configured cutoff date), HR executes "Lock Attendance" for the preceding month.
2.  Sets `isLocked: true` on all `/attendance` records and generates `/musterRolls`.
3.  Locks prevent any further punches, proxy edits, or regularization requests for that period.
4.  **Reopening Request:** If an edit is needed post-lock (e.g. for payroll adjustment), HR submits a "Reopen Attendance" request requiring **Admin / Owner** approval. All edits post-reopen write mandatory records to `/attendanceHistory`.

---

## 4. REPORTS, MUSTER ROLL & DASHBOARD WIDGETS

### 4.1 Muster Roll (Statutory Form 12 / Form 25 Compliant)
A 31-day grid matrix generated per branch/site:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ MUSTER ROLL REPORT - JULY 2026 (Site: ACME HQ)                                         │
├──────┬──────────────┬───┬───┬───┬───┬───┬────┬──────┬─────┬─────┬─────┬──────────────┤
│ Code │ Employee     │ 01│ 02│ 03│ 04│...│ 31 │ Pres │ Abs │ Lve │ W/O │ Payable Days │
├──────┼──────────────┼───┼───┼───┼───┼───┼────┼──────┼─────┼─────┼─────┼──────────────┤
│ E001 │ Rahul Sharma │ P │ P │ L │ WO│...│ P  │  22  │  1  │  2  │  4  │     28.0     │
│ E002 │ Anita Patel  │ P │ HD│ P │ WO│...│ P  │  23.5│  0  │  1  │  4  │     28.5     │
│ E003 │ Vikas Kumar  │ A │ A │ A │ WO│...│ A  │   0  │ 26  │  0  │  4  │      4.0     │
└──────┴──────────────┴───┴───┴───┴───┴───┴────┴──────┴─────┴─────┴─────┴──────────────┘
```

### 4.2 Reports Available
1.  **Daily Attendance Register:** Real-time list of present, absent, late, and on-leave employees today.
2.  **Late Coming & Early Exit Report:** Frequency of late arrivals per employee/department.
3.  **Overtime Register:** Summary of approved OT hours for payroll processing.
4.  **Geofence Exception Log:** Punches captured outside designated site boundaries with GPS maps.
5.  **Proxy Punch Audit Report:** List of all punches marked by supervisors on behalf of workers.

### 4.3 Dashboard Widgets (Mobile & Tablet)
*   **Live Site Count:** `[ Present: 142 | Late: 8 | Absent: 12 | On Leave: 5 ]`
*   **Pending Corrections Badge:** `[ 4 Regularization Requests Pending Approval ]`
*   **Live Gate Stream:** Real-time feed of check-in events with photos and geofence indicators.
*   **Shift Wise Breakdown Bar Chart:** Visualizing workforce distribution across Day, Evening, and Night shifts.

---

## 5. FIRESTORE SECURITY RULES (ATTENDANCE MODULE)

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

      // --- SHIFTS & ROSTERS ---
      match /shifts/{shiftId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && hrTier();
      }

      match /rosters/{rosterId} {
        allow read: if sameCompany(cid) && (opsTier() || request.auth.uid == resource.data.linkedUserId);
        allow write: if sameCompany(cid) && opsTier();
      }

      // --- RAW PUNCHES ---
      match /attendancePunches/{punchId} {
        allow read: if sameCompany(cid) && (opsTier() || request.auth.uid == resource.data.linkedUserId);
        allow create: if sameCompany(cid) && (
          request.auth.uid == request.resource.data.linkedUserId || opsTier()
        );
        allow update, delete: if false; // Raw punches are strictly append-only
      }

      // --- DAILY ATTENDANCE ---
      match /attendance/{attendanceId} {
        allow read: if sameCompany(cid) && (
          mgmtTier() || 
          hasBranch(resource.data.branchId) || 
          request.auth.uid == resource.data.employeeUserId
        );
        // Direct creation allowed for self-punch or ops tier proxy
        allow create: if sameCompany(cid) && (
          request.auth.uid == request.resource.data.employeeUserId || opsTier()
        );
        // Updates allowed only if NOT locked, and user belongs to opsTier
        allow update: if sameCompany(cid) && opsTier() 
          && resource.data.isLocked == false 
          && request.resource.data.companyId == cid;
        allow delete: if false; // Soft delete only via isDeleted flag
      }

      // --- ATTENDANCE CORRECTIONS ---
      match /attendanceCorrections/{correctionId} {
        allow read: if sameCompany(cid) && (
          opsTier() || 
          request.auth.uid == resource.data.requestedByUserId
        );
        allow create: if sameCompany(cid) && (
          request.auth.uid == request.resource.data.requestedByUserId || opsTier()
        );
        allow update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }

      // --- MUSTER ROLLS ---
      match /musterRolls/{musterId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow create, update: if sameCompany(cid) && hrTier();
        allow delete: if false;
      }

      // --- ATTENDANCE HISTORY (AUDIT TRAIL) ---
      match /attendanceHistory/{histId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow write: if false; // Written exclusively via Cloud Functions
      }
    }
  }
}
```

---

## 6. FIRESTORE COMPOSITE INDEXES (ATTENDANCE MODULE)

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
        { "fieldPath": "employeeId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "attendancePunches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "employeeId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "attendancePunches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "siteId", "order": "ASCENDING" },
        { "fieldPath": "workDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "attendance",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "branchId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "attendance",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "siteId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" },
        { "fieldPath": "isLate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "attendance",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "employeeUserId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "attendanceCorrections",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "musterRolls",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "branchId", "order": "ASCENDING" },
        { "fieldPath": "monthYear", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 7. ERROR HANDLING & VALIDATION CODES

| Error Code | Message | Resolution |
|---|---|---|
| `ERR_ATT_LOCKED` | Attendance period for this date is locked by HR. | Request Attendance Reopen from Admin. |
| `ERR_GEOFENCE_VIOLATION` | You are outside the allowed site boundary. | Move within site radius or request supervisor proxy punch. |
| `ERR_DUPLICATE_PUNCH` | Consecutive punch of same type registered within 2 minutes. | Rate-limited. Wait 2 minutes before punching again. |
| `ERR_NO_ACTIVE_ROSTER` | No shift roster assigned for employee on this date. | Supervisor must assign shift roster before marking attendance. |
| `ERR_QR_EXPIRED` | QR code HMAC signature has expired or is invalid. | Refresh QR code display on gate kiosk. |
| `ERR_FACE_MISMATCH` | Facial recognition score below required match threshold. | Retry selfie capture in good lighting or request manual verification. |

---

## CROSS-MODULE CONNECTIVITY (Attendance Module ⇄ System Core)

1. **Attendance ⇄ Employee Module:** Employee code, branch, site, and reporting manager auto-populate from `employees/{employeeId}` and `employeeHistory`.
2. **Attendance ⇄ Leave Module:** Approved leave requests automatically mark daily attendance records as `ON_LEAVE` and prevent duplicate punch entries.
3. **Attendance ⇄ Payroll Module:** Finalized `/musterRolls` and `totalWorkMinutes` / `overtimeMinutes` directly calculate Gross Pay, LOP (Loss of Pay) deductions, and Overtime allowances during monthly payroll runs.
4. **Attendance ⇄ Notification Engine:** Triggers real-time alerts for late arrival, missed punch out, regularization approval requests, and monthly lock notifications.
5. **Attendance ⇄ Audit Log Engine:** All manual overrides, proxy punches, and correction approvals write immutable logs to `/attendanceHistory` and `/auditLogs`.

---

**End of Phase: Attendance Module (100% Complete).**
Awaiting your approval before proceeding to the Leave Module.
