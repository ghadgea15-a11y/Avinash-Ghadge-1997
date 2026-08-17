# Log Sheet Muster - Firestore Master Collection List

**Project Name:** Log Sheet Muster  
**Project Owner:** Avinash Shivaji Ghadge  

Architecture Status: **FROZEN (Pending Collection Additions)**

---

## Evaluation: `/users/{uid}/memberships` vs Top-Level `/company_memberships`

**1. Scalability:** Both scale infinitely. Firestore handles top-level collections and subcollections with the exact same performance characteristics.
**2. Security:** 
- *Subcollection:* Inherently secure. A rule simply states `allow read if request.auth.uid == uid`. Absolute isolation per user.
- *Top-Level:* Requires strict query constraints `where("uid", "==", request.auth.uid)` and slightly more complex rules to prevent cross-user leakage.
**3. Query Performance:**
- *Subcollection:* Lightning fast for the primary use case (Login Routing: "Which companies can this user access?"). Poor for querying "Who are all the users in Company A?" (Requires Collection Group Queries).
- *Top-Level:* Excellent for querying both directions.
**4. Maintenance:** Top-level is easier to globally audit. Subcollections ensure user data is easily deleted if a user requests account deletion.

**Recommendation:** Keep it as a **Subcollection (`/users/{uid}/memberships`)**.
**Reason:** In our approved enterprise architecture, the `/companies/{company_id}/role_assignments` collection already perfectly handles the "Who is in this company?" query. The membership collection's *only* purpose is to serve as an Identity Router during the initial login phase. A subcollection tied directly to the `uid` provides the strictest security boundary for this specific task.

---

## 1. Global Collections

### `/users`
1. **Why it exists:** Core identity routing. Links a Firebase Auth UID to the user's company memberships.
2. **Parent collection:** Root
3. **Child collections:** `/memberships`
4. **Estimated document count:** 1 per human user (Scales to Millions)
5. **Access roles:** User (Read own), Super Admin (Read All)
6. **Searchable:** By email or phone.
7. **Indexes:** `email`, `phone_number`

### `/users/{uid}/memberships`
1. **Why it exists:** Determines which companies a user can log into.
2. **Parent collection:** `/users`
3. **Child collections:** None
4. **Estimated document count:** 1-5 per user.
5. **Access roles:** User (Read own)
6. **Searchable:** No.
7. **Indexes:** None required (simple fetch).

### `/company_codes`
1. **Why it exists:** Public registry to validate a company code before the user logs in.
2. **Parent collection:** Root
3. **Child collections:** None
4. **Estimated document count:** 1 per registered company.
5. **Access roles:** Public (Read Only), Super Admin (Write)
6. **Searchable:** Exact match only.
7. **Indexes:** `company_code`

---

## 2. Company Collections

### `/companies`
1. **Why it exists:** Master tenant record. Contains company name, logo, and global preferences.
2. **Parent collection:** Root
3. **Child collections:** All company-specific data (regions, employees, attendance, etc.)
4. **Estimated document count:** 1 per client company.
5. **Access roles:** Admin (Read/Update), Super Admin (Read/Write)
6. **Searchable:** Yes (by Company Name).
7. **Indexes:** `company_name`, `status`

### `/companies/{company_id}/regions`
1. **Why it exists:** Geographical hierarchy (e.g., North Zone, South Zone).
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 5-50 per company.
5. **Access roles:** Admin/HR (Write), All Employees (Read)
6. **Searchable:** No (dropdown list).
7. **Indexes:** `region_name`

### `/companies/{company_id}/branches`
1. **Why it exists:** Sub-division of regions.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 10-100 per company.
5. **Access roles:** Admin/HR (Write), All Employees (Read)
6. **Searchable:** Yes.
7. **Indexes:** `region_id`

### `/companies/{company_id}/sites`
1. **Why it exists:** Physical facility locations where attendance happens.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 50-5,000 per company.
5. **Access roles:** Admin/Manager (Write), Supervisor/Worker (Read assigned)
6. **Searchable:** Yes.
7. **Indexes:** `branch_id`, `site_name`

### `/companies/{company_id}/departments`
1. **Why it exists:** Categorizes workers (e.g., Security, Housekeeping).
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 10-50 per company.
5. **Access roles:** Admin/HR (Write), All Employees (Read)
6. **Searchable:** No.
7. **Indexes:** None.

### `/companies/{company_id}/designations` (NEW)
1. **Why it exists:** Standardized job titles (e.g., Senior Guard, Head Janitor).
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 20-100 per company.
5. **Access roles:** Admin/HR (Write), All Employees (Read)
6. **Searchable:** Yes.
7. **Indexes:** `department_id`

---

## 3. HRMS Collections

### `/companies/{company_id}/employees`
1. **Why it exists:** Core HR profile (Personal info, placements). No roles or payroll.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 100-100,000+ per company.
5. **Access roles:** HR/Admin (Write), Incharge/Supervisor (Read assigned only)
6. **Searchable:** Yes (by name, phone, employee ID).
7. **Indexes:** `site_id`, `department_id`, `first_name`, `status`

