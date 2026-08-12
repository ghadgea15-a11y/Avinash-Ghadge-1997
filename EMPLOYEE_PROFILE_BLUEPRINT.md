# Log Sheet Muster - Modular Employee Profile Architecture

**Project Name:** Log Sheet Muster  
**Project Owner:** Avinash Shivaji Ghadge  

To align with strictly modular, enterprise-grade HRMS architecture, we have decoupled the Employee's Core Identity from their Access Control (Roles) and Financial Data (Payroll). 

This ensures that a Site Incharge can view a worker's profile (name, emergency contact, site assignment) without having access to their salary or the ability to change their system permissions.

---

## 1. Core Employee Profile Blueprint
**Collection:** `/companies/{company_id}/employees`  
**Document ID:** `{employee_id}`  
*Purpose: Strictly contains personal and organizational placement data. Contains NO financial or system permission data.*

```json
{
  "employee_id": "EMP-1001",
  "auth_uid": "aB3x9kL2pQ8mZ1vN7cY5", 
  "first_name": "Rahul",
  "last_name": "Sharma",
  "contact_number": "+919876543210",
  "date_of_birth": "1990-05-15",
  "blood_group": "O+",
  "emergency_contact": {
    "name": "Sunita Sharma",
    "relation": "Spouse",
    "phone": "+919876543211"
  },
  "assigned_region_id": "REG-001",
  "assigned_branch_id": "BRN-001",
  "assigned_site_id": "SIT-005",
  "department_id": "DPT-HK",
  "status": "active",
  "joined_date": "2026-07-01",
  "profile_picture_url": "https://storage.googleapis.com/..."
}
```
*(Note: No roles, no salaries, no device IDs. If this is a phoneless worker, `auth_uid` will simply be null/empty).*

---

## 2. Role Assignment Module Blueprint
**Collection:** `/companies/{company_id}/role_assignments`  
**Document ID:** `{employee_id}`  
*Purpose: Completely isolates access control. Only Super Admins, Admins, or HR can read/write this collection.*

```json
{
  "employee_id": "EMP-1001",
  "role": "supervisor",
  "permissions_override": [],
  "assigned_by_employee_id": "EMP-0001",
  "assigned_at": "2026-07-01T10:00:00Z",
  "last_updated_at": "2026-07-01T10:00:00Z"
}
```

---

## 3. Payroll Profile Module Blueprint
**Collection:** `/companies/{company_id}/payroll_profiles`  
**Document ID:** `{employee_id}`  
*Purpose: Completely isolates financial and compliance data. Only HR and Admins can access this collection.*

```json
{
  "employee_id": "EMP-1001",
  "salary_structure": "monthly", 
  "base_salary": 15000,
  "bank_details": {
    "account_name": "Rahul Sharma",
    "account_number": "1234567890",
    "ifsc_code": "HDFC0001234"
  },
  "compliance": {
    "pf_number": "MH/BAN/12345/000",
    "esi_number": "31-00-123456-000-1001",
    "pan_number": "ABCDE1234F"
  },
  "last_updated_at": "2026-07-01T10:00:00Z",
  "last_updated_by_employee_id": "EMP-0050"
}
```

---
**Next Step:**
Please review this highly modular Enterprise HRMS data structure. Confirm in the chat if you approve of this separation of concerns so we can proceed.
