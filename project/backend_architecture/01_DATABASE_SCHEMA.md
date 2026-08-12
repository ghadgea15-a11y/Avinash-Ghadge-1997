# Log Sheet Muster - Complete Firestore Database Schema

This document defines the production-ready NoSQL schema for the Log Sheet Muster platform. The database is designed for **Multi-Tenancy (Multi-Company Isolation)**, **Offline Persistence**, and **High Scalability**.

## 1. Global Collections (Root Level)

### `users` (Collection)
Stores global identity information. Authentication handles login, but this document stores profile data.
*   **Document ID:** `uid` (from Firebase Auth)
*   **Fields:**
    *   `email`: String
    *   `name`: String
    *   `phone`: String (Optional)
    *   `fcmTokens`: Array of Strings (For push notifications to multiple devices)
    *   `createdAt`: Timestamp
    *   `updatedAt`: Timestamp

#### `users/{uid}/memberships` (Subcollection)
Defines which companies a user belongs to and their role in that company.
*   **Document ID:** `companyId`
*   **Fields:**
    *   `companyId`: String (Reference to companies collection)
    *   `companyName`: String (Denormalized for quick UI rendering)
    *   `roleId`: String (e.g., 'Admin', 'HR_Manager', 'Security_Guard')
    *   `status`: String Enum ('Active', 'Suspended', 'Pending')
    *   `createdAt`: Timestamp

### `company_codes` (Collection)
Used for validation during employee onboarding/login.
*   **Document ID:** `code` (e.g., 'ACME-2026')
*   **Fields:**
    *   `companyId`: String
    *   `companyName`: String
    *   `active`: Boolean
    *   `expiresAt`: Timestamp (Optional)

---

## 2. Tenant Collections (Multi-Company Isolation)

All business data exists inside the `companies` collection to guarantee strict isolation.

### `companies` (Collection)
*   **Document ID:** `companyId` (Auto-generated or custom code)
*   **Fields:**
    *   `name`: String
    *   `registrationNumber`: String
    *   `industry`: String
    *   `subscriptionPlan`: String Enum ('Basic', 'Enterprise')
    *   `settings`: Map (Timezone, Date Format, Currency)
    *   `createdAt`: Timestamp
    *   `updatedAt`: Timestamp

---

### 2.1 HRMS & Payroll (Subcollections under `companies/{companyId}`)

#### `employees`
*   **Document ID:** `employeeId` (Usually mapping to `uid` or a custom employee code)
*   **Fields:**
    *   `userId`: String (Reference to global `users.uid`)
    *   `employeeCode`: String
    *   `departmentId`: String
    *   `designationId`: String
    *   `status`: String Enum ('Active', 'OnLeave', 'Terminated')
    *   `joiningDate`: Timestamp
    *   `managerId`: String (Self-reference to `employees`)

#### `attendance`
Designed for querying by date and employee.
*   **Document ID:** `ATT-{YYYYMMDD}-{employeeId}`
*   **Fields:**
    *   `employeeId`: String
    *   `date`: String ('YYYY-MM-DD')
    *   `checkIn`: Timestamp
    *   `checkOut`: Timestamp (Nullable)
    *   `checkInLocation`: GeoPoint (GPS coordinates)
    *   `checkOutLocation`: GeoPoint (GPS coordinates)
    *   `checkInPhotoUrl`: String (Optional, for selfie attendance)
    *   `status`: String Enum ('Present', 'Absent', 'HalfDay', 'Late')
    *   `workHours`: Number

#### `leave_requests`
*   **Document ID:** Auto-generated
*   **Fields:**
    *   `employeeId`: String
    *   `type`: String Enum ('Annual', 'Sick', 'Unpaid', 'Maternity')
    *   `startDate`: Timestamp
    *   `endDate`: Timestamp
    *   `status`: String Enum ('Pending', 'Approved', 'Rejected', 'Cancelled')
    *   `approvedBy`: String (EmployeeId of manager)
    *   `reason`: String
    *   `attachmentUrl`: String (Medical certificate, etc.)

