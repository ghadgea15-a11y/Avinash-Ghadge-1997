# Log Sheet Muster - Master Architecture Document

**Project Name:** Log Sheet Muster
**Project Owner:** Avinash Shivaji Ghadge
**Platform:** Android (via Mobile-First PWA/Web-App architecture for simple mobile management)
**Design Language:** Material 3 Expressive Design
**Target Audience:** Facility Management & Facility Services Company

---

## 1. Complete Project Folder Structure
```text
/src
  /assets         # Static files, icons, and Material 3 design tokens
  /components     # Reusable UI components (Buttons, Cards, Dialogs)
  /config         # Firebase & environment configurations
  /features       # Independent, pluggable feature modules
    /auth         # Authentication & Session Management
    /attendance   # Attendance logic (Self, Supervisor, Incharge)
    /company      # Organization hierarchy management
    /users        # User profiles, Role assignments
    /departments  # Department configurations
  /hooks          # Custom React hooks for business logic
  /layouts        # Screen layouts (Bottom Navigation, Top App Bars)
  /pages          # Main application screens grouped by feature
  /services       # Firebase API calls and external integrations
  /store          # Global state management
  /types          # TypeScript interfaces and data models
  /utils          # Helper functions, date formatters, validators
```

## 2. Complete Module List
1. **Authentication Module:** Secure Login, Password Reset, Role verification.
2. **Organization Module:** Multi-Company, Region, Branch, and Site management.
3. **Department Module:** Dynamic department creation (Housekeeping, Security, HR, etc.).
4. **User & Role Management Module:** Employee onboarding, access control.
5. **Attendance Module:** Configurable modes (Worker Self-Attendance, Supervisor Proxy, Incharge Override).
6. **Leave Management Module:** Request submission and multi-level approval.
7. **Reporting Module:** Muster rolls, exportable logs, attendance summaries.
8. **Settings Module:** App-wide preferences and modular toggles.

## 3. Application Navigation Flow
- **Splash Screen:** Verifies active session and role.
- **Login Screen:** Secure entry point.
- **Role-Based Home Dashboard:**
  - *Super Admin/Admin:* Multi-company overview, analytics, module shortcuts.
  - *Manager/Incharge:* Site-specific operational summaries.
  - *Supervisor:* Quick-action screen for marking team attendance.
  - *Worker:* Simple "Mark Attendance" button and history view.
- **Bottom Navigation (Mobile):** Home, Attendance, Profile, Settings.

## 4. User Role Hierarchy
1. **Developer:** System maintenance, overrides, technical configuration.
2. **Company Owner:** Owns company data, accesses high-level reports.
3. **Super Admin:** Manages multiple companies and global system settings.
4. **Admin:** Manages a single company across all regions/branches.
5. **HR:** Manages employee records, compliance, and payroll data.
6. **Manager:** Manages a specific region or branch.
7. **Incharge:** Manages a specific site or facility.
8. **Supervisor:** Manages a team of workers on a single site.
9. **Employee:** Standard office or field staff.
10. **Worker:** Ground staff (e.g., Housekeeping, Security).

## 5. Permission Architecture
We use a hybrid Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC):
- **Global Access (`*`):** Developer, Super Admin.
- **Company-Level Access:** Admin (`company_id` matching).
- **Regional Access:** Manager (`region_id` or `branch_id` matching).
- **Site-Level Access:** Incharge, Supervisor (`site_id` matching).
- **Action Matrix:** Each module defines specific `create`, `read`, `update`, `delete` permissions mapped to roles.

## 6. High Level Database Architecture
**Firebase Cloud Firestore (NoSQL Document Structure):**
- `/companies/{companyId}`: Core company details.
  - `/regions/{regionId}`: Subcollections for regional data.
    - `/branches/{branchId}`
      - `/sites/{siteId}`
- `/users/{userId}`: Centralized user profiles containing role and hierarchy IDs.
- `/departments/{departmentId}`: Global or company-specific departments.
- `/attendance_logs/{logId}`: Daily records containing `user_id`, `timestamp`, `location`, `marked_by`, and `mode`.
- `/roles_permissions/{roleId}`: Centralized permission matrices.