### `/companies/{company_id}/role_assignments`
1. **Why it exists:** Strictly controls what a user can do inside this company.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 1 per employee.
5. **Access roles:** Admin/HR (Read/Write). Hidden from standard workers.
6. **Searchable:** Yes.
7. **Indexes:** `role`, `assigned_by`

### `/companies/{company_id}/documents` (NEW)
1. **Why it exists:** Tracks KYC, Aadhar, PAN, and compliance documents for employees.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 3-5 per employee.
5. **Access roles:** HR (Write), Employee (Read Own)
6. **Searchable:** No.
7. **Indexes:** `employee_id`, `document_type`

### `/companies/{company_id}/leave_requests`
1. **Why it exists:** Employee leave applications and approval workflows.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 5-20 per employee per year.
5. **Access roles:** Employee (Write Own), Manager/HR (Approve/Reject)
6. **Searchable:** Yes.
7. **Indexes:** `employee_id`, `status`, `start_date`

### `/companies/{company_id}/shifts` (NEW)
1. **Why it exists:** Defines shift timings, grace periods, and rotational schedules.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 10-50 per company.
5. **Access roles:** HR/Manager (Write), Supervisor/Worker (Read)
6. **Searchable:** No.
7. **Indexes:** `site_id`

---

## 4. Attendance Collections

### `/companies/{company_id}/attendance_logs`
1. **Why it exists:** Raw, immutable punches (Clock In/Out, GPS, Photo URL).
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 2 per employee per day (Massive volume).
5. **Access roles:** Employee/Supervisor (Write), Manager/HR (Read)
6. **Searchable:** Filterable by date and site.
7. **Indexes:** `date` + `site_id`, `employee_id` + `date`

### `/companies/{company_id}/attendance_summaries`
1. **Why it exists:** Rolled-up daily/monthly data to make dashboard loading instant.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 1 per employee per month.
5. **Access roles:** HR/Manager (Read/Write)
6. **Searchable:** No.
7. **Indexes:** `employee_id`, `month_year`

### `/companies/{company_id}/site_muster_rolls`
1. **Why it exists:** Daily register for a specific site. Used by supervisors for proxy attendance.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 1 per site per day.
5. **Access roles:** Supervisor/Incharge (Write), HR (Read)
6. **Searchable:** Filterable by date.
7. **Indexes:** `site_id` + `date`

### `/companies/{company_id}/attendance_devices` (NEW)
1. **Why it exists:** Registers authorized mobile phones or biometric devices per site to prevent spoofing.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 1-5 per site.
5. **Access roles:** Admin (Write), System (Read)
6. **Searchable:** No.
7. **Indexes:** `device_id`, `site_id`

---

## 5. Payroll Collections

### `/companies/{company_id}/payroll_profiles`
1. **Why it exists:** Financial data, bank details, PF/ESI numbers.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 1 per employee.
5. **Access roles:** HR/Admin (Read/Write)
6. **Searchable:** Yes.
7. **Indexes:** `employee_id`

### `/companies/{company_id}/salary_structures` (NEW)
1. **Why it exists:** Formulas for basic, HRA, DA, PF deductions, overtime rates.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 10-50 per company.
5. **Access roles:** Admin/HR (Read/Write)
6. **Searchable:** No.
7. **Indexes:** None.

### `/companies/{company_id}/salary_slips`
1. **Why it exists:** Generated monthly payslips.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 1 per employee per month.
5. **Access roles:** HR (Write), Employee (Read Own)
6. **Searchable:** Filterable by month.
7. **Indexes:** `employee_id`, `month_year`

### `/companies/{company_id}/advances_and_deductions`
1. **Why it exists:** Tracks loans, uniform deductions, or bonuses.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** Occasional (per event).
5. **Access roles:** HR/Admin (Write), Employee (Read Own)
6. **Searchable:** Yes.
7. **Indexes:** `employee_id`, `status`

---

## 6. Inventory & Asset Collections

### `/companies/{company_id}/inventory_items`
1. **Why it exists:** Master catalog of consumables (e.g., Cleaning Liquid, Brooms).
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 500-2,000 per company.
5. **Access roles:** Admin/Inventory Manager (Write), Supervisor (Read)
6. **Searchable:** Yes.
7. **Indexes:** `category`, `item_name`

### `/companies/{company_id}/site_inventory`
1. **Why it exists:** Current stock levels at specific sites.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** Items * Sites.
5. **Access roles:** Supervisor (Update usage), Inventory Manager (Read/Write)
6. **Searchable:** Yes.
7. **Indexes:** `site_id`, `item_id`

### `/companies/{company_id}/inventory_transactions`
1. **Why it exists:** Ledger of issuance, returns, and consumption.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** High volume (Daily logs).
5. **Access roles:** Supervisor/Manager (Write)
6. **Searchable:** Yes.
7. **Indexes:** `site_id`, `date`

