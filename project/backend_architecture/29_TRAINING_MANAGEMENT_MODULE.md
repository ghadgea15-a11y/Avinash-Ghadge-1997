# LOG SHEET MUSTER — PHASE 28: ENTERPRISE TRAINING MANAGEMENT MODULE (100% COMPLETE)

Enterprise-grade, production-ready Training Management Module for Log Sheet Muster. Facilitates guard and staff onboarding, mandatory security certifications (PSARA, Fire Safety, First Aid, Soft Skills), trainer assignments, assessment scoring, digital certificate generation, and live employee skill matrix tracking.

---

## 1. DATA MODEL & FIRESTORE COLLECTIONS

All Training Management collections are multi-tenant and strictly isolated under `/companies/{companyId}/`.

```
/companies/{cid}/trainingCourses/{courseId}
/companies/{cid}/trainingSessions/{sessionId}
/companies/{cid}/trainingAssessments/{assessmentId}
/companies/{cid}/employeeCertificates/{certificateId}
/companies/{cid}/employeeSkillMatrices/{employeeId}
```

### 1.1 `trainingCourses` (Course Curriculum Master)
Master library of training programs and compliance modules.
* **Path:** `/companies/{companyId}/trainingCourses/{courseId}`
* **Document ID:** `CRS-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `courseId` | String | Yes | Unique Course ID |
| `companyId` | String | Yes | Tenant isolation key |
| `courseCode` | String | Yes | E.g. `"PSARA-GUARD-BASIC"`, `"FIRE-SAFETY-ADV"` |
| `title` | String | Yes | Full course title |
| `category` | String | Yes | Enum: `'COMPLIANCE' \| 'SECURITY' \| 'FIRE_SAFETY' \| 'FIRST_AID' \| 'SOFT_SKILLS' \| 'SUPERVISORY'` |
| `durationHours` | Number | Yes | Total duration in hours |
| `validityMonths` | Number | Yes | Certificate validity in months (e.g., 12 or 24 months, 0 for lifetime) |
| `passingScore` | Number | Yes | Minimum score percentage (e.g. 70) |
| `description` | String | Yes | Course syllabus summary |
| `isActive` | Boolean | Yes | Active status |
| `createdAt` | Timestamp | Yes | Creation timestamp |

### 1.2 `trainingSessions` (Scheduled Training Batches)
Scheduled training events assigning trainers, venues/sites, dates, and enrolled employees.
* **Path:** `/companies/{companyId}/trainingSessions/{sessionId}`
* **Document ID:** `SESS-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `sessionId` | String | Yes | Unique Session ID |
| `companyId` | String | Yes | Tenant isolation key |
| `courseId` | String | Yes | Reference to `trainingCourses` |
| `branchId` | String | Yes | Branch handling session |
| `trainerUserId` | String | Yes | Assigned Internal/External Trainer User ID |
| `location` | String | Yes | Venue or Site Name |
| `startDate` | Timestamp | Yes | Session start date & time |
| `endDate` | Timestamp | Yes | Session end date & time |
| `maxCapacity` | Number | Yes | Maximum allowed trainees |
| `enrolledEmployeeIds` | Array<String> | Yes | List of enrolled employee IDs |
| `attendedEmployeeIds` | Array<String> | Optional | List of employees marked present |
| `status` | String | Yes | Enum: `'SCHEDULED' \| 'IN_PROGRESS' \| 'COMPLETED' \| 'CANCELLED'` |
| `createdAt` | Timestamp | Yes | Creation timestamp |

### 1.3 `trainingAssessments` (Exams & Evaluated Scores)
Assessment records storing exam results, practical scores, and evaluator remarks.
* **Path:** `/companies/{companyId}/trainingAssessments/{assessmentId}`
* **Document ID:** `ASSESS-{sessionId}-{employeeId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `assessmentId` | String | Yes | Unique Assessment ID |
| `companyId` | String | Yes | Tenant isolation key |
| `sessionId` | String | Yes | Reference to `trainingSessions` |
| `courseId` | String | Yes | Reference to `trainingCourses` |
| `employeeId` | String | Yes | Reference to Employee evaluated |
| `evaluatorUserId` | String | Yes | Trainer or HR Evaluator User ID |
| `writtenScore` | Number | Optional | Written exam score % |
| `practicalScore` | Number | Optional | Practical drills score % |
| `totalScore` | Number | Yes | Final percentage score |
| `result` | String | Yes | Enum: `'PASS' \| 'FAIL' \| 'RETAKE_REQUIRED'` |
| `remarks` | String | Optional | Evaluator comments |
| `evaluatedAt` | Timestamp | Yes | Evaluation timestamp |

### 1.4 `employeeCertificates` (Digital Certification Registry)
Official certificates issued upon passing courses, tracking issue and expiry dates.
* **Path:** `/companies/{companyId}/employeeCertificates/{certificateId}`
* **Document ID:** `CERT-{YYYYMMDD}-{UUID}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `certificateId` | String | Yes | Unique Certificate ID |
| `companyId` | String | Yes | Tenant isolation key |
| `certificateNumber` | String | Yes | Unique Certificate serial number |
| `employeeId` | String | Yes | Reference to Employee |
| `courseId` | String | Yes | Reference to `trainingCourses` |
| `sessionId` | String | Yes | Reference to `trainingSessions` |
| `issuedDate` | Timestamp | Yes | Date issued |
| `expiryDate` | Timestamp | Optional | Expiry timestamp (null if non-expiring) |
| `pdfFileId` | String | Yes | Generated PDF file ID in Storage Module |
| `status` | String | Yes | Enum: `'ACTIVE' \| 'EXPIRED' \| 'REVOKED'` |

