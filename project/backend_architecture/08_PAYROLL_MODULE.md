# LOG SHEET MUSTER — PHASE 6: ENTERPRISE PAYROLL MANAGEMENT MODULE (100% COMPLETE)
Enterprise-grade, production-ready Payroll Management System for Log Sheet Muster. Fully integrated with Employee Master, Attendance, Leave, Shift & Roster, Salary Advances, Expenses, and System Core Engines.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All payroll collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/salaryStructures/{structureId}
/companies/{cid}/salaryComponents/{componentId}
/companies/{cid}/employeePayrollProfiles/{profileId}
/companies/{cid}/salaryAdvances/{advanceId}
/companies/{cid}/reimbursements/{reimbursementId}
/companies/{cid}/payrollRuns/{runId}
/companies/{cid}/payslips/{payslipId}
/companies/{cid}/payrollHistory/{historyId}
```

---

### 1.1 `salaryComponents` (Master Earning & Deduction Templates)
Defines catalog of earnings, allowances, statutory deductions, and tax rules.
* **Path:** `/companies/{companyId}/salaryComponents/{componentId}`
* **Document ID:** `COMP-BASIC`, `COMP-HRA`, `COMP-DA`, `COMP-OT`, `COMP-PF`, `COMP-PTAX`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `componentId` | String | Yes | Unique ID (e.g., `COMP-BASIC`, `COMP-HRA`) |
| `companyId` | String | Yes | Tenant isolation key |
| `name` | String | Yes | Name (e.g. "Basic Salary", "House Rent Allowance", "Provident Fund") |
| `code` | String | Yes | Short code for payslips (e.g., `BASIC`, `HRA`, `DA`, `CONV`, `PF`, `PT`) |
| `type` | String | Yes | Enum: `'EARNING' \| 'DEDUCTION' \| 'REIMBURSEMENT' \| 'STATUTORY_DEDUCTION'` |
| `calculationType` | String | Yes | Enum: `'FIXED_AMOUNT' \| 'PERCENTAGE_OF_BASIC' \| 'PERCENTAGE_OF_GROSS' \| 'ATTENDANCE_PRO_RATA' \| 'FORMULA'` |
| `percentageValue` | Number | Optional | Percentage multiplier if `calculationType` is percentage-based |
| `formulaExpression` | String | Optional | Custom math formula (e.g., `"BASIC * 0.40"`, `"BASIC + DA"`) |
| `isTaxable` | Boolean | Yes | True if subject to income tax calculation |
| `isAttendanceBase` | Boolean | Yes | True if subject to Loss of Pay (LOP) proration |
| `includeInOtCalculation` | Boolean | Yes | True if component forms part of hourly base rate for Overtime |
| `isStatutory` | Boolean | Yes | True if mandatory government contribution (PF, ESI, Tax) |
| `statutoryConfig` | Map | Optional | `{ statutoryType: "PF", maxCapAmount: 15000, employerPercentage: 12.0, employeePercentage: 12.0 }` |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'INACTIVE'` |
| `isDeleted` | Boolean | Yes | Soft delete flag |
| `version` | Number | Yes | Optimistic locking counter |

---