#### `payslips`
*   **Document ID:** `PS-{YYYYMM}-{employeeId}`
*   **Fields:**
    *   `employeeId`: String
    *   `payrollRunId`: String
    *   `period`: String ('YYYY-MM')
    *   `baseSalary`: Number
    *   `allowances`: Map (e.g., `{ housing: 500, transport: 200 }`)
    *   `deductions`: Map (e.g., `{ tax: 150, unpaidLeave: 100 }`)
    *   `netPay`: Number
    *   `status`: String Enum ('Draft', 'Finalized', 'Paid')
    *   `pdfUrl`: String (Link to generated PDF in Storage)

---

### 2.2 Inventory & Operations (Subcollections under `companies/{companyId}`)

#### `inventory_items`
*   **Document ID:** `itemId` (or SKU/Barcode)
*   **Fields:**
    *   `name`: String
    *   `category`: String
    *   `sku`: String (Used for QR/Barcode scanning)
    *   `currentStock`: Number
    *   `reorderLevel`: Number
    *   `unit`: String ('kg', 'pcs', 'liters')
    *   `locationId`: String (Warehouse/Shelf identifier)

#### `stock_transactions`
Append-only ledger for all stock movements.
*   **Document ID:** Auto-generated
*   **Fields:**
    *   `itemId`: String
    *   `type`: String Enum ('IN', 'OUT', 'ADJUSTMENT')
    *   `quantity`: Number
    *   `referenceId`: String (PO Number, Incident ID)
    *   `performedBy`: String (UserId)
    *   `timestamp`: Timestamp
    *   `notes`: String

#### `visitor_logs`
Used by Security Gate modules (tablet scanning).
*   **Document ID:** Auto-generated
*   **Fields:**
    *   `visitorName`: String
    *   `phone`: String
    *   `purpose`: String
    *   `hostEmployeeId`: String
    *   `checkIn`: Timestamp
    *   `checkOut`: Timestamp (Nullable)
    *   `idProofUrl`: String (Photo of ID)
    *   `visitorPhotoUrl`: String (Photo of visitor)
    *   `qrCode`: String (Generated QR for exit scan)

#### `incident_reports`
*   **Document ID:** Auto-generated
*   **Fields:**
    *   `title`: String
    *   `description`: String
    *   `severity`: String Enum ('Low', 'Medium', 'High', 'Critical')
    *   `reportedBy`: String (UserId)
    *   `location`: GeoPoint (GPS where incident occurred)
    *   `status`: String Enum ('Open', 'Investigating', 'Resolved')
    *   `mediaUrls`: Array of Strings (Photos/Videos)
    *   `timestamp`: Timestamp

---

### 2.3 System & Audit (Subcollections under `companies/{companyId}`)

#### `roles` (RBAC Definitions)
*   **Document ID:** `roleId` (e.g., 'HR_Manager')
*   **Fields:**
    *   `name`: String
    *   `permissions`: Array of Strings (e.g., `['read_hrms', 'write_attendance']`)

#### `audit_logs`
*   **Document ID:** Auto-generated
*   **Fields:**
    *   `userId`: String
    *   `action`: String (e.g., 'DELETE_INVENTORY_ITEM', 'APPROVE_LEAVE')
    *   `resourceId`: String
    *   `timestamp`: Timestamp
    *   `ipAddress`: String (Optional, tracked via Cloud Functions)
    *   `metadata`: Map (Previous state vs New state)

---

## 3. Recommended Firestore Indexes (composite indexes)
To ensure optimal performance for complex queries, the following composite indexes should be deployed via `firestore.indexes.json`:

*   **attendance**: `employeeId` (ASC), `date` (DESC)
*   **leave_requests**: `employeeId` (ASC), `status` (ASC), `startDate` (DESC)
*   **stock_transactions**: `itemId` (ASC), `timestamp` (DESC)
*   **incident_reports**: `status` (ASC), `severity` (DESC), `timestamp` (DESC)
*   **visitor_logs**: `checkOut` (ASC), `checkIn` (DESC) - *Used for finding currently checked-in visitors.*
