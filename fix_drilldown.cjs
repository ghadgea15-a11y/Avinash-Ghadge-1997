const fs = require('fs');
let code = fs.readFileSync('src/components/bi/EnterpriseIntelligenceDashboard.tsx', 'utf-8');

const drillDownState = `
  const [drillDownModal, setDrillDownModal] = useState<{ isOpen: boolean; title: string; data: any[] }>({ isOpen: false, title: '', data: [] });
  
  const handleInternalDrillDown = (key: string, data: any[]) => {
    let title = 'Details';
    if (key === 'WORKFORCE_EXCEPTIONS') title = 'Workforce Exceptions (Late / Missing Punch)';
    if (key === 'OPERATIONS_INCIDENTS') title = 'Open Incidents';
    if (key === 'OPERATIONS_CRITICAL_INCIDENTS') title = 'Critical Incidents';
    if (key === 'OPERATIONS_WORK_ORDERS') title = 'Open Work Orders';
    if (key === 'OPERATIONS_OVERDUE_WO') title = 'Overdue Work Orders';
    if (key === 'COMPLIANCE_APPROVALS') title = 'Pending Approvals';
    
    setDrillDownModal({ isOpen: true, title, data });
    onDrillDown(key, data);
  };
`;

code = code.replace(
  "const handleFilterChange",
  drillDownState + "\n  const handleFilterChange"
);

code = code.replace(
  "onClick={() => drillDownKey && onDrillDown(drillDownKey, drillDownData)}",
  "onClick={() => drillDownKey && handleInternalDrillDown(drillDownKey, drillDownData)}"
);

const modalUI = `
      {/* Drill-down Modal */}
      {drillDownModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{drillDownModal.title}</h3>
              <button 
                onClick={() => setDrillDownModal({ isOpen: false, title: '', data: [] })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 flex-1">
              {drillDownModal.data.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No records found.</div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">ID / Ref</th>
                        <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">Description</th>
                        <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                        <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">Date / Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {drillDownModal.data.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-mono text-xs text-slate-500">{row.id || row.employeeId || 'N/A'}</td>
                          <td className="p-3 font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                            {row.title || row.taskName || row.name || row.type || 'N/A'}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
                              {row.status || row.severity || 'N/A'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-xs">
                            {row.timestamp || row.reportedAt || row.createdAt || row.date || row.dueDate || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center text-xs text-slate-500">
              <span>Showing {drillDownModal.data.length} records. Traceable to authoritative source.</span>
              <button 
                onClick={() => setDrillDownModal({ isOpen: false, title: '', data: [] })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(
  "import { \n  Users, AlertTriangle",
  "import { \n  Users, AlertTriangle, XCircle,"
);

if (code.includes('</XCircle>')) {
  // Wait, I just need to add XCircle to import
} else if (!code.includes('XCircle')) {
  code = code.replace('AlertTriangle', 'AlertTriangle, XCircle');
}

code = code.replace(
  "</div>\n  );\n};\n",
  modalUI + "\n    </div>\n  );\n};\n"
);

fs.writeFileSync('src/components/bi/EnterpriseIntelligenceDashboard.tsx', code);
