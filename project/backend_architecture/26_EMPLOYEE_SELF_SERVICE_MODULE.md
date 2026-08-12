# LOG SHEET MUSTER — PHASE 25: ENTERPRISE EMPLOYEE SELF SERVICE (ESS) MODULE (100% COMPLETE)

Enterprise-grade, production-ready Employee Self Service (ESS) Module for Log Sheet Muster. Provides mobile and web self-service capabilities for frontline guards, supervisors, and office staff to access payslips, request advances, claim expenses, track attendance, and view company communications.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All ESS collections are multi-tenant and strictly isolated under `/companies/{companyId}/`. Existing collections (Employees, Attendance, Leave, Rosters, Payslips) are accessed in read-only mode scoped strictly to the authenticated employee's `employeeId`.

```
/companies/{cid}/salaryAdvanceRequests/{requestId}
/companies/{cid}/expenseClaims/{claimId}
/companies/{cid}/companyAnnouncements/{announcementId}
/companies/{cid}/essProfileUpdateRequests/{requestId}
```

### 1.1 RBAC Extension: Employee Users
Employee login utilizes core authentication, mapping user profiles to their respective employee records.
* **Path:** `/companies/{companyId}/users/{userId}` (Existing Collection)
* **Employee-Specific Fields:**
  * `role`: `'employee'`
  * `employeeId`: `String` (Links to `/companies/{cid}/employees/{employeeId}`)

### 1.2 `salaryAdvanceRequests` (Financial Assistance / Salary Advance)
Allows employees to apply for short-term salary advances or emergency loans with predefined repayment terms.
* **Path:** `/companies/{companyId}/salaryAdvanceRequests/{requestId}`
* **Document ID:** `ADV-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `requestId` | String | Yes | Unique Request ID |
| `companyId` | String | Yes | Tenant isolation key |
| `employeeId` | String | Yes | Reference to Employee |
| `requestedAmount` | Number | Yes | Requested advance amount |
| `approvedAmount` | Number | Optional | Amount approved by HR |
| `reason` | String | Yes | Reason for advance (e.g., medical emergency) |
| `repaymentMonths` | Number | Yes | Number of monthly payroll deductions (e.g., 1 to 6) |
| `monthlyDeduction` | Number | Optional | Calculated monthly deduction |
| `status` | String | Yes | Enum: `'PENDING' \| 'APPROVED' \| 'REJECTED' \| 'DISBURSED' \| 'COMPLETED'` |
| `approvedByUserId` | String | Optional | HR/Finance User ID |
| `createdAt` | Timestamp | Yes | Submission timestamp |
| `updatedAt` | Timestamp | Yes | Last status update timestamp |

### 1.3 `expenseClaims` (Reimbursement Engine)
Allows staff and supervisors to claim out-of-pocket expenses (e.g., site travel, uniform repairs, emergency food allowance).
* **Path:** `/companies/{companyId}/expenseClaims/{claimId}`
* **Document ID:** `EXP-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `claimId` | String | Yes | Unique Claim ID |
| `companyId` | String | Yes | Tenant isolation key |
| `employeeId` | String | Yes | Reference to Employee |
| `claimCategory` | String | Yes | Enum: `'TRAVEL' \| 'UNIFORM' \| 'FOOD' \| 'MEDICAL' \| 'OTHER'` |
| `amount` | Number | Yes | Total claim amount |
| `receiptFileId` | String | Yes | Attachment ID from Storage Module |
| `description` | String | Yes | Expense explanation |
| `claimDate` | Timestamp | Yes | Date expense occurred |
| `status` | String | Yes | Enum: `'PENDING' \| 'APPROVED' \| 'REJECTED' \| 'PAID'` |
| `approvedByUserId` | String | Optional | Ops Manager/Finance User ID |
| `paymentReference` | String | Optional | Transaction ID once disbursed |
| `createdAt` | Timestamp | Yes | Submission timestamp |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

