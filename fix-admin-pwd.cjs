const fs = require('fs');
const file = 'src/components/screens/SuperAdminCreateCompany.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Admin Temporary Password *</label>
                <input
                  type="text"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="e.g. TempP@ssw0rd123!"
                  className={\`w-full px-3 py-2 text-xs rounded-xl border \${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  } focus:outline-none focus:border-amber-500 font-mono\`}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Admin Contact Mobile</label>`;

content = content.replace(`                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Admin Contact Mobile</label>`, replacement);

fs.writeFileSync(file, content);
