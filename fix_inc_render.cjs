const fs = require('fs');

let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

const bbsFields = `
              {incidentForm.type === 'BBS_OBSERVATION' && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Behavior Category (BBS)</label>
                  <input
                    type="text"
                    value={incidentForm.behaviorCategory || ''}
                    onChange={e => setIncidentForm({ ...incidentForm, behaviorCategory: e.target.value })}
                    className={\`w-full mt-1 p-2.5 rounded-xl text-xs border \${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}\`}
                    placeholder="e.g. Unsafe lifting, Not wearing PPE"
                    required
                  />
                </div>
              )}
              {incidentForm.type === 'COMPLAINT' && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">SLA Deadline</label>
                  <input
                    type="date"
                    value={incidentForm.slaDeadline || ''}
                    onChange={e => setIncidentForm({ ...incidentForm, slaDeadline: e.target.value })}
                    className={\`w-full mt-1 p-2.5 rounded-xl text-xs border \${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}\`}
                  />
                </div>
              )}
`;

code = code.replace(/<div className="grid grid-cols-2 gap-2">/, bbsFields + '\n              <div className="grid grid-cols-2 gap-2">');

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', code);
