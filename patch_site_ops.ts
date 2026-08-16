import * as fs from 'fs';

let content = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf-8');

// 1. Add Type to incident form
content = content.replace(
  "severity: IncidentReportRecord['severity'];",
  "severity: IncidentReportRecord['severity'];\n    type: 'INCIDENT' | 'COMPLAINT' | 'BBS_OBSERVATION';"
);
content = content.replace(
  "{ siteId: '', title: '', category: 'SECURITY_BREACH', severity: 'MEDIUM', description: '' }",
  "{ siteId: '', title: '', category: 'SECURITY_BREACH', severity: 'MEDIUM', description: '', type: 'INCIDENT' }"
);
content = content.replace(
  "const newIncident: IncidentReportRecord = {",
  "const newIncident: IncidentReportRecord = {\n        type: incidentForm.type,"
);

// Add the type dropdown in the modal
const typeDropdown = `
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Record Type</label>
                <select
                  value={incidentForm.type}
                  onChange={e => setIncidentForm({ ...incidentForm, type: e.target.value as any })}
                  className={\`w-full mt-1 p-2.5 rounded-xl text-xs border \${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}\`}
                >
                  <option value="INCIDENT">Incident</option>
                  <option value="COMPLAINT">Complaint</option>
                  <option value="BBS_OBSERVATION">BBS Observation</option>
                </select>
              </div>
`;
content = content.replace(
  "<div className=\"grid grid-cols-2 gap-2\">",
  typeDropdown + "\n              <div className=\"grid grid-cols-2 gap-2\">"
);

// 2. Add DAILY_LOGS tab content
const dailyLogsTabContent = `
      {activeTab === 'DAILY_LOGS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Daily Logs & Handovers</h3>
              <p className="text-xs text-slate-500">Manage daily site inspections and shift handovers.</p>
            </div>
            <button
              onClick={() => {
                const log: DailySiteLogRecord = {
                  id: crypto.randomUUID(),
                  companyId,
                  siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""),
                  date: new Date().toISOString().split('T')[0],
                  inspectorId: userSession.employeeId || '',
                  logType: 'INSPECTION',
                  notes: 'Routine site inspection completed.',
                  createdAt: Date.now()
                };
                FirestoreService.saveDailySiteLog(companyId, log);
                setStatusMsg({ type: 'SUCCESS', text: 'Inspection log created.' });
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Inspection</span>
            </button>
            <button
              onClick={() => {
                const log: DailySiteLogRecord = {
                  id: crypto.randomUUID(),
                  companyId,
                  siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""),
                  date: new Date().toISOString().split('T')[0],
                  logType: 'HANDOVER',
                  outgoingSupervisorId: userSession.employeeId || '',
                  incomingSupervisorId: 'NEXT_SHIFT_USER',
                  notes: 'Shift handover complete. All keys and radios transferred.',
                  createdAt: Date.now()
                };
                FirestoreService.saveDailySiteLog(companyId, log);
                setStatusMsg({ type: 'SUCCESS', text: 'Handover log created.' });
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow flex items-center gap-2 ml-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Shift Handover</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dailySiteLogs.filter(d => selectedSiteId === "ALL" || d.siteId === selectedSiteId).map(log => (
              <div key={log.id} className={\`p-4 rounded-2xl border \${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-3\`}>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                    {log.logType || 'STANDARD'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{log.notes}</p>
                {log.logType === 'HANDOVER' && (
                  <p className="text-[10px] text-slate-400">Outgoing: {log.outgoingSupervisorId}</p>
                )}
              </div>
            ))}
            {dailySiteLogs.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400">No daily logs found.</div>
            )}
          </div>
        </div>
      )}
`;
content = content.replace("      {/* MODAL 1: ADD CHECKPOINT */}", dailyLogsTabContent + "\n      {/* MODAL 1: ADD CHECKPOINT */}");

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', content);

