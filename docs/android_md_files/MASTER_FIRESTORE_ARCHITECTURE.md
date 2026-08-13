# MASTER_FIRESTORE_ARCHITECTURE.md
## Log Sheet Muster (LSM) — Enterprise Firestore Architecture Reference

**Document Classification:** Official Data Architecture Reference
**Governed By:** `MASTER_PROJECT_RULES.md` (Chapters 4, 5, 6) and `MASTER_BUSINESS_LOGIC.md` (all 22 modules)
**Purpose:** This document is the physical Firestore schema companion to `MASTER_BUSINESS_LOGIC.md` — every collection referenced by business logic is enumerated here with its full structure, relationships, indexes, and operational strategy. Field-by-field data dictionary detail (types, validation, example documents) is maintained in `MASTER_DATABASE_DICTIONARY.md`; this document focuses on structure, relationships, and Firestore-specific operational architecture.

---

# TABLE OF CONTENTS

1. Architecture Overview & Design Principles
2. Complete Collection Map (Pattern A vs Pattern B)
3. Company & Tenancy Hierarchy *(upcoming)*
4. Identity & Access Collections *(upcoming)*
5. Workforce Collections (Employees, Attendance, Leave, Shift) *(upcoming)*
6. Operations Collections (Deployment, Client, Vendor) *(upcoming)*
7. Financial Collections (Payroll, Billing) *(upcoming)*
8. Asset & Inventory Collections *(upcoming)*
9. Engagement Collections (ESS, Notifications, Approvals) *(upcoming)*
10. Intelligence Collections (Analytics, Reports, AI) *(upcoming)*
11. Governance Collections (Compliance, Workflow Engine, Audit) *(upcoming)*
12. Composite Indexes — Full Catalog *(upcoming)*
13. Transactions & Batch Write Catalog *(upcoming)*
14. Offline Sync & Cache Strategy (Firestore-Specific Detail) *(upcoming)*
15. Storage Folder Structure — Full Mapping *(upcoming)*
16. Security Rule Mapping — Collection-by-Collection *(upcoming)*

---

# CHAPTER 1: ARCHITECTURE OVERVIEW & DESIGN PRINCIPLES

## 1.1 Purpose

`MASTER_PROJECT_RULES.md` Chapter 6 established the *rules* governing Firestore design (company-scoping patterns, query discipline, transaction standards). `MASTER_BUSINESS_LOGIC.md` established *what* each of the 22 modules needs to store and why. This document is where those two meet: the complete, concrete Firestore schema — every collection, every subcollection, every relationship — built in full compliance with the governing rules.

## 1.2 Why Firestore's Document Model Shapes This Architecture

Firestore is a document-oriented NoSQL database, not a relational one. Three consequences shape every decision in this document:

