# MASTER_BUSINESS_LOGIC(2).md
## Log Sheet Muster (LSM) — Complete Business Logic Reference

**Document Classification:** Official Business Logic & Workflow Reference
**Governed By:** `MASTER_PROJECT_RULES.md`
**Rule ID Convention:** `RULE-<MODULE>-<NUMBER>`

---

# TABLE OF CONTENTS

1. Company
2. Authentication
3. Employees 
4. Attendance 
5. Leave 
6. Shift 
7. Deployment (BUSINESS LOGIC REQUIRED)
8. Payroll 
9. Inventory 
10. Assets 
11. Billing (BUSINESS LOGIC REQUIRED)
12. Client (BUSINESS LOGIC REQUIRED)
13. Vendor 
14. ESS 
15. Notifications (BUSINESS LOGIC REQUIRED)
16. Analytics (BUSINESS LOGIC REQUIRED)
17. Reports (BUSINESS LOGIC REQUIRED)
18. Workflow Engine (BUSINESS LOGIC REQUIRED)
19. Approvals
20. AI (BUSINESS LOGIC REQUIRED)
21. Compliance (BUSINESS LOGIC REQUIRED)
22. Offline Sync

---

# MODULE 1: COMPANY

## 1.1 Why This Module Exists

LSM is multi-tenant. The Company entity is the tenancy boundary itself — every other module's data ultimately traces back to a `companyId` (represented as `cId` in production claims).

## 1.2 Who Uses This Module

| Role | Interaction |
|---|---|
| Super Admin | Creates, suspends, reactivates, and configures subscription tiers for companies |
| A0_OWNER / A1_DIRECTOR_CEO | Configures their own company's profile, branding, policies |
| All other A2-A9 roles | Implicitly scoped by `cId`; do not directly manage the Company entity |

## 1.3 Firestore Collections

```
/companies/{companyId}
  ├── companyId, companyLegalName, brandName, gstNumber, panNumber
  ├── subscriptionTier, subscriptionStatus
  ├── ...
  ├── /sites/{siteId}                      — subcollection
  ├── /departments/{departmentId}          — subcollection
  └── /designations/{designationId}        — subcollection
```

## 1.4 Business Rules

**RULE-COMPANY-001: Company Creation Is Super-Admin-Exclusive**
Validated. Supported by `SuperAdminCreateCompany.tsx`.

**RULE-COMPANY-002: Company Isolation Is Immutable Post-Creation**
Validated. `cId` is the strict tenancy boundary.

---

# MODULE 2: AUTHENTICATION

## 2.1 Why This Module Exists

Authentication establishes *who* a user is and, critically, *which company* (`cId`) and *what role* (`aLvl`) they hold.

## 2.2 Who Uses This Module

Every human user across the A0–A9 hierarchy.

## 2.3 Firestore Collections

```
/users/{uid}                                — mirrors Firebase Auth user, UI/display convenience
  ├── cId (companyId)
  ├── aLvl (Authority Level: A0_OWNER to A9_SUPPORT)
  ├── rId, sId, dId, pV
```

## 2.4 Business Rules

**RULE-AUTH-001: Sign-In Method by Role**
Validated. Email/Password is currently implemented in `LoginScreen.tsx`.

**RULE-AUTH-002: Custom Claims Are the Sole Authorization Source (CONTRADICTION FIXED)**
- **Original:** Used `request.auth.token.companyId` and `request.auth.token.role`.
- **Fixed:** The production claim contract strictly uses `request.auth.token.cId`, `aLvl`, `rId`, `sId`, `dId`, `pV`. Firestore Security Rules rely exclusively on these minified claims for evaluation.

**RULE-AUTH-003: Role/Company Change Requires Token Refresh**
Validated. Handled by `SessionManager` forcing token refresh.

---

# MODULE 3: EMPLOYEES

## 3.1 Why This Module Exists

The Employee entity is the central subject of nearly every other module.

## 3.2 Who Uses This Module

| Role | Interaction |
|---|---|
| A3_OFFICIAL_STAFF (HR) | Full CRUD on employee records |
| A0_OWNER / A1_DIRECTOR_CEO | Oversight |

## 3.3 Firestore Collections

```
/companies/{companyId}/employees/{employeeId}
  ├── employeeCode
  ├── firstName, lastName, phone, email
  ├── aLvl (e.g. 'A7_SKILLED', 'A8_SEMI_SKILLED', 'A9_SUPPORT')
  ├── departmentId, siteId
  ├── status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED'
```

## 3.4 Business Rules

**RULE-EMPLOYEE-001: Employee Code Uniqueness**
Validated. 

