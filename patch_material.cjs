const fs = require('fs');
let file = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

// 1. Fix handleSaveMaterialPass logic
file = file.replace(
  '    if (!companyId || !materialForm.materialDescription || !materialForm.supplierVendorName) {\n      setStatusMsg({ type: \'ERROR\', text: \'Material Description and Vendor Name required.\' });\n      return;\n    }\n    const siteObj = sites.find(s => s.id === materialForm.siteId);\n    const gatePassNumber = materialForm.gatePassNumber || `GP-${Math.floor(1000 + Math.random() * 9000)}`;\n    const newMat: MaterialMovementRecord = {\n      id: `MAT-${Date.now()}`,\n      companyId,\n      siteId: materialForm.siteId || (selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "")),',
  `    const finalSiteId = materialForm.siteId || (selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""));\n    if (!companyId || !materialForm.materialDescription || !materialForm.supplierVendorName || !finalSiteId) {\n      setStatusMsg({ type: 'ERROR', text: 'Site, Material Description, and Vendor Name required.' });\n      return;\n    }\n    const siteObj = sites.find(s => s.id === finalSiteId);\n    const gatePassNumber = materialForm.gatePassNumber || \`GP-\${Math.floor(1000 + Math.random() * 9000)}\`;\n    const newMat: MaterialMovementRecord = {\n      id: \`MAT-\${Date.now()}\`,\n      companyId,\n      siteId: finalSiteId,`
);

// 2. Add Site Selection dropdown to Material Gate Pass Modal
const newSiteSelect = `              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Site</label>
                <select
                  value={materialForm.siteId || ''}
                  onChange={e => setMaterialForm({ ...materialForm, siteId: e.target.value })}
                  className={\`w-full mt-1 p-2.5 rounded-xl text-xs border \${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}\`}
                >
                  <option value="">-- Select a Site --</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>`;

file = file.replace(
  '<form onSubmit={handleSaveMaterialPass} className="space-y-3">',
  '<form onSubmit={handleSaveMaterialPass} className="space-y-3">\n' + newSiteSelect
);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', file);
console.log("Material Gate Pass patched.");