### `/companies/{company_id}/assets` (NEW)
1. **Why it exists:** Tracks fixed/capital assets (e.g., Floor Cleaning Machines, Vehicles) with serial numbers.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 100-5,000 per company.
5. **Access roles:** Admin/Manager (Write), Supervisor (Read)
6. **Searchable:** Yes (by serial number).
7. **Indexes:** `site_id`, `status`, `serial_number`

### `/companies/{company_id}/vendors` (NEW)
1. **Why it exists:** Suppliers who provide inventory and assets.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 50-200 per company.
5. **Access roles:** Admin/Purchase Manager (Read/Write)
6. **Searchable:** Yes.
7. **Indexes:** `category`, `vendor_name`

---

## 7. Billing Collections

### `/companies/{company_id}/clients` (NEW)
1. **Why it exists:** Customer details (the entities who own the Sites you manage).
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 10-500 per company.
5. **Access roles:** Admin/Billing (Read/Write)
6. **Searchable:** Yes.
7. **Indexes:** `client_name`

### `/companies/{company_id}/contracts` (NEW)
1. **Why it exists:** Service agreements defining billing rates, manpower requirements, and SLA terms.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 1-5 per client.
5. **Access roles:** Admin (Read/Write)
6. **Searchable:** Yes.
7. **Indexes:** `client_id`, `expiry_date`

### `/companies/{company_id}/invoices`
1. **Why it exists:** Generated bills for services rendered.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 1 per client per month.
5. **Access roles:** Billing/Admin (Write), Client (Read - if client portal exists)
6. **Searchable:** Yes.
7. **Indexes:** `client_id`, `status`, `issue_date`

### `/companies/{company_id}/payments`
1. **Why it exists:** Receipts against invoices.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** Matches invoice volume.
5. **Access roles:** Billing/Admin (Write)
6. **Searchable:** Yes.
7. **Indexes:** `invoice_id`, `payment_date`

---

## 8. Log & Task Collections

### `/companies/{company_id}/daily_site_logs`
1. **Why it exists:** Routine facility observations and checklist completions.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 1 per site per day.
5. **Access roles:** Supervisor (Write), Manager (Read)
6. **Searchable:** Filterable by date/site.
7. **Indexes:** `site_id`, `date`

### `/companies/{company_id}/incident_reports`
1. **Why it exists:** Formal logging of accidents, damages, or security breaches.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** Occasional.
5. **Access roles:** Supervisor (Write), Admin/Manager (Read/Write)
6. **Searchable:** Yes.
7. **Indexes:** `site_id`, `severity`, `status`

### `/companies/{company_id}/visitor_logs`
1. **Why it exists:** Gate entries and exits for visitors/vendors.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** Very high volume at large sites.
5. **Access roles:** Security Guard (Write), Manager (Read)
6. **Searchable:** Yes (by phone or name).
7. **Indexes:** `site_id`, `date`, `visitor_phone`

### `/companies/{company_id}/material_movement_logs`
1. **Why it exists:** Gate passes for inward/outward asset movement.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** High volume.
5. **Access roles:** Security Guard/Supervisor (Write)
6. **Searchable:** Yes.
7. **Indexes:** `site_id`, `date`, `gate_pass_number`

### `/companies/{company_id}/tasks` (NEW)
1. **Why it exists:** Helpdesk tickets, maintenance requests, ad-hoc jobs.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** High volume.
5. **Access roles:** Any Employee (Write), Assigned Worker (Update), Manager (Read)
6. **Searchable:** Yes.
7. **Indexes:** `site_id`, `status`, `assigned_to`

---

## 9. Notification Collections

### `/companies/{company_id}/notifications`
1. **Why it exists:** Targeted in-app alerts for specific users (e.g., "Leave Approved").
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** High volume. Automatically deleted after 30 days.
5. **Access roles:** System (Write), Employee (Read Own)
6. **Searchable:** No.
7. **Indexes:** `user_id`, `is_read`, `created_at`

### `/companies/{company_id}/announcements`
1. **Why it exists:** Broadcast messages to regions or sites.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** Low volume.
5. **Access roles:** HR/Admin (Write), All Employees (Read)
6. **Searchable:** No.
7. **Indexes:** `target_audience`, `created_at`

---

## 10. Settings Collections

### `/companies/{company_id}/system_settings`
1. **Why it exists:** Feature toggles, custom rules, global app preferences (e.g., "Enable Geo-fencing: True").
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** 1 document (Singleton).
5. **Access roles:** Admin/Super Admin (Read/Write), System (Read)
6. **Searchable:** No.
7. **Indexes:** None.

### `/companies/{company_id}/audit_logs`
1. **Why it exists:** Immutable security tracking of who changed what and when.
2. **Parent collection:** `/companies`
3. **Child collections:** None
4. **Estimated document count:** Massive volume. Archived every 90 days.
5. **Access roles:** System (Write), Super Admin (Read)
6. **Searchable:** Filterable by user/action.
7. **Indexes:** `action_by_uid`, `timestamp`, `action_type`
