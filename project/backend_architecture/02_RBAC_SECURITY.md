# Log Sheet Muster - Role-Based Access Control (RBAC) & Security Architecture

The platform uses a hybrid RBAC system leveraging **Firebase Custom Claims** for fast, cost-effective read authorization, combined with **Firestore Document Validation** for strict tenant isolation.

## 1. Authentication Flow & Tenant Assignment

1.  **User Logs In:** Authenticates via Firebase Auth (Email/Password or Biometric).
2.  **Membership Check:** The client app reads `users/{uid}/memberships` to list available companies.
3.  **Context Switching:** User selects a company. The UI sets the active `companyId`.
4.  **Custom Claims Sync (Cloud Function):** Whenever a membership changes, a Cloud Function automatically updates the user's Firebase Auth Custom Claims.

**Example Token Custom Claims payload:**
```json
{
  "companies": {
    "COMP-001": "HR_Manager",
    "COMP-002": "Employee"
  },
  "superAdmin": false
}
```

## 2. Standard Roles & Permission Matrix

Permissions are granular actions. Roles are collections of permissions.

### Available Permissions
*   `read_hrms`, `write_hrms`
*   `read_payroll`, `write_payroll`
*   `read_inventory`, `write_inventory`
*   `read_operations`, `write_operations`
*   `read_billing`, `write_billing`
*   `manage_users`, `manage_roles`, `view_audit_logs`

### Default Role Definitions

| Role | Description | Core Permissions |
| :--- | :--- | :--- |
| **System Admin** | Full access to company settings, users, and billing. | `all` |
| **HR Manager** | Manages employees, attendance, leaves, and payroll. | `read_hrms`, `write_hrms`, `read_payroll`, `write_payroll` |
| **Inventory Mgr**| Manages items, POs, and stock audits. | `read_inventory`, `write_inventory` |
| **Security Guard**| Gate operations, visitor logs, basic incident reporting. | `read_operations`, `write_operations` (restricted context) |
| **Employee** | Self-service view (Own attendance, own payslips). | `read_self`, `write_self` |

## 3. Security Rules Strategy (firestore.rules)

Because reading role documents inside security rules costs database reads, we utilize **Custom Claims** for immediate access validation, falling back to document checks only when strictly necessary.

### Rule Hierarchy
1.  **Authentication Rule:** Must be logged in (`request.auth != null`).
2.  **Tenant Isolation Rule:** User's custom claims must contain the requested `companyId`.
3.  **Module Permission Rule:** User's role inside that `companyId` must map to the required permission.
4.  **Resource Ownership Rule:** (For Employees) If the role is just 'Employee', they can only read/write documents where `employeeId == request.auth.uid`.

### Data Validation Rules (Enforced at DB level)
*   **Immutability:** Audit logs cannot be deleted or modified once created (`allow update, delete: if false`).
*   **Ledger Integrity:** Stock transactions cannot be modified. Adjustments require a new 'ADJUSTMENT' transaction.
*   **State Machines:** Leave requests can only transition `Pending` -> `Approved`/`Rejected`. Once `Approved`, they cannot go back to `Pending`.

## 4. Android Client Security Implementations

*   **Biometric Binding:** On Android, store the Firebase Refresh Token in the EncryptedSharedPreferences, secured by `androidx.biometric`.
*   **Screenshot Prevention:** Apply `FLAG_SECURE` to the Window for highly sensitive screens (Payroll, Admin Settings).
*   **Network Security Configuration:** Strict HTTPS only, Certificate Pinning for external APIs (if any).
*   **Offline Data Security:** Firestore's local SQLite cache is not encrypted by default on Android. On heavily restricted enterprise devices, the entire Android device must have Full Disk Encryption (FDE) or File-Based Encryption (FBE) mandated via Mobile Device Management (MDM).