## 7. Recommended Firebase Services
- **Firebase Authentication:** Secure login (Email/Password, Phone OTP).
- **Cloud Firestore:** Real-time, offline-capable NoSQL database.
- **Firebase Storage:** For profile pictures and document attachments.
- **Firebase Hosting:** To host the web-based Android PWA.
- **Cloud Functions:** Secure server-side logic (e.g., daily roll-over, secure role assignment).

## 8. Security Architecture
- **Firestore Security Rules:** Strict validation checking `request.auth.uid` against document ownership and custom claims (Roles).
- **Data Validation:** Client-side UI validation combined with strict backend rule validation.
- **Location Verification:** Geofencing/GPS validation when marking attendance to prevent spoofing.
- **Device Binding:** Prevent workers from sharing credentials by linking accounts to specific devices.

## 9. Modular Design Strategy
- Every business function (e.g., Housekeeping, Billing) is built as an independent folder/module.
- Modules can be enabled or disabled via database flags per company.
- The UI dynamically hides or shows navigation items based on active modules and user permissions.

## 10. Future Expansion Strategy
- **Scalability:** Firestore's document model scales automatically to millions of records.
- **Integration:** Cloud Functions can expose secure REST APIs for future ERP/Payroll software integration.
- **AI Integration:** Future scope for Gemini AI to predict staffing shortages or detect attendance anomalies.

## 11. Enterprise Best Practices
- **Offline-First:** Workers can mark attendance even without internet; the app syncs data once reconnected.
- **Audit Trails:** Track who made changes to schedules, roles, or manual attendance corrections.
- **Soft Deletes:** Never permanently delete records; use an `is_active: false` flag to maintain historical data integrity.
- **Localization:** UI designed to support multiple languages for ground workers.

## 12. Risks and Solutions
- **Risk:** Fake Location for Attendance.
  **Solution:** High-accuracy GPS requirement + optional photo verification.
- **Risk:** Poor internet connectivity on remote sites.
  **Solution:** Firestore offline persistence caches actions locally.
- **Risk:** Unauthorized data access.
  **Solution:** Strict Firestore Security Rules and Multi-Factor Authentication.

## 13. Recommended Technology Stack
- **Frontend:** React with TypeScript (deployed as a mobile-first PWA that installs like a native Android app).
- **UI Framework:** Tailwind CSS with Material 3 design principles.
- **Backend/Database:** Firebase (Auth, Firestore, Storage).
- **State Management:** Zustand or React Context for lightweight, scalable state.

## 14. Naming Convention Standards
- **Files:** PascalCase for UI components (`ActionCard.tsx`), camelCase for utilities (`formatDate.ts`).
- **Database:** snake_case for collections and fields (`attendance_logs`, `company_id`).
- **Variables:** camelCase (`isLoggedIn`, `activeUser`).
- **Constants:** UPPER_SNAKE_CASE (`MAX_LOGIN_ATTEMPTS`).

## 15. Coding Standards
- Strict TypeScript typing (No `any` types allowed).
- Component-based architecture with separated business logic (Custom Hooks).
- Comprehensive error handling with user-friendly toast notifications.
- Meaningful inline comments explaining *why* complex decisions were made.

## 16. Development Roadmap (Phase 1 to 10)
- **Phase 1:** Project Setup, Architecture & UI Foundation.
- **Phase 2:** Firebase Integration & Authentication.
- **Phase 3:** Organization Hierarchy & Department Setup.
- **Phase 4:** User Management & Role Assignment.
- **Phase 5:** Core Attendance Engine (Self & Supervisor modes).
- **Phase 6:** Leave & Shift Management Modules.
- **Phase 7:** Reporting, Exporting & Analytics Dashboard.
- **Phase 8:** Advanced Security (Geofencing, Photo Verification).
- **Phase 9:** Push Notifications & Alerts.
- **Phase 10:** Enterprise Integrations & Final Polish.