### 1.4 `companyAnnouncements` (Broadcast Communications)
Targeted broadcasts from HQ/HR to employees (e.g., holiday notices, safety protocols, uniform policy updates).
* **Path:** `/companies/{companyId}/companyAnnouncements/{announcementId}`
* **Document ID:** `ANN-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `announcementId` | String | Yes | Unique Announcement ID |
| `companyId` | String | Yes | Tenant isolation key |
| `title` | String | Yes | Announcement title |
| `content` | String | Yes | Body markdown text |
| `targetBranchIds` | Array<String> | Optional | If empty, targets all branches |
| `targetSiteIds` | Array<String> | Optional | If empty, targets all sites |
| `targetRoles` | Array<String> | Optional | If empty, targets all employee roles |
| `priority` | String | Yes | Enum: `'NORMAL' \| 'HIGH' \| 'URGENT'` |
| `publishedByUserId` | String | Yes | HR Admin User ID |
| `publishDate` | Timestamp | Yes | When to show announcement |
| `expiryDate` | Timestamp | Optional | Expiration timestamp |
| `isActive` | Boolean | Yes | Active flag |
| `createdAt` | Timestamp | Yes | Creation timestamp |

### 1.5 `essProfileUpdateRequests` (Controlled Data Changes)
To maintain HR compliance, employees cannot edit bank details or government IDs directly. They submit a profile update request with supporting proof.
* **Path:** `/companies/{companyId}/essProfileUpdateRequests/{requestId}`
* **Document ID:** `EPROF-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `requestId` | String | Yes | Unique Request ID |
| `companyId` | String | Yes | Tenant isolation key |
| `employeeId` | String | Yes | Reference to Employee |
| `requestedChanges` | Map | Yes | `{ address: "New Address", bankAccount: "123456789" }` |
| `supportingDocFileId` | String | Yes | Proof document file ID |
| `status` | String | Yes | Enum: `'PENDING' \| 'APPROVED' \| 'REJECTED'` |
| `reviewedByUserId` | String | Optional | HR Admin User ID |
| `rejectionReason` | String | Optional | Notes if rejected |
| `createdAt` | Timestamp | Yes | Submission timestamp |
| `updatedAt` | Timestamp | Yes | Last update timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

### 2.1 ESS Dashboard & Personal Data Scoping
* **Attendance & Roster:** Employees can query `/musterRolls` and `/shiftRosters` where `employeeId` matches their own profile.
* **Payslips:** Employees can view and download PDFs from `/payslips` for past months.
* **Leave Balances:** ESS shows current leave balances (`CL`, `SL`, `EL`) from `/employees/{employeeId}` and permits submitting new `/leaveRequests`.

### 2.2 Salary Advance & Payroll Integration
1. Employee submits a `salaryAdvanceRequests`.
2. HR/Finance approves and sets `approvedAmount` and `monthlyDeduction`.
3. When Payroll (`payrollRuns`) is executed for subsequent months, the system automatically checks active `salaryAdvanceRequests` and adds the `monthlyDeduction` as an advance recovery line item until the loan is fully repaid.

### 2.3 Profile Change Verification
1. Employee submits an `essProfileUpdateRequests` (e.g., updating bank account for salary credit).
2. HR Admin inspects the attached `supportingDocFileId` (e.g., cancelled cheque).
3. Upon HR approval, a Cloud Function automatically updates the core `/employees/{employeeId}` document and marks the request as `APPROVED`.

---

## 3. FIRESTORE SECURITY RULES (EMPLOYEE SELF SERVICE)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function for Employee Access
    function isEmployeeUser() { return isRole('employee'); }
    function matchesEmployeeId(cid, targetEmpId) {
      return get(/databases/$(database)/documents/companies/$(cid)/users/$(request.auth.uid)).data.employeeId == targetEmpId;
    }

    match /companies/{cid} {
      match /salaryAdvanceRequests/{requestId} {
        allow read: if sameCompany(cid) && (mgmtTier() || (isEmployeeUser() && matchesEmployeeId(cid, resource.data.employeeId)));
        allow create: if sameCompany(cid) && isEmployeeUser() && matchesEmployeeId(cid, request.resource.data.employeeId);
        allow update: if sameCompany(cid) && mgmtTier(); // Finance approves
      }

      match /expenseClaims/{claimId} {
        allow read: if sameCompany(cid) && (mgmtTier() || (isEmployeeUser() && matchesEmployeeId(cid, resource.data.employeeId)));
        allow create: if sameCompany(cid) && isEmployeeUser() && matchesEmployeeId(cid, request.resource.data.employeeId);
        allow update: if sameCompany(cid) && mgmtTier(); // Finance approves
      }

      match /companyAnnouncements/{announcementId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow write: if sameCompany(cid) && mgmtTier();
      }

      match /essProfileUpdateRequests/{requestId} {
        allow read: if sameCompany(cid) && (mgmtTier() || (isEmployeeUser() && matchesEmployeeId(cid, resource.data.employeeId)));
        allow create: if sameCompany(cid) && isEmployeeUser() && matchesEmployeeId(cid, request.resource.data.employeeId);
        allow update: if sameCompany(cid) && mgmtTier(); // HR approves
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (EMPLOYEE SELF SERVICE)

```json
{
  "indexes": [
    {
      "collectionGroup": "salaryAdvanceRequests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "employeeId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "expenseClaims",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "employeeId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "companyAnnouncements",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "publishDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "essProfileUpdateRequests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "employeeId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

**End of Phase 25: Enterprise Employee Self Service (ESS) Module (100% Complete).**
