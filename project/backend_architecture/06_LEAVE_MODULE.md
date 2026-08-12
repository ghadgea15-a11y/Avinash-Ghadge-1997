# LOG SHEET MUSTER — PHASE 4: LEAVE MANAGEMENT MODULE (100% COMPLETE)
Enterprise-grade, production-ready Leave Management System for Log Sheet Muster, integrated seamlessly with Employee Master, Attendance, Payroll, Shift Rosters, and System Core Engines.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All leave records reside in company-isolated namespaces under `/companies/{companyId}/`.

```
/companies/{cid}/leaveTypes/{leaveTypeId}
/companies/{cid}/leavePolicies/{policyId}
/companies/{cid}/leaveBalances/{balanceId}
/companies/{cid}/leaveRequests/{requestId}
/companies/{cid}/compOffGrants/{grantId}
/companies/{cid}/leaveEncashments/{encashmentId}
/companies/{cid}/leaveHistory/{historyId}
```

---

### 1.1 `leaveTypes` (Master Leave Types Definition)
Configures statutory and custom company leave categories.
* **Path:** `/companies/{companyId}/leaveTypes/{leaveTypeId}`
* **Document ID:** `LT-CASUAL`, `LT-SICK`, `LT-EARNED`, `LT-MATERNITY`, `LT-PATERNITY`, `LT-COMPOFF`, `LT-SHORT`, `LT-UNPAID`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `leaveTypeId` | String | Yes | Unique identifier (e.g. `LT-CASUAL`) |
| `companyId` | String | Yes | Tenant isolation key |
| `name` | String | Yes | Display name (e.g., "Casual Leave", "Sick Leave", "Earned Leave / PL") |
| `code` | String | Yes | Short code for Muster Roll & Payroll (e.g., `CL`, `SL`, `EL`, `ML`, `PL`, `CO`, `LOP`) |
| `description` | String | Optional | Description of leave type purpose |
| `category` | String | Yes | Enum: `'PAID' \| 'UNPAID' \| 'SPECIAL' \| 'COMPENSATORY'` |
| `isEncashable` | Boolean | Yes | True if unused balance can be encashed into cash payout |
| `isCarryForwardable` | Boolean | Yes | True if unused balance carries forward to next financial year |
| `maxCarryForwardDays` | Number | Yes | Cap on carry-forward days (e.g. 15.0, 0 if false) |
| `requiresDocumentProof` | Boolean | Yes | True if medical certificate or proof document is mandatory |
| `minDaysForProof` | Number | Yes | Threshold days before document upload is enforced (e.g., 2.0) |
| `allowHalfDay` | Boolean | Yes | True if half-day application is allowed for this type |
| `allowShortLeave` | Boolean | Yes | True if 1-2 hour short leave is permitted |
| `genderRestriction` | String | Yes | Enum: `'ALL' \| 'MALE_ONLY' \| 'FEMALE_ONLY'` (e.g., Maternity = Female Only) |
| `maritalStatusRestriction` | String | Yes | Enum: `'ALL' \| 'MARRIED' \| 'SINGLE'` |
| `minServiceDaysRequired` | Number | Yes | Minimum probation/service days required before entitlement activates (e.g. 90) |
| `colorCode` | String | Yes | Hex color code for calendar/dashboard UI (e.g., `#4CAF50`) |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'INACTIVE'` |
| `isDeleted` | Boolean | Yes | Soft delete flag |
| `version` | Number | Yes | Optimistic concurrency counter |
| `createdAt` | Timestamp | Yes | Creation timestamp |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

---

### 1.2 `leavePolicies` (Entitlement & Accrual Rules)
Defines accrual cycles, entitlement quotas, and policy rules attached to employee grades/branches.
* **Path:** `/companies/{companyId}/leavePolicies/{policyId}`
* **Document ID:** `LP-{policyCode}` (e.g. `LP-PERMANENT-2026`)

| Field Name | Type | Required | Description |
|---|---|---|---|
| `policyId` | String | Yes | Unique policy ID |
| `companyId` | String | Yes | Tenant isolation key |
| `leaveTypeId` | String | Yes | Reference to `leaveTypes/{leaveTypeId}` |
| `policyName` | String | Yes | E.g. "Standard Executive Leave Policy 2026" |
| `employeeType` | String | Yes | Target employment grade: `'PERMANENT' \| 'PROBATION' \| 'CONTRACT' \| 'INTERN'` |
| `accrualFrequency` | String | Yes | Enum: `'MONTHLY' \| 'QUARTERLY' \| 'ANNUAL_FRONT_LOADED' \| 'TENURE_BASED'` |
| `annualQuota` | Number | Yes | Total annual leave days entitlement (e.g., 12.0 for CL, 15.0 for EL) |
| `accrualRatePerPeriod` | Number | Yes | Incremental credit per period (e.g. 1.0 day/month) |
| `accrualOnDayOfMonth` | Number | Yes | Day of month when auto-accrual job runs (e.g. 1st) |
| `prorateFirstMonth` | Boolean | Yes | True if joining mid-month yields prorated leave credit |
| `maxConsecutiveDays` | Number | Yes | Maximum days allowed in a single application (e.g. 10.0) |
| `minAdvanceNoticeDays` | Number | Yes | Advance notice required before leave start date (e.g. 3 days for EL, 0 for SL) |
| `sandwichRuleEnabled` | Boolean | Yes | True if adjacent holidays/weekly-offs count as leave when sandwiched |
| `negativeBalanceAllowed` | Boolean | Yes | True if employee can borrow leave against future accrual |
| `maxNegativeBalance` | Number | Yes | Maximum negative days allowed (e.g. -3.0) |
| `version` | Number | Yes | Optimistic concurrency counter |

---

### 1.3 `leaveBalances` (Employee Entitlement Ledgers)
Tracks live entitlement, accrued, used, pending, and carry-forward balances per employee per year.
* **Path:** `/companies/{companyId}/leaveBalances/{balanceId}`
* **Document ID:** `BAL-{year}-{employeeId}-{leaveTypeId}` (e.g. `BAL-2026-EMP101-LT-CASUAL`)

| Field Name | Type | Required | Description |
|---|---|---|---|
| `balanceId` | String | Yes | `BAL-{year}-{employeeId}-{leaveTypeId}` |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch ID |
| `employeeId` | String | Yes | Reference to `employees/{employeeId}` |
| `employeeUserId` | String | Yes | Reference to `users/{uid}` |
| `year` | Number | Yes | Calendar / Financial Year (e.g. `2026`) |
| `leaveTypeId` | String | Yes | Reference to `leaveTypes/{leaveTypeId}` |
| `leaveTypeCode` | String | Yes | Denormalized short code (e.g., `CL`) |
| `openingBalance` | Number | Yes | Carry-forward balance brought from previous year |
| `accrued` | Number | Yes | Cumulative days accrued in current year |
| `used` | Number | Yes | Approved leave days consumed |
| `pending` | Number | Yes | Days currently tied up in pending approval requests |
| `encashed` | Number | Yes | Days encashed into cash payout |
| `available` | Number | Yes | Real-time available balance: `(opening + accrued) - (used + pending + encashed)` |
| `lastAccrualDate` | Timestamp | Optional | Last date auto-accrual script ran |
| `version` | Number | Yes | Optimistic concurrency counter |
| `updatedAt` | Timestamp | Yes | Last modification timestamp |

---

### 1.4 `leaveRequests` (Leave Applications)
Core transactional record for leave, half-day, short leave, and comp-off applications.
* **Path:** `/companies/{companyId}/leaveRequests/{requestId}`
* **Document ID:** `LR-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `requestId` | String | Yes | Unique Request ID |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch ID |
| `siteId` | String | Yes | Site ID |
| `employeeId` | String | Yes | Reference to `employees/{employeeId}` |
| `employeeUserId` | String | Yes | Reference to `users/{uid}` |
| `employeeCode` | String | Yes | Employee code |
| `employeeName` | String | Yes | Employee name |
| `leaveTypeId` | String | Yes | Reference to `leaveTypes/{leaveTypeId}` |
| `leaveTypeCode` | String | Yes | Short code (`CL`, `SL`, `EL`, `ML`, `CO`, `LOP`) |
| `leaveCategory` | String | Yes | Enum: `'FULL_DAY' \| 'HALF_DAY_FIRST_HALF' \| 'HALF_DAY_SECOND_HALF' \| 'SHORT_LEAVE' \| 'EMERGENCY'` |
| `fromDate` | String | Yes | Start date `"YYYY-MM-DD"` |
| `toDate` | String | Yes | End date `"YYYY-MM-DD"` |
| `totalDays` | Number | Yes | Computed leave duration in days (e.g. `1.0`, `0.5`, `3.0`) |
| `shortLeaveHours` | Number | Optional | Hours for short leave (e.g. `2.0`, if `SHORT_LEAVE`) |
| `reason` | String | Yes | Detailed employee reason |
| `isEmergency` | Boolean | Yes | True if submitted post-facto as emergency leave |
| `documentProofPath` | String | Optional | GCS Storage path to medical certificate or document |
| `status` | String | Yes | Enum: `'SUBMITTED' \| 'PENDING_L1' \| 'PENDING_L2' \| 'APPROVED' \| 'REJECTED' \| 'CANCELLED'` |
| `approvalInstanceRef` | String | Yes | Reference to `approvalInstances/{id}` in Approval Engine |
| `currentApproverUserId` | String | Optional | User ID of person currently required to act |
| `approvalHistory` | Array<Map> | Yes | List of step actions: `[{ step, actorUserId, action, comment, timestamp }]` |
| `appliedByUserId` | String | Yes | `userId` who filed request (Self, HR, or Supervisor) |
| `appliedByRole` | String | Yes | Role of submitter (`employee`, `supervisor`, `hr`) |
| `isProcessedForPayroll` | Boolean | Yes | True once processed by Payroll engine |
| `isDeleted` | Boolean | Yes | Soft delete flag |
| `version` | Number | Yes | Optimistic locking counter |
| `createdAt` | Timestamp | Yes | Submission time |
| `updatedAt` | Timestamp | Yes | Last update time |

