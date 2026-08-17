# Phase 2C-M: Comprehensive Collection Inventory

## 1. Overview
This authoritative collection inventory catalogs every Firestore root collection and company tenant subcollection identified across the entire codebase (`src/`, `functions/`, `services/`, `screens/`).

## 2. Global Root Collections
| Collection Path | Purpose | Operations Supported | Authentication Requirement | Scope Constraints |
|---|---|---|---|---|
| `/users/{uid}` | User master profiles & session bindings | READ, CREATE, UPDATE, DELETE | Authenticated | Self (`uid == request.auth.uid`), Super Admin, or same company tenant |
| `/users/{uid}/memberships/{companyId}` | Multi-tenant company membership roles | READ, CREATE, UPDATE, DELETE | Authenticated | Self, Super Admin, or Company Admin |
| `/company_codes/{codeId}` | Company code discovery & verification during login | GET (Single Doc), WRITE (Super Admin) | Public GET, Super Admin WRITE | Single document GET allowed for login verification; LIST restricted |
| `/companyCodes/{codeId}` | Legacy code alias lookup | GET (Single Doc), WRITE (Super Admin) | Public GET, Super Admin WRITE | Single document GET allowed for login verification; LIST restricted |
| `/plans/{planId}` | Subscription plan metadata | READ, WRITE (Super Admin) | Authenticated | Read for active users, Write for Super Admin |
| `/modules/{moduleId}` | System module definition dictionary | READ, WRITE (Super Admin) | Authenticated | Read for active users, Write for Super Admin |
| `/settings/{settingId}` | Global platform settings | READ, WRITE (Super Admin) | Authenticated | Read for active users, Write for Super Admin |
| `/userRoles/{roleId}` | Role definition dictionary | READ, WRITE (Super Admin) | Authenticated | Super Admin only |
| `/regions/{regionId}` | Global region infrastructure mapping | READ, WRITE (Super Admin) | Authenticated | Active users read, Super Admin write |
| `/branches/{branchId}` | Global branch infrastructure mapping | READ, WRITE (Super Admin) | Authenticated | Active users read, Super Admin write |
| `/sites/{siteId}` | Global site infrastructure mapping | READ, WRITE (Super Admin) | Authenticated | Active users read, Super Admin write |
| `/departments/{departmentId}` | Global department definitions | READ, WRITE (Super Admin) | Authenticated | Active users read, Super Admin write |
| `/designations/{designationId}` | Global designation definitions | READ, WRITE (Super Admin) | Authenticated | Active users read, Super Admin write |
| `/shifts/{shiftId}` | Global work shift definitions | READ, WRITE (Super Admin) | Authenticated | Active users read, Super Admin write |
| `/approval_requests/{requestId}` | Global application & onboarding approval inbox | READ, CREATE, UPDATE, DELETE | Authenticated | Self (`uid`), same company, or Super Admin |
| `/audit_logs/{logId}` & `/auditLogs/{logId}` | Global immutable audit trails | READ, CREATE | Authenticated | Read for Company Admin/Super Admin, Create for active user |
| `/notifications/{notificationId}` | Global user system notifications | READ, CREATE, UPDATE, DELETE | Authenticated | Recipient/tenant read, Manager create |