**RULE-EMPLOYEE-002: Employment Status Transitions**
Validated. Statuses are ACTIVE, INACTIVE, SUSPENDED, TERMINATED.

---

# MODULE 4: ATTENDANCE

## 4.1 Why This Module Exists

Attendance is the highest-frequency action and the input to Payroll.

## 4.3 Firestore Collections

```
/companies/{companyId}/attendance_logs/{attendanceId}
  ├── employeeId, employeeName, siteId, shiftId, date
  ├── status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' | 'EARLY_DEPARTURE' | 'ON_LEAVE'
  ├── checkInTime, checkOutTime
  ├── checkInGps, checkOutGps
  ├── checkInMethod: 'SELF_GPS' | 'SUPERVISOR_MUSTER' | 'BIOMETRIC' | 'MANUAL_CORRECTION'
  └── overtimeMinutes, lateArrivalMinutes
```

## 4.4 Business Rules

**RULE-ATTENDANCE-001: Geofence Validation**
Validated. GPS coordinates are captured and validated against `SiteRecord` geofence radius.

**RULE-ATTENDANCE-002: Proxy Marking by Supervisor**
Validated. `checkInMethod: 'SUPERVISOR_MUSTER'` supports this.

---

# MODULE 5: LEAVE

## 5.3 Firestore Collections

```
/companies/{companyId}/leave_requests/{leaveId}
  ├── employeeId, employeeName, leaveType
  ├── startDate, endDate, daysCount
  ├── status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
```

## 5.4 Business Rules

**RULE-LEAVE-001: Leave Application Validation**
Validated. Supported by `LeaveManagementScreen.tsx`.

**RULE-LEAVE-002: Approval Chain**
Validated. Cross-references `ApprovalRequestRecord` and A0-A9 hierarchical routing.

---

# MODULE 6: SHIFT

## 6.3 Firestore Collections

```
/companies/{companyId}/shifts/{shiftId}
  ├── name, code, startTime, endTime
  ├── gracePeriodMinutes, breakDurationMinutes
  └── weeklyOffDays
```

## 6.4 Business Rules

**RULE-SHIFT-001: Shift Definition**
Validated. 

**[BUSINESS LOGIC REQUIRED]: Shift Roster & Swap Workflows**
*Audit Note:* The original document referenced `/shiftRoster` and `/shiftSwapRequests`. These are NOT implemented in the current codebase. Roster assignments are currently implicitly handled or missing.

---

# MODULE 7: DEPLOYMENT

**[BUSINESS LOGIC REQUIRED]: Deployment Module**
*Audit Note:* The original document defined a robust Deployment entity linking Employees to Sites and Clients for billing purposes (`/deployments/{id}`). The current codebase uses a static `siteId` on the `EmployeeRecord` and does not have a dedicated `DeploymentRecord` or history subcollection. This entire module is missing from the production architecture.

---

# MODULE 8: PAYROLL

## 8.3 Firestore Collections

```
/companies/{companyId}/payroll/{payrollCycleId}
  ├── month, year, cycleLabel
  ├── status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'DISBURSED'
  ├── totalGrossPay, totalNetPay

/companies/{companyId}/salary_slips/{slipId}
  ├── employeeId, employeeName, payableDays
  ├── earnings (basic, hra, overtimePay)
  ├── deductions (pf, esic, tds)
  └── netPay
```

## 8.4 Business Rules

**RULE-PAYROLL-001: Payroll Generation**
Validated. Implemented via `PayrollCompensationScreen.tsx`.

---

# MODULE 9: INVENTORY

## 9.3 Firestore Collections

```
/companies/{companyId}/inventory_items/{itemId}
  ├── itemCode, itemName, category, currentStock, reorderLevel

/companies/{companyId}/inventory_transactions/{transactionId}
  ├── transactionType: 'PURCHASE_INWARD' | 'ISSUE_TO_EMPLOYEE' | 'RETURN_FROM_EMPLOYEE' | 'DAMAGE_SCRAP'
  ├── quantity, previousStock, newStock
```

## 9.4 Business Rules

**RULE-INVENTORY-001: Stock Level Changes**
Validated. Implemented via `InventoryStockScreen.tsx` and `StockTransactionRecord`.

---

# MODULE 10: ASSETS

## 10.3 Firestore Collections

```
/companies/{companyId}/assets/{assetId}
  ├── assetCode, category, status, condition, assignedEmployeeId

/companies/{companyId}/asset_movements/{movementId}
  ├── action: 'CHECK_OUT' | 'CHECK_IN' | 'MAINTENANCE_OUT'

/companies/{companyId}/asset_maintenance/{maintenanceId}
  ├── serviceType, serviceCost, status
```

