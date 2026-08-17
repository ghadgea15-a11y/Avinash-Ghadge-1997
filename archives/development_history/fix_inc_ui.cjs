const fs = require('fs');

let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

const descriptionRegex = /<div>\s*<label className="text-\[10px\] font-bold uppercase text-slate-500">Description<\/label>\s*<textarea[\s\S]*?required\s*\/>\s*<\/div>/;

const fileInputHTML = `
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Attach Evidence Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setIncidentForm({ ...incidentForm, photoFile: file });
                  }}
                  className={\`w-full mt-1 p-2 text-xs border \${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}\`}
                />
              </div>
`;

code = code.replace(descriptionRegex, (match) => match + '\n' + fileInputHTML);

// Let's also make sure to render the photo in the incident list if it exists.
const renderTitleRegex = /<h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">[\s\S]*?<\/h4>/;

const photoRenderHTML = `
                  {inc.photoUrls && inc.photoUrls.length > 0 && (
                    <div className="mt-2">
                      <img src={inc.photoUrls[0]} alt="Evidence" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    </div>
                  )}
`;
code = code.replace(renderTitleRegex, (match) => match + '\n' + photoRenderHTML);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', code);
