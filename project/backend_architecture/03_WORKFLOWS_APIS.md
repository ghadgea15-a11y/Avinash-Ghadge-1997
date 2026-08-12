# Log Sheet Muster - Business Logic & Workflows

This document outlines the server-side business logic, background processing, and enterprise workflows. These are intended to be implemented using **Firebase Cloud Functions (Node.js/TypeScript)** or standard Android **WorkManager** instances for offline-first operations.

## 1. Core Cloud Functions (Event-Driven Workflows)

### 1.1 HRMS & Attendance
*   **`onAttendanceCreated` (Trigger: Firestore `onCreate` on `attendance`)**
    *   *Logic:* Calculates late arrivals. If `checkIn` time > Shift Start Time + Grace Period, flag as `Late`.
    *   *Notification:* Push notification (FCM) sent to the employee's manager if flagged as Late.
*   **`onLeaveRequestUpdated` (Trigger: Firestore `onUpdate` on `leave_requests`)**
    *   *Logic:* If status changes to `Approved`, push notification sent to the employee. Automatically marks the `attendance` collection for those future dates as `OnLeave`.

### 1.2 Inventory & Operations
*   **`onStockTransactionCreated` (Trigger: Firestore `onCreate` on `stock_transactions`)**
    *   *Logic:* Distributed Counter update. Automatically updates the `currentStock` field in the parent `inventory_items` document. Uses a transaction to prevent race conditions.
    *   *Workflow:* If `currentStock` falls below `reorderLevel`, triggers a "Low Stock Alert" notification to the Inventory Manager and creates a draft `purchase_orders` document.
*   **`onIncidentReported` (Trigger: Firestore `onCreate` on `incident_reports`)**
    *   *Logic:* If `severity` == `High` or `Critical`, immediately send an FCM Broadcast to all System Admins and Security Guards.

### 1.3 System & Audit
*   **`syncUserCustomClaims` (Trigger: Firestore `onWrite` on `users/{uid}/memberships/{companyId}`)**
    *   *Logic:* Reads all active memberships for a user and securely sets their Firebase Auth Custom Claims. This avoids client-side manipulation of roles.
*   **`dailyDatabaseCleanup` (Trigger: Pub/Sub Schedule - Daily at 00:00)**
    *   *Logic:* Auto-checkouts visitors who forgot to check out (sets checkout time to end of day, flags as auto-checkout).

---

## 2. Android Client-Side Workflows (Offline & Sync)

Since the target is native Android, network drops are expected (e.g., basements, remote warehouses).

### 2.1 The "Store and Forward" Pattern
1.  **Action:** Security Guard scans a visitor ID in a no-network zone.
2.  **Local Save:** Jetpack Compose UI writes to Firestore. Firestore caches the write locally. UI instantly reflects success.
3.  **WorkManager Backup (Optional but recommended for media):** If the action includes an image upload (Firebase Storage doesn't cache uploads the same way Firestore caches documents), the URI is saved to a local Room DB table `pending_uploads`.
4.  **Sync Worker:** `BackgroundSyncWorker` listens for `NetworkType.CONNECTED`. It iterates through `pending_uploads`, uploads the image to Firebase Storage, gets the Download URL, and updates the pending Firestore document.

### 2.2 QR Code & ML Kit Workflows
*   **Asset Auditing (Inventory):**
    *   Android CameraX feeds frames to ML Kit Barcode Scanner.
    *   Upon detecting a QR (e.g., `ITEM-XYZ`), query local Firestore cache for `inventory_items/ITEM-XYZ`.
    *   Display item details on screen.
    *   User inputs physical count. App calculates variance and creates a `stock_audits` record.

*   **Touchless Attendance:**
    *   Tablet mounted at reception runs the app in "Kiosk Mode" (Screen pinning).
    *   Employees show their personal QR code (generated in their own mobile app) to the tablet.
    *   Tablet reads QR, logs `attendance` with `checkInLocation` matching the facility coordinates.

---

## 3. Third-Party Integrations (Future-Proofing)

The architecture supports integrating external APIs via Cloud Functions:
*   **Email Gateway:** SendGrid / AWS SES for sending official Payslips to external email addresses.
*   **SMS Gateway:** Twilio / Gupshup for OTP verification or critical incident SMS alerts to offline staff.
*   **ERP Export:** Nightly Pub/Sub function generates CSV extracts of inventory movements and drops them into a secure FTP or Google Cloud Storage bucket for legacy ERP ingestion (e.g., SAP, Tally).
