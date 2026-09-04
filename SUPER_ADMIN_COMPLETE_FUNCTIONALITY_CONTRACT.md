# SUPER_ADMIN_COMPLETE_FUNCTIONALITY_CONTRACT

## Modules
1. Dashboard (`SuperAdminDashboard.tsx`)
2. Admins (`SuperAdminAdminsScreen.tsx`)
3. Audit Logs (`SuperAdminAuditScreen.tsx`)
4. Companies/Tenants (`SuperAdminCompaniesScreen.tsx`)
5. Create Company (`SuperAdminCreateCompany.tsx`)
6. Config (`SuperAdminConfigScreen.tsx`)
7. Leads (`SuperAdminLeadsScreen.tsx`)
8. Modules (`SuperAdminModulesScreen.tsx`)
9. Monitoring (`SuperAdminMonitoringScreen.tsx`)
10. Reports (`SuperAdminReportsScreen.tsx`)
11. Security (`SuperAdminSecurityScreen.tsx`)
12. Subscriptions (`SuperAdminSubscriptionsScreen.tsx`)
13. Support (`SuperAdminSupportScreen.tsx`)

## Current Functionality Status

### 1. Dashboard
- Load global stats (companies, users, approvals, leads).
- Display lists of companies.
- Navigation links to other modules.

### 2. Admins
- List platform admins.
- Add super admin (UI exists, need to verify backend capability).
- Remove super admin.

### 3. Audit Logs
- View `platform_audit_logs`.
- Filtering by action/tenant.

### 4. Companies/Tenants
- View all tenants.
- Search/filter tenants.
- View details.
- Edit details/status.
- Suspend tenant.

### 5. Create Company
- Form to provision new tenant, admin credentials, select modules.
- Sends data to `/api/admin/create-company` (We verified this backend route exists and works).

### 6. Config
- Update platform global config (`platform_global_config`).
- Manage platform broadcasts.

### 7. Leads
- View lead forms.
- Update lead status.

### 8. Modules
- Manage module entitlements per tenant (`enabledModules` field).

### 9. Monitoring
- View system health.

### 10. Reports
- Export tenant CSV/JSON.

### 11. Security
- View `platform_security_events`.
- Resolve events.

### 12. Subscriptions
- View global subscription plans.
- Create new plans.
- View subscriptions per company.
- Assign plans to companies.

### 13. Support
- Impersonation/support access sessions.

