# MASTER_TESTING_CHECKLIST.md
## Log Sheet Muster (LSM) — Complete Testing Checklist Reference

**Document Classification:** Official QA & Testing Reference
**Governed By:** `MASTER_PROJECT_RULES.md` (Chapter 13 — Testing Standards)
**Purpose:** `MASTER_PROJECT_RULES.md` Chapter 13 established the testing *pyramid, coverage targets, and discipline*. Every one of `MASTER_BUSINESS_LOGIC.md`'s 22 modules also specified its own "Testing Requirements" subsection. This document consolidates all of that into one exhaustive, checkable checklist — the single artifact a QA lead or AI-assisted tool runs through before any release, with zero items left to individual memory or module-by-module cross-referencing.

---

# TABLE OF CONTENTS

1. Unit Testing Checklist
2. Integration Testing Checklist *(upcoming)*
3. UI Testing Checklist *(upcoming)*
4. Performance Testing Checklist *(upcoming)*
5. Security Testing Checklist *(upcoming)*
6. Offline Testing Checklist *(upcoming)*
7. Regression Testing Checklist *(upcoming)*
8. UAT Checklist *(upcoming)*
9. Production Checklist (Final Consolidated Gate) *(upcoming)*

---

# CHAPTER 1: UNIT TESTING CHECKLIST

## 1.1 Purpose and Scope

Per `MASTER_PROJECT_RULES.md` §13.2, unit tests cover the Domain layer exclusively — every Use Case's happy path, every documented edge case, and at least one failure path, with zero live Firebase dependency. This chapter enumerates every specific Use Case requiring unit test coverage, module by module, cross-referencing the exact `RULE-<MODULE>-*` identifiers each test must verify.

## 1.2 Coverage Target Reminder

Per `MASTER_PROJECT_RULES.md` §13.3: Domain layer ≥ 90% line coverage, CI-enforced, build-blocking on regression.

## 1.3 Module-by-Module Unit Test Checklist

### Company (Module 1)
- [ ] `OnboardCompanyUseCase`: duplicate GST warning path, all-or-nothing rollback on partial failure (Rule COMPANY-001)
- [ ] `CompanySubscriptionGuard`: grace-period boundary (exactly at expiry, 1 day into grace, last day of grace, 1 day past grace) (Rule COMPANY-003)
- [ ] `CreateEmployeeUseCase` (limit check): exactly at `maxEmployeeLimit`, one over (Rule COMPANY-004)

### Authentication (Module 2)
- [ ] `PermissionEvaluator`: correct resolution from custom claims across every role bundle (`MASTER_SECURITY_FRAMEWORK.md` §2.4)
- [ ] Sign-in method resolution: Employee/Supervisor role retaining original method post-promotion (Rule AUTH-001 edge case)
- [ ] Account lockout counter: exactly 5 failures within 15-minute window triggers lock; 4 failures does not (Rule AUTH-004)

### Employees (Module 3)
- [ ] `ActivateEmployeeUseCase`: every mandatory-field-missing combination rejected (Rule EMPLOYEE-002)
- [ ] Employment status state machine: every valid transition succeeds, every invalid transition (incl. `DRAFT→TERMINATED` direct) rejected (Rule EMPLOYEE-004)
- [ ] Offboarding cascade: all four cascading actions (Deployment end, Auth disable, device flag, payroll flag) verified, plus simulated partial-cascade-failure surfacing correctly (Rule EMPLOYEE-005)
- [ ] Reporting-manager circular-chain detection: direct cycle (A→B→A), indirect cycle (A→B→C→A), self-reference (Rule EMPLOYEE-007)

### Attendance (Module 4)
- [ ] Deterministic ID generation: identical inputs produce identical IDs across repeated calls (Rule ATTENDANCE-001)
- [ ] Geofence validation: exactly at boundary radius, just inside, just outside, with/without override (Rule ATTENDANCE-002)
- [ ] Late-marking threshold: exactly at grace period boundary, one minute over (Rule ATTENDANCE-003)
- [ ] Auto-absent scheduled logic: interaction with concurrent Leave approval (no double-status), interaction with late check-in after auto-absent fired (Rule ATTENDANCE-004, §4.9 edge cases)
- [ ] Proxy marking: Supervisor site-assignment validation, time-window boundary (Rule ATTENDANCE-005)
- [ ] Payroll-lock rejection: every role including HR rejected on locked record (Rule ATTENDANCE-006)
- [ ] Overnight shift duration calculation spanning midnight boundary (§4.9)

### Leave (Module 5)
- [ ] Overlap detection: exact boundary dates (end date of one = start date of next), against both `APPROVED` and `PENDING_APPROVAL` (Rule LEAVE-001, LEAVE-004)
- [ ] Balance-sufficiency transaction: concurrent application race simulation confirming no over-approval (Rule LEAVE-003)
- [ ] Cancellation credit-back: pre-start-date full cancellation, post-start-date partial cancellation (Rule LEAVE-005)
- [ ] Pro-rated accrual: mid-month joining date at every day-of-month boundary (Rule LEAVE-006)
- [ ] Carry-forward capping: balance above cap, at cap, below cap (Rule LEAVE-007)

### Shift (Module 6)
- [ ] Overnight shift time consistency validation (Rule SHIFT-001)
- [ ] Roster assignment against active-Deployment cross-check (Rule SHIFT-002)
- [ ] Double-booking prevention: overlapping shifts rejected; company-policy-permitted double-shift path checked against statutory max-hours (Rule SHIFT-003)
- [ ] Shift swap state machine: every state transition, target-decline path, approver-rejection path (Rule SHIFT-004)