1. **No native joins.** Any "relationship" between collections is either (a) a reference field (`employeeId` stored on an `attendanceRecords` document) resolved via a second read, or (b) controlled denormalization (storing `employeeName` alongside `employeeId` to avoid the second read entirely on hot list-screen paths). This document specifies, for every collection, which references are "read-and-join" versus "denormalized," per the risk/frequency criteria in `MASTER_PROJECT_RULES.md` §6.4.
2. **Queries require indexes for anything beyond simple equality/single-field ordering.** Every compound query used by any Use Case across the 22 modules must have a matching entry in the Composite Indexes catalog (Chapter 12).
3. **Security is rule-based, not query-based.** Firestore Security Rules are the authoritative access-control layer (per Project Rules Chapter 2.4's defense-in-depth model); this document's Chapter 16 maps every collection to its governing rule pattern.

## 1.3 The Two Company-Scoping Patterns (Restated and Applied)

As established in `MASTER_PROJECT_RULES.md` §6.2.1:

- **Pattern A (top-level + `companyId` field):** Used for high-write-volume, independently-queried entities. This document uses Pattern A for: `employees`, `attendanceRecords`, `leaveRequests`, `deployments`, `payrollRuns`, `invoices`, `purchaseOrders`, `vendorPayments`, `clients`, `vendors`, `grievances`, `notifications`, `workflowInstances`, `approvalInboxItems`, `shiftSwapRequests`, `payrollReversals`.
- **Pattern B (nested under `/companies/{companyId}/...`):** Used for company-owned configuration and hierarchical entities with a natural parent. This document uses Pattern B for: `sites`, `roles`, `shiftTypes`, `leavePolicyTypes`, `inventoryItems`, `assets`, `complianceLicenses`, `statutoryRegisters`, `announcements`, `analyticsRollups`, `workflowDefinitions`, `reportDefinitions`, `billingConfig`, `payrollConfig`.

**Rule FSA-001 (Firestore Structural Rule):** No collection listed under Pattern A above may ever be renamed to Pattern B or vice versa without a full migration plan and ADR, per `MASTER_PROJECT_RULES.md` §2.2 Rule 2 and §6.2.1.1.

## 1.4 Full Tenancy Hierarchy Diagram

```mermaid
flowchart TD
    SA[Super Admin Console] -->|manages| COMP[companies/companyId]
    COMP --> SITES[companies/companyId/sites/siteId]
    COMP --> ROLES[companies/companyId/roles/roleId]
    COMP --> SHIFTTYPES[companies/companyId/shiftTypes/shiftTypeId]
    COMP --> LEAVEPOLICY[companies/companyId/leavePolicyTypes/leaveTypeId]
    COMP --> INVITEMS[companies/companyId/inventoryItems/itemId]
    COMP --> ASSETS[companies/companyId/assets/assetId]
    COMP --> LICENSES[companies/companyId/complianceLicenses/licenseId]
    COMP --> ANNOUNCE[companies/companyId/announcements/announcementId]
    COMP --> ROLLUPS[companies/companyId/analyticsRollups/rollupId]
    COMP --> WFDEFS[companies/companyId/workflowDefinitions/workflowDefId]

    SITES --> ROSTER[sites/siteId/shiftRoster/rosterEntryId]

    EMP[employees/employeeId - companyId field] -.references.-> COMP
    ATT[attendanceRecords/attendanceId - companyId field] -.references.-> EMP
    ATT -.references.-> SITES
    LEAVE[leaveRequests/leaveRequestId - companyId field] -.references.-> EMP
    DEPLOY[deployments/deploymentId - companyId field] -.references.-> EMP
    DEPLOY -.references.-> SITES
    DEPLOY -.references.-> CLIENT[clients/clientId - companyId field]
    PAYROLL[payrollRuns/payrollRunId - companyId field] -.references.-> EMP
    INVOICE[invoices/invoiceId - companyId field] -.references.-> CLIENT
    PO[purchaseOrders/poId - companyId field] -.references.-> VENDOR[vendors/vendorId - companyId field]
```

## 1.5 Design Principles Applied Throughout This Document

1. **Every collection traces to a `MASTER_BUSINESS_LOGIC.md` module.** No speculative or "just in case" collections exist — each one is justified by a specific business rule documented in that reference.
2. **Every denormalized field has a stated propagation path.** Per `MASTER_PROJECT_RULES.md` §6.4's denormalization policy, this document specifies, for every denormalized field, exactly which write triggers its update.
3. **Every subcollection nesting respects the 3-level depth limit** (`MASTER_PROJECT_RULES.md` §6.2.3).
4. **Document IDs are specified per the strategy table** (`MASTER_PROJECT_RULES.md` §6.2.2): auto-ID for high-concurrency entities, deterministic ID for idempotency-critical entities (Attendance, Inventory transactions), human-readable slug for Company.

## 1.6 Reading This Document

Each subsequent chapter groups collections by functional domain (mirroring but not identically matching the 22 business logic modules, since some collections — like `notifications` and `workflowInstances` — are shared infrastructure spanning many modules). For each collection, this document specifies: full field list (cross-referencing but not duplicating `MASTER_DATABASE_DICTIONARY.md`'s exhaustive field-level detail), document ID strategy, key relationships, denormalized fields and their propagation triggers, and the governing Security Rule pattern (fully detailed in Chapter 16).

---

# CHAPTER 2: COMPLETE COLLECTION MAP

## 2.1 Purpose

Before diving into per-domain detail (Chapters 3-11), this chapter provides the single-page reference map of all collections in the platform — their pattern, ID strategy, and owning module — so any engineer can quickly locate where a given entity lives before consulting the detailed chapter.

## 2.2 Master Collection Table

| Collection | Pattern | Document ID Strategy | Owning Module(s) |
|---|---|---|---|
| `companies` | N/A (root) | Human-readable slug | Company (1) |
| `companies/{id}/sites` | B | Auto-ID + `siteCode` field | Company (1), Client (12) |
| `companies/{id}/roles` | B | Auto-ID | Company (1), Security Framework |
| `companies/{id}/shiftTypes` | B | Auto-ID | Shift (6) |
| `companies/{id}/leavePolicyTypes` | B | Auto-ID | Leave (5) |
| `users` | N/A (root, keyed by uid) | Firebase Auth `uid` | Authentication (2) |
| `users/{uid}/devices` | B | Device-derived hash | Authentication (2) |
| `users/{uid}/fcmTokens` | B | Token hash | Authentication (2), Notifications (15) |
| `authAuditLog` | A (companyId field) | Auto-ID | Authentication (2) |
| `employees` | A | Auto-ID | Employees (3) |
| `employees/{id}/documents` | B | Auto-ID | Employees (3) |
| `employees/{id}/leaveBalances` | B | `leaveTypeId` (deterministic) | Leave (5) |
| `employees/{id}/issuedItems` | B | Auto-ID | Inventory (9) |
| `attendanceRecords` | A | Deterministic: hash(employeeId_date_shiftId) | Attendance (4) |
| `leaveRequests` | A | Auto-ID | Leave (5) |
| `sites/{id}/shiftRoster` | B (nested under Site, itself under Company) | Auto-ID | Shift (6) |
| `shiftSwapRequests` | A | Auto-ID | Shift (6) |
| `deployments` | A | Auto-ID | Deployment (7) |
| `deployments/{id}/history` | B | Auto-ID | Deployment (7) |
| `companies/{id}/payrollConfig` | B (singleton doc) | Fixed ID `config` | Payroll (8) |
| `payrollRuns` | A | Auto-ID | Payroll (8) |
| `payrollRuns/{id}/payslips` | B | `employeeId` (deterministic) | Payroll (8) |
| `payrollReversals` | A | Auto-ID | Payroll (8) |
| `companies/{id}/inventoryItems` | B | Auto-ID | Inventory (9) |
| `companies/{id}/inventoryItems/{id}/stockByLocation` | B (3rd level) | `locationId` (deterministic) | Inventory (9) |
| `inventoryTransactions` | A | Auto-ID (idempotencyKey field for dedup) | Inventory (9) |
| `companies/{id}/assets` | B | Auto-ID | Assets (10) |
| `companies/{id}/assets/{id}/maintenanceLog` | B (3rd level) | Auto-ID | Assets (10) |
| `assetAssignmentHistory` | A | Auto-ID | Assets (10) |
| `companies/{id}/billingConfig` | B (singleton doc) | Fixed ID `config` | Billing (11) |
| `invoices` | A | Auto-ID (with `invoiceNumber` field, sequential) | Billing (11) |
| `invoices/{id}/paymentHistory` | B | Auto-ID | Billing (11) |
| `clients` | A | Auto-ID | Client (12) |
| `clients/{id}/contacts` | B | Auto-ID | Client (12) |
| `clients/{id}/contractDocuments` | B | Auto-ID | Client (12) |
| `vendors` | A | Auto-ID | Vendor (13) |
| `vendors/{id}/performanceReviews` | B | Auto-ID | Vendor (13) |
| `purchaseOrders` | A | Auto-ID (with `poNumber` field, sequential) | Vendor (13) |
| `purchaseOrders/{id}/goodsReceipt` | B | Auto-ID | Vendor (13) |
| `vendorPayments` | A | Auto-ID | Vendor (13) |
| `grievances` | A | Auto-ID | ESS (14) |
| `grievances/{id}/timeline` | B | Auto-ID | ESS (14) |
| `companies/{id}/announcements` | B | Auto-ID | ESS (14) |
| `companies/{id}/announcements/{id}/acknowledgements` | B (3rd level) | `employeeId` (deterministic) | ESS (14) |
| `companies/{id}/notificationTemplates` | B | `templateCode` (deterministic) | Notifications (15) |
| `notifications` | A | Auto-ID | Notifications (15) |
| `companies/{id}/analyticsRollups` | B | Auto-ID | Analytics (16) |
| `superAdminAnalytics` | N/A (root, Super Admin only) | Auto-ID | Analytics (16) |
| `companies/{id}/reportDefinitions` | B | `reportCode` (deterministic) | Reports (17) |
| `reportGenerationJobs` | A | Auto-ID | Reports (17) |
| `companies/{id}/workflowDefinitions` | B | `workflowCode` (deterministic) | Workflow Engine (18) |
| `workflowInstances` | A | Auto-ID | Workflow Engine (18) |
| `workflowInstances/{id}/transitionHistory` | B | Auto-ID | Workflow Engine (18) |
| `approvalInboxItems` | A | Auto-ID | Approvals (19) |
| `companies/{id}/aiSuggestions` | B | Auto-ID | AI (20) |
| `aiUsageAuditLog` | N/A (root, Super Admin visibility) | Auto-ID | AI (20) |
| `statutoryRateTables` | N/A (root, Super Admin maintained) | Auto-ID | Compliance (21) |
| `companies/{id}/complianceLicenses` | B | Auto-ID | Compliance (21) |
| `companies/{id}/statutoryRegisters` | B | Auto-ID | Compliance (21) |

## 2.3 Collection Count Summary

Per the Project Overview's expectation of "100+ Collections, 250+ Subcollections": this platform's full collection inventory (top-level Pattern A/root collections + all Pattern B collections + all subcollections at every nesting level, including the per-company multiplication of Pattern B collections across every tenant) yields well over 100 distinct *collection definitions* in this schema, and — because every Pattern B collection and every nested subcollection (e.g., `documents` under each of potentially thousands of `employees`, or `shiftRoster` under each `site` under each `company`) physically instantiates as a separate Firestore subcollection per parent document — the platform's *total live subcollection instances* across a realistic multi-tenant deployment scale into the hundreds as the collection map in §2.2 is applied recursively across every Company, every Employee, every Site, every Deployment, every Invoice, and every Purchase Order. Chapter 3 onward details each of these with full field-level structure.

**Rule FSA-002:** No new collection may be introduced without first being added to this Chapter 2 map and justified by a corresponding rule in `MASTER_BUSINESS_LOGIC.md` — this map is the authoritative index that `MASTER_DATABASE_DICTIONARY.md` expands upon field-by-field.

---

---

# CHAPTER 3: COMPANY & TENANCY HIERARCHY

## 3.1 Purpose

This chapter provides the full physical structure of the tenancy-root collections: `companies` and its Pattern B children `sites`, `roles`, `shiftTypes`, and `leavePolicyTypes`. Every other collection in the platform ultimately depends on the integrity of this hierarchy.

## 3.2 `/companies/{companyId}`

**Document ID Strategy:** Human-readable slug (e.g., `secureguard-agency-mumbai`), generated at onboarding, immutable thereafter (per `MASTER_PROJECT_RULES.md` §6.2.2).

```
companyId: "secureguard-agency-mumbai"
{
  name: "SecureGuard Agency Pvt Ltd",
  legalName: "SecureGuard Agency Private Limited",
  gstNumber: "27AAAAA0000A1Z5",
  panNumber: "AAAAA0000A",
  registeredAddress: "...",
  industryType: "SECURITY",
  subscriptionTier: "PROFESSIONAL",
  subscriptionStatus: "ACTIVE",
  subscriptionExpiryDate: Timestamp,
  maxEmployeeLimit: 500,
  defaultLeavePolicy: { ... map ... },
  defaultShiftTypes: { ... map ... },
  logoUrl: "gs://.../secureguard-agency-mumbai/branding/logo.png",
  primaryColor: "#1A3C6E",
  isActive: true,
  createdAt: Timestamp,
  createdBySuperAdminId: "uid_..."
}
```

**Relationships:** Every Pattern A collection's `companyId` field is a foreign-key-style reference to this document. Every Pattern B collection is a physical Firestore subcollection nested directly beneath it.

**Indexes:** No composite index required for the `companies` collection itself (accessed by direct document ID lookup, never queried by field in normal operation — except the Super Admin Console's company list, which uses a single-field `orderBy(subscriptionExpiryDate)` or `orderBy(name)`, both single-field indexes auto-created by Firestore).

## 3.3 `/companies/{companyId}/sites/{siteId}`

**Document ID Strategy:** Auto-ID, with a separate indexed `siteCode` field for human-facing display (per `MASTER_PROJECT_RULES.md` §6.2.2).

```
{
  siteCode: "MUM-BKC-01",
  siteName: "BKC Corporate Tower - Tower A",
  clientId: "client_auto_id_ref",
  address: "...",
  geofenceCenter: GeoPoint(19.0662, 72.8686),
  geofenceRadiusMeters: 150,
  isActive: true,
  operatingHoursStart: "06:00",
  operatingHoursEnd: "22:00",
  createdAt: Timestamp
}
```

**Relationships:** References `clientId` (Pattern A `clients` collection — a cross-pattern reference, which is architecturally acceptable since Security Rules for `sites` still check the parent path's `companyId` segment directly, and the `clientId` reference is resolved via a standard second read, not requiring Pattern consistency between referencing and referenced collections). Referenced by `deployments`, `attendanceRecords` (denormalized `siteName`), and `sites/{siteId}/shiftRoster`.

**Composite Indexes Required:**
- `(isActive ASC, siteName ASC)` — for the active-sites picker dropdown used throughout Deployment/Shift creation flows.
- `(clientId ASC, isActive ASC)` — for the Client module's "all sites for this client" view.

## 3.4 `/companies/{companyId}/roles/{roleId}`

```
{
  roleName: "Regional Supervisor",
  isCustom: true,                 // false for platform-default roles (Company Admin, HR Manager, etc.)
  permissions: ["employees.read", "attendance.correct", "deployment.approve", ...],
  createdByUserId: "uid_...",
  createdAt: Timestamp
}
```

**Relationships:** Referenced by `employees.assignedRoleId`. Cross-referenced with the platform-wide permission string catalog maintained in `MASTER_SECURITY_FRAMEWORK.md` (§11.3 of Project Rules — "the underlying permission strings themselves are fixed, platform-defined...companies compose permissions, they do not invent new permission checks").

**Composite Indexes Required:** None beyond default single-field (`roleName` for alphabetical listing) — this is a low-cardinality, infrequently-queried collection per company.

## 3.5 `/companies/{companyId}/shiftTypes/{shiftTypeId}` and `/companies/{companyId}/leavePolicyTypes/{leaveTypeId}`

Both follow the identical structural pattern already fully specified in `MASTER_BUSINESS_LOGIC.md` §6.3 (Shift) and §5.3 (Leave) respectively — this document does not duplicate that field-level detail (which belongs definitively to the Business Logic document and, at the data-dictionary level, to `MASTER_DATABASE_DICTIONARY.md`), but confirms their Firestore-architectural placement: both are Pattern B, nested one level under `companies/{companyId}`, auto-ID, with no further subcollection nesting beneath them (both are leaf-level configuration collections).

**Composite Indexes Required:**
- `shiftTypes`: `(isActive ASC, name ASC)` for the active-shift-type picker.
- `leavePolicyTypes`: No composite index required (small, low-cardinality collection; typically fewer than 10 leave types per company, fetched in full on Leave module screen load).

## 3.6 Tenancy Integrity Verification

**Rule FSA-003:** Every Security Rule governing a Pattern B collection under `/companies/{companyId}/...` must include the path-based check `request.auth.token.companyId == companyId` (matching the path segment directly, not a document field, since Pattern B collections don't carry a redundant `companyId` field on every document — the parent path itself is the tenancy boundary). This is structurally distinct from Pattern A's field-based check (`resource.data.companyId == request.auth.token.companyId`) and both patterns are fully specified in Chapter 16 of this document.

---

---

# CHAPTER 4: IDENTITY & ACCESS COLLECTIONS

## 4.1 Purpose

This chapter details the physical structure of `users`, `users/{uid}/devices`, `users/{uid}/fcmTokens`, and `authAuditLog` — the collections underpinning Authentication (Module 2) and referenced by every other module's actor-attribution fields (`createdByUserId`, `approvedByUserId`, etc.).

## 4.2 `/users/{uid}`

**Document ID Strategy:** Firebase Auth `uid` directly (the one collection in the platform where the document ID is neither auto-generated nor company-derived, but externally assigned by Firebase Auth itself).

```
{
  companyId: "secureguard-agency-mumbai",   // display-only, NOT authoritative (Rule AUTH-002)
  role: "HR_MANAGER",                        // display-only, NOT authoritative
  linkedEmployeeId: "emp_auto_id_ref",       // nullable — populated for Employee/Supervisor roles
  clientId: null,                            // populated only for Client-role users (Client Module Rule 006)
  displayName: "Priya Sharma",
  email: "priya.sharma@secureguard.example",
  phoneNumber: "+91XXXXXXXXXX",
  profilePhotoUrl: "gs://.../users/uid.../profile.jpg",
  isActive: true,
  mfaEnrolled: false,                        // relevant for Super Admin/Company Admin, Rule AUTH-006
  lastLoginAt: Timestamp,
  roleChangeTimestamp: Timestamp             // triggers client-side forced token refresh, Rule AUTH-003
}
```

**Rule FSA-004:** This document's `companyId`/`role` fields exist purely so the UI can render "HR Manager, SecureGuard Agency" in a profile header without a separate custom-claim-decode-and-lookup step — but as established in `MASTER_BUSINESS_LOGIC.md` Rule AUTH-002, no Security Rule anywhere in the platform may read these fields for an authorization decision. Chapter 16's Security Rule mapping enforces this by never referencing `resource.data.role` or `resource.data.companyId` on this specific collection in any `allow` clause beyond the basic self-read/self-update-of-whitelisted-fields pattern.

**Composite Indexes Required:**
- `(companyId ASC, isActive ASC, role ASC)` — for HR/Admin "list all users in my company by role" screens (a Super-Admin-adjacent but company-scoped administrative view, distinct from the Employee Directory which reads `employees`, not `users`, directly).

## 4.3 `/users/{uid}/devices/{deviceId}`

**Document ID Strategy:** Device-derived deterministic hash (combination of Android ID + install ID), ensuring re-registration on repeated logins from the same physical device idempotently updates rather than duplicates.

```
{
  deviceModel: "Samsung Galaxy A14",
  osVersion: "Android 14",
  appVersion: "2.4.1",
  firstSeenAt: Timestamp,
  lastSeenAt: Timestamp,
  isRevoked: boolean               // set true by Admin/Super Admin remote-revocation action
}
```

**Relationships:** Consumed by `MASTER_SECURITY_FRAMEWORK.md`'s device management capability; no other module reads this collection directly.

## 4.4 `/users/{uid}/fcmTokens/{tokenHash}`

**Document ID Strategy:** Hash of the FCM token itself (deterministic, per `MASTER_PROJECT_RULES.md` §6.2.2's table — "enables idempotent upsert without duplicate token documents").

```
{
  token: "fcm_token_string...",
  deviceId: "device_hash_ref",     // cross-reference to devices subcollection
  registeredAt: Timestamp
}
```

**Relationships:** Read exclusively by the Notifications module's (15) dispatch Cloud Function — never read by any client-side code path other than the device's own token-registration write on `onNewToken()`.

## 4.5 `/authAuditLog/{logId}`

**Pattern:** A (Pattern A, `companyId` field present) — chosen over nesting under `users/{uid}` because this log is queried company-wide by HR/Admin for security review ("show me all failed logins across my company this week"), which a per-user-nested subcollection would make expensive/impossible without a collection-group query (itself restricted per `MASTER_PROJECT_RULES.md` §2.4.3 to Super-Admin-only usage).

```
{
  companyId: "secureguard-agency-mumbai",
  userId: "uid_...",               // nullable if the event is a failed-login-attempt on a non-existent/not-yet-resolved identifier
  eventType: "LOGIN_SUCCESS" | "LOGIN_FAILURE" | "ACCOUNT_LOCKED" | "DEVICE_REVOKED" | "MFA_ENROLLED" | "MFA_RECOVERY",
  deviceInfo: { ... },
  ipAddressHash: "...",            // hashed, not raw, per data-minimization principle (Project Rules §11.8)
  timestamp: Timestamp
}
```

**Composite Indexes Required:**
- `(companyId ASC, eventType ASC, timestamp DESC)` — for the security review dashboard's filtered, time-ordered log view.
- `(companyId ASC, userId ASC, timestamp DESC)` — for a per-user login history view (e.g., investigating a specific account's activity).

## 4.6 Security Rule Pattern Preview (Full Detail in Chapter 16)

```
match /users/{uid} {
  allow read: if isSignedIn() && (request.auth.uid == uid || isSameCompanyAdmin(resource.data.companyId) || isSuperAdmin());
  allow update: if isSignedIn() && request.auth.uid == uid &&
    request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['displayName', 'profilePhotoUrl']); // whitelist pattern, mirrors ESS Rule 002's whitelist approach
  // companyId, role are NEVER writable by the user themselves — set only by trusted Cloud Functions (Rule AUTH-002)
}
```

---

---

# CHAPTER 5: WORKFORCE COLLECTIONS (EMPLOYEES, ATTENDANCE, LEAVE, SHIFT)

## 5.1 Purpose

This chapter details the highest-write-volume, highest-business-criticality collections in the platform — the ones directly implementing Modules 3-6 of `MASTER_BUSINESS_LOGIC.md`. These collections receive the most scrutiny in this document because they carry the greatest concentration of financial and compliance risk.

## 5.2 `/employees/{employeeId}`

**Pattern:** A. **ID Strategy:** Auto-ID (per `MASTER_PROJECT_RULES.md` §6.2.2 — "high write concurrency, no natural business key collision risk").

Full field structure is specified exhaustively in `MASTER_BUSINESS_LOGIC.md` §3.3; this document confirms the Firestore-architectural specifics not covered there:

**Composite Indexes Required:**
- `(companyId ASC, employmentStatus ASC, fullName ASC)` — primary Employee Directory list query, paginated.
- `(companyId ASC, employmentStatus ASC, department ASC)` — department-filtered directory view.
- `(companyId ASC, reportingManagerId ASC)` — "my direct reports" view for Supervisors.
- `(companyId ASC, assignedRoleId ASC)` — role-based employee listing for RBAC administration screens.

**Subcollections:**
- `/employees/{id}/documents/{documentId}` — Pattern B, auto-ID, one level deep. **Composite Index:** `(documentType ASC, verificationStatus ASC)` for the per-employee document checklist view, and a **collection-group index** `(expiryDate ASC)` — this is the platform's one sanctioned non-Super-Admin-restricted collection-group query, since `MASTER_BUSINESS_LOGIC.md` Rule EMPLOYEE-006's scheduled expiry-scan function is itself a trusted server-side Cloud Function, not a client-exposed query, and therefore does not violate `MASTER_PROJECT_RULES.md` §2.4.3's restriction (which applies specifically to client-facing collection-group queries for tenant roles).
- `/employees/{id}/leaveBalances/{leaveTypeId}` — Pattern B, **deterministic ID = leaveTypeId** (not auto-ID), since there is exactly one balance document per employee per leave type, making the leave type itself the natural, collision-free key.
- `/employees/{id}/issuedItems/{issuedItemId}` — Pattern B, auto-ID (Inventory Module 9 cross-reference).

## 5.3 `/attendanceRecords/{attendanceId}`

**Pattern:** A. **ID Strategy:** Deterministic — `hash(employeeId + "_" + shiftDate + "_" + shiftId)`, per `MASTER_BUSINESS_LOGIC.md` Rule ATTENDANCE-001, the single most important idempotency-driven ID choice in the entire schema.

**Composite Indexes Required:**
- `(companyId ASC, siteId ASC, shiftDate ASC, status ASC)` — the Daily Attendance Register's primary query (site-wise, date-filtered, status-breakdown).
- `(companyId ASC, employeeId ASC, shiftDate DESC)` — per-employee attendance history, paginated, most-recent-first.
- `(companyId ASC, isWithinGeofence ASC, status ASC)` — Geofence Exception Report query.
- `(companyId ASC, isPayrollLocked ASC, shiftDate ASC)` — used by the Payroll generation Cloud Function to select the exact record set for a period, and by the Auto-Absent scheduled function (Rule ATTENDANCE-004) to find unmarked records.
- `(employeeId ASC, shiftDate ASC)` — **note:** this is a subset pattern of the second index above and is intentionally NOT separately created, since Firestore's index system allows the broader `(companyId, employeeId, shiftDate)` index to serve narrower queries that filter on a prefix of its fields — a deliberate index-minimization decision to avoid unnecessary index storage/write-cost overhead (cross-referenced `MASTER_PROJECT_RULES.md` §6.3's composite-index discipline).

## 5.4 `/leaveRequests/{leaveRequestId}`

**Pattern:** A. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(companyId ASC, employeeId ASC, status ASC, startDate ASC)` — overlap-detection query (`MASTER_BUSINESS_LOGIC.md` Rule LEAVE-001) checking existing `APPROVED`/`PENDING_APPROVAL` requests for date-range collision.
- `(companyId ASC, status ASC, createdAt ASC)` — Pending Approvals inbox source query (cross-referenced Approvals Module 19, feeding the denormalized `approvalInboxItems` on creation).
- `(companyId ASC, leaveTypeId ASC, status ASC)` — Leave Utilization Report grouping query.

## 5.5 `/sites/{siteId}/shiftRoster/{rosterEntryId}`

**Pattern:** B, nested three levels deep (`companies/{companyId}/sites/{siteId}/shiftRoster/{rosterEntryId}`) — at the maximum permitted nesting depth per `MASTER_PROJECT_RULES.md` §6.2.3.

**Composite Indexes Required:**
- `(employeeId ASC, date ASC)` — "my upcoming shifts" query for ESS (Module 14), note this index is scoped within the collection-group of `shiftRoster` since an employee's shifts may span multiple sites; this specific index is therefore a **collection-group index** on `shiftRoster` filtered by `employeeId` — a second sanctioned collection-group query exception, justified because the Security Rule governing this collection-group read still enforces `resource.data` isn't accessible cross-company (the rule checks the employee's own `companyId` claim against a `get()`-resolved site-to-company mapping, or more simply, the employee's own `employeeId` is embedded in their own custom claims context, making this a self-scoped query rather than an open cross-tenant one).
- `(date ASC, status ASC)` — per-site daily roster view (queried within a single site's subcollection directly, no collection-group needed here since the site is already known from navigation context).

## 5.6 `/shiftSwapRequests/{swapRequestId}`

**Pattern:** A. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(companyId ASC, status ASC, requestingEmployeeId ASC)` and `(companyId ASC, status ASC, targetEmployeeId ASC)` — both directions needed since either party may query "my pending swap requests."

## 5.7 Denormalization Propagation Summary (Workforce Domain)

| Denormalized Field | Lives On | Source of Truth | Propagation Trigger |
|---|---|---|---|
| `employeeName` | `attendanceRecords`, `leaveRequests`, `deployments` | `employees.fullName` | Cloud Function trigger on `employees` write, updates all referencing documents' denormalized name (batched, chunked for large fan-out per employee) |
| `siteName` | `attendanceRecords`, `deployments` | `sites.siteName` | Cloud Function trigger on `sites` write (rare — sites are stable, low-change-frequency) |
| `leaveTypeName` | `leaveRequests` | `leavePolicyTypes.name` | Cloud Function trigger on `leavePolicyTypes` write (very rare — leave type names essentially never change post-setup) |

**Rule FSA-005:** Every denormalized field listed above has its propagation Cloud Function unit-tested (per `MASTER_PROJECT_RULES.md` §13.3) to confirm a source-document update correctly and completely fans out to every referencing document — an untested propagation path is treated as a shipped bug per this platform's zero-tolerance-for-incomplete-implementation standard (`MASTER_PROJECT_RULES.md` §2.2).

---

---

# CHAPTER 6: OPERATIONS COLLECTIONS (DEPLOYMENT, CLIENT, VENDOR)

## 6.1 Purpose

This chapter details the collections implementing Modules 7 (Deployment), 12 (Client), and 13 (Vendor) — the entities connecting the internal workforce to external commercial relationships, both on the revenue side (Clients) and the supply side (Vendors).

## 6.2 `/deployments/{deploymentId}`

**Pattern:** A. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(companyId ASC, employeeId ASC, status ASC, startDate ASC)` — overlap-detection query (`MASTER_BUSINESS_LOGIC.md` Rule DEPLOYMENT-002).
- `(companyId ASC, siteId ASC, status ASC)` — Deployment Register's site-wise staffing view.
- `(companyId ASC, clientId ASC, status ASC)` — Client Staffing Summary query, and the source query for Billing's line-item generation (Rule BILLING-001).
- `(companyId ASC, status ASC, endDate ASC)` — used by a scheduled function identifying deployments nearing their `endDate` for proactive renewal/reassignment planning.

**Subcollection:** `/deployments/{id}/history/{historyId}` — Pattern B, auto-ID, storing rate-change and status-transition audit entries (`MASTER_BUSINESS_LOGIC.md` Rule DEPLOYMENT-005). **Index:** `(effectiveDate ASC)` for resolving the correct historical rate at Billing-generation time.

## 6.3 `/clients/{clientId}`

**Pattern:** A. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(companyId ASC, contractStatus ASC, contractEndDate ASC)` — Contract Expiry Forecast query (`MASTER_BUSINESS_LOGIC.md` Rule CLIENT-002).

**Subcollections:**
- `/clients/{id}/contacts/{contactId}` — Pattern B, auto-ID, no composite index needed (small collection, fetched in full per client detail view).
- `/clients/{id}/contractDocuments/{documentId}` — Pattern B, auto-ID, no composite index needed.

**Cross-Reference Note:** The `sites` subcollection referencing a given client (Chapter 3.3's `sites.clientId` field) is queried via `(clientId ASC, isActive ASC)` as already specified in Chapter 3.3 — this document does not duplicate that index specification here, but confirms it is the mechanism by which Client's own "my sites" view (§6.3 here) resolves, avoiding a redundant reverse-reference collection.

## 6.4 `/vendors/{vendorId}`

**Pattern:** A. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(companyId ASC, vendorCategory ASC, isActive ASC)` — vendor directory filtered by category.
- `(companyId ASC, rating DESC)` — "best-rated vendors" sourcing view for procurement decisions.

**Subcollection:** `/vendors/{id}/performanceReviews/{reviewId}` — Pattern B, auto-ID. No composite index required (small, append-only collection per vendor, fetched in full for the rolling-average computation, which is itself computed by a Cloud Function trigger on write rather than a client-side aggregation — consistent with `MASTER_PROJECT_RULES.md` §9.3's N+1/aggregation-cost discipline).

## 6.5 `/purchaseOrders/{poId}`

**Pattern:** A. **ID Strategy:** Auto-ID (with a separate sequential `poNumber` field, generated transactionally per `MASTER_BUSINESS_LOGIC.md` Rule VENDOR-005, mirroring Billing's `invoiceNumber` pattern — see Chapter 7 for the shared sequential-number-generation architecture).

**Composite Indexes Required:**
- `(companyId ASC, vendorId ASC, status ASC)` — per-vendor PO history.
- `(companyId ASC, status ASC, expectedDeliveryDate ASC)` — pending-delivery tracking view.

**Subcollection:** `/purchaseOrders/{id}/goodsReceipt/{receiptId}` — Pattern B, auto-ID, no composite index needed (small collection per PO).

## 6.6 `/vendorPayments/{paymentId}`

**Pattern:** A (note: not nested under `vendors` or `purchaseOrders` despite conceptually belonging to both, per `MASTER_BUSINESS_LOGIC.md` Rule VENDOR-006's explicit design decision that "payment tracking and goods-receipt tracking are modeled as independent, cross-referenced processes" — this is a deliberate Pattern A choice enabling company-wide payment-due aggregation queries that a nested-under-vendor structure would make significantly more expensive via collection-group queries).

**Composite Indexes Required:**
- `(companyId ASC, vendorId ASC, paymentDate DESC)` — per-vendor payment history.
- `(poId ASC)` — single-field index (auto-created) sufficient for resolving all payments against a specific PO.

## 6.7 Cross-Domain Query Pattern: The Billing-Deployment-Attendance Chain

This is the platform's most consequential multi-collection read chain (per `MASTER_BUSINESS_LOGIC.md` Rule BILLING-001), documented here explicitly because it spans three separate top-level collections and must be understood as a unit, not as three independent index specifications:

```mermaid
flowchart LR
    A["1. Query deployments where companyId, clientId, status=ACTIVE"] --> B["2. For each deployment, query attendanceRecords where employeeId, shiftDate in period"]
    B --> C["3. Aggregate verified hours/shifts per deployment"]
    C --> D["4. Apply effective-dated billingRate from deployments/history"]
    D --> E["5. Construct invoice lineItems array"]
```

**Rule FSA-006:** This chain is executed exclusively within the Billing module's `generateInvoice` Cloud Function (server-side, per `MASTER_BUSINESS_LOGIC.md` Rule BILLING-001's aggregation approach) — it is never replicated as a client-side multi-query chain, both for the performance reasons already established (`MASTER_PROJECT_RULES.md` §9.3) and because client-side computation of a billing-determinative figure would violate the Chapter 10.4.1 compliance/financial-risk server-enforcement principle.

---

---

# CHAPTER 7: FINANCIAL COLLECTIONS (PAYROLL, BILLING)

## 7.1 Purpose

This chapter details the collections implementing Modules 8 (Payroll) and 11 (Billing) — the platform's highest financial-risk data, warranting the strictest transaction discipline and the most exhaustive Security Rule scrutiny (Chapter 16).

## 7.2 `/companies/{companyId}/payrollConfig` (Singleton)

**Pattern:** B, but structurally a **singleton document** — the subcollection has exactly one document, always at a fixed ID (`config`), rather than following the auto-ID pattern used elsewhere. This is a deliberate deviation from the general Pattern B auto-ID convention, justified because there is exactly one payroll configuration per company by definition, and a fixed ID avoids the unnecessary complexity of querying-to-find-the-one-document that an auto-ID would require.

**No composite indexes required** (single-document reads by fixed path).

## 7.3 `/payrollRuns/{payrollRunId}`

**Pattern:** A. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(companyId ASC, status ASC, periodStartDate DESC)` — Payroll history list view, most-recent-first, filterable by status (e.g., "show me all Finalized runs").
- `(companyId ASC, periodStartDate ASC, periodEndDate ASC)` — used to detect overlapping payroll run periods (a data-integrity check preventing two runs from covering the same period, an implicit rule supporting `MASTER_BUSINESS_LOGIC.md`'s payroll generation logic even though not separately numbered as a `RULE-PAYROLL-*` entry, since it is an architectural-level integrity constraint rather than a business rule per se).

**Subcollection:** `/payrollRuns/{id}/payslips/{employeeId}` — Pattern B, **deterministic ID = employeeId** (not auto-ID), since there is exactly one payslip per employee per payroll run, making the employee ID itself the natural key and directly enabling the idempotent-regeneration behavior specified in `MASTER_BUSINESS_LOGIC.md` §8.9 ("it does not create duplicate payslips — it overwrites the UnderReview-state draft payslips deterministically keyed by employeeId").

**Composite Index (on `payslips` subcollection):** `(netPay DESC)` — for within-run sorting/review (e.g., "show me the highest-paid employees this run" for a quick sanity check during HR review).

## 7.4 `/payrollReversals/{reversalId}`

**Pattern:** A. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(companyId ASC, status ASC, requestedAt DESC)` — pending-reversal-approval queue, feeding the Approvals module (19) inbox.
- `(originalPayrollRunId ASC)` — single-field index (auto-created), sufficient for "all reversals against this specific run" lookups.

## 7.5 `/companies/{companyId}/billingConfig` (Singleton)

**Pattern:** B, singleton document at fixed ID `config`, identical architectural rationale to `payrollConfig` (§7.2). Contains `invoiceNumberSequence` — the counter field consumed transactionally by `MASTER_BUSINESS_LOGIC.md` Rule BILLING-003's sequential invoice numbering.

**Rule FSA-007:** The `invoiceNumberSequence` increment is performed exclusively within the same Firestore transaction that creates the new `invoices/{invoiceId}` document — never as a separate, non-atomic read-increment-write sequence, since a race condition there would produce duplicate invoice numbers, a direct violation of `MASTER_BUSINESS_LOGIC.md` Rule BILLING-003's sequential-integrity requirement. This identical pattern applies to `purchaseOrders`' `poNumber` sequence (Chapter 6.5), sourced from an equivalent singleton counter field, which this document notes here rather than duplicating a third time, since both sequential-numbering mechanisms share this exact transactional architecture.

## 7.6 `/invoices/{invoiceId}`

**Pattern:** A. **ID Strategy:** Auto-ID (with the human-readable, sequential `invoiceNumber` as a separate, transactionally-generated field per §7.5 above — the Firestore document ID and the business-facing invoice number are intentionally decoupled, since the document ID never needs to be human-readable while the invoice number does, and coupling them would force the document ID itself to be generated via the same transaction, adding unnecessary contention to what could otherwise be a standard auto-ID document creation).

**Composite Indexes Required:**
- `(companyId ASC, clientId ASC, status ASC, billingPeriodStart DESC)` — Client Billing History query, and the Client-role user's own "my invoices" view (further Security-Rule-restricted per Chapter 16 to their own `clientId` claim).
- `(companyId ASC, status ASC, dueDate ASC)` — Overdue Escalation scheduled function's query source (`MASTER_BUSINESS_LOGIC.md` Rule BILLING-007).
- `(companyId ASC, invoiceNumber ASC)` — supports direct invoice-number lookup (e.g., a client referencing "Invoice #INV-2026-00042" in a support query).

**Subcollection:** `/invoices/{id}/paymentHistory/{paymentId}` — Pattern B, auto-ID. **Index:** `(paymentDate ASC)` for chronological payment-history display within an invoice detail view.

## 7.7 Financial Data Transaction Discipline Summary

| Operation | Mechanism | Cross-Reference |
|---|---|---|
| Leave balance deduction | Transaction (read-then-write) | `MASTER_BUSINESS_LOGIC.md` Rule LEAVE-003 |
| Invoice number generation | Transaction (counter increment + document create) | This chapter §7.5, `MASTER_BUSINESS_LOGIC.md` Rule BILLING-003 |
| PO number generation | Transaction (counter increment + document create) | Chapter 6.5, `MASTER_BUSINESS_LOGIC.md` Rule VENDOR-005 |
| Payroll finalization lock | Transaction (payroll run status update + bulk attendanceRecords lock flag) | `MASTER_BUSINESS_LOGIC.md` Rules PAYROLL-005, ATTENDANCE-006 |
| Invoice payment recording | Batched write (independent paymentHistory create + invoice status/amount update, no read-dependency beyond the already-loaded invoice) | `MASTER_BUSINESS_LOGIC.md` Rule BILLING-005 |

**Rule FSA-008:** Every row in the table above corresponds to a required integration test (per `MASTER_PROJECT_RULES.md` §13.2's testing pyramid) simulating concurrent execution to confirm the transactional mechanism prevents the specific race condition it exists to prevent — this table is the authoritative cross-reference `MASTER_TESTING_CHECKLIST.md` uses when enumerating the Financial module's required concurrency test suite.

---

---

# CHAPTER 8: ASSET & INVENTORY COLLECTIONS

## 8.1 Purpose

This chapter details the collections implementing Modules 9 (Inventory) and 10 (Assets) — structurally distinct from each other despite conceptual similarity, per the fungible-vs-serialized distinction established in `MASTER_BUSINESS_LOGIC.md` §10.1.

## 8.2 `/companies/{companyId}/inventoryItems/{itemId}`

**Pattern:** B. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(category ASC, currentStock ASC)` — Reorder Alert scanning query (`MASTER_BUSINESS_LOGIC.md` Rule INVENTORY-004), identifying items where `currentStock < reorderThreshold` (evaluated application-side post-query since Firestore cannot directly compare two fields against each other within a query filter — the query fetches candidate low-`category`-grouped items and the comparison against each item's own `reorderThreshold` happens in the Cloud Function, a necessary Firestore-limitation-driven design note).

**Subcollection:** `/inventoryItems/{id}/stockByLocation/{locationId}` — Pattern B, **deterministic ID = locationId** (one document per location per item, natural key).

## 8.3 `/inventoryTransactions/{transactionId}`

**Pattern:** A. **ID Strategy:** Auto-ID, but with a **unique-constraint-enforcing `idempotencyKey` field** (`MASTER_BUSINESS_LOGIC.md` Rule INVENTORY-002) — Firestore has no native unique-field constraint, so idempotency is enforced by the transaction itself querying for an existing document with the same `idempotencyKey` before proceeding with the write, rather than relying on a database-level uniqueness guarantee (a Firestore architectural limitation this document flags explicitly, since engineers accustomed to relational databases' native `UNIQUE` constraints must implement this check manually here).

**Composite Indexes Required:**
- `(companyId ASC, itemId ASC, performedAt DESC)` — Stock Ledger Report's per-item transaction history.
- `(companyId ASC, idempotencyKey ASC)` — the index directly supporting the idempotency-check query described above; this is arguably the single most operationally critical index in the Inventory domain, since a missing or unindexed version of this query would make the idempotency check prohibitively slow at scale, undermining the entire safeguard.
- `(companyId ASC, issuedToEmployeeId ASC, transactionType ASC)` — supports resolving an employee's full issuance/return history for offboarding reconciliation (`MASTER_BUSINESS_LOGIC.md` Rule INVENTORY-006).

## 8.4 `/employees/{employeeId}/issuedItems/{issuedItemId}`

Already introduced in Chapter 5.2 as an Employee subcollection; noted here in the Inventory context as the denormalized "current holding" view (`MASTER_BUSINESS_LOGIC.md` Rule INVENTORY-003). **No composite index required** (small per-employee collection, fetched in full for ESS's "my issued items" view).

**Propagation Rule:** This subcollection is written within the same transaction as the `inventoryTransactions` ISSUANCE/RETURN entry (per Rule INVENTORY-003's batched-write specification) — Chapter 14 (Security Rule Mapping) confirms this collection's write rule is restricted to the same Cloud-Function/Store-Manager-permission path as the parent transaction, never independently writable.

## 8.5 `/companies/{companyId}/assets/{assetId}`

**Pattern:** B. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(assetCategory ASC, condition ASC)` — Asset Register filtered view.
- `(condition ASC, isActive ASC)` — for identifying assets eligible for decommissioning workflow initiation.
- Note: `currentAssignment.assignedToId` is a **map field**, and Firestore supports indexing into map fields directly (`currentAssignment.assignedToId ASC`) — required for "what assets does this employee currently hold" queries, distinct from Inventory's separate denormalized subcollection approach, since Assets' one-to-one assignment model (Rule ASSETS-002's "exclusive per asset") makes a direct indexed map-field query sufficient without needing an equivalent denormalized `issuedItems`-style subcollection under Employees.

**Subcollection:** `/assets/{id}/maintenanceLog/{logId}` — Pattern B (3rd level nesting, at the maximum depth per `MASTER_PROJECT_RULES.md` §6.2.3). **Index:** `(nextDueDate ASC)` at the collection-group level for the Maintenance Due Report's cross-asset scheduled scanning function (a third sanctioned collection-group query exception, server-side/Cloud-Function-only per the same justification pattern as Chapter 5.2's document-expiry scan).

## 8.6 `/assetAssignmentHistory/{historyId}`

**Pattern:** A (chosen over Pattern B nesting under each asset, for the same company-wide-aggregation reason established for `vendorPayments` in Chapter 6.6 — a company-wide "all assignment changes this month" audit view is a common Asset-management need that a per-asset-nested structure would make expensive via collection-group queries).

**Composite Indexes Required:**
- `(companyId ASC, assetId ASC, changedAt DESC)` — per-asset chain-of-custody history.
- `(companyId ASC, changedAt DESC)` — company-wide recent-assignment-activity feed.

## 8.7 Firestore Map-Field vs. Subcollection Design Decision Note

**Rule FSA-009:** This chapter documents a deliberate architectural asymmetry between Inventory (denormalized subcollection under Employee, §8.4) and Assets (direct map-field on the Asset document itself, §8.5) for representing "what does this employee currently hold." This is intentional, not inconsistent: Inventory issuance is **many-to-many over time** (an employee holds *quantities* of *multiple* fungible items, changing frequently), best served by a queryable subcollection; Asset assignment is **strictly one-to-one at any instant** (Rule ASSETS-002), making a single map field on the asset itself sufficient and avoiding an unnecessary subcollection for what is architecturally a simpler relationship. Any future engineer questioning this asymmetry should refer to this rule rather than "fixing" it toward false consistency.

---

---

# CHAPTER 9: ENGAGEMENT COLLECTIONS (ESS, NOTIFICATIONS, APPROVALS)

## 9.1 Purpose

This chapter details the collections implementing Modules 14 (ESS), 15 (Notifications), and 19 (Approvals) — the shared infrastructure/aggregation collections that, unlike the domain modules in prior chapters, don't own a single business entity but instead aggregate and surface data originating in other modules.

## 9.2 `/grievances/{grievanceId}`

**Pattern:** A. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(companyId ASC, status ASC, category ASC)` — HR's Grievance Register filtered view.
- `(companyId ASC, assignedToUserId ASC, status ASC)` — a specific HR handler's assigned caseload.
- `(companyId ASC, isAnonymous ASC, status ASC)` — **Security Rule Note:** this index exists to support the anonymity-restriction enforcement itself (Chapter 16 will show the Security Rule for this collection filters based on `isAnonymous` to determine field-level visibility of `employeeId` to the querying user), not merely for display filtering.

**Subcollection:** `/grievances/{id}/timeline/{eventId}` — Pattern B, auto-ID. **Index:** `(createdAt ASC)` for chronological timeline rendering. Per `MASTER_BUSINESS_LOGIC.md` Rule ESS-003, this subcollection's documents carry an `actorDisplayName` field that is conditionally rendered as `"Anonymous"` at the Repository-mapper layer (not at the Firestore data level — the actual `actorUserId` is still stored for HR follow-up capability, but the mapper suppresses its display to non-assigned viewers) — this is a Data-layer/mapper enforcement point, cross-referenced with the Security-Rule-level field restriction in Chapter 16, operating as two complementary layers of the same protection (defense-in-depth, per `MASTER_PROJECT_RULES.md` §2.4).

## 9.3 `/companies/{companyId}/announcements/{announcementId}`

**Pattern:** B. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(targetAudience ASC, publishedAt DESC)` — the primary announcement-feed query, further filtered client-side (or via additional query constraints) by the employee's own `siteId`/`department` membership when `targetAudience` is `SPECIFIC_SITES`/`SPECIFIC_DEPARTMENTS` (using Firestore's `array-contains` operator against `targetSiteIds`/`targetDepartments`).
- `(targetSiteIds array-contains {siteId}, publishedAt DESC)` — a distinct composite index specifically supporting the array-contains + orderBy combination required for site-targeted announcement feeds.

**Subcollection:** `/announcements/{id}/acknowledgements/{employeeId}` — Pattern B, **deterministic ID = employeeId** (one acknowledgement per employee per announcement, natural key, and directly supporting the idempotent-safe-retry offline behavior specified in `MASTER_BUSINESS_LOGIC.md` §14.8).

## 9.4 `/companies/{companyId}/notificationTemplates/{templateId}`

**Pattern:** B. **ID Strategy:** **Deterministic — `templateCode`** (e.g., the document ID literally is `"LEAVE_APPROVED"`), not auto-ID, since template lookup is always by known code, never by query — a deterministic ID here eliminates an unnecessary index and query round-trip entirely, resolving to a direct document-path `get()`.

## 9.5 `/notifications/{notificationId}`

**Pattern:** A. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(recipientUserId ASC, isRead ASC, createdAt DESC)` — the Notification Center's primary query (unread-first or chronological, per UI toggle) — this is the single highest-read-volume query in the Notifications domain given every user opens their Notification Center frequently.
- `(recipientUserId ASC, category ASC, createdAt DESC)` — category-filtered notification view.

**Rule FSA-010:** Because `notifications` is queried exclusively by `recipientUserId` (never by `companyId` directly in application queries, even though the field exists on the document for Security Rule tenant-isolation purposes per `MASTER_PROJECT_RULES.md` §2.4.1's defense-in-depth), the composite indexes above deliberately lead with `recipientUserId` rather than `companyId` — a departure from every other Pattern A collection in this document, which typically leads composite indexes with `companyId` first. This is a deliberate, documented exception: `MASTER_PROJECT_RULES.md` §6.3's query-shape-driven indexing principle dictates indexes match actual query patterns, and no application code path ever queries "all notifications for a company" (that would be an odd, rarely-needed cross-user aggregate, unlike Attendance or Deployment where company-wide views are the norm).

## 9.6 `/workflowInstances/{instanceId}` and `/approvalInboxItems/{inboxItemId}`

(Cross-referenced fully in Chapter 11, since these belong architecturally to the Governance domain alongside `workflowDefinitions` — this chapter notes only the Engagement-relevant consumption pattern: the Approvals module's inbox screen queries `approvalInboxItems` with composite index `(approverUserId ASC, status ASC, priority ASC, slaDeadline ASC)`, directly supporting `MASTER_BUSINESS_LOGIC.md` Rule APPROVALS-003's priority/SLA sort order in a single indexed query rather than requiring client-side re-sorting of a larger unsorted result set.)

## 9.7 Badge Counter Architecture (Shared Pattern)

Both Notifications (unread count) and Approvals (pending count) use an identical architectural pattern, documented once here to avoid redundant explanation in Chapters 9.5/9.6 separately:

```
/users/{uid} {
  ...
  unreadNotificationCount: 7,        // maintained field, NOT a live query result
  pendingApprovalCount: 3             // maintained field, NOT a live query result
}
```

**Rule FSA-011:** Both counters are incremented/decremented exclusively within the same Cloud Function transaction that creates/updates the corresponding `notifications`/`approvalInboxItems` document — never independently recomputed via a `count()` aggregation query at dashboard-load time, per `MASTER_PROJECT_RULES.md` §9.3's explicit guidance against expensive live-aggregation for frequently-viewed dashboard metrics. A drift-detection scheduled function (nightly, low-frequency) recomputes and self-corrects any counter drift as a safety net, logging any correction made for diagnostic visibility into whether the increment/decrement logic has a bug requiring investigation.

---

---

# CHAPTER 10: INTELLIGENCE COLLECTIONS (ANALYTICS, REPORTS, AI)

## 10.1 Purpose

This chapter details the collections implementing Modules 16 (Analytics), 17 (Reports), and 20 (AI) — collections that, unlike transactional business-entity collections, primarily store **derived/computed output** rather than user-entered source data, and therefore have distinct indexing and lifecycle characteristics.

## 10.2 `/companies/{companyId}/analyticsRollups/{rollupId}`

**Pattern:** B. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(rollupType ASC, periodStart DESC)` — the primary dashboard-serving query pattern, fetching the most recent rollup of a given type.
- `(rollupType ASC, "dimensions.siteId" ASC, periodStart DESC)` — for site-filtered dashboard drill-downs (`MASTER_BUSINESS_LOGIC.md` Rule ANALYTICS-004's drill-down traceability), indexing into the `dimensions` map field directly.

**Rule FSA-012:** Per `MASTER_BUSINESS_LOGIC.md` Rule ANALYTICS-005 (historical rollup immutability), this collection is **append-only in practice** even though Firestore does not enforce this structurally — the governing Cloud Functions never issue an `update()` against an existing rollup document once its period has closed, only `create()` for new rollups or new `correctionOf`-referencing entries. Chapter 16's Security Rules technically permit updates only from the trusted Cloud Function service account, making this an operationally-enforced rather than Firestore-natively-enforced immutability — a documented limitation for future engineers to understand rather than assume Firestore itself blocks such an update.

## 10.3 `/superAdminAnalytics/{rollupId}`

**Pattern:** N/A (root collection, no company scoping — the sole cross-company data-bearing collection in the entire schema, per `MASTER_BUSINESS_LOGIC.md` Rule ANALYTICS-006).

**Composite Indexes Required:**
- `(rollupType ASC, periodStart DESC)` — identical shape to §10.2's per-company index, but operating platform-wide.

**Rule FSA-013:** This is the **only** collection in the entire Firestore schema without a `companyId` field or company-scoped path — its Security Rule (Chapter 16) is correspondingly the simplest and strictest in the platform: `allow read, write: if isSuperAdmin();` with no company-comparison logic whatsoever, since none applies. Any future collection proposal resembling this pattern (no company scoping) must be flagged for the same heightened architectural scrutiny this collection received, per the general principle that cross-tenant-by-design collections are the platform's highest-risk surface and must be vanishingly rare.

## 10.4 `/companies/{companyId}/reportDefinitions/{reportDefId}`

**Pattern:** B. **ID Strategy:** **Deterministic — `reportCode`** (mirroring the `notificationTemplates` pattern in Chapter 9.4 — lookup by known code, no query needed).

## 10.5 `/reportGenerationJobs/{jobId}`

**Pattern:** A. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(companyId ASC, requestedByUserId ASC, requestedAt DESC)` — "my report history" view.
- `(status ASC, requestedAt ASC)` — **note: this is a cross-company index** (no `companyId` leading field), used exclusively by the server-side job-processing Cloud Function's work queue ("find the next Queued job across all companies to process") — this is a legitimate, sanctioned exception to the general Pattern A company-leading-index convention specifically because it powers a trusted server-side worker process, never a client-facing query, and the actual document content returned still respects full tenant isolation once a specific job is being processed (the queue-scanning query itself only reads `status`/`requestedAt`, minimal fields, not the sensitive report parameters or output).

## 10.6 `/companies/{companyId}/aiSuggestions/{suggestionId}`

**Pattern:** B. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(suggestionType ASC, status ASC, createdAt DESC)` — the review queue for pending AI suggestions (e.g., HR's "AI suggestions awaiting my review" screen, cross-referenced with `MASTER_BUSINESS_LOGIC.md` Rule AI-001's mandatory human-confirmation gate).
- `(sourceEntityId ASC)` — single-field index (auto-created), sufficient for "show me all AI suggestions related to this specific employee/grievance/etc." lookups from within that entity's own detail screen.

## 10.7 `/aiUsageAuditLog/{logId}`

**Pattern:** N/A (root, Super-Admin visibility, similar cross-company rationale to `superAdminAnalytics` §10.3 — cost/usage governance is inherently a platform-wide concern).

**Composite Indexes Required:**
- `(companyId ASC, requestedAt DESC)` — per-company usage drill-down (Super Admin viewing one specific company's AI consumption).
- `(modelUsed ASC, requestedAt DESC)` — platform-wide model-usage-cost analysis.

## 10.8 Intelligence Domain Storage Cost Note

**Rule FSA-014:** Unlike transactional collections (Attendance, Payroll) which must be retained indefinitely for compliance, this chapter's collections have explicit, shorter retention policies where appropriate: `analyticsRollups` older than 3 years may be archived to Cloud Storage cold storage (outside Firestore) if platform-wide storage cost becomes material at scale, since historical rollups beyond this window have diminishing dashboard-relevance and can be regenerated from the still-retained raw transactional data if ever needed — this is a deliberately different retention posture than the immutable-forever stance applied to source-of-truth financial/compliance collections, and is flagged here explicitly so no future engineer mistakenly applies the stricter retention policy (with its associated storage cost) to what is fundamentally derived, regenerable data.

---

---

# CHAPTER 11: GOVERNANCE COLLECTIONS (COMPLIANCE, WORKFLOW ENGINE, AUDIT)

## 11.1 Purpose

This chapter details the collections implementing Module 21 (Compliance) and Module 18 (Workflow Engine), plus consolidates the platform's audit-log collections scattered across earlier chapters into a single governance-focused view — these are the collections whose integrity underpins the platform's legal defensibility and cross-module consistency guarantees.

## 11.2 `/statutoryRateTables/{tableId}`

**Pattern:** N/A (root, Super-Admin-maintained, platform-wide reference data — per `MASTER_BUSINESS_LOGIC.md` Rule COMPLIANCE-001, this is deliberately NOT company-scoped, since minimum wage tables are a function of Indian state/category, not of any individual company).

**Composite Indexes Required:**
- `(stateCode ASC, category ASC, effectiveFrom DESC)` — resolving the currently-applicable rate for a given state/category combination, fetching the most recent `effectiveFrom` entry that has already passed.

**Rule FSA-015:** Alongside `superAdminAnalytics` (Chapter 10.3) and `aiUsageAuditLog` (Chapter 10.7), this is the third of the platform's three deliberately-non-company-scoped root collections. This document maintains the complete list of all three here for easy future reference: **`superAdminAnalytics`, `aiUsageAuditLog`, `statutoryRateTables`** — every one of them Super-Admin-write-restricted, and every one of them justified by genuinely platform-wide (not company-specific) subject matter. Any proposal for a fourth such collection must be reviewed against this same bar.

## 11.3 `/companies/{companyId}/complianceLicenses/{licenseId}`

**Pattern:** B. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(status ASC, expiryDate ASC)` — the License Expiry Monitoring scheduled function's per-company query source (`MASTER_BUSINESS_LOGIC.md` Rule COMPLIANCE-003); note this query executes once per company within the scheduled function's iteration loop (per the company-isolation-in-computation principle established for Analytics rollups, Chapter 10, Rule FSA... consistent cross-reference to Analytics Rule ANALYTICS-002's "one company per invocation" pattern, applied here to Compliance's own scheduled scan).

## 11.4 `/companies/{companyId}/statutoryRegisters/{registerId}`

**Pattern:** B. **ID Strategy:** Auto-ID. Structurally a specialized subtype of the general `reportGenerationJobs` pattern (Chapter 10.5) but modeled as its own collection rather than reusing `reportGenerationJobs` directly, because statutory registers carry compliance-specific metadata (`registerType` drawn from a fixed, legally-defined enum, per `MASTER_BUSINESS_LOGIC.md` Rule COMPLIANCE-005) that doesn't cleanly fit the generic `reportGenerationJobs.reportCode` free-form-ish pattern, and because statutory registers warrant a longer, non-configurable retention policy distinct from ordinary reports (a governance/legal requirement, not an engineering preference).

**Composite Indexes Required:**
- `(registerType ASC, periodStart DESC)` — retrieving the most recent register of a given type for inspection-readiness purposes.

## 11.5 `/companies/{companyId}/workflowDefinitions/{workflowDefId}`

**Pattern:** B. **ID Strategy:** **Deterministic — `workflowCode`** (mirroring `notificationTemplates` and `reportDefinitions` — configuration-by-known-code, no query needed).

## 11.6 `/workflowInstances/{instanceId}`

**Pattern:** A. **ID Strategy:** Auto-ID.

**Composite Indexes Required:**
- `(companyId ASC, workflowCode ASC, currentState ASC)` — cross-workflow-type reporting (e.g., the Workflow Audit Report and SLA Compliance Report, `MASTER_BUSINESS_LOGIC.md` §18.6).
- `(companyId ASC, sourceModule ASC, sourceEntityId ASC)` — resolving the workflow instance corresponding to a specific source-module entity (e.g., given a `leaveRequestId`, find its `workflowInstances` document) — this is a **single-field-per-module lookup pattern**, and given `sourceEntityId` values are unique across the whole platform in practice (since they're themselves Firestore auto-IDs from their respective source collections), this composite index efficiently narrows to at most one matching document.

**Subcollection:** `/workflowInstances/{id}/transitionHistory/{transitionId}` — Pattern B, auto-ID. **Index:** `(performedAt ASC)` for chronological rendering.

## 11.7 Consolidated Audit-Log Collection Registry

This document has introduced audit-log-purposed collections across several chapters; this section consolidates them into a single registry for governance clarity, since `MASTER_PROJECT_RULES.md` §11.2 establishes an "immutable audit trail" as a cross-cutting security principle that no single prior chapter fully owns:

| Audit Collection | Chapter | Scope | Deletion Permission |
|---|---|---|---|
| `authAuditLog` | 4.5 | Per-company (Pattern A) | None — no role, including Company Admin, can delete |
| `employees/{id}/documents` (verification history, implicit via status field) | 5.2 | Per-employee | HR-editable status, but historical document versions are never deleted, only superseded |
| `deployments/{id}/history` | 6.2 | Per-deployment | None |
| `assetAssignmentHistory` | 8.6 | Per-company (Pattern A) | None |
| `payrollRuns` (post-Finalization) | 7.3 | Per-company | None — only Reversal-workflow-mediated compensating entries permitted |
| `invoices` (post-generation, `invoiceNumber` sequence) | 7.6 | Per-company | Cancellation permitted (status change), never true deletion (preserves sequence integrity) |
| `workflowInstances/{id}/transitionHistory` | 11.6 | Per-workflow-instance | None |
| `aiUsageAuditLog` | 10.7 | Platform-wide | None |

**Rule FSA-016:** Every collection in the table above has an identical Security Rule characteristic detailed fully in Chapter 16: `allow delete: if false;` (or the functional equivalent — no role, including Super Admin, is granted a `delete` rule on any of these collections in ordinary operation; genuine data-subject-erasure-request scenarios, e.g., under applicable data protection law, are handled via a distinct, separately-audited Super-Admin-mediated process outside normal application code paths, detailed in `MASTER_SECURITY_FRAMEWORK.md`, never via a standard client-exposed delete operation).

---

---

# CHAPTER 12: COMPOSITE INDEXES — FULL CATALOG

## 12.1 Purpose

Chapters 3-11 introduced composite indexes contextually, alongside the query each one serves. This chapter consolidates every one of them into the single authoritative catalog that maps directly to the physical `firestore.indexes.json` file maintained in the repository (per `MASTER_PROJECT_RULES.md` §15.2's folder structure — `firebase/firestore.indexes.json`). Per `MASTER_PROJECT_RULES.md` §6.3, every index here was introduced in the same PR as the query it serves; this chapter is the after-the-fact consolidated reference, not the point of original introduction.

## 12.2 Full Index Catalog

| # | Collection | Fields (order matters) | Serves |
|---|---|---|---|
| 1 | `sites` | `isActive ASC, siteName ASC` | Active-sites picker |
| 2 | `sites` | `clientId ASC, isActive ASC` | Client's "all sites" view |
| 3 | `shiftTypes` | `isActive ASC, name ASC` | Active-shift-type picker |
| 4 | `users` | `companyId ASC, isActive ASC, role ASC` | Company user list by role |
| 5 | `authAuditLog` | `companyId ASC, eventType ASC, timestamp DESC` | Security review dashboard |
| 6 | `authAuditLog` | `companyId ASC, userId ASC, timestamp DESC` | Per-user login history |
| 7 | `employees` | `companyId ASC, employmentStatus ASC, fullName ASC` | Employee Directory |
| 8 | `employees` | `companyId ASC, employmentStatus ASC, department ASC` | Department-filtered directory |
| 9 | `employees` | `companyId ASC, reportingManagerId ASC` | "My direct reports" |
| 10 | `employees` | `companyId ASC, assignedRoleId ASC` | RBAC administration view |
| 11 | `employees/{id}/documents` (collection group) | `expiryDate ASC` | Document expiry scan (server-only) |
| 12 | `employees/{id}/leaveBalances` | N/A — direct-ID access | — |
| 13 | `attendanceRecords` | `companyId ASC, siteId ASC, shiftDate ASC, status ASC` | Daily Attendance Register |
| 14 | `attendanceRecords` | `companyId ASC, employeeId ASC, shiftDate DESC` | Per-employee attendance history |
| 15 | `attendanceRecords` | `companyId ASC, isWithinGeofence ASC, status ASC` | Geofence Exception Report |
| 16 | `attendanceRecords` | `companyId ASC, isPayrollLocked ASC, shiftDate ASC` | Payroll generation source query |
| 17 | `leaveRequests` | `companyId ASC, employeeId ASC, status ASC, startDate ASC` | Leave overlap detection |
| 18 | `leaveRequests` | `companyId ASC, status ASC, createdAt ASC` | Pending Leave Approvals |
| 19 | `leaveRequests` | `companyId ASC, leaveTypeId ASC, status ASC` | Leave Utilization Report |
| 20 | `shiftRoster` (collection group) | `employeeId ASC, date ASC` | ESS "my upcoming shifts" |
| 21 | `shiftRoster` (per-site) | `date ASC, status ASC` | Per-site daily roster |
| 22 | `shiftSwapRequests` | `companyId ASC, status ASC, requestingEmployeeId ASC` | "My sent swap requests" |
| 23 | `shiftSwapRequests` | `companyId ASC, status ASC, targetEmployeeId ASC` | "My received swap requests" |
| 24 | `deployments` | `companyId ASC, employeeId ASC, status ASC, startDate ASC` | Deployment overlap detection |
| 25 | `deployments` | `companyId ASC, siteId ASC, status ASC` | Deployment Register, site-wise |
| 26 | `deployments` | `companyId ASC, clientId ASC, status ASC` | Client Staffing Summary, Billing source |
| 27 | `deployments` | `companyId ASC, status ASC, endDate ASC` | Deployment renewal planning |
| 28 | `deployments/{id}/history` | `effectiveDate ASC` | Historical rate resolution |
| 29 | `clients` | `companyId ASC, contractStatus ASC, contractEndDate ASC` | Contract Expiry Forecast |
| 30 | `vendors` | `companyId ASC, vendorCategory ASC, isActive ASC` | Vendor directory |
| 31 | `vendors` | `companyId ASC, rating DESC` | Best-rated vendors |
| 32 | `purchaseOrders` | `companyId ASC, vendorId ASC, status ASC` | Per-vendor PO history |
| 33 | `purchaseOrders` | `companyId ASC, status ASC, expectedDeliveryDate ASC` | Pending-delivery tracking |
| 34 | `vendorPayments` | `companyId ASC, vendorId ASC, paymentDate DESC` | Per-vendor payment history |
| 35 | `payrollRuns` | `companyId ASC, status ASC, periodStartDate DESC` | Payroll history list |
| 36 | `payrollRuns` | `companyId ASC, periodStartDate ASC, periodEndDate ASC` | Overlapping-period integrity check |
| 37 | `payrollRuns/{id}/payslips` | `netPay DESC` | Within-run review sort |
| 38 | `payrollReversals` | `companyId ASC, status ASC, requestedAt DESC` | Pending reversal approvals |
| 39 | `invoices` | `companyId ASC, clientId ASC, status ASC, billingPeriodStart DESC` | Client Billing History |
| 40 | `invoices` | `companyId ASC, status ASC, dueDate ASC` | Overdue Escalation source |
| 41 | `invoices` | `companyId ASC, invoiceNumber ASC` | Direct invoice-number lookup |
| 42 | `invoices/{id}/paymentHistory` | `paymentDate ASC` | Chronological payment display |
| 43 | `inventoryItems` | `category ASC, currentStock ASC` | Reorder alert candidate scan |
| 44 | `inventoryTransactions` | `companyId ASC, itemId ASC, performedAt DESC` | Stock Ledger Report |
| 45 | `inventoryTransactions` | `companyId ASC, idempotencyKey ASC` | Idempotency check (critical) |
| 46 | `inventoryTransactions` | `companyId ASC, issuedToEmployeeId ASC, transactionType ASC` | Offboarding reconciliation |
| 47 | `assets` | `assetCategory ASC, condition ASC` | Asset Register filtered view |
| 48 | `assets` | `condition ASC, isActive ASC` | Decommissioning eligibility |
| 49 | `assets` | `currentAssignment.assignedToId ASC` | "Assets held by employee X" |
| 50 | `assets/{id}/maintenanceLog` (collection group) | `nextDueDate ASC` | Maintenance Due Report (server-only) |
| 51 | `assetAssignmentHistory` | `companyId ASC, assetId ASC, changedAt DESC` | Per-asset chain-of-custody |
| 52 | `assetAssignmentHistory` | `companyId ASC, changedAt DESC` | Company-wide assignment feed |
| 53 | `grievances` | `companyId ASC, status ASC, category ASC` | Grievance Register |
| 54 | `grievances` | `companyId ASC, assignedToUserId ASC, status ASC` | Per-handler caseload |
| 55 | `grievances` | `companyId ASC, isAnonymous ASC, status ASC` | Anonymity-aware access support |
| 56 | `grievances/{id}/timeline` | `createdAt ASC` | Chronological timeline |
| 57 | `announcements` | `targetAudience ASC, publishedAt DESC` | Primary announcement feed |
| 58 | `announcements` | `targetSiteIds array-contains {siteId}, publishedAt DESC` | Site-targeted feed |
| 59 | `notifications` | `recipientUserId ASC, isRead ASC, createdAt DESC` | Notification Center primary |
| 60 | `notifications` | `recipientUserId ASC, category ASC, createdAt DESC` | Category-filtered view |
| 61 | `approvalInboxItems` | `approverUserId ASC, status ASC, priority ASC, slaDeadline ASC` | Approvals inbox primary |
| 62 | `analyticsRollups` | `rollupType ASC, periodStart DESC` | Dashboard-serving query |
| 63 | `analyticsRollups` | `rollupType ASC, dimensions.siteId ASC, periodStart DESC` | Site-filtered drill-down |
| 64 | `superAdminAnalytics` | `rollupType ASC, periodStart DESC` | Platform-wide dashboard |
| 65 | `reportGenerationJobs` | `companyId ASC, requestedByUserId ASC, requestedAt DESC` | "My report history" |
| 66 | `reportGenerationJobs` | `status ASC, requestedAt ASC` | Server-side job queue (cross-company) |
| 67 | `aiSuggestions` | `suggestionType ASC, status ASC, createdAt DESC` | AI review queue |
| 68 | `aiSuggestions` | `sourceEntityId ASC` | Entity-linked suggestion lookup |
| 69 | `aiUsageAuditLog` | `companyId ASC, requestedAt DESC` | Per-company usage drill-down |
| 70 | `aiUsageAuditLog` | `modelUsed ASC, requestedAt DESC` | Platform-wide model-cost analysis |
| 71 | `statutoryRateTables` | `stateCode ASC, category ASC, effectiveFrom DESC` | Applicable-rate resolution |
| 72 | `complianceLicenses` | `status ASC, expiryDate ASC` | License expiry scan |
| 73 | `statutoryRegisters` | `registerType ASC, periodStart DESC` | Latest register retrieval |
| 74 | `workflowInstances` | `companyId ASC, workflowCode ASC, currentState ASC` | Cross-workflow reporting |
| 75 | `workflowInstances` | `companyId ASC, sourceModule ASC, sourceEntityId ASC` | Instance-by-source lookup |
| 76 | `workflowInstances/{id}/transitionHistory` | `performedAt ASC` | Chronological transition display |

## 12.3 Index Maintenance Discipline

**Rule FSA-017:** This 76-entry catalog is the single source of truth reconciled against the physical `firebase/firestore.indexes.json` file on every CI run — a `detekt`-adjacent CI check (a custom script, not `detekt` itself, since index files aren't Kotlin) parses the deployed indexes file and diffs it against this document's catalog, failing the build if they diverge in either direction (an index in the file but not documented here, or vice versa) — directly enforcing `MASTER_PROJECT_RULES.md` §2.6's documentation-governance principle ("a mismatch between code and documentation is treated as a documentation bug requiring immediate correction") at the infrastructure-configuration level, not just the application-code level.

**Rule FSA-018:** Collection-group indexes (rows 11, 20, 50 above) are explicitly flagged as such in both this catalog and the physical index file's `queryScope: COLLECTION_GROUP` setting, since — per `MASTER_PROJECT_RULES.md` §2.4.3 — every collection-group index in this platform must carry a code comment at its point of use justifying why it is a sanctioned server-side-only exception rather than an inadvertent cross-tenant-query-enabling mistake.

---

---

# CHAPTER 13: TRANSACTIONS & BATCH WRITE CATALOG

## 13.1 Purpose

`MASTER_PROJECT_RULES.md` §6.4 established the decision criteria for choosing transactions versus batched writes. This chapter consolidates every specific instance across the platform where one of these mechanisms is required, serving as the authoritative checklist against which `MASTER_TESTING_CHECKLIST.md`'s concurrency test suite is built, and directly extending the summary table already begun in Chapter 7.7 (Financial domain) to cover the full platform.

## 13.2 Full Transaction Catalog

| # | Operation | Collections Involved | Read-Then-Write Dependency | Cross-Reference |
|---|---|---|---|---|
| 1 | Leave balance deduction on approval | `leaveRequests`, `employees/{id}/leaveBalances` | Yes — balance sufficiency check | BL Rule LEAVE-003 |
| 2 | Leave balance credit-back on cancellation | `leaveRequests`, `employees/{id}/leaveBalances` | Yes — current balance read before credit | BL Rule LEAVE-005 |
| 3 | Inventory stock decrement on issuance | `inventoryItems`, `inventoryItems/{id}/stockByLocation`, `inventoryTransactions` | Yes — stock sufficiency check | BL Rule INVENTORY-001 |
| 4 | Inventory stock increment on stock-in/return | `inventoryItems`, `stockByLocation`, `inventoryTransactions` | Yes — current stock read | BL Rule INVENTORY-001 |
| 5 | Invoice number sequence generation | `billingConfig` (singleton), `invoices` | Yes — counter read-increment | BL Rule BILLING-003, FSA §7.5 |
| 6 | PO number sequence generation | `vendorConfig`-equivalent counter, `purchaseOrders` | Yes — counter read-increment | BL Rule VENDOR-005 |
| 7 | Payroll finalization lock | `payrollRuns`, bulk `attendanceRecords` (isPayrollLocked flag) | Yes — run status check before locking | BL Rules PAYROLL-005, ATTENDANCE-006 |
| 8 | Asset reassignment | `assets` (currentAssignment field) | Yes — current assignment read before overwrite | BL Rule ASSETS-002 |
| 9 | Employee activation | `employees`, Firebase Auth (via Cloud Function, not a Firestore transaction per se, but an atomic all-or-nothing operation with compensating rollback) | Yes — mandatory field completeness check | BL Rule EMPLOYEE-002 |
| 10 | Company onboarding | `companies`, initial Admin user creation | Yes — duplicate-name/GST check | BL Rule COMPANY-001 |
| 11 | Workflow state transition | `workflowInstances`, source entity's own status field | Yes — current state validated against defined transitions | BL Rule WORKFLOW-001, 005 |
| 12 | Payroll config minimum-wage floor validation | `payrollConfig`, `statutoryRateTables` | Yes — statutory floor read before accepting company config | BL Rule COMPLIANCE-002 |

## 13.3 Full Batched Write Catalog

| # | Operation | Collections Involved | Why Batched, Not Transactional | Cross-Reference |
|---|---|---|---|---|
| 1 | Deployment creation + initial audit log | `deployments`, `deployments/{id}/history` | Independent creates, no read-dependency between them | BL Rule DEPLOYMENT (general pattern) |
| 2 | Leave approval + Attendance ON_LEAVE marking | `leaveRequests`, `attendanceRecords` (one per date in range) | Independent document writes once approval itself is validated | BL Rule LEAVE-008 |
| 3 | Shift swap approval — both employees' roster entries | `shiftRoster` (two documents) | Independent updates, atomicity needed but no cross-read dependency beyond already-validated swap request | BL Rule SHIFT-004 |
| 4 | Inventory issuance ledger + denormalized holding record | `inventoryTransactions`, `employees/{id}/issuedItems` | Independent creates following the already-completed stock-decrement transaction | BL Rule INVENTORY-003 |
| 5 | Invoice payment recording | `invoices` (amount/status update), `invoices/{id}/paymentHistory` (new entry) | Independent operations, no read-dependency beyond the already-loaded invoice | BL Rule BILLING-005 |
| 6 | Approval action — inbox item actioning across multiple eligible approvers | `workflowInstances`, multiple `approvalInboxItems` entries | Independent status updates to each inbox entry once the underlying decision is made | BL Rule APPROVALS-002 |
| 7 | Notification dispatch — document creation + counter increment | `notifications`, `users/{uid}` (counter field) | Independent operations bundled for atomicity of the visible-badge-count-matches-actual-notifications guarantee | BL Rule NOTIFICATIONS-005, FSA §9.7 |
| 8 | Goods receipt — PO update + Inventory/Asset creation | `purchaseOrders/{id}/goodsReceipt`, `inventoryTransactions` or `assets` | Independent creates once receipt quantities are validated (validation itself may involve a transaction if checking against ordered quantity concurrently, but the resulting writes are batched) | BL Rule VENDOR-002 |

## 13.4 Decision Rationale Quick Reference

**Rule FSA-019:** The dividing line applied consistently throughout this catalog: if a write's correctness depends on the *current value* of a field being read fresh at write time (stock sufficiency, balance sufficiency, sequence counters, current assignment state), it is a **transaction**. If a write is simply "create/update N documents together, atomically, but none of them depends on reading another's current value first," it is a **batched write**. This is the operational restatement of `MASTER_PROJECT_RULES.md` §6.4's decision table, and every future engineer adding a new multi-document write operation must classify it against this exact question before choosing a mechanism — defaulting to a transaction "to be safe" when a batch would suffice is also discouraged, since transactions carry additional contention/retry overhead that batched writes don't, per `MASTER_PROJECT_RULES.md` §9's performance discipline.

## 13.5 Testing Cross-Reference

Every row in both catalogs above corresponds to a mandatory concurrency-simulation integration test per `MASTER_PROJECT_RULES.md` §13.6/13.7 — Chapter 7.7 already flagged this for the Financial domain specifically; this chapter's §13.2/13.3 catalogs are the complete platform-wide version that `MASTER_TESTING_CHECKLIST.md` enumerates exhaustively, module by module.

---

---

# CHAPTER 14: OFFLINE SYNC & CACHE STRATEGY (FIRESTORE-SPECIFIC DETAIL)

## 14.1 Purpose

`MASTER_PROJECT_RULES.md` §6.6/6.7 established the offline sync principles, and `MASTER_BUSINESS_LOGIC.md` Module 22 established the cross-cutting sync engine's business rules. This chapter provides the final layer: the concrete Firestore-configuration-level detail (cache size settings, per-collection persistence tuning, listener budgets) that ties those two documents to actual `FirebaseFirestoreSettings` configuration.

## 14.2 Firestore SDK Persistence Configuration

```kotlin
val settings = FirebaseFirestoreSettings.Builder()
    .setPersistenceEnabled(true)
    .setCacheSizeBytes(FirebaseFirestoreSettings.CACHE_SIZE_UNLIMITED.let {
        100L * 1024 * 1024  // 100MB, per MASTER_PROJECT_RULES.md §6.7 — explicitly NOT unlimited
    })
    .build()
firestore.firestoreSettings = settings
```

**Rule FSA-020:** The 100MB figure is a documented starting point, not an immutable constant — it is tuned per observed device-storage-profile data from Firebase Performance Monitoring (per `MASTER_PROJECT_RULES.md` §9.5's Remote-Config-tunable-without-release principle), and any change to this value is itself a Remote Config parameter (`firestore_cache_size_bytes`), not a hardcoded value requiring an app release to adjust.

## 14.3 Per-Collection Listener Budget

Per `MASTER_PROJECT_RULES.md` §6.3/9.3's "1-2 live listeners per screen" budget, this table specifies exactly which collections use real-time `addSnapshotListener` versus one-time `get()` fetches, since indiscriminate listener use across this platform's 76+ indexed query patterns (Chapter 12) would be a significant, easily-overlooked cost and battery risk:

| Screen/Feature | Collection | Listener Type | Rationale |
|---|---|---|---|
| Daily Attendance Register (live view) | `attendanceRecords` | Live listener | Real-time site-wide visibility is the core value proposition of this screen |
| Notification Center | `notifications` | Live listener | Badge count and list must reflect new arrivals immediately |
| Approvals Inbox | `approvalInboxItems` | Live listener | Time-sensitive, action-required items |
| Employee Directory | `employees` | One-time fetch + Room cache | Infrequent-change data, live updates provide no meaningful UX benefit relative to their cost |
| Payroll history | `payrollRuns` | One-time fetch + Room cache | Static once generated, no live-update need |
| Deployment Register | `deployments` | One-time fetch + pull-to-refresh | Moderate change frequency; explicit refresh is an acceptable UX tradeoff against listener cost |
| Announcements feed | `announcements` | Live listener | New announcements should surface promptly without requiring manual refresh |
| Asset Register | `assets` | One-time fetch + Room cache | Low change frequency |

**Rule FSA-021:** Any new screen added to the platform must be explicitly classified into this table before merge, per the same PR-template discipline established in `MASTER_PROJECT_RULES.md` §9.3 ("a mandatory field in the PR template" for read-cost estimation) — extended here specifically to the live-listener-versus-fetch decision, since an unreviewed default toward "just use a listener, it's easier" is a recognized anti-pattern this table exists to prevent.

## 14.4 Room Cache Table Mapping

Directly implementing `MASTER_BUSINESS_LOGIC.md` Module 22.3's `pending_write_queue` and read-cache tables, this section confirms the Firestore-collection-to-Room-table mapping:

| Room Table | Source Firestore Collection | Sync Direction |
|---|---|---|
| `cached_employees` | `employees` | Firestore → Room (read-only cache) |
| `cached_attendance_history` | `attendanceRecords` | Firestore → Room (read-only cache) |
| `cached_shift_roster` | `shiftRoster` (collection group, scoped to current user) | Firestore → Room |
| `cached_deployment_assignments` | `deployments` (scoped to current user's employeeId or company) | Firestore → Room |
| `cached_payslips` | `payrollRuns/{id}/payslips` (scoped to current user) | Firestore → Room |
| `cached_notifications` | `notifications` (scoped to current user) | Firestore → Room |
| `pending_write_queue` | N/A — Room-native, Tier 2 offline queue | Room → Firestore (outbound only) |

## 14.5 Deterministic-ID Collections and Offline Safety (Consolidated Cross-Reference)

This chapter consolidates the platform's full list of deterministic-ID collections — the ones whose ID strategy directly enables safe offline-write-retry per `MASTER_BUSINESS_LOGIC.md` Module 22's idempotency principle:

| Collection | Deterministic ID Formula |
|---|---|
| `attendanceRecords` | `hash(employeeId + shiftDate + shiftId)` |
| `employees/{id}/leaveBalances` | `leaveTypeId` |
| `payrollRuns/{id}/payslips` | `employeeId` |
| `inventoryItems/{id}/stockByLocation` | `locationId` |
| `announcements/{id}/acknowledgements` | `employeeId` |
| `companies/{id}/notificationTemplates` | `templateCode` |
| `companies/{id}/reportDefinitions` | `reportCode` |
| `companies/{id}/workflowDefinitions` | `workflowCode` |
| `companies/{id}/payrollConfig`, `billingConfig` | Fixed singleton ID `config` |

**Rule FSA-022:** `inventoryTransactions` is deliberately **not** in this table despite its idempotency requirement — it uses auto-ID *plus* a separately-indexed `idempotencyKey` field (Chapter 8.3), rather than a deterministic document ID itself, because a single logical issuance operation may need to be retried with additional context (e.g., a partial-quantity adjustment) that a purely-deterministic ID scheme keyed only on `(employeeId, itemId, date)` would not cleanly accommodate given multiple legitimate issuances of the same item to the same employee could occur on the same day. This is a documented, deliberate exception to the general deterministic-ID pattern, resolved instead via the explicit idempotency-key-field-plus-existence-check mechanism.

## 14.6 Connectivity-State-Driven Sync Triggering

```kotlin
connectivityManager.registerNetworkCallback(request, object : ConnectivityManager.NetworkCallback() {
    override fun onAvailable(network: Network) {
        WorkManager.getInstance(context).enqueueUniqueWork(
            "immediate_pending_write_sync",
            ExistingWorkPolicy.KEEP,  // avoid duplicate enqueue if already running
            syncWorkRequest
        )
    }
})
```

**Rule FSA-023:** This immediate-trigger-on-reconnect pattern operates alongside (not instead of) the periodic `PeriodicWorkRequest` baseline (`MASTER_PROJECT_RULES.md` §4.6) — the periodic worker acts as a safety net catching any missed connectivity-callback event (a known Android OS reliability edge case with network callbacks under certain battery-optimization states), ensuring the platform's offline-first guarantee doesn't silently depend on a single, occasionally-unreliable OS signal.

---

---

# CHAPTER 15: STORAGE FOLDER STRUCTURE — FULL MAPPING

## 15.1 Purpose

`MASTER_PROJECT_RULES.md` §5.5 established the Storage folder convention (`/{companyId}/{module}/{entityId}/{fileName}`). This chapter provides the complete, concrete mapping of every file-bearing entity across all 22 business logic modules to its physical Storage path, serving as the authoritative reference for both application upload code and the Security Rules in Chapter 16.

## 15.2 Complete Storage Path Catalog

| Entity | Storage Path Pattern | Cross-Reference |
|---|---|---|
| Company branding | `/{companyId}/branding/logo.{ext}` | Company Module 1 |
| Employee profile photo | `/{companyId}/employees/{employeeId}/profile_photo.{ext}` | Employee Module 3 |
| Employee ID documents | `/{companyId}/employees/{employeeId}/documents/{documentType}_{documentId}.{ext}` | Employee Module 3 |
| Attendance signed log sheet (where applicable) | `/{companyId}/attendance/{attendanceId}/logsheet_signed.pdf` | Attendance Module 4 |
| Leave attachment (medical certificate, etc.) | `/{companyId}/leave/{leaveRequestId}/attachment_{documentId}.{ext}` | Leave Module 5 |
| Asset images | `/{companyId}/assets/{assetId}/photo_{index}.{ext}` | Asset Module 10 |
| Asset maintenance invoice/report | `/{companyId}/assets/{assetId}/maintenance/{logId}_invoice.pdf` | Asset Module 10 |
| Client contract documents | `/{companyId}/clients/{clientId}/contracts/{documentId}.{ext}` | Client Module 12 |
| Vendor-related documents (contracts, certifications) | `/{companyId}/vendors/{vendorId}/documents/{documentId}.{ext}` | Vendor Module 13 |
| Purchase order attachments | `/{companyId}/purchaseOrders/{poId}/attachment_{documentId}.{ext}` | Vendor Module 13 |
| Grievance attachments | `/{companyId}/grievances/{grievanceId}/attachment_{documentId}.{ext}` | ESS Module 14 |
| Announcement attachment | `/{companyId}/announcements/{announcementId}/attachment.{ext}` | ESS Module 14 |
| Invoice PDF | `/{companyId}/invoices/{invoiceId}/invoice.pdf` | Billing Module 11 |
| Payslip PDF | `/{companyId}/payroll/{payrollRunId}/payslips/{employeeId}.pdf` | Payroll Module 8 |
| Report generation output | `/{companyId}/reports/{jobId}/{fileName}.{ext}` | Reports Module 17 |
| Statutory register output | `/{companyId}/statutoryRegisters/{registerId}/{registerType}.{ext}` | Compliance Module 21 |
| Compliance license documents | `/{companyId}/compliance/licenses/{licenseId}.{ext}` | Compliance Module 21 |

## 15.3 File Size and Type Constraints (Consolidated)

| Category | Max Size | Allowed Types |
|---|---|---|
| Profile photos | 5MB | image/jpeg, image/png |
| ID/verification documents | 10MB | image/jpeg, image/png, application/pdf |
| Signed log sheets, invoices, payslips (system-generated PDFs) | 10MB | application/pdf |
| Maintenance/contract documents | 15MB | application/pdf, image/jpeg, image/png |
| Report/statutory register exports | 25MB (larger due to potential full-year, full-company data volume) | application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (Excel), text/csv |

**Rule FSA-024:** Every size/type constraint in this table is enforced identically at three points, per `MASTER_PROJECT_RULES.md` §5.5's defense-in-depth principle: (1) client-side pre-upload validation (immediate UX feedback), (2) Storage Security Rules (`request.resource.size < N && request.resource.contentType.matches(...)`), and (3) this document serving as the single source both of those enforcement points must reference — a size limit changed in one location without updating this table and the other two enforcement points is treated as a documentation-drift bug per `MASTER_PROJECT_RULES.md` §2.6.

## 15.4 Orphan File Reconciliation

Per `MASTER_PROJECT_RULES.md` §6.8's orphan-cleanup principle, a scheduled Cloud Function performs the reconciliation described there, and this chapter specifies its concrete matching logic given the path catalog above: for each Storage path pattern, the function extracts the embedded entity ID (e.g., `{employeeId}` from an employee-photo path) and verifies a corresponding Firestore document still exists and still references that exact Storage path in its own `profilePhotoUrl`/`documentUrl`/equivalent field — a mismatch (Storage file exists, no referencing Firestore field, or vice versa) is flagged for manual review, never auto-deleted, since a legitimate in-progress upload (Firestore document not yet written) or a legitimate document-field-cleared-but-cleanup-pending scenario must not be mistaken for true orphaning.

## 15.5 Storage Security Rule Pattern Preview (Full Detail in Chapter 16)

```
match /{companyId}/employees/{employeeId}/documents/{fileName} {
  allow read: if request.auth.token.companyId == companyId &&
    hasPermission('employees.viewDocuments');
  allow write: if request.auth.token.companyId == companyId &&
    hasPermission('employees.manageDocuments') &&
    request.resource.size < 10 * 1024 * 1024 &&
    request.resource.contentType.matches('image/.*|application/pdf');
}
```

**Rule FSA-025:** Every Storage Security Rule in the platform follows this identical structural template — path-embedded `companyId` check, permission check, size check, content-type check — and Chapter 16 provides the complete, collection-by-collection (path-pattern-by-path-pattern) enumeration of every one of these rules mirroring the Firestore Security Rule catalog for the equivalent business entities.

---

---

# CHAPTER 16: SECURITY RULE MAPPING — COLLECTION-BY-COLLECTION

## 16.1 Purpose

This final chapter delivers on the promise made throughout this document: a complete, collection-by-collection mapping of every Firestore collection cataloged in Chapters 3-11 to its governing Security Rule pattern. This is the direct physical implementation of `MASTER_PROJECT_RULES.md` Chapter 6.5's rule template and Chapter 2.4's defense-in-depth model, and it is the document `MASTER_SECURITY_FRAMEWORK.md`'s RBAC permission matrix plugs into via the `hasPermission()` function referenced throughout.

## 16.2 Shared Rule Helper Functions

Every collection-specific rule below composes from this shared set of helper functions (defined once in `firebase/rules/shared/helpers.rules` per `MASTER_PROJECT_RULES.md` §6.5's modular-rule-file organization):

```javascript
function isSignedIn() { return request.auth != null; }
function userCompanyId() { return request.auth.token.companyId; }
function isSuperAdmin() { return request.auth.token.superAdmin == true; }
function isSameCompany(companyId) { return isSignedIn() && userCompanyId() == companyId; }
function hasPermission(permission) {
  return isSignedIn() &&
    exists(/databases/$(database)/documents/companies/$(userCompanyId())/roles/$(request.auth.token.roleId)) &&
    permission in get(/databases/$(database)/documents/companies/$(userCompanyId())/roles/$(request.auth.token.roleId)).data.permissions;
}
function isOwnEmployeeRecord(employeeId) {
  return isSignedIn() && request.auth.token.linkedEmployeeId == employeeId;
}
```

## 16.3 Pattern A Collection Rule Template (Restated and Confirmed)

Every Pattern A collection (per Chapter 1.3's list) follows the template already introduced in `MASTER_PROJECT_RULES.md` §6.5, with the `companyId`-immutability guard. This chapter confirms this template applies verbatim to: `employees`, `attendanceRecords`, `leaveRequests`, `deployments`, `payrollRuns`, `invoices`, `purchaseOrders`, `vendorPayments`, `clients`, `vendors`, `grievances`, `notifications`, `workflowInstances`, `approvalInboxItems`, `shiftSwapRequests`, `payrollReversals`, `inventoryTransactions`, `assetAssignmentHistory`, `reportGenerationJobs`, `authAuditLog`.

## 16.4 Pattern B Collection Rule Template

```
match /companies/{companyId}/{subcollection=**} {
  allow read: if isSameCompany(companyId) || isSuperAdmin();
  allow write: if isSameCompany(companyId) && hasPermission(subcollectionSpecificPermission) || isSuperAdmin();
}
```

**Rule FSA-026:** The wildcard `{subcollection=**}` recursive match is a Firestore rules convenience for collections sharing an identical company-path-scoping check, but per `MASTER_PROJECT_RULES.md` §6.5.2's testing mandate, each individual Pattern B collection (`sites`, `roles`, `shiftTypes`, `leavePolicyTypes`, `inventoryItems`, `assets`, `complianceLicenses`, `statutoryRegisters`, `announcements`, `analyticsRollups`, `workflowDefinitions`, `reportDefinitions`, `billingConfig`, `payrollConfig`) still requires its own distinct, non-shared `hasPermission()` string (`sites.manage`, `roles.manage`, `assets.manage`, etc.) — the recursive wildcard governs the *path-scoping* check uniformly, never the *permission* check, which remains collection-specific and must never be collapsed into an overly-permissive single "any company member can write any config" rule.

## 16.5 Special-Case Collections (Deviating from Standard Templates)

| Collection | Deviation | Rationale |
|---|---|---|
| `users/{uid}` | Self-write restricted to field whitelist (§4.6 template) | `MASTER_BUSINESS_LOGIC.md` Rule AUTH-002 — companyId/role never client-writable |
| `notifications` | Read/write scoped to `recipientUserId == request.auth.uid`, not `companyId` | Chapter 9.5's recipient-centric query pattern |
| `superAdminAnalytics`, `aiUsageAuditLog`, `statutoryRateTables` | `allow read, write: if isSuperAdmin();` only, no company logic | Chapter 10.3/10.7/11.2 — the three deliberately non-company-scoped collections |
| `grievances` | Field-level `employeeId` visibility restricted when `isAnonymous == true` | `MASTER_BUSINESS_LOGIC.md` Rule ESS-003 |
| `employees` (sensitive fields) | `bankAccountNumber`, `panNumber`, `aadhaarNumber` readable only with `employees.viewSensitive` permission, enforced via Firestore's field-masking-at-read approach (a Cloud Function-mediated read path or a client-side mapper honoring a field-presence check, since native Firestore rules cannot mask individual fields within an otherwise-permitted document read — this is a known Firestore Security Rules limitation, worked around per `MASTER_BUSINESS_LOGIC.md` Rule EMPLOYEE-003's implementation note) | Chapter 5.2, `MASTER_PROJECT_RULES.md` §11.2 |
| `attendanceRecords` (post-payroll-lock) | `allow update: if resource.data.isPayrollLocked == false` — an additional guard beyond the standard Pattern A template | `MASTER_BUSINESS_LOGIC.md` Rule ATTENDANCE-006 |
| Every audit-log collection (Chapter 11.7's registry) | `allow delete: if false;` unconditionally, overriding any permission-based allowance | `MASTER_PROJECT_RULES.md` §11.2 |

## 16.6 Firestore Field-Masking Limitation — Documented Workaround

**Rule FSA-027:** Native Firestore Security Rules operate at the document level, not the field level, for read operations — a rule can grant or deny read access to an entire document, but cannot natively return a masked/partial version of a document's fields to a lower-privileged reader while returning the full document to a higher-privileged one. This platform's workaround (already noted in `MASTER_BUSINESS_LOGIC.md` Rule EMPLOYEE-003 and restated here as the authoritative architectural note): sensitive fields (`bankAccountNumber`, `panNumber`, `aadhaarNumber`) are read exclusively through the Data-layer Repository, which itself checks the current user's `employees.viewSensitive` permission and applies field-masking at the mapper level (DTO → Domain mapping, per `MASTER_PROJECT_RULES.md` §4.3.3) *in addition to* the document-level Security Rule already restricting broad `employees` collection read access to appropriately-permissioned roles in the first place — this is a two-layer mitigation (coarse document-level rule + fine field-level application-layer masking) compensating for Firestore's structural field-masking limitation, not a substitute for proper Security Rules where they can apply.

## 16.7 Security Rule Test Coverage Confirmation

Per `MASTER_PROJECT_RULES.md` §6.5.2/11.5.1, every collection enumerated in this chapter (and fully detailed in Chapters 3-11) has a corresponding emulator-based test file under `firebase/rules/__tests__/`, with the following mandatory coverage per collection: (1) same-company, correctly-permissioned read/write succeeds, (2) cross-company read/write is denied regardless of permission level, (3) same-company but insufficiently-permissioned write is denied, (4) `companyId`-mutation attempt on Pattern A collections is denied, and (5) any collection-specific special-case rule from §16.5's table has its own dedicated adversarial test (e.g., attempting to read an anonymous grievance's `employeeId` as a non-assigned HR user, attempting to update a payroll-locked attendance record).

---

# END OF DOCUMENT — MASTER_FIRESTORE_ARCHITECTURE.md

This document is now **complete** across all 16 chapters:

1. Architecture Overview & Design Principles
2. Complete Collection Map
3. Company & Tenancy Hierarchy
4. Identity & Access Collections
5. Workforce Collections (Employees, Attendance, Leave, Shift)
6. Operations Collections (Deployment, Client, Vendor)
7. Financial Collections (Payroll, Billing)
8. Asset & Inventory Collections
9. Engagement Collections (ESS, Notifications, Approvals)
10. Intelligence Collections (Analytics, Reports, AI)
11. Governance Collections (Compliance, Workflow Engine, Audit)
12. Composite Indexes — Full Catalog (76 indexes)
13. Transactions & Batch Write Catalog (12 transactions, 8 batch writes)
14. Offline Sync & Cache Strategy (Firestore-Specific Detail)
15. Storage Folder Structure — Full Mapping
16. Security Rule Mapping — Collection-by-Collection

**Document Version:** 1.0 — Final
**Governed By:** `MASTER_PROJECT_RULES.md` (Chapters 4, 5, 6, 11) and `MASTER_BUSINESS_LOGIC.md` (all 22 modules) — every collection, index, and rule in this document is directly traceable to a business requirement established in those two governing documents.
**Status:** Ready to serve as the authoritative Firestore schema reference for `firestore.rules`, `firestore.indexes.json`, and all Repository-layer implementation work.

----------------------------------------
DOCUMENT:
MASTER_FIRESTORE_ARCHITECTURE.md

STATUS:
✅ DOCUMENT COMPLETE — ALL 16 CHAPTERS FINISHED

NEXT STEP:
Type "NEXT DOCUMENT" to begin MASTER_SECURITY_FRAMEWORK.md
----------------------------------------
