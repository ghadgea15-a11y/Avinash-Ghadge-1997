# Log Sheet Muster - User Authentication Data Model (V2 - Enterprise Updated)

**Project Name:** Log Sheet Muster  
**Project Owner:** Avinash Shivaji Ghadge  
**Platform:** Android (Mobile-First)

---

## 1. User Account Architecture
The architecture strictly separates **Identity** (Firebase Authentication) from **Company Roles & HR Data** (Cloud Firestore).
- **Firebase Auth:** Stores only the unique `uid`, email, and password hash. (Phone authentication will be introduced in a later phase).
- **Firestore `/users` Collection:** Acts as the identity root. It no longer contains global roles. It simply exists to link a user to their company memberships.
- **Firestore `/users/{uid}/memberships` Sub-collection:** A scalable architectural pattern to handle multi-company access. Instead of an array, each company gets its own document defining the user's role for *that specific company*.

## 2. Scalable Company Membership & Role Strategy
Roles are **Company-Specific**, not global. 
- A user (like Avinash) might be a "Super Admin" in `Company A`, but only an "Admin" or "Consultant" in `Company B`.
- Instead of using a limited `allowed_companies` array, we use a `memberships` sub-collection. This allows a user to belong to an infinite number of companies without hitting Firestore document size limits.

## 3. Phase 1 Security Enforcement (No Cloud Functions)
Since Cloud Functions will not be used in Phase 1, we cannot use Firebase Custom Claims.
- **How we secure data:** We will use native **Firestore Security Rules**.
- When a user tries to read payroll data for Company A, the Firestore rule will look up: `users/{uid}/memberships/{CompanyA}`. 
- If the document exists and the `role` is `Admin`, the database allows the read. This is highly secure and works perfectly without needing backend server scripts.

## 4. Supervisor Proxy Strategy (For Workers Without Phones)
Not every worker has a smartphone, and we must not force them to create accounts.
- **No Auth Account Required:** Workers without phones will **NOT** have a Firebase Authentication account. 
- **HR Profile Only:** HR will create their profile strictly in the `/companies/{company_id}/employees` collection.
- **Proxy Attendance:** The **Supervisor** or **Incharge** will log into the app using their own Email/Password. They will open their "Site Dashboard", see the list of assigned workers, and click "Mark Present" on behalf of the workers.

## 5. Login Session Flow (Phase 1)
1. User submits Email + Password.
2. Firebase Auth verifies credentials and logs the user in.
3. The app reads the `uid` and queries the `/users/{uid}/memberships` sub-collection.
4. If the user belongs to multiple companies, a "Select Company" screen appears. If only one, it auto-selects.
5. The app reads the user's `role` from the selected membership document.
6. The app fetches the deep HR profile from `/companies/{company_id}/employees/{employee_id}`.
7. The app navigates to the appropriate Role-Based Dashboard (e.g., Admin Dashboard, Supervisor Dashboard).

## 6. User Status Flow (Active, Inactive, Suspended, Deleted)
We use **Soft Deletes** to preserve historical attendance and payroll data.
- **Active:** Normal access.
- **Inactive:** Employee has left the company. Login is blocked. Name remains in historical reports.
- **Suspended:** Temporary block. Login is blocked.
- **Deleted:** The `is_deleted: true` flag is set. The user cannot log in, and their name is hidden from all active UI lists.

---

## 7. Firestore User Collection Blueprint
*Do NOT create these collections in the database yet. This is the updated structural blueprint.*

**1. Collection: `/users`**
*Contains basic identity. No global roles.*
**Document ID:** `{Firebase_Auth_UID}`
```json
{
  "uid": "aB3x9kL2pQ8mZ1vN7cY5",
  "email": "supervisor@example.com",
  "default_company_id": "CMP-001",
  "created_at": "2026-07-01T10:00:00Z"
}
```

**2. Sub-Collection: `/users/{uid}/memberships`**
*Scalable multi-company access and company-specific roles.*
**Document ID:** `{company_id}` (e.g., `CMP-001`)
```json
{
  "company_id": "CMP-001",
  "company_name": "Apex Facility Services",
  "employee_id": "EMP-1001",
  "role": "supervisor",
  "status": "active",
  "joined_at": "2026-07-01T10:00:00Z"
}
```

**3. Collection: `/companies/{company_id}/employees`**
*The actual HR file. Can exist WITHOUT an auth_uid for phoneless workers.*
**Document ID:** `{employee_id}`
```json
{
  "employee_id": "EMP-1001",
  "auth_uid": "aB3x9kL2pQ8mZ1vN7cY5", 
  "first_name": "Rahul",
  "last_name": "Sharma",
  "role": "supervisor",
  "assigned_region_id": "REG-001",
  "assigned_branch_id": "BRN-001",
  "assigned_site_id": "SIT-005",
  "department_id": "DPT-HK",
  "status": "active",
  "base_salary": 15000,
  "joined_date": "2026-07-01"
}
```
*(Note: If this was a phoneless worker, `auth_uid` would simply be `null` or empty).*

---
**Next Step:**
Please review this updated Phase 1 architecture. Confirm in the chat if you approve of these enterprise modifications so we can proceed to the next step.
