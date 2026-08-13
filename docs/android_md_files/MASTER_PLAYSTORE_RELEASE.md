# MASTER_PLAYSTORE_RELEASE.md
## Log Sheet Muster (LSM) — Play Store Release Reference

**Document Classification:** Official Release & Distribution Reference
**Governed By:** `MASTER_PROJECT_RULES.md` (Chapters 2, 15), `MASTER_TESTING_CHECKLIST.md` (Chapter 9 — Production Checklist gate)
**Purpose:** This document is the authoritative reference for taking a Production-Ready build (per `MASTER_TESTING_CHECKLIST.md`'s gate) through to actual Google Play Store distribution — build artifacts, signing, store listing content, legal/compliance disclosures, and rollout strategy.

---

# TABLE OF CONTENTS

1. Android Release Build Process (APK/AAB)
2. App Signing
3. Versioning *(upcoming)*
4. Play Store Listing *(upcoming)*
5. Privacy Policy *(upcoming)*
6. Terms of Service *(upcoming)*
7. Data Safety Section *(upcoming)*
8. Release Checklist *(upcoming)*
9. Rollout Strategy *(upcoming)*

---

# CHAPTER 1: ANDROID RELEASE BUILD PROCESS (APK/AAB)

## 1.1 Purpose

This chapter specifies the build artifact strategy — what gets built, how, and why — for every LSM release, extending `MASTER_PROJECT_RULES.md` §15's folder structure and CI/CD discipline into the release-specific build pipeline.

## 1.2 Android App Bundle (AAB) as Primary Distribution Format

**Rule REL-001:** LSM is distributed to the Play Store exclusively as an **Android App Bundle (.aab)**, never a universal APK — Google Play's App Bundle format enables Play Feature Delivery and device-specific APK generation (smaller download sizes per device configuration), directly supporting the size-consciousness required for LSM's budget-device-heavy target user base (`MASTER_PROJECT_RULES.md` §9.2's device-fleet consideration).

## 1.3 Dynamic Feature Modules (Play Feature Delivery)

Per `MASTER_PROJECT_RULES.md` §9.2's size-budget note ("Super Admin console not shipped to field-only installs where technically separable"), LSM uses Play Feature Delivery to modularize:

| Module | Delivery Type | Rationale |
|---|---|---|
| Base module (Auth, core navigation, Employee/Attendance/Leave — the modules every role needs) | Install-time (always included) | Core functionality no user can function without |
| `:feature:superadmin` | Conditional delivery (installed only for accounts with `superAdmin` custom claim) | Zero field-employee installs ever download Super Admin Console code, directly reducing APK size for the vast majority of the user base |
| `:feature:analytics`, `:feature:reports` (the heavier, chart-library-dependent modules) | On-demand delivery (downloaded on first navigation to these sections) | Reduces initial install size for field-employee-role users who may never navigate to Analytics dashboards |

**Rule REL-002:** Every dynamic feature module's inclusion/exclusion logic is tested as part of the Chapter 3 (`MASTER_TESTING_CHECKLIST.md`) UI test suite — specifically, a test confirming an Employee-role account's app never triggers a Super Admin module download, both for the size-savings rationale and as a defense-in-depth security measure (even though Security Rules independently prevent an Employee-role account from *using* Super Admin functionality, not shipping the code at all is a stronger guarantee than merely gating its use).

## 1.4 Build Variant Matrix

| Variant | Purpose | Firebase Project | Signing Config |
|---|---|---|---|
| `debug` | Local development | `lsm-dev` | Debug keystore (auto-generated, not versioned) |
| `staging` | QA/UAT builds | `lsm-staging` | Internal release keystore (Chapter 2.3) |
| `release` | Production Play Store builds | `lsm-prod` | Production keystore (Chapter 2.2) |

**Rule REL-003:** Each build variant's `google-services.json` (Firebase project configuration) is variant-specific and never cross-wired — a `staging`-variant build accidentally pointing at `lsm-prod` (or vice versa) is treated as a release-blocking defect given the severe consequence of, for example, a QA tester's test data writes landing in the production database, directly violating `MASTER_PROJECT_RULES.md` §13.9.1's test-data-governance rule.

## 1.5 ProGuard/R8 Code Shrinking and Obfuscation

**Rule REL-004:** Release builds enable R8 full-mode code shrinking, obfuscation, and resource shrinking — reducing APK/AAB size (again serving the budget-device size-consciousness goal) and providing a baseline layer of reverse-engineering resistance for the compiled code, though this is explicitly **not** treated as a security control in itself (per `MASTER_PROJECT_RULES.md` §11's "never trust the client" principle — obfuscation raises the effort bar for casual inspection but is never relied upon as an actual security boundary, which remains entirely server-side via Security Rules and Cloud Functions).

## 1.6 Build Reproducibility

**Rule REL-005:** Every release build is produced exclusively via the CI/CD pipeline (never a manually-triggered local build promoted to production), with the exact Git commit SHA, dependency lock-file state, and build environment captured in the build's metadata — ensuring any production build can be exactly reproduced from source for auditing or debugging purposes, directly extending `MASTER_PROJECT_RULES.md` §13.9's environment-discipline principle to the build-artifact-provenance dimension specifically.

---

# CHAPTER 2: APP SIGNING

## 2.1 Purpose

App signing is a one-way door — losing control of a signing key permanently compromises the ability to publish updates under the app's existing identity. This chapter specifies LSM's signing key management, built around Google Play App Signing for maximum safety.

## 2.2 Google Play App Signing (Mandatory)

**Rule REL-006:** LSM enrolls in **Google Play App Signing** — Google holds and manages the actual app signing key used for the final distributed APK, while LSM's development team holds only an **upload key** used to sign the AAB submitted to Play Console, which Google then re-signs with the true app signing key before distribution. This is mandatory, not optional, since it provides a critical safety net: if the upload key is ever compromised or lost, Google Play Console's key-reset process can issue a new upload key without requiring users to reinstall under a new app identity — a catastrophic-failure-recovery capability unavailable if the team self-manages the actual app signing key directly.

## 2.3 Upload Key Management

- **Generation:** The upload keystore is generated once, via `keytool`, with a validity period of 25+ years (Google's recommended minimum for signing keys, avoiding any future forced-migration scenario due to key expiry).
- **Storage:** The upload keystore file and its passwords are stored in Google Cloud Secret Manager (the same infrastructure already established for encryption key management, `MASTER_SECURITY_FRAMEWORK.md` §5.5) — never committed to the Git repository, never stored in plaintext in CI/CD configuration, accessed by the CI/CD pipeline via a scoped service account with access to this specific secret only.
- **Backup:** A secure, offline backup of the upload keystore exists (per Google's own strong recommendation), stored in a location accessible to at least two authorized senior engineering personnel independently, preventing a single-point-of-failure/single-person-departure risk to the team's ability to publish future updates.

## 2.4 Signing Key Rotation

**Rule REL-007:** Should the upload key ever be suspected compromised, the Play Console upload-key-reset process is initiated immediately (requiring identity verification with Google), and a new upload keystore is generated following the identical §2.3 process — this is a rare, exceptional-circumstance procedure, not a routine rotation, since Google Play App Signing's architecture (§2.2) means routine upload-key rotation provides limited additional security benefit relative to its operational disruption risk, unlike, for example, the application-level encryption key rotation specified in `MASTER_SECURITY_FRAMEWORK.md` §5.5 which follows a scheduled cadence.

## 2.5 Play Integrity API Dependency

**Rule REL-008:** Correct app-signing configuration is a hard prerequisite for `MASTER_PROJECT_RULES.md` §5.7's Play Integrity API-based App Check enforcement — Play Integrity verdicts are computed partly based on confirming the requesting app's signature matches Google Play's records for the legitimate app listing, meaning a signing misconfiguration wouldn't just risk store-submission rejection but would actively break the platform's App Check security layer for all users, making this chapter's correctness a security-critical concern, not merely a release-logistics one.

## 2.6 Debug Build Signing Isolation

**Rule REL-009:** Debug-variant builds (§1.4) use Android Studio's auto-generated debug keystore, which is explicitly excluded from version control (`.gitignore`) and never used for any build variant beyond local development — a debug-signed build is structurally incapable of being uploaded to Play Console (Google Play rejects debug-signed uploads), providing an additional structural safeguard against an accidental debug-build release beyond the CI/CD-pipeline-only rule established in §1.6.

---

---

# CHAPTER 3: VERSIONING

## 3.1 Purpose

This chapter specifies the concrete Android `versionCode`/`versionName` implementation of the Semantic Versioning discipline already established in `MASTER_PROJECT_RULES.md` §2.5, resolving the well-known tension between SemVer's human-readable `MAJOR.MINOR.PATCH` and Android's requirement for a strictly-increasing integer `versionCode`.

## 3.2 versionName (Human-Readable, User-Facing)

Directly follows `MASTER_PROJECT_RULES.md` §2.5: `MAJOR.MINOR.PATCH` (e.g., `2.4.1`) — visible to users in Play Store listing and in-app Settings/About screen, and referenced throughout this document set's other chapters (e.g., `MASTER_API_CONTRACT.md` §1.3's function versioning discussion).

## 3.3 versionCode (Machine-Readable, Strictly Increasing)

**Rule REL-010:** `versionCode` is computed deterministically from `versionName` via the formula: `versionCode = MAJOR * 1_000_000 + MINOR * 1_000 + PATCH`, e.g., `versionName "2.4.1"` → `versionCode 2_004_001`. This formula guarantees strict monotonic increase as long as `MAJOR.MINOR.PATCH` itself only ever increases (which `MASTER_PROJECT_RULES.md` §2.5's versioning discipline already guarantees), while remaining human-derivable — an engineer can look at a `versionCode` in a crash report and immediately reconstruct the corresponding `versionName` without needing a lookup table, a debugging-convenience property a purely-sequential build-counter-based `versionCode` scheme would lack.

**Rule REL-011:** The formula's per-component multipliers (1,000,000 / 1,000 / 1) cap `MINOR` and `PATCH` at 999 each before requiring a `MAJOR` bump — considered acceptable headroom given the platform's realistic release cadence (even a highly active PATCH-release cadence of weekly hotfixes would take ~19 years to exhaust 999 patches within a single MAJOR/MINOR combination), documented here explicitly so a future engineer encountering this constraint understands it's a deliberate, sized-for-realistic-use decision rather than an arbitrary limitation.

## 3.4 Version Bump Decision Table (Restated and Applied)

Per `MASTER_PROJECT_RULES.md` §2.5, applied concretely to release-decision-making:

| Change Type | Version Component | Example |
|---|---|---|
| Firestore schema breaking change, removed feature, major architecture change | MAJOR | `2.4.1` → `3.0.0` |
| New module/feature added (e.g., a new business logic module beyond the 22 currently specified) | MINOR | `2.4.1` → `2.5.0` |
| Bug fix, non-breaking dependency update, performance improvement | PATCH | `2.4.1` → `2.4.2` |

## 3.5 Pre-Release Version Suffixes (Internal, Not Shipped)

For internal `staging`-variant builds (Chapter 1.4), a build-metadata suffix is appended for traceability without affecting the release `versionCode`/`versionName` scheme: e.g., `2.5.0-rc1+a3f1c9d` (release-candidate number + short Git SHA) — this suffix is stripped entirely for the actual `release`-variant Play Store submission, ensuring the public-facing version identity remains clean per §3.2/3.3 while internal QA tracking retains full build provenance.

## 3.6 Minimum Supported Android Version Policy

**Rule REL-012:** `minSdkVersion` is reviewed annually (not per-release) against current Android version-distribution data and Google Play's own minimum-API-level policy requirements — a deliberately infrequent review cadence (versus per-release) since raising `minSdkVersion` cuts off some existing users' ability to receive updates, a decision with real field-workforce-access consequences (a security guard with an older, employer-issued device losing app-update access is a meaningfully different cost than a consumer-app user on a personal device) warranting more deliberate, less frequent reconsideration than routine feature/bug-fix release cadence.

## 3.7 Version Deprecation Communication

**Rule REL-013:** When a `minSdkVersion` increase is planned, affected users (determinable via Firebase Analytics device-OS-version data, or more directly via each user's own `devices` subcollection `osVersion` field, `MASTER_FIRESTORE_ARCHITECTURE.md` §4.3) receive advance in-app notice (minimum 60 days) before the cutoff release ships, giving Company Admins time to plan device upgrades for affected field employees — never a silent cutoff where a user simply stops receiving updates with no prior warning, consistent with the platform-wide non-silent-failure principle (`MASTER_PROJECT_RULES.md` §2.2) extended here to the release-lifecycle dimension.

---

---

# CHAPTER 4: PLAY STORE LISTING

## 4.1 Purpose

This chapter specifies the store-listing content strategy and asset requirements — the platform's public-facing storefront presence, which for a B2B enterprise app like LSM serves a different function than a consumer-app listing (informing prospective enterprise customers and confirming legitimacy for existing customers' employees searching for the app, rather than driving organic consumer discovery/conversion).

## 4.2 App Listing Metadata

| Field | Content Strategy |
|---|---|
| App Title | "Log Sheet Muster - Workforce Manager" (includes both the product name and a clear functional descriptor, since "Log Sheet Muster" alone may not be immediately self-explanatory to a first-time searcher) |
| Short Description (80 chars) | Concise value proposition emphasizing attendance, payroll, and compliance for field workforces |
| Full Description | Structured with clear sections: Who it's for (security agencies, facility management, etc.), Key capabilities (Attendance, Leave, Payroll, Deployment, Compliance), Offline-first callout (a genuine differentiator worth surfacing prominently), and a clear statement that this is company-provisioned software (not self-service signup), managing prospective-user expectations correctly |
| Category | Business |
| Content Rating | Rated via Play Console's content rating questionnaire — expected to receive the lowest-risk rating tier given the app contains no user-generated public content, violence, or age-restricted material |

## 4.3 Graphic Assets

| Asset | Specification | Content Strategy |
|---|---|---|
| App Icon | 512×512px, follows Material 3 adaptive icon guidelines | Uses the LSM brand mark (Chapter 4.2 of `MASTER_UI_UX_DESIGN_SYSTEM.md`'s `color.primary` navy) — legible at small sizes, distinguishable from other workforce-management-category apps in a device app drawer |
| Feature Graphic | 1024×500px | Shows the product in context — a composite illustration suggesting field-workforce + mobile-app usage, not a generic abstract graphic |
| Screenshots (Phone) | Minimum 4, up to 8 | Show real (or realistic, non-PII-containing seeded) screens: Attendance marking, Dashboard, Payslip view, Approvals inbox — captured per the Chapter 3 (`MASTER_TESTING_CHECKLIST.md`) UI test suite's device-profile matrix, using the same seeded demo dataset (never real customer data, per `MASTER_PROJECT_RULES.md` §13.9.1's test-data governance extended to marketing-asset generation) |
| Screenshots (Tablet) | Minimum 2 | Demonstrate the two-pane list-detail layout (`MASTER_UI_UX_DESIGN_SYSTEM.md` Chapter 12), differentiating LSM from competitors that may only offer a stretched-phone-layout tablet experience |
| Promo Video (optional) | ≤ 30 seconds | A short walkthrough of the core attendance-to-payroll flow, if produced |

**Rule REL-014:** Every screenshot is captured against a dedicated, clearly-fictional demo dataset (fictional company name, fictional employee names/photos using licensed stock or generated placeholder imagery, never real customer or real individual data) — this directly extends the `MASTER_PROJECT_RULES.md` §13.9.1 test-data governance principle to marketing asset production specifically, since store-listing screenshots are public-facing in a way internal QA staging data is not, raising the stakes of any accidental real-data exposure significantly higher.

## 4.4 Localization of Store Listing

**Rule REL-015:** Consistent with `MASTER_UI_UX_DESIGN_SYSTEM.md` §15.8's localization-readiness (English-only in-app UI for this version, but structurally prepared for future localization), the Play Store listing itself is published in English only for this release, with the store listing's own metadata following the identical externalized-string discipline as the in-app UI, ensuring a future Hindi/regional-language store listing addition requires only translation work, not structural rework.

## 4.5 Contact and Support Information

- **Developer Website:** Points to a dedicated LSM product page (not merely Anthropic's or the developing company's generic corporate site), providing prospective enterprise customers a clear path to sales/demo-request contact, since this is a B2B-sales-mediated product, not self-service.
- **Support Email:** A dedicated support address (distinct from general company contact), routed to the team responsible for handling in-app support requests referenced throughout this document set (e.g., `MASTER_SECURITY_FRAMEWORK.md` §3.4's MFA recovery support flow).
- **Privacy Policy URL:** Required field, detailed fully in Chapter 5.

## 4.6 Enterprise Distribution Consideration

**Rule REL-016:** While LSM is listed on the public Play Store (enabling company-provisioned employee devices to install it via a standard Play Store link/QR code shared during onboarding), it is **not** distributed via Google Play's Managed Google Play / Enterprise private-app-catalog mechanism in this version — a deliberate scoping decision consistent with `MASTER_PROJECT_RULES.md` §1.5's non-goals, noted here as a candidate future enhancement for companies wanting stricter device-management-integrated distribution, but not a requirement for the current release.

---

---

# CHAPTER 5: PRIVACY POLICY

## 5.1 Purpose

This chapter specifies the required content structure for LSM's Privacy Policy — a legally-required, publicly-accessible document (linked from the Play Store listing per Chapter 4.5) that must accurately reflect the actual data handling already specified throughout `MASTER_SECURITY_FRAMEWORK.md` Chapter 10 and `MASTER_PROJECT_RULES.md` §11.8, rather than being drafted independently of that technical reality.

## 5.2 Required Content Sections

| Section | Content Source Cross-Reference |
|---|---|
| What data is collected | `MASTER_DATABASE_DICTIONARY.md`'s field catalogs — summarized at a category level (identity data, employment data, attendance/location data, financial data) rather than exhaustively field-by-field in the public-facing policy |
| Why data is collected (purpose limitation) | `MASTER_SECURITY_FRAMEWORK.md` §10.3's purpose-limitation principle, restated in plain language |
| Who data is shared with | `MASTER_SECURITY_FRAMEWORK.md` §10.6's third-party boundary — explicitly names Google Firebase (infrastructure) and Google AI Studio (specific, purpose-limited AI features), and explicitly states no data is sold or shared with advertisers, consistent with `MASTER_PROJECT_RULES.md`'s ad-free-products policy |
| Data retention | `MASTER_SECURITY_FRAMEWORK.md` §6.2's retention table, summarized |
| Data subject rights | `MASTER_SECURITY_FRAMEWORK.md` §10.4's access/correction/erasure/portability rights, with a clear description of how to exercise them (via ESS in-app self-service where applicable, or via the Company Admin/support-mediated Data Subject Erasure Request process) |
| Data security measures | High-level summary of `MASTER_SECURITY_FRAMEWORK.md`'s encryption (Chapter 5) and access control (Chapter 2) — described in terms appropriate for a lay reader, not exposing implementation-level detail that could itself be a security-relevant disclosure (e.g., naming exact encryption algorithms is acceptable industry-standard practice, but internal Cloud Function names or Security Rule specifics are not disclosed) |
| Location data specific disclosure | Explicit, prominent disclosure of geofenced-attendance location collection (`MASTER_BUSINESS_LOGIC.md` Rule ATTENDANCE-002), given location data's particular sensitivity and the Play Store's own specific location-data-disclosure requirements |
| Children's privacy | Explicit statement that LSM is a workforce-management tool not directed at or knowingly used by children, consistent with the platform's B2B employment context (all users are, by definition, employees or their employer's authorized representatives) |
| Policy changes | How material changes to the policy are communicated (via the Notifications module's `ANNOUNCEMENT` category, cross-referenced `MASTER_BUSINESS_LOGIC.md` Module 15, plus an updated "Last modified" date) |
| Contact information | The same support email established in Chapter 4.5 |

## 5.3 Privacy Policy Accuracy Verification

**Rule REL-017:** Before every release that introduces a new data collection point (a new field, a new AI-mediated data flow, a new third-party integration), the Privacy Policy is reviewed and updated **before** that release ships, never retroactively after the fact — this is enforced as an explicit item in the Chapter 8 (this document) Release Checklist, directly extending `MASTER_PROJECT_RULES.md` §2.6's "documentation before/concurrent with implementation" principle to legally-binding external documentation specifically, where the stakes of inaccuracy are regulatory/legal, not merely internal-process quality.

## 5.4 Privacy Policy Hosting

**Rule REL-018:** The Privacy Policy is hosted at a stable, versioned URL (never a URL that could later be repurposed for different content, breaking the Play Store listing's link or any historical reference to "the policy as it stood on date X") — hosted on LSM's own product website infrastructure (Chapter 4.5's Developer Website) rather than embedded solely within the app itself, ensuring it remains accessible to prospective users evaluating the app before installation, per Play Store's own requirement that this link be functional from the store listing without requiring app installation first.

## 5.5 In-App Privacy Policy Access

Beyond the Play Store listing link, the Privacy Policy is also accessible in-app (Settings → Legal → Privacy Policy, opening the same hosted URL per Chapter 5.4) — ensuring a user questioning data handling after installation has an easily-discoverable path to the policy without needing to return to the Play Store listing.

---

---

# CHAPTER 6: TERMS OF SERVICE

## 6.1 Purpose

This chapter specifies the required content structure for LSM's Terms of Service — the legal agreement governing platform usage, distinct from but complementary to the Privacy Policy (Chapter 5), which addresses data handling specifically while Terms address the broader usage relationship.

## 6.2 Terms Structure and the B2B Two-Tier User Reality

**Rule REL-019:** LSM's Terms of Service are drafted recognizing two distinct legal relationships that must both be addressed: (1) the **Company-level agreement** between LSM/the platform provider and the subscribing company (covering subscription terms, data processing agreement/DPA terms, liability, service levels) — this is typically a separate, sales-mediated contract rather than an in-app-accepted document, consistent with `MASTER_PROJECT_RULES.md` §1.5's non-goal of self-service company signup; and (2) the **End-User Terms** accepted by individual employees/Supervisors/Admins within a subscribing company upon first app use, covering acceptable use, account responsibilities, and the individual's relationship to their employer's use of the platform. This chapter's remaining content addresses category (2), the in-app-accepted End-User Terms.

## 6.3 Required End-User Terms Content Sections

| Section | Key Content |
|---|---|
| Acceptance of Terms | Confirmation that continued app use constitutes acceptance; terms presented at first login (Chapter 6.4) |
| Account Responsibilities | User's obligation to maintain credential confidentiality, report suspected unauthorized access (cross-referenced `MASTER_SECURITY_FRAMEWORK.md` §4's session security features available to address this) |
| Acceptable Use | Prohibition on attempting to circumvent security controls, submitting false attendance/leave data, misusing the Grievance channel (`MASTER_BUSINESS_LOGIC.md` Rule ESS-003's anonymous-channel abuse-prevention note) |
| Employer Relationship Acknowledgment | Clear statement that the individual's access to LSM is provisioned by and subject to their employment relationship with the subscribing company — access can be revoked by the employer (e.g., upon termination, `MASTER_BUSINESS_LOGIC.md` Rule EMPLOYEE-005), and the employer, not LSM's platform provider, is the primary party responsible for employment-related decisions the platform facilitates recording |
| Data Accuracy Responsibility | User's responsibility for the accuracy of self-entered data (e.g., leave application reasons, grievance descriptions), while confirming the platform's own responsibility for the accuracy of system-computed data (payroll calculations, attendance-derived figures) |
| Limitation of Liability | Standard limitation-of-liability language, reviewed by qualified legal counsel given the platform's wage/compliance-adjacent subject matter carries genuine liability-relevant stakes beyond a typical consumer app |
| Termination | Conditions under which End-User access may be terminated (employment end, Terms violation, company subscription lapse) |
| Governing Law and Dispute Resolution | Indian jurisdiction, consistent with the platform's primary market and data-residency commitment (`MASTER_SECURITY_FRAMEWORK.md` §10.5) |
| Changes to Terms | Same communication mechanism as Privacy Policy changes (Chapter 5.2's Policy Changes row) |

## 6.4 In-App Terms Acceptance Flow

**Rule REL-020:** End-User Terms are presented for explicit acceptance (a distinct "I agree" affirmative action, never a pre-checked checkbox or implied-acceptance-via-continued-use-only pattern) at first login, before any business functionality is accessible — recorded as a timestamped acceptance event (a dedicated field on the `users/{uid}` document or a small dedicated collection, `termsAcceptedAt` + `termsVersionAccepted`) providing an auditable record of consent, cross-referenced with the audit-trail philosophy already established platform-wide (`MASTER_SECURITY_FRAMEWORK.md` §6).

## 6.5 Re-Acceptance on Material Terms Changes

**Rule REL-021:** A material Terms update (as opposed to a minor clarification) requires re-acceptance on next login — the stored `termsVersionAccepted` field is checked against the current Terms version at every login, and a mismatch triggers the same first-login acceptance flow (§6.4) again before continued access, ensuring the platform never operates under an assumption of consent to terms the user has not actually seen and accepted in their current form.

## 6.6 Legal Review Requirement

**Rule REL-022:** Both the Privacy Policy (Chapter 5) and Terms of Service (this chapter) are drafted with qualified legal counsel review before initial publication and before any material subsequent revision — this document specifies the required *content structure and technical accuracy cross-referencing* these legal documents must achieve, but does not itself constitute legal advice or a substitute for qualified legal drafting, a distinction worth stating explicitly given this document's otherwise highly technical/prescriptive nature throughout the rest of this documentation set.

---

---

# CHAPTER 7: DATA SAFETY SECTION

## 7.1 Purpose

This chapter specifies LSM's completion of Google Play Console's mandatory **Data Safety form** — the structured, standardized disclosure (distinct from the free-form Privacy Policy, Chapter 5) that Google requires every app to complete, displayed to prospective users directly on the Play Store listing page. This chapter maps LSM's actual data practices (per `MASTER_DATABASE_DICTIONARY.md` and `MASTER_SECURITY_FRAMEWORK.md`) to Google's specific disclosure categories.

## 7.2 Data Collection Disclosure Mapping

| Google Play Data Category | Collected? | LSM Field(s) | Purpose Declared |
|---|---|---|---|
| Name | Yes | `employees.fullName`, `users.displayName` | App functionality |
| Email address | Yes | `employees.email`, `users.email` | App functionality, Account management |
| Phone number | Yes | `employees.contactNumber`, `users.phoneNumber` | App functionality (Phone OTP auth), Account management |
| Physical address | Yes | `employees.currentAddress`/`permanentAddress` | App functionality |
| Government IDs | Yes | `employees.panNumber`, `employees.aadhaarNumber` (encrypted, `MASTER_SECURITY_FRAMEWORK.md` §5.4) | App functionality (compliance/payroll) |
| Precise location | Yes | `attendanceRecords.checkInLocation`/`checkOutLocation` | App functionality (geofenced attendance verification) |
| Photos | Yes | `employees.profilePhotoUrl`, document uploads | App functionality |
| Financial info (bank details) | Yes | `employees.bankAccountNumber` (encrypted) | App functionality (payroll disbursement) |
| App activity / App interactions | Yes | Firebase Analytics standard events (screen views, feature usage) | Analytics, App functionality |
| Device or other IDs | Yes | `users/{uid}/devices` fingerprint (`MASTER_SECURITY_FRAMEWORK.md` §7.2) | Security/fraud prevention |

## 7.3 Data Sharing Disclosure

**Rule REL-023:** The Data Safety form's "Data shared with third parties" section discloses exactly the third-party relationships already established in `MASTER_SECURITY_FRAMEWORK.md` §10.6 — Google Firebase (as the underlying infrastructure processor, disclosed per Google's own standard guidance for Firebase-built apps) and Google AI Studio (for the specific, purpose-limited AI features, `MASTER_BUSINESS_LOGIC.md` Module 20) — and explicitly declares **no data is shared for advertising purposes** and **no data is sold**, consistent with the platform's ad-free posture (Product Information's ad-free-products policy) and the third-party-sharing boundary already established.

## 7.4 Data Security Practices Disclosure

Per the Data Safety form's security-practices checklist:
- [x] Data is encrypted in transit (Chapter 5.2 of `MASTER_SECURITY_FRAMEWORK.md`)
- [x] Users can request data deletion (Chapter 10.4 of `MASTER_SECURITY_FRAMEWORK.md` — noting the legitimate-retention-override nuance is described in the accompanying explanatory text where the form allows it)
- [x] Committed to Google Play Families Policy — **N/A, declared not applicable**, since LSM is a B2B enterprise workforce tool with no child-directed content or design, and the Data Safety form allows explicit declaration of non-applicability for this category

## 7.5 Data Retention Disclosure

Cross-referencing `MASTER_SECURITY_FRAMEWORK.md` §6.2's retention table, the Data Safety form's retention-disclosure fields are populated with the actual policy values (e.g., audit logs retained 3+ years, business-transaction records retained indefinitely per statutory requirement) — never a vague "as long as necessary" placeholder where the form allows specific disclosure, since accurate specific disclosure better serves both regulatory compliance and prospective-user trust than a deliberately vague statement would.

## 7.6 Data Safety Form Accuracy Verification (Cross-Reference Chapter 5.3)

**Rule REL-024:** Identical governance to the Privacy Policy accuracy rule (Chapter 5.3) applies to the Data Safety form specifically — any release introducing a new data collection point requires the Data Safety form to be updated in Play Console **before** that release ships (Google's own policy additionally requires this, with enforcement consequences for inaccurate disclosures including app removal, making this a hard compliance requirement, not merely a best practice recommendation).

## 7.7 Data Safety Form Review Cadence

Beyond the release-triggered updates (§7.6), the complete Data Safety form is reviewed in full at least annually (aligned with the `minSdkVersion` annual review cadence, Chapter 3.6) even absent a specific triggering data-collection change, catching any drift between the form's disclosures and actual practice that might have accumulated through several incremental, individually-minor changes each of which seemed too small to warrant a full form review at the time.

---

---

# CHAPTER 8: RELEASE CHECKLIST

## 8.1 Purpose

This chapter consolidates every prior chapter of this document, plus `MASTER_TESTING_CHECKLIST.md`'s Chapter 9 Production Checklist gate, into the single literal checklist executed for every Play Store submission.

## 8.2 Pre-Submission Checklist

- [ ] `MASTER_TESTING_CHECKLIST.md` Chapter 9's full Production Checklist gate green (all 8 sub-checklists, all module-level checklists, platform-level checklist)
- [ ] AAB built via CI/CD pipeline only, from the exact tagged release-candidate commit (Chapter 1.6)
- [ ] `versionCode`/`versionName` correctly incremented per Chapter 3's formula and decision table
- [ ] Correct `google-services.json` variant confirmed (`lsm-prod`, Chapter 1.4) — a manual double-check beyond the automated CI safeguard given the severity of this specific misconfiguration category
- [ ] Upload key signing confirmed successful (Chapter 2.3)
- [ ] ProGuard/R8 mapping file archived (required for de-obfuscating future crash reports against this specific release, per standard Android release practice)
- [ ] Dynamic feature module delivery configuration verified (Chapter 1.3) — Super Admin module confirmed not bundled into base

## 8.3 Store Listing Checklist

- [ ] App listing metadata reviewed for accuracy against current feature set (Chapter 4.2)
- [ ] Screenshots current (regenerated if UI has materially changed since last release, Chapter 4.3)
- [ ] Privacy Policy reviewed and updated if this release introduces new data collection (Chapter 5.3, Rule REL-017)
- [ ] Terms of Service reviewed, version-bumped and re-acceptance-triggering if materially changed (Chapter 6.5)
- [ ] Data Safety form reviewed and updated if this release introduces new data collection (Chapter 7.6, Rule REL-024)
- [ ] Content rating questionnaire re-confirmed still accurate (rarely changes, but checked per release regardless)

## 8.4 Legal and Compliance Checklist

- [ ] Any new third-party service integration disclosed in Privacy Policy and Data Safety form (cross-reference `MASTER_SECURITY_FRAMEWORK.md` §10.6's third-party boundary — a new integration would itself require updating that boundary's documentation first)
- [ ] Any new sensitive-field collection application-level-encrypted per `MASTER_SECURITY_FRAMEWORK.md` §5.4's scope-boundary criteria, or explicitly reviewed and deliberately excluded with documented rationale

## 8.5 Post-Submission Monitoring Checklist

- [ ] Play Console pre-launch report reviewed (Google's automated pre-launch testing across a device farm) — any flagged crash/ANR investigated before proceeding with rollout
- [ ] Firebase Crashlytics dashboard monitored closely during initial rollout window (Chapter 9's staged rollout percentages)
- [ ] Firebase Performance Monitoring dashboard reviewed for any regression against the previous release's baseline (cross-reference `MASTER_PROJECT_RULES.md` §9.7)
- [ ] Support channel monitored for an uptick in user-reported issues correlating with the new release

## 8.6 Rollback Readiness Checklist

- [ ] Previous release's AAB retained and immediately available for emergency rollback via Play Console's "Halt rollout" / staged-rollout-percentage-reduction mechanism
- [ ] Any Firestore schema change in this release confirmed backward-compatible (per `MASTER_PROJECT_RULES.md` §2.5's schema-migration discipline) such that a rolled-back older app version would not be broken by data written by the newer version during its rollout window
- [ ] Any new/changed Security Rules confirmed compatible with both the new and immediately-prior app version, for the same rollback-safety reason

---

---

# CHAPTER 9: ROLLOUT STRATEGY

## 9.1 Purpose

This final chapter specifies how a Play-Store-approved release actually reaches users — the staged rollout percentages, monitoring gates between stages, and halt/rollback triggers — directly extending Chapter 8.5-8.6's monitoring/rollback checklists into a concrete, timed procedure.

## 9.2 Staged Rollout Percentage Schedule

| Stage | Percentage | Minimum Duration Before Next Stage | Gate Criteria to Proceed |
|---|---|---|---|
| 1 | 5% | 24 hours | No new Crashlytics crash-free-rate regression beyond 0.5% from previous release baseline; no critical support escalations |
| 2 | 20% | 24 hours | Same criteria, at larger sample size |
| 3 | 50% | 48 hours | Same criteria; additionally, Performance Monitoring dashboards show no regression |
| 4 | 100% | N/A (final stage) | N/A |

**Rule REL-025:** This staged schedule is the **default**; it is deliberately shortened for a critical security-patch or data-integrity-bug-fix release (per `MASTER_PROJECT_RULES.md` §2.5's PATCH-category urgency) and deliberately lengthened (more stages, longer gates) for a MAJOR-version release involving significant architectural change, per the release's own risk profile — the schedule is not a rigid, one-size-fits-all timer but a risk-calibrated default requiring explicit engineering-lead sign-off to deviate from in either direction.

## 9.3 Rollout Halt Triggers

A rollout is immediately halted (Play Console's percentage frozen, not advanced further) if, during any stage:
- [ ] Crash-free-rate regresses beyond 0.5% from the previous release's baseline
- [ ] Any `MASTER_SECURITY_FRAMEWORK.md` Chapter 9 threat-detection rule fires at an anomalous rate correlating with the new release specifically (suggesting the release itself introduced a security-relevant regression, not merely coincidental timing)
- [ ] A confirmed data-integrity issue is reported (e.g., an attendance/payroll calculation discrepancy) — given `MASTER_PROJECT_RULES.md`'s zero-tolerance stance on financial/compliance-risk defects, this triggers an immediate halt regardless of how small the affected user percentage currently is
- [ ] Support channel reports a pattern of critical usability regression (e.g., a core flow like attendance marking broken for a subset of device configurations not caught in pre-release testing)

## 9.4 Rollback Procedure

**Rule REL-026:** Upon a halt trigger requiring full rollback (not merely a pause-and-investigate), Play Console's rollout is reduced to 0% for the new release, and — since Play Store doesn't support "downgrading" users already on the new version automatically — the previous release's AAB (retained per Chapter 8.6) is re-promoted as the current release if the issue cannot be hotfixed within an acceptable window, ensuring any user who hasn't yet updated stops receiving the problematic version, while affected already-updated users are prioritized for an expedited hotfix release following the same (likely shortened, per Rule REL-025) staged rollout rather than left on a known-broken version indefinitely.

## 9.5 Enterprise Customer Communication During Rollout Issues

**Rule REL-027:** Consistent with `MASTER_SECURITY_FRAMEWORK.md` §11.5's incident communication plan (originally specified for infrastructure disasters, extended here to release-quality incidents), a rollout halt triggered by a data-integrity or security-relevant issue (§9.3) triggers proactive Company Admin notification across all companies with any affected users — via the same `ALERT_ESCALATION` notification category already established platform-wide — rather than a silent halt-and-fix with no customer visibility, since a B2B enterprise customer managing their own workforce's wage/attendance data has a legitimate expectation of transparency about any issue that may have affected that data, however briefly.

## 9.6 Post-Rollout Review

**Rule REL-028:** Every release, once reaching 100% rollout without a halt, undergoes a brief retrospective review (What went well, what could improve, any near-miss worth addressing) — and every release involving a halt/rollback undergoes a mandatory, more thorough post-incident review following the same incident-response-runbook-adjacent rigor established in `MASTER_SECURITY_FRAMEWORK.md` §9.5, ensuring the release process itself continuously improves rather than treating each release as an isolated, non-learning event.

---

# END OF DOCUMENT — MASTER_PLAYSTORE_RELEASE.md

This document is now **complete** across all 9 chapters:

1. Android Release Build Process (APK/AAB)
2. App Signing
3. Versioning
4. Play Store Listing
5. Privacy Policy
6. Terms of Service
7. Data Safety Section
8. Release Checklist
9. Rollout Strategy

**Document Version:** 1.0 — Final
**Governed By:** `MASTER_PROJECT_RULES.md` (Chapters 2, 15), `MASTER_TESTING_CHECKLIST.md` (Chapter 9), `MASTER_SECURITY_FRAMEWORK.md` (Chapters 9-11)
**Status:** Ready to serve as the authoritative release-and-distribution reference for every LSM Play Store submission.

----------------------------------------
DOCUMENT:
MASTER_PLAYSTORE_RELEASE.md

STATUS:
✅ DOCUMENT COMPLETE — ALL 9 CHAPTERS FINISHED

NEXT STEP:
Type "NEXT DOCUMENT" to begin MASTER_IMPLEMENTATION_PROMPTS.md (the final document in this series)
----------------------------------------
