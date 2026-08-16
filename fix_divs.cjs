const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

const regex = /<div className="flex items-center justify-between">\s*<span className=\{\`px-2\.5 py-0\.5 rounded-full text-\[10px\] font-extrabold uppercase \$\{[\s\S]*?\} SEVERITY\s*<\/span>\s*<span className=\{\`px-2 py-0\.5 rounded-full text-\[10px\] font-bold \$\{[\s\S]*?\}\s*<\/span>\s*<\/div>\s*<button onClick=\{\(\) => \{ setIncidentForm\(\{ id: inc\.id, siteId: inc\.siteId, title: inc\.title, category: inc\.category, severity: inc\.severity, type: inc\.type as any, description: inc\.description, behaviorCategory: inc\.behaviorCategory, slaDeadline: inc\.slaDeadline \}\); setIsIncidentModalOpen\(true\); \}\} className="text-slate-400 hover:text-indigo-600 transition p-1">\s*<Edit3 className="w-3\.5 h-3\.5" \/>\s*<\/button>\s*<\/div>/;

const replacement = `
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={\`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase \${
                        inc.severity === 'CRITICAL' ? 'bg-rose-600 text-white' :
                        inc.severity === 'HIGH' ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white'
                      }\`}>
                        {inc.severity} SEVERITY
                      </span>
                      <span className={\`px-2 py-0.5 rounded-full text-[10px] font-bold \${
                        inc.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }\`}>
                        {inc.status}
                      </span>
                    </div>
                    <button onClick={() => { setIncidentForm({ id: inc.id, siteId: inc.siteId, title: inc.title, category: inc.category, severity: inc.severity, type: inc.type as any, description: inc.description, behaviorCategory: inc.behaviorCategory, slaDeadline: inc.slaDeadline }); setIsIncidentModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 transition p-1">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', code);
