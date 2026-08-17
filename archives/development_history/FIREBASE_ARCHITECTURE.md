# Log Sheet Muster - Firebase Backend Architecture

**Project Name:** Log Sheet Muster  
**Project Owner:** Avinash Shivaji Ghadge  
**Platform:** Android (Mobile-First)  
**Business Type:** Facility Management Services  

This document outlines the complete, enterprise-grade Firebase backend architecture. It is designed to be highly secure, scalable to millions of records, and strictly isolates data between different companies.

---

## 1. Firebase Authentication Strategy
**How users log in:**
- **Workers & Supervisors:** Phone Number Authentication (OTP). It is the easiest and most accessible method for ground staff.
- **Management (HR, Admins, Company Owners):** Email and Password Authentication for strict corporate access.
- **Session Management:** Users will remain logged in until they explicitly log out, making daily use frictionless.

## 2. Firestore Database Structure
**How data is organized:**
Firestore is a "NoSQL" database, meaning it stores data in "Documents" (like a digital form) grouped into "Collections" (like a filing cabinet drawer).

We use a **Hierarchical Multi-Tenant Structure**, meaning every piece of company data lives strictly inside that company's folder.

```text
/companies (Collection)
  ├── {Company_Auto_ID} (Document)
  │    ├── company_code: "CMP-001"
  │    ├── name: "Apex Facility Services"
  │    │
  │    ├── /regions (Sub-collection)
  │    │    └── {Region_Auto_ID} -> region_code: "REG-001", name: "North Zone"
  │    │
  │    ├── /branches (Sub-collection)
  │    │    └── {Branch_Auto_ID} -> branch_code: "BRN-001", region_id: "..."
  │    │
  │    ├── /sites (Sub-collection)
  │    │    └── {Site_Auto_ID} -> site_code: "SIT-001", name: "Phoenix Mall"
  │    │
  │    ├── /departments (Sub-collection)
  │    │    └── {Dept_Auto_ID} -> dept_code: "DPT-HR", name: "Housekeeping"
  │    │
  │    ├── /employees (Sub-collection)
  │    │    └── {User_Auth_UID} -> emp_id: "EMP-1001", role: "Worker"
  │    │
  │    ├── /attendance (Sub-collection)
  │    │    └── {Attendance_Auto_ID} -> date: "2026-07-22", status: "Present"
  │    │
  │    ├── /daily_logs (Sub-collection)
  │    ├── /inventory (Sub-collection)
  │    ├── /payroll (Sub-collection)
  │    └── /billing (Sub-collection)

/users (Global Collection - For Authentication mapping only)
  ├── {User_Auth_UID} (Document)
       ├── phone: "+919876543210"
       ├── active_company_id: "Company_Auto_ID"
       └── global_role: "Worker"
```

## 3. Storage Folder Structure
**Where files, photos, and documents live:**
Firebase Cloud Storage will hold physical files. Folders are strictly segregated by Company ID to prevent cross-company data leaks.

```text
/storage
  └── /companies
       └── /{Company_Auto_ID}
            ├── /employee_profiles
            │    └── {User_Auth_UID}.jpg
            ├── /site_assets
            │    └── {Site_Auto_ID}_photo.jpg
            ├── /attendance_selfies
            │    └── YYYY-MM-DD_{User_Auth_UID}.jpg
            └── /documents
                 └── /invoices
```

## 4. Cloud Messaging Strategy
**How push notifications are sent:**
Firebase Cloud Messaging (FCM) will be used to send real-time alerts directly to Android phones.
- **Direct Messages:** Sent directly to a user's phone token (e.g., "Your leave is approved").
- **Topic Subscriptions:** Users automatically subscribe to topics based on their assignment.
  - Example Topic: `site_phoenix_mall_alerts` (Notifies all supervisors at that site).
  - Example Topic: `company_apex_hr_notices` (Broadcasts to all HR personnel in the company).

## 5. Security Rules Strategy
**How data is protected:**
Firestore Security Rules act as a digital bouncer. Even if a hacker finds the database URL, the rules will reject them.
- **Rule 1 (Authentication):** The user MUST be logged in.
- **Rule 2 (Tenant Isolation):** A user can only read/write documents where the URL path matches their assigned `company_id`.
- **Rule 3 (Role Enforcement):** Only users with the "Admin" or "HR" role can write to the `/payroll` collection. Workers can only read their own `/attendance` documents.

## 6. User Identity Strategy
**How we recognize users:**
Every person has one master identity (Firebase Authentication UID). This UID is linked to a global `/users` document that simply points the system to which Company they belong to. Once inside the company, their `/employees` profile dictates their permissions.

## 7. Company Isolation Strategy
**How we keep companies separate:**
This is a true "Multi-Tenant" system. All major collections (Sites, Employees, Attendance) are **Sub-collections** under the master `Company` document. It is mathematically impossible to accidentally query another company's attendance because the database path requires the specific Company ID.

