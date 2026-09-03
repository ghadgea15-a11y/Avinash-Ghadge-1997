const fs = require('fs');

const file = 'src/components/screens/OrgSetupWizardScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `const renderDashboard = () => {
    return (
      <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-white font-bold mb-1">Completeness Dashboard</h3>
          <p className="text-xs text-slate-400">Live validation of organizational setup.</p>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="bg-slate-900 rounded-lg p-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Core Entities</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Regions</span>
                <span className={\`font-bold \${regions.length > 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>{regions.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Sites</span>
                <span className={\`font-bold \${sites.length > 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>{sites.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Departments</span>
                <span className={\`font-bold \${missingA3.length === 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>{departments.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Workforce Counts</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">A2 (Gen Mgr)</span>
                <span className={\`font-bold \${workforceCount.A2 > 0 ? 'text-emerald-400' : 'text-slate-400'}\`}>{workforceCount.A2}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">A3 (Dept Head)</span>
                <span className={\`font-bold \${missingA3.length === 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>{workforceCount.A3}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">A4 (Reg Mgr)</span>
                <span className={\`font-bold \${missingA4.length === 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>{workforceCount.A4}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">A5 (Site In-Charge)</span>
                <span className={\`font-bold \${missingA5.length === 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>{workforceCount.A5}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">A6 (Supervisor)</span>
                <span className={\`font-bold \${missingA6.length === 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>{workforceCount.A6}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-800">
                <span className="text-slate-400">Guards/Staff</span>
                <span className="font-bold text-emerald-400">{workforceCount.A7_A9}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-lg p-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Site Readiness Matrix</h4>
            <div className="space-y-3">
              {sites.map(site => {
                const hasA4 = employees.some(e => e.authorityLevel === 'A4_REGIONAL_MANAGER' && e.regionId === site.regionId);
                const hasA5 = employees.some(e => e.authorityLevel === 'A5_SITE_INCHARGE' && e.assignedSiteId === site.id);
                const hasA6 = employees.some(e => e.authorityLevel === 'A6_SECURITY_SUPERVISOR' && e.assignedSiteId === site.id);
                const isReady = hasA4 && hasA5 && hasA6;
                const region = regions.find(r => r.id === site.regionId)?.name || 'Unknown Region';
                return (
                  <div key={site.id} className="text-xs border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-slate-300 truncate mr-2" title={site.name}>{site.name}</span>
                      <span className={isReady ? 'text-emerald-400' : 'text-rose-400'}>{isReady ? 'READY' : 'INCOMPLETE'}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mb-1">{region}</div>
                    <div className="flex gap-2">
                      <span className={\`px-1.5 py-0.5 rounded \${hasA4 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}\`}>A4</span>
                      <span className={\`px-1.5 py-0.5 rounded \${hasA5 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}\`}>A5</span>
                      <span className={\`px-1.5 py-0.5 rounded \${hasA6 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}\`}>A6</span>
                    </div>
                  </div>
                );
              })}
              {sites.length === 0 && <div className="text-xs text-slate-500">No sites created yet.</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };`;

content = content.replace(/const renderDashboard = \(\) => \{[\s\S]*?\n  \};\n/m, replacement + '\n');

// Update variables
content = content.replace(
  /const missingA4 = regions/g,
  `const workforceCount = {
    A2: employees.filter((e:any) => e.authorityLevel === 'A2_GENERAL_MANAGER').length,
    A3: employees.filter((e:any) => e.authorityLevel === 'A3_DEPARTMENT_HEAD').length,
    A4: employees.filter((e:any) => e.authorityLevel === 'A4_REGIONAL_MANAGER').length,
    A5: employees.filter((e:any) => e.authorityLevel === 'A5_SITE_INCHARGE').length,
    A6: employees.filter((e:any) => e.authorityLevel === 'A6_SECURITY_SUPERVISOR').length,
    A7_A9: employees.filter((e:any) => ['A7_GUARD', 'A8_RELIEVER', 'A9_SUPPORT_STAFF'].includes(e.authorityLevel)).length,
  };
  const missingA4 = regions`
);

fs.writeFileSync(file, content);
console.log('Patched dashboard');
