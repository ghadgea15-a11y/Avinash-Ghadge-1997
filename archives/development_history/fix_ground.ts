import * as fs from 'fs';

['SkilledStaffDashboard.tsx', 'SemiSkilledDashboard.tsx', 'SupportStaffDashboard.tsx'].forEach(filename => {
  let content = fs.readFileSync('src/components/screens/dashboards/' + filename, 'utf-8');

  // Add TaskRecord, AnnouncementRecord
  content = content.replace(
    "AssetRecord, IncidentReportRecord",
    "AssetRecord, IncidentReportRecord, TaskRecord, AnnouncementRecord"
  );
  
  // Add state
  content = content.replace(
    "  const [incidents, setIncidents] = useState<IncidentReportRecord[]>([]);",
    "  const [incidents, setIncidents] = useState<IncidentReportRecord[]>([]);\n  const [tasks, setTasks] = useState<TaskRecord[]>([]);\n  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);"
  );

  // Add subscriptions
  content = content.replace(
    "      FirestoreService.subscribeToIncidentReports(userSession, company.companyId, (data) => {\n        setIncidents(data.filter(i => i.reportedById === userSession.employeeId));\n      })",
    "      FirestoreService.subscribeToIncidentReports(userSession, company.companyId, (data) => {\n        setIncidents(data.filter(i => i.reportedById === userSession.employeeId));\n      }),\n      FirestoreService.subscribeToTasks(userSession, company.companyId, (data) => {\n        setTasks(data.filter(t => t.assignedTo === userSession.employeeId));\n      }),\n      FirestoreService.subscribeToAnnouncements(userSession, company.companyId, (data) => {\n        // Just show all announcements scoped to them\n        setAnnouncements(data);\n      })"
  );

  // Replace scaffold
  const scaffoldRegex = /\{\/\* Missing Logic Scaffold \*\/\}[\s\S]*?<\/div>/g;
  const newUI = `{/* My Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">My Tasks</h3>
            <CheckSquare className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {tasks.filter(t => t.status === 'TODO' || t.status === 'IN_PROGRESS').length}
          </p>
          <p className="text-xs text-slate-500 mt-2">Active tasks assigned to me</p>
        </div>

        {/* Announcements */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">Announcements</h3>
            <AlertTriangle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{announcements.length}</p>
          <p className="text-xs text-slate-500 mt-2">Recent company announcements</p>
        </div>
      </div>`;

  content = content.replace(scaffoldRegex, newUI);

  fs.writeFileSync('src/components/screens/dashboards/' + filename, content);
});
