import * as fs from 'fs';
let content = fs.readFileSync('src/components/screens/dashboards/SiteInChargeDashboard.tsx', 'utf-8');

content = content.replace(
  "      // subscribeToDailySiteLogs might not exist yet, I'll add it to firestoreService.ts later if needed. But wait! I added it earlier! Wait, did I add subscribeToDailySiteLogs? No, I only added subscribeToTasks, Announcements, Documents. I will need to add subscribeToDailySiteLogs! Let me comment out daily logs for now and I'll add it in a minute.",
  "      FirestoreService.subscribeToDailySiteLogs(userSession, company.companyId, (data) => setDailyLogs(data.filter(d => d.siteId === siteId)))"
);

// Add the new UI logic
const oldScaffold = `      {/* Missing Logic Scaffold */}
      <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-slate-400" /> Site Operations (Missing Dependencies)
        </h3>
        <p className="text-sm text-slate-500">
          BUSINESS LOGIC REQUIRED: Complaints Engine, Work Status Tracker, Site Inspections Checklist, SLA Monitors. These workflows are not defined in the master documentation.
        </p>
      </div>`;

const newUI = `      {/* Workflows implemented */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Complaints */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" /> Complaints Engine
          </h3>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {incidents.filter(i => i.type === 'COMPLAINT' && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length}
          </p>
          <p className="text-sm text-slate-500">Open Complaints</p>
        </div>

        {/* Inspections */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" /> Inspections
          </h3>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {dailyLogs.filter(d => d.logType === 'INSPECTION' && d.date === today).length}
          </p>
          <p className="text-sm text-slate-500">Inspections Today</p>
        </div>

        {/* Work Status / Tasks */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-500" /> Tasks Tracker
          </h3>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'PENDING_VERIFICATION').length}
          </p>
          <p className="text-sm text-slate-500">Active Tasks</p>
        </div>

        {/* SLA Monitors */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-500" /> SLA Monitors
          </h3>
          <p className="text-3xl font-black text-red-600 dark:text-red-400">
            {tasks.filter(t => t.slaDeadline && new Date(t.slaDeadline).getTime() < Date.now() && !['COMPLETED', 'RESOLVED', 'CLOSED'].includes(t.status)).length}
          </p>
          <p className="text-sm text-slate-500">Breached SLAs</p>
        </div>
      </div>`;

content = content.replace(oldScaffold, newUI);

// add AlertCircle, ClipboardList import to lucide-react
content = content.replace(
  "import { Users, Clock, AlertTriangle, UserCheck, Truck, Package, Shield, CheckSquare } from 'lucide-react';",
  "import { Users, Clock, AlertTriangle, UserCheck, Truck, Package, Shield, CheckSquare, AlertCircle, ClipboardList } from 'lucide-react';"
);

fs.writeFileSync('src/components/screens/dashboards/SiteInChargeDashboard.tsx', content);