## 10.4 Business Rules

**RULE-ASSETS-001: Asset Assignment**
Validated. Exclusive assignment supported via `assignedEmployeeId` and movement tracking.

---

# MODULE 11: BILLING

**[BUSINESS LOGIC REQUIRED]: Billing Module**
*Audit Note:* The codebase defines `CompanyBillingProfile` but lacks the `/invoices` collection, line item generation, and dispute workflow defined in the master document.

---

# MODULE 12: CLIENT

**[BUSINESS LOGIC REQUIRED]: Client Module**
*Audit Note:* The codebase does not have a `ClientRecord` entity or a Client role view. Sites belong to the Company directly.

---

# MODULE 13: VENDOR

## 13.3 Firestore Collections

```
/companies/{companyId}/vendors/{vendorId}
  ├── vendorCode, vendorName, categoriesSupplied
```

**[BUSINESS LOGIC REQUIRED]: Purchase Orders & Payments**
*Audit Note:* Only the basic Vendor profile exists. `/purchaseOrders` and `/vendorPayments` are NOT implemented.

---

# MODULE 14: ESS

## 14.3 Firestore Collections

*Audit Note:* `/grievances` is NOT explicitly implemented. Employees use Tasks/Incident modules for reporting. `/announcements` IS implemented.

```
/companies/{companyId}/announcements/{announcementId}
  ├── targetAudience, message, priority, expiresAt
```

**[BUSINESS LOGIC REQUIRED]: Grievance Engine**
Grievance specific SLAs and anonymous reporting are currently scaffolded or absent.

---

# MODULE 15: NOTIFICATIONS

**[BUSINESS LOGIC REQUIRED]: Notification Engine**
*Audit Note:* While `AppNotification` exists in types, the centralized `NotificationDispatcher` and `/notificationTemplates` defined in the master document are missing.

---

# MODULE 16: ANALYTICS

**[BUSINESS LOGIC REQUIRED]: Analytics Rollups**
*Audit Note:* Dashboards currently query raw collections directly. The pre-computed `/analyticsRollups` batch jobs are not implemented.

---

# MODULE 17: REPORTS

**[BUSINESS LOGIC REQUIRED]: Async Report Jobs**
*Audit Note:* Reports are currently generated client-side. The `/reportGenerationJobs` async Cloud Function pipeline is not implemented.

---

# MODULE 18: WORKFLOW ENGINE

**[BUSINESS LOGIC REQUIRED]: Generic Workflow Engine**
*Audit Note:* Status transitions are hardcoded per module (e.g. TaskRecord status, LeaveRequest status) rather than using a generic `/workflowDefinitions` and `/workflowInstances` engine.

---

# MODULE 19: APPROVALS

## 19.3 Firestore Collections

```
/companies/{companyId}/approval_requests/{requestId}
  ├── type, requestedBy, status, priority, dataSnapshot
```

## 19.4 Business Rules

**RULE-APPROVALS-001: Unified Inbox**
Validated. Implemented via `ApprovalManagementScreen.tsx` and `ApprovalPendingScreen.tsx`.

---

# MODULE 20: AI

**[BUSINESS LOGIC REQUIRED]: AI Capabilities**
*Audit Note:* The AI document extraction, anomaly detection, and conversational assistant features are completely absent from the current codebase.

---

# MODULE 21: COMPLIANCE

**[BUSINESS LOGIC REQUIRED]: Compliance Engine**
*Audit Note:* `/statutoryRateTables`, `/complianceLicenses`, and auto-generated statutory registers are not implemented. Payroll calculations currently rely on manual inputs rather than a central compliance matrix.

---

# MODULE 22: OFFLINE SYNC

## 22.1 Why This Module Exists

Ensures offline-first capability for the field workforce.

## 22.4 Business Rules

**RULE-OFFLINESYNC-001: Tiered Sync**
Validated. Handled by `OfflineSyncService` intercepting writes and caching locally.

---

# SUMMARY OF AUDIT

1. **Sections Changed:** All 22 sections reconciled against the live codebase architecture.
2. **Contradictions Fixed:** Replaced legacy `request.auth.token.role` and `companyId` with the strict `aLvl`, `rId`, `sId`, `dId`, `pV`, `cId` claim contract. 
3. **BUSINESS LOGIC REQUIRED items:** Shift Rosters, Deployment, Billing, Client, Purchase Orders, Grievances, Notification Engine, Analytics Rollups, Async Reports, Generic Workflow Engine, AI, Compliance.
4. **Final Status Matrix:** The document reflects the actual Phase 2E codebase while explicitly highlighting the delta between the intended master design and the current implementation state.
