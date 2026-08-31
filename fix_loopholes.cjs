const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

// 1. Fix collectionGroup
rules = rules.replace(
/match \/collectionGroup\/\{groupName\}\/\{documentId\} \{\s+allow read: if \(groupName == 'predictions' \|\| groupName == 'incident_reports'\) \s+&& signedIn\(\) \s+&& sameCompany\(resource\.data\.companyId\);\s+\}/,
`match /collectionGroup/{groupName}/{documentId} {
      allow read: if (groupName == 'predictions' || groupName == 'incident_reports') 
                  && signedIn() 
                  && sameCompany(resource.data.companyId)
                  && (
                    isSuperAdmin() || 
                    isOwnerOrExecutive() || 
                    isOfficialStaff() || 
                    (authorityLevel() == "A4_REGIONAL_AREA_MANAGER" && resource.data.assignedRegionId == regionId()) ||
                    isSiteManager(resource.data.siteId, resource.data.departmentId) ||
                    isSelfEmployee(resource.data.reportedById)
                  );
    }`
);

// 2. Fix Dynamic Attendance
rules = rules.replace(
/allow read: if isAttendanceCollection\(\) && \(\s+isSuperAdmin\(\) \|\| sameCompany\(getCompanyCodeFromCollection\(\)\)\s+\);/,
`allow read: if isAttendanceCollection() && (
        isSuperAdmin() || (sameCompany(getCompanyCodeFromCollection()) && (
          isOwnerOrExecutive() || 
          isOfficialStaffDept("HR") || 
          isOfficialStaffDept("FINANCE") || 
          isOfficialStaffDept("OPERATIONS") || 
          (authorityLevel() == "A4_REGIONAL_AREA_MANAGER" && (resource.data.assignedRegionId == regionId() || resource.data.assignedRegionId == null)) || 
          isSiteManager(resource.data.siteId, resource.data.departmentId) || 
          isSelfEmployee(resource.data.employeeId)
        ))
      );`
);

rules = rules.replace(
/allow create: if isAttendanceCollection\(\) && \(\s+isSuperAdmin\(\) \|\| sameCompany\(getCompanyCodeFromCollection\(\)\)\s+\);/,
`allow create: if isAttendanceCollection() && (
        isSuperAdmin() || (sameCompany(getCompanyCodeFromCollection()) && (
          isOwnerOrExecutive() || 
          isOfficialStaffDept("HR") || 
          isOfficialStaffDept("OPERATIONS") || 
          (authorityLevel() in ["A5_SITE_IN_CHARGE", "A6_SUPERVISOR"] && request.resource.data.siteId == siteId()) || 
          isSelfEmployee(request.resource.data.employeeId)
        ))
      );`
);

// 3. Fix Inventory
rules = rules.replace(
/match \/inventory_items\/\{itemId\} \{\s+allow read: if sameCompany\(cId\);/,
`match /inventory_items/{itemId} {
        allow read: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaff() || authorityLevel() == "A4_REGIONAL_AREA_MANAGER" || authorityLevel() == "A5_SITE_IN_CHARGE" || authorityLevel() == "A6_SUPERVISOR");`
);

rules = rules.replace(
/match \/site_inventory\/\{inventoryId\} \{\s+allow read: if sameCompany\(cId\);/,
`match /site_inventory/{inventoryId} {
        allow read: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaff() || (authorityLevel() == "A4_REGIONAL_AREA_MANAGER" && resource.data.assignedRegionId == regionId()) || isSiteManager(resource.data.siteId, resource.data.departmentId));`
);

rules = rules.replace(
/match \/inventory_transactions\/\{txId\} \{\s+allow read: if sameCompany\(cId\);/,
`match /inventory_transactions/{txId} {
        allow read: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaff() || (authorityLevel() == "A4_REGIONAL_AREA_MANAGER" && resource.data.assignedRegionId == regionId()) || isSiteManager(resource.data.siteId, resource.data.departmentId));`
);

// 4. Fix Contracts
rules = rules.replace(
/match \/contracts\/\{contractId\} \{\s+allow read: if sameCompany\(cId\);/,
`match /contracts/{contractId} {
        allow read: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaffDept("FINANCE") || isOfficialStaffDept("OPERATIONS"));`
);

// 5. Fix Attendance Devices
rules = rules.replace(
/match \/attendance_devices\/\{deviceId\} \{\s+allow read: if sameCompany\(cId\);/,
`match /attendance_devices/{deviceId} {
        allow read: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaffDept("IT") || isOfficialStaffDept("OPERATIONS") || isSiteManager(resource.data.siteId, resource.data.departmentId));`
);

fs.writeFileSync('firestore.rules', rules);
console.log("Fixes applied successfully.");
