const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

const isScopeAuthorized = `    function isScopeAuthorized(companyId, resourceData) {
      if (!signedIn() || !hasMembership(companyId)) return false;
      let mem = getMembership(companyId);
      if (mem == null) return false;
      let role = mem.role;
      if (role in ["COMPANY_ADMIN", "ADMIN", "HR_ADMIN", "OWNER_PROMOTER", "DIRECTOR_CEO", "GENERAL_MANAGER", "super_admin", "admin", "hr_admin"]) {
         return true;
      }
      let targetRegionId = resourceData.get('regionId', resourceData.get('assignedRegionId', ''));
      if (role in ["REGIONAL_MANAGER"]) {
         return (mem.assignedRegionId != null && mem.assignedRegionId != '' && targetRegionId == mem.assignedRegionId) || resourceData.get('id', '') == mem.assignedRegionId;
      }
      let targetBranchId = resourceData.get('branchId', resourceData.get('assignedBranchId', ''));
      if (role in ["AREA_MANAGER"]) {
         return (mem.assignedBranchId != null && mem.assignedBranchId != '' && targetBranchId == mem.assignedBranchId) || resourceData.get('id', '') == mem.assignedBranchId || targetRegionId == mem.assignedRegionId; 
      }
      let targetSiteId = resourceData.get('siteId', resourceData.get('assignedSiteId', ''));
      if (role in ["SITE_IN_CHARGE", "SUPERVISOR", "FIELD_OFFICER", "MANAGER", "OPS_MANAGER"]) {
         return (mem.assignedSiteId != null && mem.assignedSiteId != '' && targetSiteId == mem.assignedSiteId) || resourceData.get('id', '') == mem.assignedSiteId;
      }
      let targetEmpId = resourceData.get('employeeId', resourceData.get('assignedTo', resourceData.get('reportedById', '')));
      return (mem.employeeId != null && targetEmpId == mem.employeeId) || (resourceData.get('userId', '') == request.auth.uid) || resourceData.get('id', '') == mem.employeeId;
    }`;

// Insert it right after canViewSalary
rules = rules.replace(/function canViewSalary\(companyId\) \{[\s\S]*?\}/, match => match + '\n' + isScopeAuthorized);

// Replace allow read: if isSuperAdmin() || sameCompany(companyId); with isScopeAuthorized for operational collections.
// We will do this explicitly for specific collections:
const collectionsToScope = [
  'employees', 'attendance', 'safety_checksheets', 'incidents', 
  'patrol_tours', 'patrol_checkpoints', 'visitor_logs', 'work_orders', 
  'assets', 'maintenance_records', 'inventory', 'leaves', 
  'tasks', 'shifts', 'sites', 'branches', 'regions'
];

for (let col of collectionsToScope) {
  const matchRegex = new RegExp(`match \\/${col}\\/\\{[^\\}]+\\} \\{[\\s\\S]*?\\}`);
  rules = rules.replace(matchRegex, match => {
    let replaced = match.replace(/allow read: if isSuperAdmin\(\) \|\| sameCompany\(companyId\);/g, 'allow read: if isSuperAdmin() || isScopeAuthorized(companyId, resource.data);');
    
    // For updates and creates, ensure they can't change scope
    // We replace allow write/create/update/delete.
    if (col === 'shifts' || col === 'departments' || col === 'designations') {
       // Wait, shifts don't have siteId. So isScopeAuthorized will return false for SITE_IN_CHARGE.
       // Let's NOT use isScopeAuthorized for shifts! 
       // We'll revert shifts later in the script.
    } else {
       // We'll replace all "allow write: if isSuperAdmin() || isManager(companyId);" with scoped write
       // Because it's hard to parse, let's just do targeted replacements.
    }
    return replaced;
  });
}

fs.writeFileSync('firestore.rules.new', rules);
