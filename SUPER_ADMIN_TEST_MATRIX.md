# SUPER ADMIN VERIFICATION MATRIX

| Module | Feature | Component / Service | Action | Expected Outcome | Status |
|---|---|---|---|---|---|
| **Auth** | Add Super Admin | `SuperAdminAdminsScreen` -> `SuperAdminService.addSuperAdmin` | Submit form | Real Auth user created, `super_admins` record created, reset email sent | **PASS** |
| **Auth** | Remove Super Admin | `SuperAdminAdminsScreen` -> `SuperAdminService.removeSuperAdmin` | Click "Revoke" | Auth user deleted/suspended, claims removed, document deleted | **PASS** |
| **Auth** | Login as Platform Owner | `PlatformLoginScreen` -> `FirebaseAuthService.authenticateUser` | Login with credentials | Bypasses company isolation, logs into `GLOBAL_ADMIN` mode | **PASS** |
| **Dashboard** | View Stats | `SuperAdminDashboard` -> `FirestoreService.getSuperAdminStats` | Load page | Real counts of active tenants, users, leads, pending approvals | **PASS** |
| **Companies** | Create Company | `SuperAdminCreateCompany` -> `FirestoreService.createCompanyWithAdmin` | Submit | `companies` doc created, Auth user created, modules linked | **PASS** |
| **Companies** | Edit Status | `SuperAdminCompaniesScreen` -> `FirestoreService.updateCompanyDetails` | Toggle Status | Status flips between ACTIVE/SUSPENDED | **PASS** |
| **Companies** | Delete Company | `SuperAdminCompaniesScreen` -> `authRoutes.delete('/admin/companies')` | Confirm delete | All related data wiped, Users deleted | **PASS** |
| **Modules** | Update Entitlements | `SuperAdminModulesScreen` -> `FirestoreService.updateCompanyModules` | Select modules -> Save | `enabledModules` updated for tenant, UI reflects changes | **PASS** |
| **Support** | Create Support Session | `SuperAdminSupportScreen` -> `SuperAdminService.createSupportAccessSession` | Authorize | Audit log + `support_sessions` record created securely | **PASS** |
| **Reports** | Export Stats | `SuperAdminReportsScreen` -> `SuperAdminService.exportToCsv` | Click Export | Browser downloads CSV of SaaS tenant analytics | **PASS** |

