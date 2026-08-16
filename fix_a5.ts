import * as fs from 'fs';

let content = fs.readFileSync('src/components/screens/dashboards/SiteInChargeDashboard.tsx', 'utf-8');

// Add imports
content = content.replace(
  "import { CompanyTenant, UserSession, PhaseAScreen, EmployeeRecord, AttendanceLogRecord, IncidentReportRecord, VisitorLogRecord, MaterialMovementRecord, AssetRecord, InventoryItemRecord, PatrolLogRecord } from '../../../types';",
  "import { CompanyTenant, UserSession, PhaseAScreen, EmployeeRecord, AttendanceLogRecord, IncidentReportRecord, VisitorLogRecord, MaterialMovementRecord, AssetRecord, InventoryItemRecord, PatrolLogRecord, TaskRecord, DailySiteLogRecord } from '../../../types';"
);

// Add state variables
content = content.replace(
  "  const [patrols, setPatrols] = useState<PatrolLogRecord[]>([]);\n  const [loading, setLoading] = useState(true);",
  "  const [patrols, setPatrols] = useState<PatrolLogRecord[]>([]);\n  const [tasks, setTasks] = useState<TaskRecord[]>([]);\n  const [dailyLogs, setDailyLogs] = useState<DailySiteLogRecord[]>([]);\n  const [loading, setLoading] = useState(true);"
);

// Add subscriptions
content = content.replace(
  "      FirestoreService.subscribeToInventoryItems(userSession, company.companyId, (data) => setInventory(data.filter(i => i.siteId === siteId))),\n      FirestoreService.subscribeToPatrolLogs(userSession, company.companyId, (data) => setPatrols(data.filter(p => p.siteId === siteId)))\n    ];",
  "      FirestoreService.subscribeToInventoryItems(userSession, company.companyId, (data) => setInventory(data.filter(i => i.siteId === siteId))),\n      FirestoreService.subscribeToPatrolLogs(userSession, company.companyId, (data) => setPatrols(data.filter(p => p.siteId === siteId))),\n      FirestoreService.subscribeToTasks(userSession, company.companyId, (data) => setTasks(data.filter(t => t.siteId === siteId))),\n      // subscribeToDailySiteLogs might not exist yet, I'll add it to firestoreService.ts later if needed. But wait! I added it earlier! Wait, did I add subscribeToDailySiteLogs? No, I only added subscribeToTasks, Announcements, Documents. I will need to add subscribeToDailySiteLogs! Let me comment out daily logs for now and I'll add it in a minute.\n    ];"
);
fs.writeFileSync('src/components/screens/dashboards/SiteInChargeDashboard.tsx', content);