### Deployment (Module 7)
- [ ] Overlap detection: single-site default policy, multi-site-permitted policy interacting with Shift double-booking check (Rule DEPLOYMENT-002)
- [ ] Status state machine: every transition incl. `OnHold→Cancelled` (Rule DEPLOYMENT-003)
- [ ] Site transfer: confirms new record created, old record correctly `COMPLETED`, never an in-place mutation (Rule DEPLOYMENT-004)
- [ ] Cancellation cascade: future roster entries cancelled, historical entries untouched (Rule DEPLOYMENT-006)

### Payroll (Module 8)
- [ ] Gross/net pay computation: full attendance, partial with leave, with overtime, minimum-wage-floor-triggering scenario (Rule PAYROLL-002)
- [ ] Overtime sourcing: confirms value read verbatim from Attendance, never recalculated (Rule PAYROLL-003)
- [ ] PF/ESI threshold edge cases: exactly at ceiling, just above, just below (Rule PAYROLL-004)
- [ ] Payslip adjustment threshold: below co-sign requirement, at threshold, above threshold (Rule PAYROLL-006)
- [ ] Full & Final settlement computation on offboarding (Rule PAYROLL-008)

### Inventory (Module 9)
- [ ] Concurrency simulation: simultaneous issuance requests against limited stock, confirming no oversell (Rule INVENTORY-001)
- [ ] Idempotency: retried transaction with same key does not double-decrement (Rule INVENTORY-002)
- [ ] Reorder threshold notification trigger boundary (Rule INVENTORY-004)

### Assets (Module 10)
- [ ] Depreciation calculation: both methods, full-year and partial-first-year purchase (Rule ASSETS-004)
- [ ] Exclusive assignment transaction: no race condition produces dual assignment (Rule ASSETS-002)
- [ ] Offboarding-triggered asset-recovery flag cascade (Rule ASSETS-003)

### Billing (Module 11)
- [ ] Line-item computation across effective-dated rate change mid-period (Rule BILLING-002)
- [ ] Invoice number sequence: concurrent generation never produces duplicate (Rule BILLING-003)
- [ ] Overdue escalation across all three tiers (Rule BILLING-007)
- [ ] Client-role query isolation: never surfaces another client's invoice (Rule BILLING-006)

### Client (Module 12)
- [ ] Deployment-creation blocked for non-`ACTIVE` client (Rule CLIENT-001)
- [ ] Contract-expiry scheduled notification across all configured windows (Rule CLIENT-002)

### Vendor (Module 13)
- [ ] Goods receipt correctly triggers Inventory `STOCK_IN` vs. Asset registration based on line-item category (Rule VENDOR-002)
- [ ] Over-receipt validation and override flag (Rule VENDOR-002)

### ESS (Module 14)
- [ ] Self-scope enforcement: ESS user cannot read/write another employee's data (Rule ESS-001) — Domain-layer portion of this test; full Security Rule portion in Chapter 5
- [ ] Profile-field whitelist: bundled write with non-whitelisted field rejected (Rule ESS-002)
- [ ] Anonymous grievance: `employeeId` never exposed to non-assigned HR via any Domain-layer query path (Rule ESS-003)
- [ ] SLA auto-escalation including shortened harassment-category path (Rule ESS-004)

### Notifications (Module 15)
- [ ] `APPROVAL_REQUIRED`/`ALERT_ESCALATION` never suppressed regardless of mute config (Rule NOTIFICATIONS-003)
- [ ] Template rendering immutability: editing template post-send doesn't alter sent notification (Rule NOTIFICATIONS-002)

### Analytics (Module 16)
- [ ] Rollup computation logic across representative grouping scenarios (Rule ANALYTICS-001)
- [ ] Historical rollup never mutated in place, only appended-to (Rule ANALYTICS-005)

### Reports (Module 17)
- [ ] Report content matches source data exactly, no off-by-one date range errors (§17.9)

### Workflow Engine (Module 18)
- [ ] Generic `transition()` rejects undefined transitions across multiple differently-shaped workflow definitions (Rule WORKFLOW-001)
- [ ] Dual-write consistency: source-entity status field never disagrees with `workflowInstances.currentState` (Rule WORKFLOW-005)
- [ ] Definition-time validation rejects malformed dead-end-containing workflow definitions (Rule WORKFLOW-006)

### Approvals (Module 19)
- [ ] Multi-approver race: two approvers actioning simultaneously, exactly one succeeds (Rule APPROVALS-002)
- [ ] Badge counter accuracy under high-volume concurrent creation/actioning (Rule APPROVALS-006)

### AI (Module 20)
- [ ] Universal check: no code path writes `suggestedOutput` directly to an authoritative collection without human-actioned status transition (Rule AI-001)
- [ ] Low-confidence flagging UI-state logic (Rule AI-002)
- [ ] ESS assistant: cannot be prompted into any write action (Rule AI-007)

### Compliance (Module 21)
- [ ] Server-side floor enforcement rejects sub-statutory minimum wage configuration (Rule COMPLIANCE-002)
- [ ] PF/ESI applicability determination across representative wage/company-size scenarios, cross-validated against Payroll's consumption (Rule COMPLIANCE-006)

### Offline Sync (Module 22)
- [ ] Idempotent queue entry processing confirmed for every registered field (Rule OFFLINESYNC-002)
- [ ] Conflict-resolution strategy correctness per field classification (transaction vs. last-write-wins) (Rule OFFLINESYNC-004)

## 1.4 Unit Test Execution Gate