---

### 1.5 `compOffGrants` (Compensatory Off Credits)
Tracks earned Comp-Off credits granted when an employee works on a Weekly Off or Holiday.
* **Path:** `/companies/{companyId}/compOffGrants/{grantId}`
* **Document ID:** `CO-{YYYYMMDD}-{employeeId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `grantId` | String | Yes | Unique Grant ID |
| `companyId` | String | Yes | Tenant isolation key |
| `employeeId` | String | Yes | Reference to employee |
| `employeeUserId` | String | Yes | Reference to user |
| `workedDate` | String | Yes | Date employee worked `"YYYY-MM-DD"` |
| `attendanceId` | String | Yes | Reference to `/attendance` record proving attendance |
| `workedType` | String | Yes | Enum: `'WEEKLY_OFF' \| 'HOLIDAY'` |
| `grantedDays` | Number | Yes | Comp-off credit awarded (e.g., `1.0` or `0.5`) |
| `expiryDate` | String | Yes | Expiry date `"YYYY-MM-DD"` (e.g. 60 days from workedDate) |
| `status` | String | Yes | Enum: `'AVAILABLE' \| 'USED' \| 'EXPIRED'` |
| `usedInRequestId` | String | Optional | Reference to `leaveRequests/{requestId}` where credit was used |
| `approvedByUserId` | String | Yes | Manager/HR who verified and approved the comp-off |
| `createdAt` | Timestamp | Yes | Grant timestamp |

---

### 1.6 `leaveEncashments` (Leave Encashment Claims)
Tracks financial encashment requests for unused Earned Leave (EL / PL).
* **Path:** `/companies/{companyId}/leaveEncashments/{encashmentId}`
* **Document ID:** `ENC-{YYYY}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `encashmentId` | String | Yes | Unique ID |
| `companyId` | String | Yes | Tenant isolation key |
| `employeeId` | String | Yes | Reference to employee |
| `year` | Number | Yes | Calendar/Financial Year |
| `leaveTypeId` | String | Yes | Reference to `leaveTypes/{leaveTypeId}` |
| `encashDays` | Number | Yes | Number of days requested for payout (e.g. `10.0`) |
| `perDayRate` | Number | Yes | Computed per-day basic salary rate |
| `totalEncashAmount` | Number | Yes | Total calculated cash payout amount |
| `status` | String | Yes | Enum: `'SUBMITTED' \| 'APPROVED' \| 'REJECTED' \| 'PAID'` |
| `payrollRunId` | String | Optional | Reference to `/payroll` run where payout was disbursed |
| `approvedByUserId` | String | Optional | Approver user ID |
| `approvedAt` | Timestamp | Optional | Approval timestamp |

