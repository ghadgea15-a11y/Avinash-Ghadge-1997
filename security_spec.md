# Log Sheet Muster (LSM) - Firebase Security Spec (TDD)

This security specification defines the access control invariants, the malicious "Dirty Dozen" payload vectors, and testing patterns for the Log Sheet Muster Android & Web multi-tenant database structure.

---

## 1. Multi-Tenant Data Invariants

1. **Strict Tenant Partitioning**:
   * All company-specific data resides in `/companies/{companyId}/...` subcollections or `/attendance_{companyId}/...` dynamic collections.
   * Access is strictly bound to the logged-in user's active membership inside `/users/{uid}/memberships/{companyId}`.
   * A user has no access to any resource under `companyId` if they do not have a valid, active membership document under `/users/{uid}/memberships/{companyId}`.

2. **Role-Based Privilege Separation (RBAC)**:
   * **Super Admin (`SUPER_ADMIN`)**: Absolute read/write across all collections globally.
   * **Company Admin (`ADMIN`, `COMPANY_ADMIN`)**: Full read/write inside their `companyId` boundaries (can manage employees, regions, payroll, inventory, billing).
   * **Manager / Supervisor (`MANAGER`, `SUPERVISOR`)**: Can read and write/edit employees and attendance records, log daily events, view inventory, and submit daily muster rolls. They cannot edit billing or final payroll parameters.
   * **Worker / Guard (`WORKER`, `GUARD`)**: Can read their own profile, register their own attendance check-ins, view their own leave requests, and see global company announcements. They cannot read payroll summaries or manage other users.

3. **Immutability and Server Timestamps**:
   * Core identity markers like `uid`, `employeeId`, and `companyId` are immutable once created.
   * Creation and update timestamps (`createdAt`, `updatedAt`) must strictly match `request.time` (the Firestore server-side time). Client-provided values must be rejected.

4. **Kyc & PII Isolation**:
   * Personal identification metrics (Aadhaar, blood group, contact numbers) stored in `/companies/{companyId}/employees/{employeeId}` are only visible to the employee themselves or managers/admins of that company.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following specific JSON payloads are designed to test and break security boundaries. They must always return `PERMISSION_DENIED` under the new rules.

### Payload 1: Identity Spoofing (Write to another profile)
* **Target Path**: `/users/VICTIM_UID`
* **Logged-in User**: `ATTACKER_UID` (Regular Worker)
* **Intent**: Overwrite someone else's global profile.
* **Payload**:
```json
{
  "uid": "VICTIM_UID",
  "email": "attacker@spam.com",
  "default_company_id": "CMP-999",
  "role": "SUPER_ADMIN"
}
```

### Payload 2: Self-Assigned Role Privilege Escalation
* **Target Path**: `/users/ATTACKER_UID/memberships/CMP-101`
* **Logged-in User**: `ATTACKER_UID`
* **Intent**: Elevate own role to `ADMIN` during membership creation.
* **Payload**:
```json
{
  "company_id": "CMP-101",
  "company_name": "Apex Facility Services",
  "role": "SUPER_ADMIN",
  "status": "active"
}
```

### Payload 3: Tenant Cross-Talk Employee Scraping
* **Target Path**: `/companies/COMPANY_B/employees/EMP-500` (Individual Get or List)
* **Logged-in User**: `COMPANY_A_SUPERVISOR_UID` (has membership in `COMPANY_A` only)
* **Intent**: Extract employee PII from an independent tenant.
* **Query/Payload**:
```text
GET /companies/COMPANY_B/employees/EMP-500
```

### Payload 4: Orphaned / Fabricated Employee Entry
* **Target Path**: `/companies/COMPANY_A/employees/EMP-ROUE`
* **Logged-in User**: `COMPANY_B_SUPERVISOR_UID`
* **Intent**: Add an unauthorized worker profile to another company's records.
* **Payload**:
```json
{
  "employee_id": "EMP-ROUE",
  "first_name": "Ghost",
  "last_name": "Worker",
  "role": "worker",
  "status": "active"
}
```

