const fs = require('fs');

const wizardFile = 'src/components/screens/OrgSetupWizardScreen.tsx';
let content = fs.readFileSync(wizardFile, 'utf8');

const requiredDepts = "['HR', 'FINANCE', 'ADMIN', 'PROCUREMENT', 'EHS', 'QUALITY']";

if (!content.includes('missingA3')) {
  // Add missingA3 array calculation
  content = content.replace(
    /const missingA4 = regions/g,
    `const REQUIRED_DEPTS = ['HR', 'FINANCE', 'ADMIN', 'PROCUREMENT', 'EHS', 'QUALITY'];\n  const missingA3 = REQUIRED_DEPTS.filter(dName => {\n    const dId = departments.find(d => d.name.toUpperCase() === dName)?.id;\n    if (!dId) return true;\n    return !employees.some(e => e.authorityLevel === 'A3_DEPARTMENT_HEAD' && e.departmentId === dId);\n  });\n  const missingA4 = regions`
  );

  // Update step logic for step 4 and 6
  content = content.replace(
    /case 4: return departments\.length > 0;/g,
    `case 4: return REQUIRED_DEPTS.every(dName => departments.some(d => d.name.toUpperCase() === dName));`
  );
  content = content.replace(
    /case 6: return true; \/\/ Could force.*/g,
    `case 6: return missingA3.length === 0;`
  );

  // Update step 6 to show missing A3 warning
  content = content.replace(
    /case 6:\s+return <EmployeeCreationForm title="A3 Officials".*?\/>/s,
    `case 6:
        return (
          <div>
            {missingA3.length > 0 && (
               <div className="mb-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-lg flex gap-3">
                 <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                 <div>
                   <h4 className="text-sm font-bold text-rose-400">Action Required</h4>
                   <p className="text-xs text-rose-300/80 mt-1">You must assign at least one A3 Official for every required department.</p>
                   <ul className="list-disc list-inside mt-2 text-xs text-rose-300">
                     {missingA3.map((dName: any) => <li key={dName}>{dName}</li>)}
                   </ul>
                 </div>
               </div>
            )}
            <EmployeeCreationForm title="A3 Officials" aLvl="A3_DEPARTMENT_HEAD" role="STAFF" activeCompany={activeCompany} requiresDepartment departments={departments} />
          </div>
        );`
  );

  // Add missingA3 to dashboard
  content = content.replace(
    /<div className="flex justify-between items-center mb-1">\s*<span className="text-xs font-medium text-slate-300">A4 \(Regional Mgrs\)/s,
    `<div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-slate-300">A3 (Dept Heads)</span>
                  {missingA3.length === 0 ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <span className="text-xs font-bold text-rose-400">{missingA3.length} missing</span>
                  )}
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-3">
                  <div className={\`h-1.5 rounded-full \${missingA3.length === 0 ? 'bg-emerald-400' : 'bg-rose-400'}\`} style={{ width: '100%' }}></div>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-slate-300">A4 (Regional Mgrs)`
  );
}

// Ensure Step 4 displays missing required departments
if (!content.includes('Required departments:')) {
  content = content.replace(
    /case 4:\s+return <GenericListManager collectionName="departments".*?\/>/s,
    `case 4:
        return (
          <div>
            <div className="mb-6 bg-slate-700/50 p-4 rounded-lg">
              <h4 className="text-sm font-bold text-slate-200">Required Departments</h4>
              <p className="text-xs text-slate-400 mt-1 mb-3">Please ensure the following departments are created:</p>
              <div className="flex flex-wrap gap-2">
                {REQUIRED_DEPTS.map(dName => {
                  const exists = departments.some(d => d.name.toUpperCase() === dName);
                  return (
                    <div key={dName} className={\`px-3 py-1 rounded text-xs font-medium border \${exists ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}\`}>
                      {dName} {exists && '✓'}
                    </div>
                  );
                })}
              </div>
            </div>
            <GenericListManager collectionName="departments" title="Departments" activeCompany={activeCompany} items={departments} itemName="Department" icon={<Briefcase className="w-4 h-4"/>} />
          </div>
        );`
  );
}

fs.writeFileSync(wizardFile, content);
console.log("Patched wizard file.");
