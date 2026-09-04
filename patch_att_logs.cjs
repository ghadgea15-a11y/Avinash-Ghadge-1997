const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/AttendanceLogs.tsx', 'utf8');

code = code.replace(
  "                <th className=\"py-3 px-6 font-bold text-slate-500\">Action/Status</th>\n                <th className=\"py-3 px-6 font-bold text-slate-500\">Location Details</th>\n              </tr>",
  "                <th className=\"py-3 px-6 font-bold text-slate-500\">Action/Status</th>\n                <th className=\"py-3 px-6 font-bold text-slate-500\">Location Details</th>\n                <th className=\"py-3 px-6 font-bold text-slate-500 text-right\">Actions</th>\n              </tr>"
);

const newRow = `                  <td className="py-3 px-6">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5" />
                      {log.locationDetails || 'N/A'}
                    </div>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <button 
                      onClick={() => handleRequestRegularization(log)}
                      className="px-3 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs font-bold transition-colors"
                    >
                      Request Regularization
                    </button>
                  </td>`;

code = code.replace(
  /<td className="py-3 px-6">[\s\S]*?<div className="flex items-center gap-1\.5 text-xs text-slate-500">[\s\S]*?<MapPin className="w-3\.5 h-3\.5" \/>[\s\S]*?\{log\.locationDetails \|\| 'N\/A'\}[\s\S]*?<\/div>[\s\S]*?<\/td>/g,
  newRow
);

const handleFn = `
  const handleRequestRegularization = async (log: AttendanceRecord) => {
    const reason = prompt("Enter reason for regularizing this punch:");
    if (!reason) return;
    try {
      await FirestoreService.saveAttendance(activeCompany.companyId, {
        ...log,
        requiresReview: true,
        regularizationReason: reason
      });
      alert('Regularization request submitted and sent for review.');
    } catch(err) {
      alert('Failed to submit request.');
    }
  };
`;

code = code.replace(
  "const handleExport = () => {",
  handleFn + "\n  const handleExport = () => {"
);

fs.writeFileSync('src/components/wfm/AttendanceLogs.tsx', code);
console.log('patched AttendanceLogs');
