const fs = require('fs');

let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

// 1. Add id to incidentForm state
code = code.replace(/type: 'INCIDENT' \| 'COMPLAINT' \| 'BBS_OBSERVATION';/, `id?: string;
    type: 'INCIDENT' | 'COMPLAINT' | 'BBS_OBSERVATION';`);
    
// 2. Add Edit button to card
code = code.replace(/<div className="flex items-center justify-between">/, 
`<div className="flex items-center justify-between">
                    <div className="flex gap-2">`);
code = code.replace(/<\/div>\s*<h4 className="text-sm font-bold text-slate-900/, 
`  </div>
                    <button onClick={() => { setIncidentForm({ id: inc.id, siteId: inc.siteId, title: inc.title, category: inc.category, severity: inc.severity, type: inc.type as any, description: inc.description, behaviorCategory: inc.behaviorCategory, slaDeadline: inc.slaDeadline }); setIsIncidentModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 transition p-1">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900`);

// 3. handleSaveIncident logic update
code = code.replace(/id: \`INC-\$\{Date\.now\(\)\}\`,/, `id: incidentForm.id || \`INC-\$\{Date.now()\}\`,`);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', code);