### Payload 5: Rogue Dynamic Attendance Write
* **Target Path**: `/attendance_COMPANY_B/ATT-FRAUD`
* **Logged-in User**: `COMPANY_A_GUARD_UID` (not in `COMPANY_B`'s membership)
* **Intent**: Write high-frequency fraudulent logs into another tenant's dynamic root collection.
* **Payload**:
```json
{
  "logId": "ATT-FRAUD",
  "userId": "COMPANY_A_GUARD_UID",
  "employeeId": "EMP-1111",
  "action": "PUNCH_IN",
  "timestamp": "2026-08-12T11:00:00Z"
}
```

### Payload 6: Default Company Escape (Shadow Update)
* **Target Path**: `/users/ATTACKER_UID`
* **Logged-in User**: `ATTACKER_UID`
* **Intent**: Link self to a company where they have no active membership.
* **Payload**:
```json
{
  "default_company_id": "COMPANY_B"
}
```

### Payload 7: Direct Payroll Parameter Overwrite
* **Target Path**: `/companies/COMPANY_A/payroll_profiles/EMP-1001`
* **Logged-in User**: `ATTACKER_UID` (Regular Employee `EMP-1001` with no Admin privileges)
* **Intent**: Alter salary parameters directly from client.
* **Payload**:
```json
{
  "employeeId": "EMP-1001",
  "baseSalary": 500000,
  "currency": "INR"
}
```

### Payload 8: Denial of Wallet (Resource Poisoning via ID)
* **Target Path**: `/companies/COMPANY_A/employees/EMP_VERY_LONG_ID_CONTAINING_10KB_OF_GARBAGE_CHARACTERS`
* **Logged-in User**: `COMPANY_A_ADMIN_UID`
* **Intent**: Inflate storage index size using highly bloated document IDs.
* **Payload**:
```json
{
  "employee_id": "EMP-1001",
  "first_name": "Valid Name"
}
```

### Payload 9: Temporal Spoofing (Backdated Attendance Logs)
* **Target Path**: `/companies/COMPANY_A/attendance_logs/ATT-999`
* **Logged-in User**: `COMPANY_A_GUARD_UID`
* **Intent**: Backdate a check-in record to claim overtime.
* **Payload**:
```json
{
  "logId": "ATT-999",
  "employeeId": "EMP-1001",
  "timestamp": "2026-01-01T08:00:00Z",
  "action": "PUNCH_IN"
}
```

### Payload 10: Unauthorized State Override for Suspended User
* **Target Path**: `/companies/COMPANY_A/employees/EMP-SUSPENDED`
* **Logged-in User**: `EMP-SUSPENDED` (User themselves trying to reactivate their own card)
* **Intent**: Remove administrative lock on account status.
* **Payload**:
```json
{
  "status": "ACTIVE"
}
```

### Payload 11: Cross-Tenant Inventory Sabotage
* **Target Path**: `/companies/COMPANY_B/inventory_items/INV-999`
* **Logged-in User**: `COMPANY_A_SUPERVISOR_UID`
* **Intent**: Modify quantities or delete material stocks of a competitor tenant.
* **Payload**:
```json
{
  "stock": 0,
  "name": "Damaged Laptop"
}
```

### Payload 12: Fraudulent Membership Insertion
* **Target Path**: `/users/VICTIM_UID/memberships/COMPANY_A`
* **Logged-in User**: `ATTACKER_UID` (Regular employee)
* **Intent**: Fabricate a high-level admin role document inside another user's folder.
* **Payload**:
```json
{
  "company_id": "COMPANY_A",
  "role": "super_admin",
  "status": "active"
}
```

---

## 3. Test Runner Design Blueprint

This complete test runner script targets the Firestore rules emulator using `@firebase/rules-unit-testing`.

```typescript
import * as testing from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

const PROJECT_ID = 'log-sheet-muster-tdd';

describe('Log Sheet Muster - Firestore Security Rules TDD', () => {
  let dbProvider: any;

  beforeAll(async () => {
    const rulesContent = readFileSync('firestore.rules', 'utf8');
    await testing.loadFirestoreRules({
      projectId: PROJECT_ID,
      rules: rulesContent,
    });
  });

  afterEach(async () => {
    await testing.clearFirestoreData({ projectId: PROJECT_ID });
  });

  function getFirestore(auth: { uid: string; email?: string; email_verified?: boolean } | null) {
    return testing.initializeTestApp({
      projectId: PROJECT_ID,
      auth: auth,
    }).firestore();
  }

  it('Payload 1: Identity Spoofing must be BLOCKED', async () => {
    const db = getFirestore({ uid: 'ATTACKER_UID', email: 'attacker@test.com', email_verified: true });
    const ref = db.collection('users').doc('VICTIM_UID');
    await testing.assertFails(ref.set({
      uid: 'VICTIM_UID',
      email: 'attacker@spam.com',
      default_company_id: 'CMP-999',
      role: 'SUPER_ADMIN'
    }));
  });

  it('Payload 2: Self-Assigned Role Privilege Escalation must be BLOCKED', async () => {
    const db = getFirestore({ uid: 'ATTACKER_UID', email: 'attacker@test.com', email_verified: true });
    const ref = db.collection('users').doc('ATTACKER_UID').collection('memberships').doc('CMP-101');
    await testing.assertFails(ref.set({
      company_id: 'CMP-101',
      company_name: 'Apex Facility Services',
      role: 'SUPER_ADMIN',
      status: 'active'
    }));
  });

  it('Payload 3: Tenant Cross-Talk Employee Scraping must be BLOCKED', async () => {
    // Attacker belongs only to COMPANY_A
    const db = getFirestore({ uid: 'ATTACKER_UID', email: 'attacker@test.com', email_verified: true });
    
    // Seed attacker's membership in COMPANY_A
    const adminDb = testing.initializeAdminApp({ projectId: PROJECT_ID }).firestore();
    await adminDb.collection('users').doc('ATTACKER_UID').collection('memberships').doc('COMPANY_A').set({
      company_id: 'COMPANY_A',
      role: 'supervisor'
    });

    // Attempt to read COMPANY_B
    const ref = db.collection('companies').doc('COMPANY_B').collection('employees').doc('EMP-500');
    await testing.assertFails(ref.get());
  });
});
```