**Rule TEST-001:** Every checklist item above corresponds to a named test function in the codebase (per `MASTER_PROJECT_RULES.md` §14.2's backtick-descriptive-sentence naming convention) — a checklist item without a corresponding discoverable test is treated as an incomplete testing implementation, not merely a documentation gap, and blocks the Chapter 9 Production Checklist gate.

---

---

# CHAPTER 2: INTEGRATION TESTING CHECKLIST

## 2.1 Purpose and Scope

Per `MASTER_PROJECT_RULES.md` §13.2, integration tests run against the Firebase Emulator Suite, verifying Repository implementations correctly translate Domain calls into Firestore operations. This chapter enumerates the required emulator-backed test scenarios, organized around `MASTER_FIRESTORE_ARCHITECTURE.md`'s Transaction/Batch-Write Catalog (Chapter 13 of that document) and Security Rule Mapping (Chapter 16).

## 2.2 Transaction Integrity Tests (Full Catalog Cross-Reference)

Per `MASTER_FIRESTORE_ARCHITECTURE.md` §13.2's 12-row Transaction Catalog, every row requires a dedicated concurrency-simulation integration test:

- [ ] Leave balance deduction: 10 concurrent approval attempts against a balance sufficient for only 1, confirming exactly 1 succeeds
- [ ] Leave balance credit-back on cancellation: concurrent cancellation + new application racing
- [ ] Inventory stock decrement: concurrent issuance requests against limited stock (emulator-level, complementing the Domain-layer unit test in Chapter 1.3)
- [ ] Inventory stock increment: concurrent stock-in + issuance racing
- [ ] Invoice number sequence: 20 concurrent invoice-generation requests, confirming 20 unique sequential numbers with no gaps beyond expected cancellations
- [ ] PO number sequence: identical test shape to invoice numbering
- [ ] Payroll finalization lock: confirms all constituent Attendance records lock atomically, no partial-lock state achievable under simulated mid-transaction failure
- [ ] Asset reassignment: concurrent reassignment attempts, confirming exclusive-assignment guarantee holds
- [ ] Employee activation: simulated Cloud-Function partial failure (Auth creation succeeds, claims-setting fails), confirming compensating rollback leaves no orphaned Auth account
- [ ] Company onboarding: identical partial-failure rollback test shape
- [ ] Workflow state transition: concurrent transition attempts on the same instance, confirming exactly one succeeds
- [ ] Payroll minimum-wage floor validation: concurrent company-config update racing against a payroll-generation run

## 2.3 Batched Write Consistency Tests (Full Catalog Cross-Reference)

Per `MASTER_FIRESTORE_ARCHITECTURE.md` §13.3's 8-row Batch Catalog:

- [ ] Deployment creation + history entry: simulated mid-batch failure confirms neither document is left in a half-written state
- [ ] Leave approval + Attendance ON_LEAVE marking across multi-day range: confirms every date in range gets a correctly-marked record
- [ ] Shift swap approval: both employees' roster entries updated atomically, no partial-swap state achievable
- [ ] Inventory issuance ledger + denormalized holding record: consistency after the batch
- [ ] Invoice payment recording: payment history entry + invoice amount/status update consistency
- [ ] Approval action across multiple eligible approvers: all inbox entries correctly marked `ACTIONED`
- [ ] Notification dispatch + counter increment: counter always matches actual unread notification count post-batch
- [ ] Goods receipt: PO update + Inventory/Asset creation consistency

## 2.4 Security Rule Integration Tests (Cross-Reference `MASTER_FIRESTORE_ARCHITECTURE.md` Chapter 16)

Per that document's §16.7 mandatory coverage requirement, for **every** collection in the platform:

- [ ] Same-company, correctly-permissioned read/write succeeds
- [ ] Cross-company read/write denied regardless of permission level (the platform's single most critical test category)
- [ ] Same-company, insufficiently-permissioned write denied
- [ ] `companyId`-mutation attempt on every Pattern A collection denied
- [ ] Collection-specific special-case rules (§16.5 of that document) individually tested: anonymous-grievance field restriction, payroll-lock update rejection, sensitive-field masking, audit-log delete rejection across all 8 registry entries

## 2.5 Cache and Offline Reconciliation Integration Tests

- [ ] Firestore SDK offline persistence: simulated network-loss mid-write, confirming optimistic local write + eventual sync + correct final state
- [ ] Attendance geofence reconciliation: offline-accepted mark later flagged on sync per Chapter 6.6.2 of `MASTER_PROJECT_RULES.md`
- [ ] Inventory over-issuance-due-to-concurrent-offline-actions reconciliation surfacing to Store Manager correctly

## 2.6 Cloud Function Emulator Tests

Per `MASTER_API_CONTRACT.md` Chapter 1.4's complete function index, every one of the 20+ cataloged functions requires:
- [ ] Baseline auth check (`AUTH_UNAUTHENTICATED` correctly returned for unauthenticated calls)
- [ ] Permission check (`AUTH_PERMISSION_DENIED` correctly returned for authenticated-but-unauthorized calls)
- [ ] Company-mismatch rejection (`AUTH_COMPANY_MISMATCH`)
- [ ] Happy-path success response matching the documented contract shape exactly
- [ ] At least one documented error-code path per function's applicable scenarios (Chapter 5 of `MASTER_API_CONTRACT.md`)

---

---

# CHAPTER 3: UI TESTING CHECKLIST

## 3.1 Purpose and Scope

Per `MASTER_PROJECT_RULES.md` §13.2, UI/instrumented tests use Compose Testing APIs for component/screen-level behavior, plus a smaller set of end-to-end critical-journey tests. This chapter enumerates the required coverage against `MASTER_UI_UX_DESIGN_SYSTEM.md`'s component specifications.

## 3.2 Screen State Coverage (Every Screen, Universal Checklist)

Per `MASTER_PROJECT_RULES.md` §7.3's mandatory screen structure, every single screen in the platform requires a test confirming correct rendering of:
- [ ] Loading state (skeleton loader, per `MASTER_UI_UX_DESIGN_SYSTEM.md` §14.6)
- [ ] Empty state (`LsmEmptyState` with appropriate icon/message/action)
- [ ] Error state (`LsmErrorState` with Retry action, never a raw exception)
- [ ] Success/content state (real data rendering correctly)

## 3.3 Component-Level Test Checklist (Cross-Reference `MASTER_UI_UX_DESIGN_SYSTEM.md`)

- [ ] `LsmButton`: all four variants render correctly (Chapter 7.2); Loading state shows no layout shift and blocks double-tap (Rule DS-017); Disabled state shows correct 38% opacity and remains in layout
- [ ] `LsmTextField`: all three states (Focused, Error, Disabled) render correctly (Rule DS-021); validation timing fires on blur and submit, not on every keystroke (Rule DS-022)
- [ ] `LsmCard`: full-card tap target confirmed (never a sub-element-only tap zone) (Rule DS-019); 2-line/1-line truncation confirmed (Rule DS-020)
- [ ] `LsmConfirmDialog`: Destructive-styled confirm button, Cancel positioned first (Rule DS-024)
- [ ] `LsmStepper`: completed/current/future state indicators render correctly; back-navigation to completed step preserves data (Rule DS-023)
- [ ] Status chips: icon+color+text triad renders correctly for all six semantic statuses (Rule DS-009), verified additionally under a color-blindness simulation overlay

## 3.4 Critical End-to-End Journey Tests

- [ ] Login → Mark Attendance → View Confirmation (the platform's single most-executed real-world flow)
- [ ] Login → Apply Leave → Receive Approval Notification → View Updated Balance
- [ ] Login (Supervisor) → Approvals Inbox → Approve Leave Request → Confirm Badge Count Decrements
- [ ] Login (HR) → Generate Payroll → Review → Approve → Finalize → Confirm Payslips Generated
- [ ] Login (Client) → View Invoice → Approve Invoice
- [ ] Employee Onboarding: full multi-step form completion including document upload, confirming Activate succeeds only once all mandatory fields present (Rule EMPLOYEE-002)
- [ ] Deployment Creation → Shift Roster Assignment → Attendance Marking against that Deployment (full cross-module happy path)

## 3.5 Deep Link and Navigation Tests

- [ ] Every notification's `deepLinkRoute` (per `MASTER_DATABASE_DICTIONARY.md` §15.2) resolves to a fully-populated destination
- [ ] Deep link to a deleted/inaccessible entity shows the graceful fallback state, never a crash (`MASTER_UI_UX_DESIGN_SYSTEM.md` §10.5)
- [ ] Back-navigation from every non-top-level destination returns to the correct prior screen
- [ ] Bottom navigation / rail / drawer switch correctly per `WindowSizeClass` change (e.g., rotating a tablet)

## 3.6 Accessibility UI Tests (Cross-Reference `MASTER_UI_UX_DESIGN_SYSTEM.md` Chapter 15)

- [ ] TalkBack screen-reader pass on every screen: correct reading order, meaningful content descriptions
- [ ] 200% font scale rendering on every screen: no clipping/truncation
- [ ] 48dp/56dp touch target automated bounds check across every interactive composable (Rule DS-040)
- [ ] Reduced-motion system setting: all animations resolve to 0ms duration when enabled (Rule DS-039)

## 3.7 Responsive Layout UI Tests (Cross-Reference `MASTER_UI_UX_DESIGN_SYSTEM.md` Chapter 16)

Per that document's §16.6 testing matrix, every list-detail, dashboard, data-table, and form screen tested against:
- [ ] Compact (budget phone, standard phone)
- [ ] Medium (small tablet)
- [ ] Expanded (large tablet)
- [ ] Foldable folded and unfolded, including hinge-posture variants where applicable

## 3.8 Orientation and State Preservation Tests

- [ ] Every screen preserves scroll position, form input, and selected tab across rotation (Rule DS-043)
- [ ] Long-form autosave survives simulated process death (`MASTER_UI_UX_DESIGN_SYSTEM.md` Rule DS-025)

---

---

# CHAPTER 4: PERFORMANCE TESTING CHECKLIST

## 4.1 Purpose and Scope

Per `MASTER_PROJECT_RULES.md` Chapter 9's measurable performance targets, this chapter enumerates the specific benchmark tests validating each target, run via Jetpack Macrobenchmark against Firebase Test Lab's device matrix.

## 4.2 Benchmark Checklist Against Chapter 9 Targets

- [ ] Cold app start < 2.5s on Android Go-class/3GB RAM reference device
- [ ] Attendance mark round-trip (tap to optimistic confirmation) < 300ms
- [ ] List screen initial render < 1.5s for first page (25 items) on 3G-throttled network — tested for: Employee Directory, Attendance Register, Deployment Register, Payroll history
- [ ] Frame rendering: no dropped-frame jank spikes beyond Compose's recomposition budget during scroll of Employee Directory (largest realistic list, 500+ employee test dataset)
- [ ] APK/AAB size regression check against previous release's baseline
- [ ] Offline screen availability: 100% of previously-synced list/detail screens confirmed navigable with airplane mode enabled

## 4.3 Firestore Read-Cost Audit Checklist

- [ ] No N+1 query pattern: confirmed for every list screen against `MASTER_FIRESTORE_ARCHITECTURE.md`'s denormalization catalog (Chapter 5.7 of that document) — each denormalized field's presence verified to actually eliminate the corresponding lookup query
- [ ] Snapshot listener budget: confirmed 1-2 listeners per screen maximum, cross-referenced against the listener-budget table (`MASTER_FIRESTORE_ARCHITECTURE.md` §14.3)
- [ ] Every new composite index (Chapter 12 of that document, 76-entry catalog) verified present and actually used by its intended query via emulator query-plan inspection

## 4.4 Compose Performance Checklist

- [ ] `@Immutable`/`@Stable` annotations verified present on all list-row data classes (Employee, Attendance, Deployment row models)
- [ ] Heavy computation (payroll aggregation display, date-range filtering) confirmed running on `Dispatchers.Default`, never inline in composable bodies
- [ ] Image loading: list-row thumbnails confirmed downsampled, full-resolution only on explicit detail-view zoom

## 4.5 Network Efficiency Checklist

- [ ] Data Saver mode / metered-network detection confirmed gating large-file uploads/downloads (per `MASTER_API_CONTRACT.md` §9.6) while never gating wage/time-critical writes (Attendance, Approvals)
- [ ] Remote Config-tunable pagination page size and thumbnail resolution confirmed adjustable without app release

## 4.6 Battery Efficiency Checklist

- [ ] Geofenced attendance location access confirmed using `PRIORITY_BALANCED_POWER_ACCURACY`, not continuous high-accuracy polling
- [ ] Background WorkManager sync workers confirmed respecting `setRequiresBatteryNotLow(true)` for non-urgent sync operations (per `MASTER_BUSINESS_LOGIC.md` Rule OFFLINESYNC-007)

## 4.7 Performance Regression Gate

**Rule TEST-002:** Every Macrobenchmark test in this chapter runs in CI on every merge to `main` against the low-end device profile (`MASTER_PROJECT_RULES.md` §9.7), with a defined regression tolerance (e.g., cold-start time may not regress more than 10% from the previous release's baseline) — a PR exceeding this tolerance is blocked from merge pending investigation, consistent with the "if it isn't tested, it isn't verified" philosophy applied specifically to performance, where regressions are otherwise easy to introduce incrementally without any single change appearing individually significant.

## 4.8 Production Data-Volume Testing

- [ ] Full test suite re-run against a realistic-scale seeded dataset (500 employees, 90 days attendance history, per `MASTER_PROJECT_RULES.md` §13.8's UAT data-volume standard) rather than toy-scale data, confirming pagination/performance targets hold at genuine scale, not just against a handful of test records that would mask N+1 or unindexed-query problems invisible at small scale.

---

---

# CHAPTER 5: SECURITY TESTING CHECKLIST

## 5.1 Purpose and Scope

Per `MASTER_PROJECT_RULES.md` §13.6, this chapter enumerates static analysis, penetration-style adversarial testing, and dependency scanning requirements, cross-referencing `MASTER_SECURITY_FRAMEWORK.md`'s complete threat model.

## 5.2 Static Analysis Checklist

- [ ] `detekt` custom rule: no hardcoded secrets anywhere in the codebase
- [ ] `detekt` custom rule: no disabled SSL/TLS verification (`TrustManager`/`HostnameVerifier` override scan, `MASTER_SECURITY_FRAMEWORK.md` §5.2)
- [ ] `detekt` custom rule: no direct Firebase SDK calls outside `:data` module
- [ ] `detekt` custom rule: no raw `Color(0x...)` literals outside `:core:designsystem`
- [ ] `detekt` custom rule: no raw spacing `.dp` literals outside `:core:designsystem`
- [ ] Static scan confirms `setCustomUserClaims()` called from exactly one Cloud Function pair (`onUserProvision`/`onUserRoleChange`) — no other call site exists (`MASTER_SECURITY_FRAMEWORK.md` Rule MSF-001)

## 5.3 Cross-Tenant Isolation Adversarial Test Suite (Highest-Priority Category)

Per `MASTER_PROJECT_RULES.md` §11.5.1/§11.5.2, run as a release-blocking gate:
- [ ] Every collection in the platform (per `MASTER_FIRESTORE_ARCHITECTURE.md` Chapter 2's full collection map) tested for cross-company read denial
- [ ] Every collection tested for cross-company write denial
- [ ] Every collection tested for cross-company query/enumeration denial (a user cannot discover another company's document IDs via a crafted query)
- [ ] Collection-group query exceptions (the 3 sanctioned server-side-only cases, `MASTER_FIRESTORE_ARCHITECTURE.md` §12.3 Rule FSA-018) confirmed genuinely inaccessible to any client-facing code path

## 5.4 Adversarial Privilege Escalation Tests

- [ ] Attempt to forge a `companyId` in a Cloud Function request payload — confirmed rejected via `AUTH_COMPANY_MISMATCH` (`MASTER_API_CONTRACT.md` §4.6)
- [ ] Attempt to write to `users/{uid}.companyId`/`.role` directly from client — confirmed rejected (whitelist enforcement, `MASTER_FIRESTORE_ARCHITECTURE.md` §4.6)
- [ ] Attempt to craft a Security Rule bypass via a nested/adjacent field write bundled with a legitimate whitelisted field — confirmed rejected (ESS Rule ESS-002 pattern)
- [ ] Attempt to modify `companyId` on an existing Pattern A document via update — confirmed rejected across all 20 Pattern A collections

## 5.5 Authentication Security Tests

- [ ] Account lockout: confirmed triggers at exactly 5 failed attempts, confirmed 30-minute lock duration
- [ ] MFA bypass attempt: confirmed `mfaEnrolled` flag cannot be client-set (`MASTER_SECURITY_FRAMEWORK.md` Rule MSF-007)
- [ ] Session revocation: confirmed revoked device's next API call rejected, confirmed all-sessions-invalidated behavior communicated correctly in UI (Rule MSF-010)
- [ ] App Check enforcement: confirmed requests from a non-attested client (simulated via debug-provider-token mismatch) rejected in production-mode configuration

## 5.6 Encryption Verification Tests

- [ ] Confirmed `bankAccountNumber`/`aadhaarNumber`/`panNumber` never appear in plaintext in any Firestore document (application-level encryption verification, `MASTER_SECURITY_FRAMEWORK.md` §5.4)
- [ ] Confirmed masked display (`XXXX1234` pattern) renders correctly for users lacking `employees.viewSensitive`
- [ ] Confirmed unmasked value never transmitted to a client lacking the permission, verified via network-traffic inspection during testing, not merely UI-display inspection

## 5.7 Threat Detection Rule Verification

Per `MASTER_SECURITY_FRAMEWORK.md` §9.2's 6-rule catalog:
- [ ] Credential stuffing threshold triggers correctly at the defined rate
- [ ] Privilege escalation attempt detection triggers `ALERT_ESCALATION` to Super Admin specifically (not just Company Admin)
- [ ] Rooted/tampered device simulation confirms hard-block at App Check layer before reaching Firestore
- [ ] Impossible-travel simulation confirms forced re-auth + MFA challenge (not a hard block)

## 5.8 Dependency Vulnerability Scanning

- [ ] Gradle dependency-check plugin run confirms no unresolved critical/high CVEs in any dependency
- [ ] Cloud Functions Node.js/TypeScript dependencies scanned via `npm audit` equivalent, no unresolved critical/high findings

## 5.9 Data Protection Compliance Tests

- [ ] Data Subject Erasure Request process tested end-to-end against a test employee record, confirming correct field-by-field erasure-vs-legal-retention-override determination (`MASTER_SECURITY_FRAMEWORK.md` §10.4)
- [ ] Confirmed no third-party data sharing exists beyond the documented Google AI Studio integration (network-traffic audit during a full app-usage test pass)

---

---

# CHAPTER 6: OFFLINE TESTING CHECKLIST

## 6.1 Purpose and Scope

Per `MASTER_PROJECT_RULES.md` §13.4, offline behavior is a first-class testing category given Offline-First is a foundational principle (§1.4 of that document). This chapter enumerates the required offline-simulation test scenarios.

## 6.2 Core Offline Flow Tests (Top Five Most-Used Flows)

Per `MASTER_PROJECT_RULES.md` §13.4's explicit requirement, each tested under simulated "airplane mode for N minutes mid-task":
- [ ] Attendance marking: airplane mode enabled immediately after tap, confirming optimistic UI, correct Sync Status Indicator progression, and correct final synced state upon reconnection
- [ ] Leave application: drafted offline, queued, confirming server-side overlap/balance validation correctly resolves upon sync (may reject if balance changed while offline — confirmed this rejection surfaces clearly, not silently)
- [ ] Deployment check (viewing current deployment status): confirmed fully browsable offline via Room cache with correct "last synced at" indicator
- [ ] Approval action: confirmed requires connectivity per design (`MASTER_BUSINESS_LOGIC.md` §19.8), UI clearly communicates this rather than allowing a queued-but-unvalidated approval
- [ ] Payslip view: confirmed previously-synced payslips viewable fully offline

## 6.3 Deterministic-ID Idempotency Tests (Cross-Reference `MASTER_FIRESTORE_ARCHITECTURE.md` §14.5)

For every collection in that document's deterministic-ID registry:
- [ ] `attendanceRecords`: repeated offline-retry produces exactly one record, never a duplicate
- [ ] `employees/{id}/leaveBalances`: repeated write produces correct upsert, no duplicate balance documents
- [ ] `payrollRuns/{id}/payslips`: repeated payroll-generation retry overwrites draft correctly, no duplicate payslips
- [ ] `inventoryItems/{id}/stockByLocation`: repeated write produces correct upsert
- [ ] `announcements/{id}/acknowledgements`: repeated offline-retry acknowledgement produces exactly one record

## 6.4 Sync Status Indicator Tests

- [ ] Confirmed present on every screen identified as offline-capable per each `MASTER_BUSINESS_LOGIC.md` module's own §X.7/X.8 Offline Behavior specification — a cross-cutting audit test enumerating every such screen
- [ ] Confirmed transitions correctly through `Synced`/`Pending`/`Failed` states
- [ ] Confirmed `FAILED_PERMANENT` state surfaces a persistent, actionable, non-silent alert (`MASTER_BUSINESS_LOGIC.md` Rule OFFLINESYNC-002)

## 6.5 Conflict Resolution Tests

Per `MASTER_BUSINESS_LOGIC.md` Rule OFFLINESYNC-004's field-classification registry:
- [ ] Transaction-based fields (Inventory stock, Leave balance, Payroll figures): concurrent-write test confirms no lost update
- [ ] Last-write-wins fields (Employee's own contact details, notification read-state, announcement acknowledgement): concurrent-write test confirms the expected, acceptable-per-classification outcome

## 6.6 Extended Offline Period Tests

- [ ] Multi-hour offline period (not just seconds) followed by reconnection: confirms full `pending_write_queue` drains correctly in priority order (`MASTER_BUSINESS_LOGIC.md` Rule OFFLINESYNC-003) with no data loss
- [ ] App process death during an extended offline period: confirms queue persists (Room-backed) and resumes correctly on next app launch

## 6.7 Priority Ordering Verification

- [ ] Simulated backlog containing Attendance + Grievance + Inventory + Leave + Announcement-acknowledgement entries simultaneously: confirms sync processes in the documented priority order (Attendance highest, Announcement-acknowledgement lowest, `MASTER_BUSINESS_LOGIC.md` Rule OFFLINESYNC-003)

## 6.8 Battery/Metered-Network Constraint Tests

- [ ] Confirms non-urgent sync operations respect `setRequiresBatteryNotLow`/metered-network user preference
- [ ] Confirms wage/time-critical operations (Attendance, Grievance submission) never gated behind these preferences regardless of battery/network state

---

---

# CHAPTER 7: REGRESSION TESTING CHECKLIST

## 7.1 Purpose and Scope

Per `MASTER_PROJECT_RULES.md` §13.7, this chapter specifies the smoke-test suite (every merge) and full regression suite (nightly/pre-release) composition.

## 7.2 Smoke Test Suite (Every Merge to `main`, Build-Blocking)

- [ ] Login (all 4 role-graph entry points: Admin, Supervisor, ESS, Client)
- [ ] Attendance mark (self and proxy)
- [ ] Leave apply → approve happy path
- [ ] Approval action from Approvals Inbox
- [ ] Payroll view (payslip access, not full generation — generation is in full regression only given its complexity/duration)
- [ ] Dashboard load for each of the 4 role graphs
- [ ] Cross-tenant isolation spot-check (a fast subset of Chapter 5.3's full suite, not the exhaustive version)

## 7.3 Full Regression Suite (Nightly + Pre-Release, Complete Coverage)

- [ ] Every scenario in Chapter 1 (Unit Testing Checklist) — full suite run
- [ ] Every scenario in Chapter 2 (Integration Testing Checklist) — full suite run
- [ ] Every scenario in Chapter 3 (UI Testing Checklist) — full suite run
- [ ] Every scenario in Chapter 5.3 (full Cross-Tenant Isolation Adversarial Suite, exhaustive version)
- [ ] Full payroll cycle: generate → adjust → approve → finalize → verify Attendance lock → verify payslip generation
- [ ] Full billing cycle: deployment/attendance data → generate invoice → internal approve → client approve → payment recording → status transitions
- [ ] Full offboarding cycle: employee termination → cascade verification (Deployment end, Auth disable, device flag, payroll flag, asset/inventory recovery flagging) → Full & Final settlement in next payroll run

## 7.4 Regression Test Data Management

**Rule TEST-003:** The regression suite runs against a dedicated, version-controlled seed dataset (distinct from the UAT realistic-scale dataset, Chapter 4.8) — a smaller, precisely-crafted dataset covering every documented edge case (e.g., an employee mid-leave, a deployment ending mid-payroll-period, an overlapping shift scenario) rather than random/generated data, ensuring regression failures are deterministic and reproducible rather than flaky due to data-dependent variance.

## 7.5 Cross-Document Consistency Regression Checks

Given the platform's extensive cross-module denormalization (`MASTER_FIRESTORE_ARCHITECTURE.md` §5.7's propagation table and equivalents across other chapters), the full regression suite includes:
- [ ] Employee name change → confirms propagation to all referencing collections (`attendanceRecords`, `leaveRequests`, `deployments`) within the expected Cloud Function trigger latency
- [ ] Site name change → confirms propagation to `attendanceRecords`, `deployments`
- [ ] Leave type name change → confirms propagation to `leaveRequests`

## 7.6 Release Candidate Gate

**Rule TEST-004:** No release candidate build proceeds to `MASTER_PLAYSTORE_RELEASE.md`'s release checklist without a green full-regression-suite run against that exact build — a regression suite run against an earlier commit is not accepted as sufficient verification for a later commit, even if the intervening changes seem unrelated, since cross-module coupling in a platform this interconnected makes "seems unrelated" an unreliable judgment to rely on without actual verification.

---

---

# CHAPTER 8: UAT CHECKLIST

## 8.1 Purpose and Scope

Per `MASTER_PROJECT_RULES.md` §13.8, UAT is structured, persona-based manual testing that automated tests cannot fully substitute for, given the field-conditions nature of LSM's primary users. This chapter specifies the persona-by-persona sign-off checklist.

## 8.2 UAT Environment Requirements

- [ ] Staging environment seeded with realistic data volume: 500 employees, 90 days attendance history (`MASTER_PROJECT_RULES.md` §13.8)
- [ ] Test devices representative of actual field-usage conditions: at least one budget/Android-Go-class device, tested outdoors in direct sunlight
- [ ] Test devices with intermittent/throttled connectivity simulation, not only Wi-Fi/lab-perfect connectivity

## 8.3 Persona-Based UAT Checklist

### Super Admin Persona
- [ ] Onboard a new company end-to-end via the wizard
- [ ] Suspend and reactivate a company subscription
- [ ] Cross-company data access with audit-trail confirmation
- [ ] Platform health dashboard review

### Company Admin Persona
- [ ] Configure company settings, branding, leave policy defaults
- [ ] Approve a high-value Deployment
- [ ] Approve a Payroll run
- [ ] MFA enrollment and recovery flow
- [ ] Review Security Monitoring dashboard

### HR Manager Persona
- [ ] Full employee onboarding including document upload and verification
- [ ] Process a full payroll cycle including manual payslip adjustment
- [ ] Handle a grievance end-to-end (including one anonymous grievance)
- [ ] Generate a statutory report (Form A Muster Roll)
- [ ] Manage a compliance license renewal

### Operations Manager Persona
- [ ] Create a deployment, assign shift roster
- [ ] Handle a shift swap approval
- [ ] Review Deployment Register and staffing gap alerts
- [ ] Raise and track a Purchase Order through goods receipt

### Supervisor Persona (Field-Conditions Testing Priority)
- [ ] Mark proxy attendance for site employees, outdoors, in direct sunlight, on a budget device
- [ ] Handle a geofence-override review
- [ ] Approve a leave request from the Approvals Inbox
- [ ] Use the app under airplane-mode-simulated poor connectivity for a full shift's worth of interactions

### Employee/ESS Persona (Field-Conditions Testing Priority)
- [ ] Mark self-attendance under real outdoor conditions
- [ ] Apply for leave, view balance
- [ ] View payslip
- [ ] Submit a grievance (both named and anonymous)
- [ ] Acknowledge a required announcement
- [ ] Interact with the ESS conversational assistant for a policy question

### Client Persona
- [ ] View deployment status for own sites only (confirm no cross-client leakage visible)
- [ ] Review and approve an invoice
- [ ] Raise a dispute on an invoice

### Accounts/Billing Persona
- [ ] Generate and approve an invoice
- [ ] Record a partial payment, confirm status remains correctly `APPROVED`/`OVERDUE` until fully paid
- [ ] Review Overdue escalation

### Vendor/Store Manager Persona
- [ ] Issue and return inventory items
- [ ] Process a write-off
- [ ] Register and assign an asset, log a maintenance record

## 8.4 UAT Sign-Off Requirements

**Rule TEST-005:** Per `MASTER_PROJECT_RULES.md` §13.8, UAT is not considered complete until every persona's checklist above has been manually exercised and explicitly signed off by a designated reviewer (a named individual, not merely "the QA team" as an undifferentiated group) — sign-off is recorded with the reviewer's name, date, and any noted issues (even minor/cosmetic) that were either fixed before sign-off or explicitly deferred with a documented reason and follow-up ticket.

## 8.5 UAT Issue Severity Classification

| Severity | Definition | Release Impact |
|---|---|---|
| Blocker | Data loss, security vulnerability, financial calculation error | Must fix before release, no exceptions |
| Critical | Core workflow broken, no workaround | Must fix before release |
| Major | Workflow degraded but workaround exists | Fix before release strongly preferred; deferred only with Company/Product stakeholder sign-off |
| Minor | Cosmetic, non-blocking | May be deferred to next release with a tracked ticket |

---

---

# CHAPTER 9: PRODUCTION CHECKLIST (FINAL CONSOLIDATED GATE)

## 9.1 Purpose

This final chapter is the single master gate consolidating every checklist across Chapters 1-8 of this document with `MASTER_PROJECT_RULES.md` §18's Production Checklist — the literal, final artifact checked off before any release is declared production-ready, per this platform's zero-tolerance standard for shipping incomplete work (`MASTER_PROJECT_RULES.md` §2.2).

## 9.2 Master Gate Checklist

- [ ] **Chapter 1 (Unit Testing):** ≥ 90% Domain layer coverage confirmed, every module's checklist items (§1.3) have a corresponding discoverable test (Rule TEST-001)
- [ ] **Chapter 2 (Integration Testing):** All 12 transaction tests, 8 batch-write tests, full Security Rule coverage matrix, all Cloud Function emulator tests green
- [ ] **Chapter 3 (UI Testing):** Every screen's 4-state coverage confirmed, all 7 critical end-to-end journeys green, full accessibility suite green, full responsive-layout matrix green
- [ ] **Chapter 4 (Performance Testing):** All benchmark targets met with no regression beyond tolerance, production-data-volume re-run confirmed
- [ ] **Chapter 5 (Security Testing):** Full cross-tenant isolation adversarial suite green (release-blocking, zero exceptions), all privilege-escalation tests green, dependency scan clean
- [ ] **Chapter 6 (Offline Testing):** All 5 core flows verified under simulated connectivity loss, all idempotency tests green
- [ ] **Chapter 7 (Regression Testing):** Full regression suite green against the exact release-candidate build (Rule TEST-004)
- [ ] **Chapter 8 (UAT):** All 9 personas signed off by named reviewers, zero unresolved Blocker/Critical issues, all Major issues either fixed or explicitly stakeholder-approved for deferral

## 9.3 Cross-Reference to Module-Level Production Checklist

Per `MASTER_PROJECT_RULES.md` §18.2, every one of the 22 `MASTER_BUSINESS_LOGIC.md` modules additionally requires its own Module-Level Production Checklist pass (Functional Completeness, Data & Firestore, Security, UI/UX, Offline, Notifications & Workflow, Performance, Testing, Reports & Exports subsections) — this document's Chapters 1-8 provide the *testing execution* substance underlying that checklist's "Testing" subsection specifically, while the other subsections (Functional Completeness, etc.) are verified against their respective governing documents directly (`MASTER_BUSINESS_LOGIC.md` for functional completeness, `MASTER_FIRESTORE_ARCHITECTURE.md` for Data & Firestore, etc.).

## 9.4 Platform-Level Release Checklist Cross-Reference

Per `MASTER_PROJECT_RULES.md` §18.3, the Platform-Level (Pre-GA/Major Release) Checklist additionally requires: full regression suite (this document's Chapter 7), cross-tenant isolation suite (this document's Chapter 5.3), dependency vulnerability scan (this document's Chapter 5.8), Performance Monitoring dashboard review, documentation-sync verification, Semantic Versioning compliance, `MASTER_PLAYSTORE_RELEASE.md` checklist completion (the next document in this series), disaster-recovery verification (`MASTER_SECURITY_FRAMEWORK.md` Chapter 11.4), and AI Self Verification (`MASTER_PROJECT_RULES.md` Chapter 19).

## 9.5 Sign-Off Authority (Restated)

Per `MASTER_PROJECT_RULES.md` §18.4: no release-blocking module (Payroll, Billing, Security/Auth) is marked Production Ready without three independent sign-offs — engineering lead (Module-Level Checklist), security reviewer (Security subsection independently), and UAT reviewer (persona-based manual testing, this document's Chapter 8) — a single individual self-certifying all three is insufficient, and this document's checklists are the literal artifacts each of those three reviewers works through.

## 9.6 Final Pre-Release Declaration

**Rule TEST-006:** A release is declared "Production Ready" only when every checkbox across this entire document (Chapters 1-9) is checked, every module's `MASTER_PROJECT_RULES.md` §18.2 checklist is checked, and the Platform-Level §18.3 checklist is checked — this is a literal, exhaustive, zero-ambiguity gate, not a subjective "feels ready" judgment call, directly implementing the Project Overview's foundational instruction: "Everything must be Production Ready."

---

# END OF DOCUMENT — MASTER_TESTING_CHECKLIST.md

This document is now **complete** across all 9 chapters:

1. Unit Testing Checklist
2. Integration Testing Checklist
3. UI Testing Checklist
4. Performance Testing Checklist
5. Security Testing Checklist
6. Offline Testing Checklist
7. Regression Testing Checklist
8. UAT Checklist
9. Production Checklist (Final Consolidated Gate)

**Document Version:** 1.0 — Final
**Governed By:** `MASTER_PROJECT_RULES.md` (Chapters 13, 18), and cross-referenced against every prior Master Document's own testing requirements
**Status:** Ready to serve as the authoritative, checkable QA gate for every LSM release.

----------------------------------------
DOCUMENT:
MASTER_TESTING_CHECKLIST.md

STATUS:
✅ DOCUMENT COMPLETE — ALL 9 CHAPTERS FINISHED

NEXT STEP:
Type "NEXT DOCUMENT" to begin MASTER_PLAYSTORE_RELEASE.md
----------------------------------------
