const fs = require('fs');
const file = 'firestore.rules';
let code = fs.readFileSync(file, 'utf8');

// Fix serviceTickets subcollections
code = code.replace(
  /match \/serviceTickets\/\{ticketId\} \{[\s\S]*?allow delete: if sameCompany\(cId\) && \(isOwnerOrExecutive\(\) || isOfficialStaff\(\)\);\n      \}/,
  `match /serviceTickets/{ticketId} {
        allow read: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaff() || isSiteManager(resource.data.siteId, resource.data.departmentId) || isSelfEmployee(resource.data.reportedById));
        allow create: if sameCompany(cId) && signedIn() && request.resource.data.reportedById == request.auth.uid;
        allow update: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaff() || (isSiteManager(resource.data.siteId, resource.data.departmentId) && request.resource.data.siteId == resource.data.siteId));
        allow delete: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaff());

        match /attachments/{docId} {
          allow read, write: if sameCompany(cId) && signedIn();
        }
        match /comments/{docId} {
          allow read, write: if sameCompany(cId) && signedIn();
        }
        match /feedback/{docId} {
          allow read, write: if sameCompany(cId) && signedIn();
        }
        match /reopens/{docId} {
          allow read, write: if sameCompany(cId) && signedIn();
        }
        match /resolutions/{docId} {
          allow read, write: if sameCompany(cId) && signedIn();
        }
        match /status_history/{docId} {
          allow read, write: if sameCompany(cId) && signedIn();
        }
      }`
);

// Fix employees subcollections
code = code.replace(
  /match \/employees\/\{employeeId\} \{[\s\S]*?allow read, write: if isSuperAdmin\(\);\n        \}\n      \}/,
  `match /employees/{employeeId} {
        allow read: if sameCompany(cId) && (
          isOwnerOrExecutive() ||
          isOfficialStaffDept("HR") ||
          isOfficialStaffDept("FINANCE") ||
          (authorityLevel() == "A4_REGIONAL_AREA_MANAGER" && resource.data.assignedRegionId == regionId()) ||
          isSiteManager(resource.data.assignedSiteId, resource.data.departmentId) ||
          isSelfEmployee(resource.data.employeeId) ||
          isSelfUser(resource.data.userId)
        );

        allow create, delete: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaffDept("HR"));

        allow update: if sameCompany(cId) && (
          isOwnerOrExecutive() ||
          isOfficialStaffDept("HR") ||
          (isSiteManager(resource.data.assignedSiteId, resource.data.departmentId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['authorityLevel', 'companyId', 'salary', 'bankDetails']))
        );

        match /private_security/{docId} {
          allow read, write: if isSuperAdmin();
        }
        match /documents/{docId} {
          allow read: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaffDept("HR") || isSelfEmployee(employeeId));
          allow write: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaffDept("HR"));
        }
        match /lifecycleEvents/{docId} {
          allow read: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaffDept("HR") || isSelfEmployee(employeeId));
          allow write: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaffDept("HR"));
        }
      }`
);

// Fix identity_badges subcollection
code = code.replace(
  /match \/identity_badges\/\{badgeId\} \{[\s\S]*?\}\n      \}/,
  `match /identity_badges/{badgeId} {
        allow read: if sameCompany(cId);
        allow create, update: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaffDept("HR") || isOfficialStaffDept("OPERATIONS"));
        allow delete: if sameCompany(cId) && isOwnerOrExecutive();

        match /history/{docId} {
          allow read, write: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaffDept("HR") || isOfficialStaffDept("OPERATIONS"));
        }
      }`
);

// Fix users subcollection
code = code.replace(
  /match \/users\/\{userId\} \{[\s\S]*?allow read: if signedIn\(\);\n        allow update: if request\.auth\.uid == userId;\n        allow delete: if isSuperAdmin\(\);\n      \}/,
  `match /users/{userId} {
        allow create: if true;
        allow read: if signedIn();
        allow update: if request.auth.uid == userId;
        allow delete: if isSuperAdmin();

        match /memberships/{cId} {
          allow read: if signedIn() && request.auth.uid == userId;
          allow write: if false; // Only manageable by server/admin
        }
      }`
);

fs.writeFileSync(file, code);