### 1.2 `salaryStructures` (Salary Templates per Grade/Designation)
Defines structured templates grouping earning and deduction components for employee cohorts.
* **Path:** `/companies/{companyId}/salaryStructures/{structureId}`
* **Document ID:** `STRUC-EXECUTIVE`, `STRUC-SECURITY-GUARD`, `STRUC-CONTRACT-WORKER`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `structureId` | String | Yes | Unique structure ID |
| `companyId` | String | Yes | Tenant isolation key |
| `name` | String | Yes | Display name (e.g., "Standard Corporate Executive Package", "Site Security Guard Grade 1") |
| `code` | String | Yes | Code (e.g., `EXEC-G1`, `SEC-G2`) |
| `description` | String | Optional | Description of applicability |
| `payFrequency` | String | Yes | Enum: `'MONTHLY' \| 'BI_WEEKLY' \| 'WEEKLY' \| 'DAILY_WAGE'` |
| `currency` | String | Yes | Currency ISO code (e.g., `"INR"`, `"USD"`, `"AED"`) |
| `components` | Array<Map> | Yes | Array of mapped components: `[{ componentId: "COMP-BASIC", valueType: "FIXED", defaultValue: 25000 }, { componentId: "COMP-HRA", valueType: "PERCENTAGE", percentage: 40 }]` |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'INACTIVE'` |
| `version` | Number | Yes | Counter |

---

### 1.3 `employeePayrollProfiles` (Individual Compensation Configuration)
Specific salary agreement, bank account details, and statutory numbers attached to an employee.
* **Path:** `/companies/{companyId}/employeePayrollProfiles/{profileId}`
* **Document ID:** `PAYPROF-{employeeId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `profileId` | String | Yes | `PAYPROF-{employeeId}` |
| `companyId` | String | Yes | Tenant isolation key |
| `employeeId` | String | Yes | Reference to `employees/{employeeId}` |
| `employeeUserId` | String | Yes | Reference to `users/{uid}` |
| `structureId` | String | Yes | Assigned `salaryStructures/{structureId}` |
| `costToCompanyAnnual` | Number | Yes | Total Annual CTC |
| `grossMonthlyBase` | Number | Yes | Base Gross Monthly CTC before attendance adjustments |
| `componentBreakdown` | Map | Yes | Detailed amounts: `{ "BASIC": 25000, "HRA": 10000, "DA": 5000, "SPECIAL": 10000 }` |
| `paymentMode` | String | Yes | Enum: `'BANK_TRANSFER' \| 'CHEQUE' \| 'CASH' \| 'UPI'` |
| `bankDetails` | Map | Yes | `{ bankName: String, accountNumber: String, ifscCode: String, branchName: String }` |
| `statutoryIds` | Map | Yes | `{ pfNumber: String, uanNumber: String, esiNumber: String, panNumber: String, taxId: String }` |
| `isPfEligible` | Boolean | Yes | True if enrolled in Provident Fund |
| `isEsiEligible` | Boolean | Yes | True if enrolled in Employee State Insurance |
| `effectiveFrom` | String | Yes | ISO Date `"YYYY-MM-DD"` |
| `version` | Number | Yes | Counter |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

---

### 1.4 `salaryAdvances` (Loans & Advance Recoveries)
Tracks cash advances or emergency loans granted to employees and monthly recovery installments.
* **Path:** `/companies/{companyId}/salaryAdvances/{advanceId}`
* **Document ID:** `ADV-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `advanceId` | String | Yes | Unique Advance ID |
| `companyId` | String | Yes | Tenant isolation key |
| `employeeId` | String | Yes | Reference to employee |
| `employeeUserId` | String | Yes | Reference to user |
| `disbursedAmount` | Number | Yes | Principal cash advance amount granted (e.g., 20000) |
| `monthlyDeductionAmount` | Number | Yes | Fixed monthly installment amount (e.g., 5000) |
| `totalInstallments` | Number | Yes | Total recovery months (e.g., 4) |
| `paidInstallments` | Number | Yes | Completed recovery months |
| `remainingBalance` | Number | Yes | Balance principal pending recovery |
| `status` | String | Yes | Enum: `'PENDING_APPROVAL' \| 'APPROVED' \| 'DISBURSED' \| 'RECOVERING' \| 'FULLY_PAID' \| 'REJECTED'` |
| `approvalInstanceRef` | String | Yes | Reference to Approval Workflow Engine |
| `disbursedAt` | Timestamp | Optional | Date funds were handed over |
| `version` | Number | Yes | Counter |

---

### 1.5 `reimbursements` (Expense Claims Payouts)
Tracks verified employee expense claims (travel, fuel, client entertainment) approved for payroll inclusion.
* **Path:** `/companies/{companyId}/reimbursements/{reimbursementId}`
* **Document ID:** `REIMB-{YYYYMM}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `reimbursementId` | String | Yes | Unique ID |
| `companyId` | String | Yes | Tenant isolation key |
| `employeeId` | String | Yes | Reference to employee |
| `category` | String | Yes | Enum: `'TRAVEL' \| 'FUEL' \| 'FOOD' \| 'MEDICAL' \| 'SITE_MATERIAL' \| 'OTHER'` |
| `claimedAmount` | Number | Yes | Amount requested by employee |
| `approvedAmount` | Number | Yes | Verified amount approved by Finance/HR |
| `proofDocumentPath` | String | Optional | Storage path to receipt PDF/image |
| `status` | String | Yes | Enum: `'SUBMITTED' \| 'APPROVED' \| 'INCLUDED_IN_PAYROLL' \| 'REJECTED'` |
| `payrollRunId` | String | Optional | Set once processed in a payroll run |
| `approvedByUserId` | String | Optional | Approver `userId` |

---

### 1.6 `payrollRuns` (Monthly Payroll Batch Execution)
Master batch record for a monthly or bi-weekly company/branch payroll processing cycle.
* **Path:** `/companies/{companyId}/payrollRuns/{runId}`
* **Document ID:** `PRRUN-{YYYYMM}-{branchId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `runId` | String | Yes | `PRRUN-{YYYYMM}-{branchId}` |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch ID (or `"ALL"`) |
| `payPeriod` | String | Yes | Month & Year `"YYYY-MM"` (e.g., `"2026-07"`) |
| `startDate` | String | Yes | Period start date `"2026-07-01"` |
| `endDate` | String | Yes | Period end date `"2026-07-31"` |
| `totalEmployees` | Number | Yes | Count of employees processed in run |
| `totalGrossPay` | Number | Yes | Aggregate sum of gross pay across batch |
| `totalDeductions` | Number | Yes | Aggregate sum of statutory + loan deductions |
| `totalNetPay` | Number | Yes | Aggregate sum of final net payouts |
| `status` | String | Yes | Enum: `'DRAFT' \| 'CALCULATED' \| 'UNDER_REVIEW' \| 'APPROVED' \| 'DISBURSED' \| 'LOCKED'` |
| `approvalInstanceRef` | String | Yes | Reference to Approval Workflow Engine |
| `initiatedByUserId` | String | Yes | HR `userId` who initiated calculation |
| `approvedByUserId` | String | Optional | Admin/Owner `userId` who approved payroll |
| `approvedAt` | Timestamp | Optional | Approval timestamp |
| `disbursedAt` | Timestamp | Optional | Disbursement execution time |
| `isLocked` | Boolean | Yes | True when finalized and locked |
| `version` | Number | Yes | Concurrency counter |

---

### 1.7 `payslips` (Individual Payslip Statement Records)
Authoritative monthly payslip document generated per employee containing full attendance and financial breakdown.
* **Path:** `/companies/{companyId}/payslips/{payslipId}`
* **Document ID:** `PS-{YYYYMM}-{employeeId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `payslipId` | String | Yes | `PS-{YYYYMM}-{employeeId}` |
| `companyId` | String | Yes | Tenant isolation key |
| `branchId` | String | Yes | Branch ID |
| `siteId` | String | Yes | Primary site location ID |
| `employeeId` | String | Yes | Reference to `employees/{employeeId}` |
| `employeeUserId` | String | Yes | Reference to `users/{uid}` |
| `employeeCode` | String | Yes | Employee code |
| `employeeName` | String | Yes | Employee name |
| `designation` | String | Yes | Designation at time of payroll run |
| `department` | String | Yes | Department at time of payroll run |
| `payPeriod` | String | Yes | `"YYYY-MM"` |
| `payrollRunId` | String | Yes | Reference to `/payrollRuns/{runId}` |
| `attendanceSummary` | Map | Yes | `{ totalDays: 31, presentDays: 24, absentDays: 1, leaveDays: 4, weeklyOffs: 4, lopDays: 1, overtimeHours: 12.5, lateDays: 2 }` |
| `earnings` | Map | Yes | Detailed earnings breakdown: `{ basic: 25000, hra: 10000, da: 5000, overtimePay: 1875, nightAllowance: 1200, bonus: 2000, reimbursements: 1500 }` |
| `deductions` | Map | Yes | Detailed deductions breakdown: `{ pfEmployee: 1800, esiEmployee: 375, professionalTax: 200, incomeTaxTds: 1200, salaryAdvanceRecovery: 5000, lopDeduction: 1290 }` |
| `grossPay` | Number | Yes | Total gross earnings before deductions |
| `totalDeductions` | Number | Yes | Total deductions |
| `netPay` | Number | Yes | Final Net Payable: `grossPay - totalDeductions` |
| `netPayInWords` | String | Yes | Net pay formatted in natural language (e.g., "Rupees Thirty Five Thousand Four Hundred Only") |
| `bankPayoutDetails` | Map | Yes | `{ bankName: "HDFC Bank", accountNumber: "XXXXXX1234", ifscCode: "HDFC0000123", paymentMode: "BANK_TRANSFER" }` |
| `pdfStoragePath` | String | Optional | Path to generated PDF payslip in GCS |
| `pdfDownloadUrl` | String | Optional | Signed storage URL for employee mobile download |
| `status` | String | Yes | Enum: `'DRAFT' \| 'FINALIZED' \| 'PAID'` |
| `isPublishedToEmployee` | Boolean | Yes | True when visible in employee mobile app |
| `publishedAt` | Timestamp | Optional | Mobile release timestamp |
| `isLocked` | Boolean | Yes | True when run is locked |
| `version` | Number | Yes | Counter |

---

### 1.8 `payrollHistory` (Immutable Payroll Audit Log)
* **Path:** `/companies/{companyId}/payrollHistory/{historyId}`
* **Document ID:** `PRHIST-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `historyId` | String | Yes | Unique ID |
| `companyId` | String | Yes | Tenant isolation key |
| `payrollRunId` | String | Yes | Reference to payroll run |
| `employeeId` | String | Optional | Reference to employee (if individual override) |
| `actorUserId` | String | Yes | User who performed payroll action |
| `action` | String | Yes | Enum: `'INITIATE_CALCULATION' \| 'MANUAL_ADJUSTMENT' \| 'APPROVE' \| 'REJECT' \| 'PUBLISH_PAYSLIPS' \| 'LOCK'` |
| `beforeState` | Map | Optional | Snapshot before action |
| `afterState` | Map | Yes | Snapshot after action |
| `reason` | String | Yes | Explanation for adjustment or state change |
| `timestamp` | Timestamp | Yes | Server timestamp |

---

## 2. BUSINESS LOGIC & PAYROLL CALCULATION ENGINE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   ENTERPRISE PAYROLL CALCULATION ENGINE                  │
├─────────────────┬──────────────────┬─────────────────┬───────────────────┤
│ 1. Attendance & │ 2. Gross Pay     │ 3. Deductions & │ 4. Approval, PDF  │
│ Leave Ingestion │ Computation      │ Statutory Engine│ Generation &      │
│ (Muster Roll)   │ (Basic, HRA, OT) │ (PF, ESI, Loan) │ Mobile Release    │
└────────┬────────┴────────┬─────────┴────────┬────────┴─────────┬─────────┘
         │                 │                  │                  │
         └─────────────────┴────────┬─────────┴──────────────────┘
                                    ▼
                 [ Server-Side Payroll Calculation Cloud Function ]
                 - Pulls Locked Muster Roll (Present, LOP, OT Hours)
                 - Computes Per-Day Rate = Gross Monthly Base / Total Month Days
                 - Calculates LOP Deduction = Per-Day Rate * LOP Days
                 - Calculates Overtime Pay = (Basic + DA) / (26 * 8) * 1.5 * OT Hours
                 - Applies Statutory Rules (PF Cap: 15k @ 12%, ESI Cap: 21k @ 0.75%)
                 - Recovers Salary Advance Installments & Reimburses Approved Expenses
                 - Generates Final Net Pay = Gross Earnings - Total Deductions
                                    │
                                    ▼
                         [ Payroll Approval Chain ]
                 DRAFT → CALCULATED → REVIEWED → APPROVED → DISBURSED → LOCKED
                                    │
                                    ▼
                  [ Background PDF Payslip Generator ]
                  - Renders PDF using Company Branding & Stamp
                  - Stores PDF in GCS (/companies/{cid}/payslips/{month}/)
                  - Publishes Payslip to Employee Mobile App
```

---

### 2.1 Attendance-Based Salary Calculation & LOP Formula
* **Ingestion:** Engine reads finalized `/musterRolls/{MUSTER-YYYYMM-employeeId}` for month $M$.
* **Per-Day Salary Rate Calculation:**
  $$\text{Per-Day Rate} = \frac{\text{Gross Monthly Base Base Salary}}{\text{Total Days in Month (28/29/30/31)}}$$
* **Loss of Pay (LOP) Deduction:**
  $$\text{LOP Deduction} = \text{Per-Day Rate} \times \text{LOP Days}$$
* **Attendance-Prorated Gross Pay:**
  $$\text{Adjusted Base Earnings} = \text{Gross Base} - \text{LOP Deduction}$$

---

### 2.2 Overtime (OT) Pay Calculation Formula
* **Standard Hourly Base Rate:**
  $$\text{Hourly Base Rate} = \frac{\text{Basic Salary} + \text{Dearness Allowance (DA)}}{26 \text{ Working Days} \times 8 \text{ Hours/Day}}$$
* **Overtime Multiplier:** Configurable in `companySettings.payrollPolicy` (Standard: $1.5\times$ for normal OT, $2.0\times$ for Holiday/Weekly Off OT).
* **Total Overtime Earnings:**
  $$\text{OT Earnings} = \text{Hourly Base Rate} \times \text{Approved OT Hours} \times \text{OT Multiplier}$$

---

### 2.3 Night Shift Allowance Formula
* Calculated for every night shift completed in `/attendance` during the pay period:
  $$\text{Night Allowance Total} = \text{Night Shift Instances} \times \text{Shift Night Allowance Rate}$$

---

### 2.4 Statutory Deductions Engine (Configurable per Country/Region)
1. **Employee Provident Fund (EPF):**
   * If `isPfEligible == true`:
     $$\text{PF Base} = \min(\text{Basic Salary} + \text{DA}, 15000)$$
     $$\text{Employee PF Deduction} = \text{PF Base} \times 12\%$$
     $$\text{Employer PF Contribution} = \text{PF Base} \times 12\% \quad (3.67\% \text{ EPF} + 8.33\% \text{ EPS})$$
2. **Employee State Insurance (ESI):**
   * If `isEsiEligible == true` and $\text{Gross Salary} \le 21000$:
     $$\text{Employee ESI Deduction} = \text{Gross Earnings} \times 0.75\%$$
     $$\text{Employer ESI Contribution} = \text{Gross Earnings} \times 3.25\%$$
3. **Professional Tax (PTax):** Slab-based lookup driven by State/Region rule table in `globalConfig/taxSlabs`.
4. **Income Tax (TDS):** Projected annual tax liability divided by 12 months.

---

### 2.5 Salary Advance Recovery & Expense Reimbursements
* **Advance Recovery:**
  * Checks `/salaryAdvances` for active records with `status == 'RECOVERING'`.
  * Deducts `monthlyDeductionAmount` from net pay.
  * Updates `paidInstallments += 1` and `remainingBalance -= monthlyDeductionAmount`.
  * If `remainingBalance == 0`, status transitions to `'FULLY_PAID'`.
* **Expense Reimbursements:**
  * Pulls approved `/reimbursements` with `status == 'APPROVED'`.
  * Adds `approvedAmount` to earnings (Non-taxable payout).
  * Marks reimbursement as `INCLUDED_IN_PAYROLL`.

---

### 2.6 Net Salary Final Calculation Master Formula
$$\text{Gross Earnings} = (\text{Basic} + \text{HRA} + \text{DA} + \text{Allowances} + \text{OT Pay} + \text{Night Pay} + \text{Incentives} + \text{Reimbursements}) - \text{LOP Deduction}$$

$$\text{Total Deductions} = \text{PF} + \text{ESI} + \text{PTax} + \text{TDS} + \text{Advance Recovery} + \text{Other Deductions}$$

$$\mathbf{Net Payable Salary} = \mathbf{Gross Earnings - Total Deductions}$$

---

### 2.7 Payroll Run Approval Workflow
Uses the Phase 1 Approval Engine (`approvalInstances`):
1. **Initiate:** HR Admin initiates payroll calculation for month $M$ (`status = 'CALCULATED'`).
2. **Review:** HR reviews discrepancy alerts (negative net pay, high OT variances, missing bank accounts).
3. **Approval:** Payroll submitted to **Owner / Finance Director** (`status = 'UNDER_REVIEW'`). Owner approves → moves to `'APPROVED'`.
4. **Disbursement:** Disbursed via Bank NEFT/Bank File Export → status becomes `'DISBURSED'`.
5. **Mobile Release:** HR clicks "Release Payslips to Mobile" → sets `isPublishedToEmployee = true` on all `/payslips` and sets `isLocked = true` on the `/payrollRuns` record.

---

## 3. PAYSLIP PDF GENERATION & ACCESS CONTROL

* **Background Generation:** Cloud Function `generatePayslipPdfs` renders HTML-to-PDF templates containing company logo, employee details, attendance stats, itemized earnings/deductions, net pay in words, and digital verification seal.
* **Storage Location:** Stored in secure, tenant-isolated path:
  `/companies/{companyId}/payslips/{payPeriod}/{employeeId}_payslip.pdf`
* **Access Rules:**
  * **Employees:** Can ONLY view and download their own payslips (`request.auth.uid == resource.data.employeeUserId`) once `isPublishedToEmployee == true`.
  * **HR / Admin:** Can view all payslips within their assigned branch/company.

---

## 4. REPORTS, DASHBOARD WIDGETS & AUDIT LOGS

### 4.1 Reports Generated
1. **Monthly Payroll Master Register:** Detailed itemized spreadsheet of all earnings, statutory deductions, LOP, OT, and Net Pay across the company.
2. **Bank Transfer Payout Statement:** Bank-format CSV/XLS text file containing Account Numbers, IFSC codes, and Net Amounts for direct corporate banking upload.
3. **Statutory Compliance Reports:** Itemized EPF ECR Text File, ESI Monthly Return Statement, and Professional Tax Summary.
4. **Salary Advance & Loan Outstanding Report:** Summary of active loans, remaining principal balances, and monthly recovery tracking.

### 4.2 Dashboard Widgets (Mobile & Tablet)
* **My Latest Payslip Card:** Self-service mobile widget displaying Net Salary, Pay Month, and "Download PDF Payslip" button.
* **Monthly Payroll Liability Card:** `[ Gross Payroll: ₹42,50,000 | Net Payable: ₹37,20,000 | Total Statutory: ₹5,30,000 ]` for Finance/HR Directors.
* **Payroll Processing Status Banner:** `[ July 2026 Payroll: Approved & Disbursed (142 Payslips Released) ]`

---

## 5. FIRESTORE SECURITY RULES (PAYROLL MODULE)

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

    function ownerTier() { return roleAtLeast(['companyOwner','admin']); }
    function hrTier()    { return roleAtLeast(['companyOwner','admin','hr']); }

    match /companies/{cid} {

      // --- SALARY COMPONENTS & STRUCTURES ---
      match /salaryComponents/{compId} {
        allow read: if sameCompany(cid);
        allow write: if sameCompany(cid) && hrTier();
      }

      match /salaryStructures/{strucId} {
        allow read: if sameCompany(cid) && hrTier();
        allow write: if sameCompany(cid) && hrTier();
      }

      // --- EMPLOYEE PAYROLL PROFILES ---
      match /employeePayrollProfiles/{profId} {
        allow read: if sameCompany(cid) && (
          hrTier() || 
          request.auth.uid == resource.data.employeeUserId
        );
        allow write: if sameCompany(cid) && hrTier();
      }

      // --- SALARY ADVANCES ---
      match /salaryAdvances/{advId} {
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

      // --- REIMBURSEMENTS ---
      match /reimbursements/{reimbId} {
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

      // --- PAYROLL RUNS ---
      match /payrollRuns/{runId} {
        allow read: if sameCompany(cid) && hrTier();
        allow create, update: if sameCompany(cid) && hrTier() && resource.data.isLocked == false;
        allow delete: if false;
      }

      // --- PAYSLIPS ---
      match /payslips/{payslipId} {
        allow read: if sameCompany(cid) && (
          hrTier() || 
          (request.auth.uid == resource.data.employeeUserId && resource.data.isPublishedToEmployee == true)
        );
        allow create, update: if sameCompany(cid) && hrTier();
        allow delete: if false;
      }

      // --- PAYROLL HISTORY (AUDIT TRAIL) ---
      match /payrollHistory/{histId} {
        allow read: if sameCompany(cid) && ownerTier();
        allow write: if false; // Written exclusively by Cloud Functions
      }
    }
  }
}
```

---

## 6. FIRESTORE COMPOSITE INDEXES (PAYROLL MODULE)

```json
{
  "indexes": [
    {
      "collectionGroup": "salaryAdvances",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "employeeId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "reimbursements",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "employeeId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "payrollRuns",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "branchId", "order": "ASCENDING" },
        { "fieldPath": "payPeriod", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "payslips",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "employeeUserId", "order": "ASCENDING" },
        { "fieldPath": "isPublishedToEmployee", "order": "ASCENDING" },
        { "fieldPath": "payPeriod", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "payslips",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "branchId", "order": "ASCENDING" },
        { "fieldPath": "payPeriod", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 7. ERROR HANDLING & VALIDATION CODES

| Error Code | Message | Resolution |
|---|---|---|
| `ERR_PAYROLL_LOCKED` | Payroll run for this pay period is finalized and locked. | Reopen requires Company Owner override approval. |
| `ERR_MUSTER_NOT_FINALIZED` | Attendance Muster Roll for pay period is not finalized/locked. | Finalize and lock attendance muster roll before running payroll. |
| `ERR_MISSING_BANK_DETAILS` | Employee profile lacks valid bank account or statutory ID details. | Update `/employeePayrollProfiles` with mandatory bank/statutory numbers. |
| `ERR_NEGATIVE_NET_PAY` | Deductions exceed total gross earnings for employee. | Review LOP or adjust advance recovery installment amount. |
| `ERR_UNAPPROVED_EXPENSES` | Selected reimbursements are not in APPROVED state. | Approve expense claims before including in payroll run. |
| `ERR_UNAUTHORIZED_PAYSLIP_ACCESS` | Access denied. Employees can only view published payslips. | Access restricted to HR or self once released. |

---

## CROSS-MODULE CONNECTIVITY (Payroll Module ⇄ System Core)

1. **Payroll ⇄ Employee Module:** Pulls designation, department, bank account details, and statutory IDs from `/employees/{id}` and `/employeePayrollProfiles`.
2. **Payroll ⇄ Attendance Module:** Ingests finalized `/musterRolls` for present days, LOP days, overtime hours, and night shift instances.
3. **Payroll ⇄ Leave Module:** Ingests paid vs unpaid leave days and leave encashment claims (`/leaveEncashments`).
4. **Payroll ⇄ Shift & Roster Module:** Ingests night shift allowances, OT shift multipliers, and holiday worked premiums.
5. **Payroll ⇄ Notification Engine:** Sends push notifications to employees when payslips are published and alerts HR on approval state changes.
6. **Payroll ⇄ Audit Log Engine:** Every manual salary adjustment, approval, and lock action writes immutable records to `/payrollHistory` and `/auditLogs`.

---

**End of Phase: Enterprise Payroll Management Module (100% Complete).**
Awaiting your approval before proceeding to Phase 7: Inventory & Procurement Module.