## 8. Role Based Access Strategy
**How we handle permissions:**
We will use **Firebase Custom Claims**. These are hidden, highly secure badges attached to the user's login token. 
- A worker logs in, their token says `{ role: "worker", companyId: "XYZ" }`. 
- An admin logs in, their token says `{ role: "admin", companyId: "XYZ" }`.
The frontend UI will hide buttons (like "Edit Payroll") if the token doesn't have the required role.

## 9. Collection Naming Convention
**How we name database folders:**
- Always **plural**.
- Always **lowercase**.
- Always use **snake_case** (underscores for spaces).
- Examples: `companies`, `daily_logs`, `attendance_records`.

## 10. Document Naming Convention
**How we name individual records:**
- We use **Firebase Auto-IDs** (e.g., `aB3x9kL2pQ8mZ1vN7cY5`) as the actual document name.
- *Why?* Auto-IDs are mathematically guaranteed to be unique and allow the Android app to generate documents while offline without worrying about ID clashes when it reconnects.

## 11. Auto ID Strategy
- **System IDs:** Let Firebase handle generating the complex 20-character IDs.
- **Human IDs:** Store a separate, human-readable field inside the document (like `company_code: "CMP-001"`) for humans to read on the screen.

## 12. Employee ID Strategy
- **Format:** `[Company Prefix]-EMP-[Sequential Number]`
- **Example:** `APX-EMP-1001`
- *How it works:* A secure Cloud Function will automatically increment a counter every time a new employee is added, assigning them the next logical number so HR can easily track them.

## 13. Company Code Strategy
- **Format:** 3 to 4 Uppercase Letters + Number
- **Example:** `APX-01` (Apex Facility Services)
- Unique shortcodes help identify the company quickly on invoices and reports.

## 14. Site Code Strategy
- **Format:** `SIT-[Region Code]-[Sequential Number]`
- **Example:** `SIT-NRT-005` (Site 5 in the North Region).
- Helps map physical locations logically.

## 15. Region Code Strategy
- **Format:** 3-Letter directional or geographical abbreviation.
- **Example:** `NRT` (North), `SOU` (South), `WST` (West).

## 16. Department Code Strategy
- **Format:** `DPT-[Short Name]`
- **Example:** `DPT-HK` (Housekeeping), `DPT-SEC` (Security), `DPT-HR` (Human Resources).

## 17. Attendance Record Strategy
**How attendance is stored efficiently:**
Instead of one massive list, attendance is stored as individual daily documents.
- **Document ID:** Auto-generated.
- **Fields:** `date` (YYYY-MM-DD), `employee_id`, `site_id`, `check_in_time`, `check_out_time`, `mode` (Self/Supervisor/Incharge), `gps_location`.
- *Benefit:* This allows lighting-fast queries like "Get all attendance for Site X on Date Y".

## 18. Payroll Record Strategy
**How we manage salaries:**
Payroll relies on "Aggregated Documents". 
Instead of calculating salary every time the user opens the app (which costs database reads and slows down the app), a Cloud Function will run every night, summarize the attendance, and update a single `Monthly_Payroll_Summary` document for each employee.

## 19. Log Book Record Strategy
**How daily facility logs are handled:**
For things like "Visitor Logs" or "Material Movement", we use daily documents.
- Document: `logs/YYYY-MM-DD`
- Inside the document: An array or sub-collection of timestamps and notes.
- This prevents the database from getting bloated and makes generating daily PDF reports instantaneous.

## 20. Backup Strategy
**How we prevent data loss:**
- **Automated Backups:** We will configure Google Cloud to automatically take daily snapshot backups of the entire Firestore database and store them in a secure Cloud Storage bucket.

## 21. Disaster Recovery Strategy
**What happens if a server fails:**
- Firestore is inherently multi-regional. Data is mirrored across multiple physical Google data centers automatically. 
- We will enable **Point-in-Time Recovery (PITR)**, allowing the Super Admin (Avinash) to literally rewind the database to any exact minute within the last 7 days in case someone accidentally deletes a massive amount of data.

## 22. Offline Synchronization Strategy
**How the app works without the internet:**
- Firestore's **Offline Persistence** will be enabled in the Android app.
- If a supervisor is in a basement with no internet, they can still mark 50 workers present. The app saves this locally.
- The moment the supervisor walks outside and gets 4G/5G, the app automatically syncs all 50 records to the cloud in the background.

## 23. Performance Optimization Strategy
**How we keep the app lightning fast:**
- **Pagination:** We will never load "All Employees" at once. We load them 20 at a time as the user scrolls.
- **Indexes:** We will create custom Firestore Indexes so that complex filters (e.g., "Show me absent workers in Housekeeping at Phoenix Mall today") return results in milliseconds.
- **Shallow Queries:** We only fetch the minimal data needed for lists, fetching heavy data (like photos) only when a profile is clicked.

## 24. Enterprise Scalability Strategy
**How we handle unlimited companies:**
- Because of the `companies/{Company_ID}/...` folder structure, Company A's data processing has absolutely zero impact on Company B. 
- If one company has 10,000 employees marking attendance at 9:00 AM, Firestore automatically scales its server power to handle the spike without affecting other companies.
- No single document will grow too large (Firestore has a 1MB limit per document), because we use sub-collections for infinitely growing data like attendance and logs.
