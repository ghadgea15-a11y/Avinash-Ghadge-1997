const fs = require('fs');
let rules = fs.readFileSync('firestore.rules.new', 'utf8');

const collectionsToScope = [
  'employees', 'attendance', 'safety_checksheets', 'incidents', 
  'patrol_tours', 'patrol_checkpoints', 'visitor_logs', 'work_orders', 
  'assets', 'maintenance_records', 'inventory', 'leaves', 
  'tasks', 'sites', 'branches', 'regions' // Note: excluded shifts, departments, designations
];

for (let col of collectionsToScope) {
  const matchRegex = new RegExp(`(match \\/${col}\\/\\{[^\\}]+\\} \\{[\\s\\S]*?\\})`);
  rules = rules.replace(matchRegex, match => {
    
    // allow create
    match = match.replace(/allow create: if ([^;]+);/, (fullMatch, p1) => {
        // usually it's "isSuperAdmin() || (sameCompany(companyId) && ...)"
        return `allow create: if ${p1} && isScopeAuthorized(companyId, request.resource.data);`;
    });
    
    // allow update
    match = match.replace(/allow update: if ([^;]+);/, (fullMatch, p1) => {
        return `allow update: if ${p1} && isScopeAuthorized(companyId, resource.data) && isScopeAuthorized(companyId, request.resource.data);`;
    });
    
    // allow delete
    match = match.replace(/allow delete: if ([^;]+);/, (fullMatch, p1) => {
        return `allow delete: if ${p1} && isScopeAuthorized(companyId, resource.data);`;
    });
    
    // Sometimes there is just "allow write: if isSuperAdmin() || isCompanyAdmin(companyId);"
    // Or "allow write: if isSuperAdmin() || isManager(companyId);"
    match = match.replace(/allow write: if ([^;]+);/, (fullMatch, p1) => {
        return `allow read, write: if false; // replaced by granular rules\n        allow create: if ${p1} && isScopeAuthorized(companyId, request.resource.data);\n        allow update: if ${p1} && isScopeAuthorized(companyId, resource.data) && isScopeAuthorized(companyId, request.resource.data);\n        allow delete: if ${p1} && isScopeAuthorized(companyId, resource.data);`;
    });
    
    return match;
  });
}

// Special case for shifts, designations, departments: revert their read rules since they are company wide
const compWide = ['shifts', 'departments', 'designations'];
for (let col of compWide) {
  const matchRegex = new RegExp(`match \\/${col}\\/\\{[^\\}]+\\} \\{[\\s\\S]*?\\}`);
  rules = rules.replace(matchRegex, match => {
     return match.replace(/allow read: if isSuperAdmin\(\) \|\| isScopeAuthorized\(companyId, resource\.data\);/g, 'allow read: if isSuperAdmin() || sameCompany(companyId);');
  });
}

fs.writeFileSync('firestore.rules', rules);