---

## 2. BUSINESS LOGIC & LEAVE ENGINE ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         LEAVE MANAGEMENT ENGINE                          │
├─────────────────┬──────────────────┬─────────────────┬───────────────────┤
│ 1. Application  │ 2. Validation    │ 3. Balance      │ 4. Multi-Level    │
│ (Self/HR/Proxy) │ (Notice, Proof,  │ Deduction       │ Approval Workflow │
│                 │  Sandwich, Max)  │ (Pending Hold)  │ Engine            │
└────────┬────────┴────────┬─────────┴────────┬────────┴─────────┬─────────┘
         │                 │                  │                  │
         └─────────────────┴────────┬─────────┴──────────────────┘
                                    ▼
                 [ Server-Side Validation Cloud Function ]
                 - Checks Entitlement & Available Balance
                 - Applies Sandwich Rule (Adjacent Offs)
                 - Verifies Medical Proof Upload if required
                 - Checks Gender / Probation Restrictions
                                    │
                                    ▼
                       [ Approval Workflow Chain ]
                       Step 1: Supervisor / Site Incharge
                       Step 2: Department Manager / HR
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                   [ REJECTED ]          [ APPROVED ]
                         │                     │
                         ▼                     ▼
               [ Release Pending ]    [ Deduct Realized Balance ]
               [ Notify Employee ]    [ Auto-Update Attendance ]
                                      [ Mark 'ON_LEAVE' in Roster ]
                                      [ Feed Payroll LOP / Paid ]
