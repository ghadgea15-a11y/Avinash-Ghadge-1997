import * as fs from 'fs';

let content = fs.readFileSync('src/components/screens/dashboards/SupervisorDashboard.tsx', 'utf-8');

// Add imports
content = content.replace(
  "EmployeeRecord, IncidentReportRecord",
  "EmployeeRecord, IncidentReportRecord, TaskRecord, DailySiteLogRecord"
);
content = content.replace(
  "import { Users, Clock, AlertTriangle, UserCheck, ShieldCheck, CheckSquare } from 'lucide-react';",
  "import { Users, Clock, AlertTriangle, UserCheck, ShieldCheck, CheckSquare, ClipboardList, TrendingUp } from 'lucide-react';"
);

// Add states
content = content.replace(
  "const [incidents, setIncidents] = useState<IncidentReportRecord[]>([]);",
  "const [incidents, setIncidents] = useState<IncidentReportRecord[]>([]);\n  const [tasks, setTasks] = useState<TaskRecord[]>([]);\n  const [dailyLogs, setDailyLogs] = useState<DailySiteLogRecord[]>([]);"
);

// Add subscriptions
const oldSubs = `    const unsubs = [
      FirestoreService.subscribeToAttendanceLogs(userSession, company.companyId, (data) => setAttendance(data.filter(a => a.siteId === siteId))),
      FirestoreService.subscribeToEmployees(userSession, company.companyId, (data) => setEmployees(data.filter(e => e.assignedSiteId === siteId))),
      FirestoreService.subscribeToIncidentReports(userSession, company.companyId, (data) => setIncidents(data.filter(i => i.siteId === siteId)))
    ];`;

const newSubs = `    const unsubs = [
      FirestoreService.subscribeToAttendanceLogs(userSession, company.companyId, (data) => setAttendance(data.filter(a => a.siteId === siteId))),
      FirestoreService.subscribeToEmployees(userSession, company.companyId, (data) => setEmployees(data.filter(e => e.assignedSiteId === siteId))),
      FirestoreService.subscribeToIncidentReports(userSession, company.companyId, (data) => setIncidents(data.filter(i => i.siteId === siteId))),
      FirestoreService.subscribeToTasks(userSession, company.companyId, (data) => setTasks(data.filter(t => t.siteId === siteId))),
      FirestoreService.subscribeToDailySiteLogs(userSession, company.companyId, (data) => setDailyLogs(data.filter(l => l.siteId === siteId)))
    ];`;

content = content.replace(oldSubs, newSubs);

// Replace scaffold
const scaffoldRegex = /\{\/\* Missing Logic Scaffold \*\/\}[\s\S]*?<\/div>/g;
const newUI = `{/* Supervisor Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Task Allocation */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-500" /> Daily Tasks
          </h3>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CLOSED').length}
          </p>
          <p className="text-sm text-slate-500">Pending tasks for team</p>
        </div>

        {/* Handover & Reports */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-500" /> Shift Handovers
          </h3>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {dailyLogs.filter(l => l.logType === 'HANDOVER' && l.date === new Date().toISOString().split('T')[0]).length}
          </p>
          <p className="text-sm text-slate-500">Handovers completed today</p>
        </div>
      </div>`;

content = content.replace(scaffoldRegex, newUI);

fs.writeFileSync('src/components/screens/dashboards/SupervisorDashboard.tsx', content);
