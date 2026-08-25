const fs = require('fs');
let code = fs.readFileSync('src/components/screens/CompanyManagementScreen.tsx', 'utf8');

code = code.replace(
  /const bRecord: BranchRecord = \{\n\s*id: editingBranch.id \|\| `BR-\$\{Date.now\(\).toString\(36\)\}`,/,
  'const bRecord: BranchRecord = {\n      companyId: currentCompanyId, id: editingBranch.id || `BR-${Date.now().toString(36)}`,'
);

code = code.replace(
  /const dRecord: DepartmentRecord = \{\n\s*id: editingDept.id \|\| `DEP-\$\{Date.now\(\).toString\(36\)\}`,/,
  'const dRecord: DepartmentRecord = {\n      companyId: currentCompanyId, id: editingDept.id || `DEP-${Date.now().toString(36)}`,'
);

code = code.replace(
  /const dRecord: DesignationRecord = \{\n\s*id: editingDesig.id \|\| `DSG-\$\{Date.now\(\).toString\(36\)\}`,/,
  'const dRecord: DesignationRecord = {\n      companyId: currentCompanyId, id: editingDesig.id || `DSG-${Date.now().toString(36)}`,'
);
fs.writeFileSync('src/components/screens/CompanyManagementScreen.tsx', code);


let fsCode = fs.readFileSync('src/services/firestoreService.ts', 'utf8');
fsCode = fsCode.replace(
  /export const DEFAULT_DEPARTMENTS: DepartmentRecord\[\] = \[([\s\S]*?)\];/g, 
  (match) => {
    // replace `id: 'DEP` with `companyId: '', id: 'DEP`
    return match.replace(/id: 'DEP/g, "companyId: '', id: 'DEP");
  }
);
fs.writeFileSync('src/services/firestoreService.ts', fsCode);