```

---

### 2.1 Leave Accrual & Entitlement Engine
* **Monthly Accrual Execution:** A scheduled Cloud Function (`runMonthlyLeaveAccrual`) executes on the 1st of every month at 00:05 AM company timezone:
  * Reads `leavePolicies` active for each employee.
  * Adds `accrualRatePerPeriod` to `leaveBalances.accrued`.
  * Recalculates `leaveBalances.available = (openingBalance + accrued) - (used + pending + encashed)`.
  * Logs transaction to `/leaveHistory`.
* **Pro-rata First Month:** New joiners receive prorated accrual based on joining date:
  $$\text{Accrual} = \text{accrualRatePerPeriod} \times \frac{\text{Days Remaining in Month}}{\text{Total Days in Month}}$$
* **Year-End Carry Forward & Lapsing:** On December 31st (or fiscal year end):
  * Lapses non-carry-forwardable leaves (e.g., Casual Leave, Short Leave).
  * Transfers Earned Leave (`EL`) to next year's `openingBalance`, capped at `maxCarryForwardDays`.

---

### 2.2 Leave Types & Rules Implementation

| Leave Type | Code | Accrual Cycle | Carry Forward | Encashable | Max Consecutive | Document Mandatory |
|---|---|---|---|---|---|---|
| **Casual Leave** | `CL` | Monthly (1.0/mo) | No (Lapses Dec 31) | No | 3 Days | No |
| **Sick Leave** | `SL` | Monthly (1.0/mo) | Max 5 Days | No | 7 Days | Yes (>2 Days) |
| **Earned / Privilege** | `EL` / `PL` | Annual / Monthly | Max 30 Days | Yes | 15 Days | No |
| **Compensatory Off** | `CO` | Earned on Work-Off | Valid 60 Days | No | 2 Days | Attendance Proof |
| **Maternity Leave** | `ML` | Fixed Statutory | No | No | 182 Days (26 wks)| Birth / Medical Certificate |
| **Paternity Leave** | `PL` | Fixed Statutory | No | No | 15 Days | Birth Certificate |
| **Short Leave** | `STL` | Monthly Quota (2/mo) | No | No | 2 Hours / Day | No |
| **Loss of Pay** | `LOP` | On-Demand (Unpaid)| N/A | N/A | No Limit | No |

---

### 2.3 Half-Day & Short Leave Logic
* **Half-Day Leave:**
  * Employee selects `HALF_DAY_FIRST_HALF` (Shift Start to Midday) or `HALF_DAY_SECOND_HALF` (Midday to Shift End).
  * Deducts `0.5` days from `leaveBalances`.
  * System updates corresponding `/attendance` record for that date: `status = 'HALF_DAY'`, `attendanceCode = 'HD'`.
* **Short Leave:**
  * Max duration: 2 hours per instance.
  * Used for partial duty adjustments (late arrival / early exit permitted up to 2 hrs).
  * Does not deduct a full/half day, but consumes 1 count from monthly Short Leave allowance (`max 2 per month`).

---

### 2.4 Sandwich Rule & Holiday/Weekly-Off Integration
* **Sandwich Rule Definition:** If an employee applies for leave on Friday AND Monday, and Saturday/Sunday are scheduled Weekly Offs, the sandwich policy evaluates if the weekend counts as Leave.
* **Calculation Algorithm:**
  ```typescript
  function calculateEffectiveLeaveDays(fromDate: Date, toDate: Date, policy: LeavePolicy, rosterMap: Map<string, Roster>): number {
    let current = new Date(fromDate);
    let count = 0;
    while (current <= toDate) {
      const dateStr = formatDate(current);
      const dayRoster = rosterMap.get(dateStr);
      const isOff = dayRoster?.isWeeklyOff || dayRoster?.isHoliday;

      if (!isOff) {
        count += 1.0;
      } else if (policy.sandwichRuleEnabled) {
        // Count weekly off / holiday as leave day under Sandwich Rule
        count += 1.0;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  }
  ```

---

### 2.5 Compensatory Off (Comp-Off) Workflow
1. **Earn:** Worker performs duty on a declared `isWeeklyOff == true` or `isHoliday == true`.
2. **Verify:** System validates raw punches in `/attendancePunches` confirming minimum 7.5 hours worked.
3. **Grant:** Supervisor/HR clicks "Grant Comp-Off" → creates `compOffGrants` record with `grantedDays = 1.0` and `expiryDate = workedDate + 60 days`.
4. **Redeem:** When employee applies for leave using `leaveTypeId = 'LT-COMPOFF'`, engine burns the oldest valid `compOffGrants` credit.

---

### 2.6 Loss of Pay (LOP) & Unpaid Leave Logic
* Triggered when an employee applies for `LT-UNPAID` OR has insufficient paid leave balance and approves LOP conversion.
* LOP days directly reduce `payableDays` in monthly `/musterRolls`:
  $$\text{Payable Days} = \text{Total Month Days} - (\text{Absent Days} + \text{LOP Days})$$
* Transmitted directly to Payroll Engine (Phase 5) to compute exact salary deductions.

---

### 2.7 Multi-Level Approval Engine
Uses the generic Phase 1 Approval Engine (`approvalInstances`):
* **Level 1 (L1):** Reporting Manager / Site Incharge.
* **Level 2 (L2):** Branch HR Manager (required if duration > 3 days or for special leaves like Maternity/Encashment).
* **Auto-Escalation:** If L1 does not act within `48 hours` (`companySettings.escalationHours`), request auto-escalates to L2/HR with urgent push notification.

---

## 3. INTEGRATION WITH ATTENDANCE & PAYROLL

1. **Attendance Auto-Reconciliation:**
   * Upon `status` becoming `'APPROVED'`, a transactional Cloud Function (`onLeaveApproved`) iterates through the date range `fromDate` to `toDate`.
   * For each date, updates/creates `/attendance/{ATT-YYYYMMDD-employeeId}`:
     * `status = 'ON_LEAVE'`
     * `attendanceCode = leaveTypeCode` (e.g. `CL`, `SL`, `EL`, `ML`, `LOP`)
     * `totalWorkMinutes = 0`
     * `isLocked = false`
2. **Roster Integration:**
   * Marks employee's daily `/rosters/{id}` entry with `isLeave: true` so Shift Roster views show coverage gap to supervisors.
3. **Payroll Reconciliation:**
   * Paid leaves (`CL`, `SL`, `EL`, `CO`) are counted into `payableDays`.
   * Unpaid leaves (`LOP`) decrease `payableDays` and increment `lopDays` on `/musterRolls/{MUSTER-YYYYMM-employeeId}`.

---

## 4. REPORTS, DASHBOARD WIDGETS & AUDIT LOGS

### 4.1 Reports Generated
1. **Leave Balance Register:** Comprehensive ledger showing Opening, Accrued, Used, Pending, and Available balances per employee.
2. **Monthly Leave Summary:** Matrix report showing leave taken per employee grouped by department and leave type.
3. **Loss of Pay (LOP) Statement:** Formatted extract consumed by Payroll processing.
4. **Comp-Off Liability Report:** List of unredeemed comp-off credits and imminent expiry dates.

### 4.2 Dashboard Widgets
* **Team Leave Calendar:** Visual monthly Gantt chart showing who is on leave today and upcoming planned leaves per site.
* **Pending Approvals Badge:** `[ 3 Leave Applications Requiring Action ]` for managers.
* **My Leave Balances Card:** Instant progress rings showing remaining `CL`, `SL`, and `EL` for self-service mobile app.

---

## 5. FIRESTORE SECURITY RULES (LEAVE MODULE)

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

      // --- LEAVE TYPES & POLICIES ---
      match /leaveTypes/{typeId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && hrTier();
      }

      match /leavePolicies/{policyId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && hrTier();
      }

      // --- LEAVE BALANCES ---
      match /leaveBalances/{balanceId} {
        allow read: if sameCompany(cid) && (
          mgmtTier() || 
          request.auth.uid == resource.data.employeeUserId
        );
        allow write: if sameCompany(cid) && hrTier(); // Cloud Functions or HR
      }

      // --- LEAVE REQUESTS ---
      match /leaveRequests/{requestId} {
        allow read: if sameCompany(cid) && (
          opsTier() || 
          request.auth.uid == resource.data.employeeUserId
        );
        allow create: if sameCompany(cid) && (
          request.auth.uid == request.resource.data.employeeUserId || opsTier()
        );
        allow update: if sameCompany(cid) && (
          opsTier() || 
          (request.auth.uid == resource.data.employeeUserId && resource.data.status == 'SUBMITTED')
        );
        allow delete: if false; // Soft delete only
      }

      // --- COMP-OFF GRANTS ---
      match /compOffGrants/{grantId} {
        allow read: if sameCompany(cid) && (
          opsTier() || 
          request.auth.uid == resource.data.employeeUserId
        );
        allow create, update: if sameCompany(cid) && opsTier();
        allow delete: if false;
      }

      // --- LEAVE ENCASHMENTS ---
      match /leaveEncashments/{encashmentId} {
        allow read: if sameCompany(cid) && (
          hrTier() || 
          request.auth.uid == resource.data.employeeUserId
        );
        allow create: if sameCompany(cid) && (
          request.auth.uid == request.resource.data.employeeUserId || hrTier()
        );
        allow update: if sameCompany(cid) && hrTier();
        allow delete: if false;
      }

      // --- LEAVE HISTORY ---
      match /leaveHistory/{histId} {
        allow read: if sameCompany(cid) && mgmtTier();
        allow write: if false; // Written exclusively by Cloud Functions
      }
    }
  }
}
```

---

## 6. FIRESTORE COMPOSITE INDEXES (LEAVE MODULE)

```json
{
  "indexes": [
    {
      "collectionGroup": "leaveBalances",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "employeeId", "order": "ASCENDING" },
        { "fieldPath": "year", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "leaveRequests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "branchId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "fromDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "leaveRequests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "employeeUserId", "order": "ASCENDING" },
        { "fieldPath": "fromDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "compOffGrants",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "employeeId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "expiryDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "leaveEncashments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "year", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 7. ERROR HANDLING & VALIDATION CODES

| Error Code | Message | Resolution |
|---|---|---|
| `ERR_INSUFFICIENT_LEAVE_BALANCE` | Requested leave duration exceeds available balance. | Apply for Loss of Pay (LOP) or adjust requested dates. |
| `ERR_LEAVE_NOTICE_PERIOD_VIOLATION` | Notice period requirement not met for this leave type. | Submit as Emergency Leave with valid reason or request HR waiver. |
| `ERR_LEAVE_PROOF_REQUIRED` | Medical proof attachment is mandatory for leave > 2 days. | Upload valid medical certificate before submitting application. |
| `ERR_LEAVE_SANDWICH_EXCEEDED` | Application violates maximum consecutive leave policy. | Reduce consecutive date range. |
| `ERR_COMPOFF_EXPIRED` | Selected Comp-Off credit has passed its 60-day validity window. | Select an active, non-expired comp-off grant. |
| `ERR_GENDER_RESTRICTION` | Selected leave type is restricted by gender entitlement. | Select an eligible leave category. |

---

## CROSS-MODULE CONNECTIVITY (Leave Module ⇄ System Core)

1. **Leave ⇄ Employee Module:** Pulls gender, marital status, employment grade, probation status, and reporting hierarchy from `/employees/{id}`.
2. **Leave ⇄ Attendance Module:** Approved leave automatically writes daily `/attendance` entries marked `ON_LEAVE` with `leaveTypeCode` and locks date against duplicate punches.
3. **Leave ⇄ Payroll Module:** Computes paid vs unpaid (`LOP`) days and transmits leave encashment amounts directly to monthly payroll calculation.
4. **Leave ⇄ Shift Roster Module:** Updates `/rosters` to flag coverage gaps and prevents shift assignment on approved leave dates.
5. **Leave ⇄ Notification Engine:** Sends real-time FCM push notifications to approvers on submission and to employees on approval/rejection/escalation.

---

**End of Phase: Leave Management Module (100% Complete).**
Awaiting your approval before proceeding to the Shift & Roster Module.
