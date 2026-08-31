const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

rules = rules.replace(
/function isSiteManager\(sId\) \{\s+return isActiveUser\(\)\s+&& \(authorityLevel\(\) == "A5_SITE_IN_CHARGE" \|\| authorityLevel\(\) == "A6_SUPERVISOR"\)\s+&& siteId\(\) == sId;\s+\}/,
`function isSiteManager(sId, deptId) {
      return isActiveUser() && siteId() == sId && (
        authorityLevel() == "A5_SITE_IN_CHARGE" ||
        (authorityLevel() == "A6_SUPERVISOR" && departmentId() == deptId)
      );
    }`
);

rules = rules.replace(/isSiteManager\(resource\.data\.siteId\)/g, 'isSiteManager(resource.data.siteId, resource.data.departmentId)');
rules = rules.replace(/isSiteManager\(request\.resource\.data\.siteId\)/g, 'isSiteManager(request.resource.data.siteId, request.resource.data.departmentId)');
rules = rules.replace(/isSiteManager\(resource\.data\.assignedSiteId\)/g, 'isSiteManager(resource.data.assignedSiteId, resource.data.departmentId)');
rules = rules.replace(/isSiteManager\(request\.resource\.data\.assignedSiteId\)/g, 'isSiteManager(request.resource.data.assignedSiteId, request.resource.data.departmentId)');

rules = rules.replace(
/match \/documents\/\{docId\} \{\s+allow read: if sameCompany\(cId\);/,
`match /documents/{docId} {
        allow read: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaffDept("HR") || isSelfEmployee(resource.data.employeeId));`
);

rules = rules.replace(
/match \/role_assignments\/\{roleId\} \{\s+allow read: if sameCompany\(cId\);/,
`match /role_assignments/{roleId} {
        allow read: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaffDept("HR") || isSelfEmployee(resource.data.employeeId));`
);

rules = rules.replace(
/          \(authorityLevel\(\) == "A5_SITE_IN_CHARGE" && resource\.data\.assignedSiteId == siteId\(\)\) \|\|\n          \(authorityLevel\(\) == "A6_SUPERVISOR" && resource\.data\.assignedSiteId == siteId\(\) && resource\.data\.departmentId == departmentId\(\)\) \|\|/g,
`          isSiteManager(resource.data.assignedSiteId, resource.data.departmentId) ||`
);

rules = rules.replace(
/          \(authorityLevel\(\) == "A5_SITE_IN_CHARGE" && resource\.data\.siteId == siteId\(\)\) \|\|\n          \(authorityLevel\(\) == "A6_SUPERVISOR" && resource\.data\.siteId == siteId\(\) && resource\.data\.departmentId == departmentId\(\)\) \|\|/g,
`          isSiteManager(resource.data.siteId, resource.data.departmentId) ||`
);

fs.writeFileSync('firestore.rules', rules);
console.log("Rules updated successfully.");