## 3. Company Tenant Subcollections (`/companies/{companyId}/...`)
| Collection Path | Purpose | Operations Supported | Scope Constraints & Authority |
|---|---|---|---|
| `/companies/{companyId}` | Tenant root profile & metadata | GET, LIST, CREATE, UPDATE, DELETE | GET public for verification; LIST/UPDATE same company (`cId`); CREATE/DELETE Super Admin |
| `/companies/{companyId}/subscriptions/{id}` | License & plan subscription records | READ, WRITE | READ same company (`cId`); WRITE Super Admin / Webhooks |
| `/companies/{companyId}/entitlements/{id}` | Enabled feature module entitlements | READ, WRITE | READ same company (`cId`); WRITE Super Admin / Webhooks |
| `/companies/{companyId}/payments/{id}` | Subscription billing payment records | READ | READ `A0-A2` or `A3` Finance; WRITE restricted to Webhook |
| `/companies/{companyId}/invoices/{id}` | Subscription billing invoices | READ | READ `A0-A2` or `A3` Finance |
| `/companies/{companyId}/subscriptionHistory/{id}` | Immutable subscription history logs | READ | READ `A0-A2` or `A3` Finance |
| `/companies/{companyId}/employees/{employeeId}` | Employee master records | READ, CREATE, UPDATE, DELETE | READ: `A0-A3`, Region Manager (`rId`), Site Manager (`sId`), or Self (`employeeId`); CREATE/DELETE: `A0-A3`; UPDATE: `A0-A3` or Site Manager (non-sensitive fields) |
| `/companies/{companyId}/role_assignments/{id}` | RBAC role assignment mappings | READ, WRITE | READ same company; WRITE `A0-A3` |
| `/companies/{companyId}/documents/{docId}` | Employee & HR document attachments | READ, WRITE | READ same company; WRITE `A0-A3` |
| `/companies/{companyId}/leave_requests/{id}` | Employee leave applications | READ, CREATE, UPDATE, DELETE | READ: `A0-A3`, Site Manager (`sId`), or Self; CREATE: active employee; UPDATE: `A0-A3` or Site Manager |
| `/companies/{companyId}/leave/{id}` | Legacy leave record alias | READ, CREATE, UPDATE, DELETE | Same rules as `leave_requests` |
| `/companies/{companyId}/attendance_logs/{id}` | Daily punch logs & attendance records | READ, CREATE, UPDATE, DELETE | READ: `A0-A3`, Region Manager (`rId`), Site Manager (`sId`), or Self; CREATE: `A0-A3`, Site Manager (`sId`), or Self; UPDATE: `A0-A3` or Site Manager |
| `/companies/{companyId}/attendance/{id}` | Legacy attendance alias | READ, CREATE, UPDATE, DELETE | Same rules as `attendance_logs` |
| `/companies/{companyId}/attendance_summaries/{id}` | Monthly/Daily attendance aggregates | READ, WRITE | READ/WRITE: `A0-A3` or Site Manager (`sId`) |
| `/companies/{companyId}/site_muster_rolls/{id}` | Site daily muster roll sheets | READ, WRITE | READ/WRITE: `A0-A3` or Site Manager (`sId`) |
| `/companies/{companyId}/attendance_devices/{id}` | Biometric & site attendance devices | READ, WRITE | READ same company; WRITE `A0-A3` |
| `/companies/{companyId}/payroll/{id}` | Monthly payroll calculation sheets | READ, CREATE, UPDATE, DELETE | READ: `A0-A2`, `A3` Finance, or Self pay stub; WRITE: `A0-A2` or `A3` Finance |
| `/companies/{companyId}/payroll_cycles/{id}` | Monthly payroll processing cycles | READ, WRITE | READ/WRITE: `A0-A2` or `A3` Finance |
| `/companies/{companyId}/payroll_profiles/{id}` | Employee payroll settings & bank profiles | READ, WRITE | READ/WRITE: `A0-A2` or `A3` Finance |
| `/companies/{companyId}/employee_salary_profiles/{id}` | Detailed salary structure profiles | READ, WRITE | READ/WRITE: `A0-A2` or `A3` Finance |
| `/companies/{companyId}/salary_structures/{id}` | Grade-wise salary component templates | READ, WRITE | READ/WRITE: `A0-A2` or `A3` Finance |
| `/companies/{companyId}/salary_slips/{id}` | Individual employee salary slips | READ, WRITE | READ: `A0-A2`, `A3` Finance, or Self; WRITE: `A0-A2` or `A3` Finance |
| `/companies/{companyId}/salary_advances/{id}` | Advance payment requests & approvals | READ, WRITE | READ: same company; WRITE: `A0-A3` or Self request |
| `/companies/{companyId}/advances_and_deductions/{id}` | Monthly salary deduction logs | READ, WRITE | READ/WRITE: `A0-A2` or `A3` Finance |
| `/companies/{companyId}/inventory/{id}` | Master company inventory stock | READ, CREATE, UPDATE, DELETE | READ: same company; WRITE: `A0-A3` or Site Manager (`sId`) |
| `/companies/{companyId}/inventory_items/{id}` | SKU & item master definitions | READ, WRITE | READ: same company; WRITE: `A0-A3` |
| `/companies/{companyId}/site_inventory/{id}` | Site-level stock allocation | READ, WRITE | READ: same company; WRITE: `A0-A3` or Site Manager (`sId`) |
| `/companies/{companyId}/inventory_transactions/{id}` | Stock issue, receive & audit logs | READ, WRITE | READ: same company; WRITE: `A0-A3` or Site Manager (`sId`) |
| `/companies/{companyId}/assets/{assetId}` | Fixed machinery & vehicle asset registry | READ, WRITE | READ: same company; WRITE: `A0-A3` |
| `/companies/{companyId}/vendors/{vendorId}` | Approved supplier & vendor database | READ, WRITE | READ: same company; WRITE: `A0-A3` |
| `/companies/{companyId}/clients/{clientId}` | Project client directory | READ, WRITE | READ: same company; WRITE: `A0-A3` |
| `/companies/{companyId}/contracts/{contractId}` | Client site contracts & SLAs | READ, WRITE | READ: same company; WRITE: `A0-A3` |
| `/companies/{companyId}/billing/{billingId}` | Client billing & invoicing records | READ, CREATE, UPDATE, DELETE | READ/WRITE: `A0-A2` or `A3` Finance |
| `/companies/{companyId}/daily_site_logs/{id}` | Daily site work progress logs | READ, WRITE | READ: same company; WRITE: `A0-A3` or Site Manager (`sId`) |
| `/companies/{companyId}/incident_reports/{id}` | EHS, safety & security incidents | READ, WRITE | READ: `A0-A3`, Region Manager (`rId`), Site Manager (`sId`), or Reporter; WRITE: `A0-A3`, Site Manager, or Reporter |
| `/companies/{companyId}/visitor_logs/{id}` | Visitor entry/exit register | READ, WRITE | READ: `A0-A3`, Region Manager (`rId`), Site Manager (`sId`); WRITE: `A0-A3` or Site Manager (`sId`) |
| `/companies/{companyId}/material_movement_logs/{id}` | Material gate pass & movement logs | READ, WRITE | READ: `A0-A3`, Region Manager (`rId`), Site Manager (`sId`); WRITE: `A0-A3` or Site Manager (`sId`) |
| `/companies/{companyId}/tasks/{taskId}` | Site & operational task assignments | READ, WRITE | READ: same company; WRITE: `A0-A3` or Site Manager (`sId`) |
| `/companies/{companyId}/announcements/{id}` | Company-wide & site broadcast notices | READ, WRITE | READ: same company; WRITE: `A0-A3` |
| `/companies/{companyId}/system_settings/{id}` | Company operational configuration | READ, WRITE | READ: same company; WRITE: `A0-A2` |
| `/companies/{companyId}/audit_logs/{id}` | Tenant immutable audit trails | READ, CREATE | READ: `A0-A2`; CREATE: active user |
| `/companies/{companyId}/regions/{id}` | Tenant region definitions | READ, WRITE | READ: same company; WRITE: `A0-A3` |
| `/companies/{companyId}/branches/{id}` | Tenant branch definitions | READ, WRITE | READ: same company; WRITE: `A0-A3` |
| `/companies/{companyId}/sites/{id}` | Tenant site locations | READ, WRITE | READ: same company; WRITE: `A0-A3` |
| `/companies/{companyId}/departments/{id}` | Tenant department definitions | READ, WRITE | READ: same company; WRITE: `A0-A3` |
| `/companies/{companyId}/designations/{id}` | Tenant job designation catalog | READ, WRITE | READ: same company; WRITE: `A0-A3` |
| `/companies/{companyId}/shifts/{id}` | Tenant shift timing templates | READ, WRITE | READ: same company; WRITE: `A0-A3` |
| `/companies/{companyId}/approval_requests/{id}` | Tenant workflow approval inbox | READ, CREATE, UPDATE, DELETE | READ: `A0-A3`, Site Manager (`sId`), or Requester; UPDATE: `A0-A3` or Site Manager |
| `/{collectionId}/{attendanceId}` | Dynamic company attendance (e.g. `attendance_CORP-101`) | READ, CREATE, UPDATE, DELETE | Dynamic company code extraction; verified against `request.auth.token.cId` |

---
*No production resources were modified during Phase 2C-M.*
