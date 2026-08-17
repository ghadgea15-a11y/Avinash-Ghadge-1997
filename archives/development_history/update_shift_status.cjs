const fs = require('fs');
let code = fs.readFileSync('src/components/screens/ShiftRosterScreen.tsx', 'utf8');

// Add cancel / swap actions
const replacement = `
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={\`text-xs px-2 py-1 rounded-full \${
                        roster.status === 'SCHEDULED' ? 'bg-emerald-100 text-emerald-700' :
                        roster.status === 'SWAPPED' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }\`}>
                        {roster.status}
                      </span>
                      {roster.status === 'SCHEDULED' && (
                        <button 
                          onClick={() => {
                            FirestoreService.saveShiftRoster(activeCompany.companyId, selectedSiteId, {
                               ...roster,
                               status: 'CANCELLED'
                            });
                          }}
                          className="text-xs text-red-600 hover:text-red-800 underline ml-2"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
`;

code = code.replace(/<td className="p-4">\s*<span className={`text-xs[^>]+>\s*\{roster.status\}\s*<\/span>\s*<\/td>/s, replacement);

fs.writeFileSync('src/components/screens/ShiftRosterScreen.tsx', code);