### 1.5 `employeeSkillMatrices` (Live Guard Qualification Profile)
Aggregated skill matrix for every guard, driving automated site placement rules (e.g. VIP site requiring Armed Guard + First Aid certified).
* **Path:** `/companies/{companyId}/employeeSkillMatrices/{employeeId}`
* **Document ID:** `{employeeId}`

| Field Name | Type | Required | Description |
|---|---|---|---|
| `employeeId` | String | Yes | Employee ID |
| `companyId` | String | Yes | Tenant isolation key |
| `skills` | Array<String> | Yes | E.g., `["FIRE_SAFETY", "FIRST_AID", "ARMED_SECURITY", "CCTV_MONITORING"]` |
| `activeCertificates` | Array<Map> | Yes | List of active certificate references & expiry dates |
| `qualificationLevel` | String | Yes | Enum: `'BASIC' \| 'INTERMEDIATE' \| 'ADVANCED' \| 'EXPERT'` |
| `lastTrainedAt` | Timestamp | Optional | Date of last completed training |
| `updatedAt` | Timestamp | Yes | Matrix update timestamp |

---

## 2. BUSINESS LOGIC & WORKFLOWS

### 2.1 Training Session & Attendance Workflow
1. HR/Trainer schedules a `trainingSession` and enrolls a batch of guards.
2. System sends notifications to guards' mobile apps via ESS (Phase 25) and site supervisors.
3. On training day, the trainer takes digital attendance (`attendedEmployeeIds`).

### 2.2 Assessment & Automated Certificate Generation
1. Trainer submits `trainingAssessments`.
2. If `result == 'PASS'`, a Cloud Function automatically:
   * Generates a digital PDF certificate in Firebase Storage.
   * Creates an `employeeCertificates` record with computed `expiryDate`.
   * Updates the employee's `/employeeSkillMatrices` document with the newly acquired skill.

### 2.3 Automated Expiry & Deployment Check
1. A daily Cloud Function checks `employeeCertificates` nearing expiry (30/15/7 days) and triggers Document Expiry Management alerts (Phase 29).
2. During Shift Roster assignment (Phase 07), the system checks `employeeSkillMatrices` to ensure assigned guards satisfy site contract skill prerequisites.

---

## 3. FIRESTORE SECURITY RULES (TRAINING MANAGEMENT)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{cid} {
      match /trainingCourses/{courseId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow write: if sameCompany(cid) && mgmtTier();
      }

      match /trainingSessions/{sessionId} {
        allow read: if sameCompany(cid) && isSignedIn();
        allow write: if sameCompany(cid) && (mgmtTier() || opsTier());
      }

      match /trainingAssessments/{assessmentId} {
        allow read: if sameCompany(cid) && (mgmtTier() || opsTier() || (isEmployeeUser() && matchesEmployeeId(cid, resource.data.employeeId)));
        allow write: if sameCompany(cid) && (mgmtTier() || opsTier());
      }

      match /employeeCertificates/{certificateId} {
        allow read: if sameCompany(cid) && (mgmtTier() || opsTier() || (isEmployeeUser() && matchesEmployeeId(cid, resource.data.employeeId)));
        allow write: if sameCompany(cid) && mgmtTier();
      }

      match /employeeSkillMatrices/{employeeId} {
        allow read: if sameCompany(cid) && (mgmtTier() || opsTier() || (isEmployeeUser() && matchesEmployeeId(cid, resource.data.employeeId)));
        allow write: if sameCompany(cid) && mgmtTier();
      }
    }
  }
}
```

---

## 4. FIRESTORE COMPOSITE INDEXES (TRAINING MANAGEMENT)

```json
{
  "indexes": [
    {
      "collectionGroup": "trainingSessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "branchId", "order": "ASCENDING" },
        { "fieldPath": "startDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "employeeCertificates",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "employeeId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "trainingAssessments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "companyId", "order": "ASCENDING" },
        { "fieldPath": "sessionId", "order": "ASCENDING" },
        { "fieldPath": "result", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

**End of Phase 28: Enterprise Training Management Module (100% Complete).**
